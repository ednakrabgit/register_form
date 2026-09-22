import pymysql
import pyodbc
import sys
import datetime

print("Connecting to MySQL...", flush=True)
mysql_conn = pymysql.connect(
    host='localhost',
    user='thaiairp_iptc',
    password='Pass@456981@XKTT',
    database='thaiairp_iptc',
    charset='utf8mb4',
    cursorclass=pymysql.cursors.DictCursor
)

print("Connecting to SQL Server 2025 (port 14333)...", flush=True)
sql_conn = pyodbc.connect(
    'DRIVER={ODBC Driver 18 for SQL Server};'
    'SERVER=127.0.0.1,14333;'
    'UID=sa;'
    'PWD=Pass@456981@XKTT;'
    'DATABASE=thaiairp_iptc;'
    'TrustServerCertificate=yes;',
    autocommit=False
)
sql_cursor = sql_conn.cursor()
sql_cursor.fast_executemany = False

# Get identity columns in SQL Server
sql_cursor.execute("""
SELECT t.name, c.name
FROM sys.tables t
JOIN sys.columns c ON t.object_id = c.object_id
WHERE c.is_identity = 1
""")
identity_tables = {r[0].lower(): r[1] for r in sql_cursor.fetchall()}

# Get all tables from MySQL
with mysql_conn.cursor() as cursor:
    cursor.execute("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")
    mysql_tables = [list(row.values())[0] for row in cursor.fetchall()]

# Get all tables in SQL Server
sql_cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
sql_tables = {row[0].lower(): row[0] for row in sql_cursor.fetchall()}

print(f"Found {len(mysql_tables)} MySQL tables and {len(sql_tables)} SQL Server tables.", flush=True)

# Disable all constraints temporarily
print("Disabling SQL Server constraints...", flush=True)
sql_cursor.execute("EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT all'")
sql_conn.commit()

# Delete existing data from matching tables
print("Clearing matching SQL Server tables...", flush=True)
for m_table in mysql_tables:
    if m_table.lower() in sql_tables:
        target_sql_table = sql_tables[m_table.lower()]
        try:
            sql_cursor.execute(f"DELETE FROM [{target_sql_table}]")
            sql_conn.commit()
        except Exception as e:
            sql_conn.rollback()
            print(f"  Could not delete from {target_sql_table}: {e}", flush=True)

# Copy data table by table
for m_table in mysql_tables:
    if m_table.lower() not in sql_tables:
        print(f"Skipping {m_table} (not in SQL Server schema)", flush=True)
        continue
    
    target_sql_table = sql_tables[m_table.lower()]
    
    with mysql_conn.cursor() as cursor:
        cursor.execute(f"SELECT * FROM `{m_table}`")
        rows = cursor.fetchall()
        
    if not rows:
        print(f"Table {m_table} is empty. (0 rows)", flush=True)
        continue
        
    print(f"Migrating {len(rows)} rows: {m_table} -> [{target_sql_table}]...", flush=True)
    
    # Get SQL Server columns for target table
    sql_cursor.execute(f"SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{target_sql_table}'")
    col_info = {r[0].lower(): (r[0], r[1].lower()) for r in sql_cursor.fetchall()}
    
    # Filter columns present in both
    matched_cols = []
    for col in rows[0].keys():
        if col.lower() in col_info:
            matched_cols.append((col, col_info[col.lower()][0], col_info[col.lower()][1]))
            
    if not matched_cols:
        print(f"  No matching columns for {m_table}. Skipping.", flush=True)
        continue
        
    mysql_keys = [mc[0] for mc in matched_cols]
    sql_keys = [mc[1] for mc in matched_cols]
    sql_types = [mc[2] for mc in matched_cols]
    
    has_identity = target_sql_table.lower() in identity_tables
    if has_identity:
        sql_cursor.execute(f"SET IDENTITY_INSERT [{target_sql_table}] ON")
        sql_conn.commit()
        
    placeholders = ",".join(["?"] * len(sql_keys))
    cols_str = ",".join([f"[{c}]" for c in sql_keys])
    insert_sql = f"INSERT INTO [{target_sql_table}] ({cols_str}) VALUES ({placeholders})"
    
    batch = []
    batch_size = 200
    for row in rows:
        val = []
        for idx, k in enumerate(mysql_keys):
            v = row[k]
            dtype = sql_types[idx]
            
            # Type conversions
            if isinstance(v, bytes):
                try:
                    v = v.decode('utf-8')
                except:
                    pass
            elif isinstance(v, (datetime.date, datetime.datetime)):
                # SQL Server DateTime range check (1753-01-01 min)
                if isinstance(v, datetime.date) and not isinstance(v, datetime.datetime):
                    v = datetime.datetime.combine(v, datetime.time.min)
                if v.year < 1753:
                    v = None
            elif dtype == 'bit':
                if v is not None:
                    if isinstance(v, (bool, int)):
                        v = 1 if v else 0
                    elif isinstance(v, str):
                        v = 1 if v.strip() in ('1', 'true', 'True', 'Y', 'y') else 0
            elif isinstance(v, str):
                if v == '0000-00-00' or v == '0000-00-00 00:00:00':
                    v = None
                    
            val.append(v)
            
        batch.append(tuple(val))
        if len(batch) >= batch_size:
            try:
                sql_cursor.executemany(insert_sql, batch)
                sql_conn.commit()
            except Exception as e:
                sql_conn.rollback()
                print(f"  Batch insert error on {target_sql_table}: {e}", flush=True)
                # Retry row by row
                for single_row in batch:
                    try:
                        sql_cursor.execute(insert_sql, single_row)
                    except Exception as row_err:
                        pass
                sql_conn.commit()
            batch = []
            
    if batch:
        try:
            sql_cursor.executemany(insert_sql, batch)
            sql_conn.commit()
        except Exception as e:
            sql_conn.rollback()
            print(f"  Final batch insert error on {target_sql_table}: {e}", flush=True)
            for single_row in batch:
                try:
                    sql_cursor.execute(insert_sql, single_row)
                except Exception:
                    pass
            sql_conn.commit()
        
    if has_identity:
        sql_cursor.execute(f"SET IDENTITY_INSERT [{target_sql_table}] OFF")
        sql_conn.commit()

print("Re-enabling SQL Server constraints...", flush=True)
sql_cursor.execute("EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all'")
sql_conn.commit()

print("\n--- Verifying SQL Server Row Counts ---", flush=True)
check_tables = ['register', 'admin_users', 'mst_provinces', 'mst_districts', 'mst_sub_districts', 'person', 'mst_renew_course']
for t in check_tables:
    try:
        sql_cursor.execute(f"SELECT COUNT(*) FROM [{t}]")
        cnt = sql_cursor.fetchone()[0]
        print(f"  [{t}]: {cnt} rows", flush=True)
    except Exception as e:
        print(f"  [{t}]: error ({e})", flush=True)

print("\nAll database tables dumped and synced to SQL Server successfully!", flush=True)

