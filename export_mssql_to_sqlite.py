import pyodbc
import sqlite3
import datetime
import decimal
import os

MSSQL_CONN_STR = 'DRIVER={ODBC Driver 18 for SQL Server};SERVER=127.0.0.1,14333;UID=sa;PWD=Pass@456981@XKTT;DATABASE=thaiairp_iptc;TrustServerCertificate=yes;'
SQLITE_DB_PATH = r"c:\Users\ednak\OneDrive\Desktop\datamangement\www\register_form\dotnet\backend\app.db"

if os.path.exists(SQLITE_DB_PATH):
    try:
        os.remove(SQLITE_DB_PATH)
    except Exception as e:
        print("Warning removing old app.db:", e)

ms_conn = pyodbc.connect(MSSQL_CONN_STR)
ms_cur = ms_conn.cursor()

sq_conn = sqlite3.connect(SQLITE_DB_PATH)
sq_cur = sq_conn.cursor()

# Get all base tables
ms_cur.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")
tables = [r[0] for r in ms_cur.fetchall()]

print(f"Found {len(tables)} tables to copy.")

def map_type(data_type):
    dt = data_type.lower()
    if any(x in dt for x in ['int', 'bit', 'tinyint', 'smallint', 'bigint']):
        return 'INTEGER'
    elif any(x in dt for x in ['decimal', 'numeric', 'float', 'real', 'money']):
        return 'REAL'
    elif any(x in dt for x in ['char', 'text', 'varchar', 'nvarchar', 'uniqueidentifier', 'xml']):
        return 'TEXT'
    elif any(x in dt for x in ['date', 'time', 'datetime', 'smalldatetime']):
        return 'TEXT'
    elif any(x in dt for x in ['binary', 'varbinary', 'image']):
        return 'BLOB'
    return 'TEXT'

for table in tables:
    ms_cur.execute(f"""
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '{table}' 
        ORDER BY ORDINAL_POSITION
    """)
    cols_info = ms_cur.fetchall()
    
    col_defs = []
    col_names = []
    for c in cols_info:
        col_name = c[0]
        data_type = c[1]
        is_null = c[2]
        sq_type = map_type(data_type)
        col_defs.append(f'"{col_name}" {sq_type}')
        col_names.append(f'"{col_name}"')
        
    create_sql = f'CREATE TABLE IF NOT EXISTS "{table}" ({", ".join(col_defs)});'
    sq_cur.execute(create_sql)
    
    # Read rows from MSSQL
    ms_cur.execute(f'SELECT * FROM [{table}]')
    rows = ms_cur.fetchall()
    
    if rows:
        placeholders = ", ".join(["?"] * len(col_names))
        insert_sql = f'INSERT INTO "{table}" ({", ".join(col_names)}) VALUES ({placeholders})'
        
        converted_rows = []
        for row in rows:
            converted_row = []
            for val in row:
                if isinstance(val, (datetime.datetime, datetime.date, datetime.time)):
                    converted_row.append(val.isoformat())
                elif isinstance(val, bool):
                    converted_row.append(1 if val else 0)
                elif isinstance(val, decimal.Decimal):
                    converted_row.append(float(val))
                elif isinstance(val, bytes):
                    converted_row.append(val)
                else:
                    converted_row.append(val)
            converted_rows.append(converted_row)
            
        sq_cur.executemany(insert_sql, converted_rows)
        sq_conn.commit()
        print(f"  Copied {table}: {len(rows)} rows")
    else:
        print(f"  Created empty table: {table}")

sq_conn.close()
ms_conn.close()
print("Export from MSSQL to SQLite complete!")
