import pyodbc
import sqlite3
import datetime
import decimal
import os
import re

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

# Get Primary Keys per table
ms_cur.execute("""
SELECT kc.TABLE_NAME, kcu.COLUMN_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS kc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  ON kc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND kc.TABLE_NAME = kcu.TABLE_NAME
WHERE kc.CONSTRAINT_TYPE = 'PRIMARY KEY'
ORDER BY kc.TABLE_NAME, kcu.ORDINAL_POSITION
""")
pk_map = {}
for t, c in ms_cur.fetchall():
    pk_map.setdefault(t, []).append(c)

# Get IDENTITY columns
ms_cur.execute("""
SELECT t.name, c.name
FROM sys.columns c
JOIN sys.tables t ON c.object_id = t.object_id
WHERE c.is_identity = 1
""")
identity_cols = set((r[0], r[1]) for r in ms_cur.fetchall())

# Get Unique Indexes / Constraints
ms_cur.execute("""
SELECT t.name AS table_name, i.name AS index_name, c.name AS col_name, i.filter_definition
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.is_unique = 1 AND i.is_primary_key = 0
ORDER BY t.name, i.name, ic.key_ordinal
""")
uniq_indexes = {}
for tbl, idx_name, col_name, filter_def in ms_cur.fetchall():
    entry = uniq_indexes.setdefault((tbl, idx_name), {"cols": [], "filter": filter_def})
    entry["cols"].append(col_name)

print(f"Found {len(tables)} tables to copy from MSSQL to SQLite.")


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


def map_default(col_default):
    if not col_default:
        return ""
    d = col_default.strip()
    while d.startswith("(") and d.endswith(")"):
        inner = d[1:-1].strip()
        # Avoid stripping unbalanced outer parens
        depth = 0
        balanced = True
        for i, ch in enumerate(inner):
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
                if depth < 0:
                    balanced = False
                    break
        if balanced and depth == 0:
            d = inner
        else:
            break
    dl = d.lower()
    if dl in ("getdate()", "getutcdate()", "sysdatetime()", "sysutcdatetime()"):
        return "DEFAULT CURRENT_TIMESTAMP"
    if re.fullmatch(r"-?\d+(\.\d+)?", d):
        return f"DEFAULT {d}"
    if d.startswith("'") and d.endswith("'"):
        return f"DEFAULT {d}"
    if d.startswith("N'") and d.endswith("'"):
        return f"DEFAULT {d[1:]}"
    return ""


def convert_filter(filter_def):
    if not filter_def:
        return ""
    # Replace [Col] with "Col"
    f = re.sub(r'\[([^\]]+)\]', r'"\1"', filter_def)
    if f.startswith("(") and f.endswith(")"):
        f = f[1:-1]
    return f" WHERE {f}"


for table in tables:
    ms_cur.execute("""
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
    """, (table,))
    cols_info = ms_cur.fetchall()

    table_pks = pk_map.get(table, [])
    col_defs = []
    col_names = []
    for col_name, data_type, is_null, col_default in cols_info:
        sq_type = map_type(data_type)
        col_names.append(f'"{col_name}"')

        if len(table_pks) == 1 and col_name == table_pks[0]:
            if (table, col_name) in identity_cols and sq_type == 'INTEGER':
                col_defs.append(f'"{col_name}" INTEGER PRIMARY KEY AUTOINCREMENT')
            else:
                col_defs.append(f'"{col_name}" {sq_type} PRIMARY KEY')
        else:
            default_clause = map_default(col_default)
            parts = [f'"{col_name}"', sq_type]
            if default_clause:
                parts.append(default_clause)
            col_defs.append(" ".join(parts))

    if len(table_pks) > 1:
        pk_cols_str = ", ".join(f'"{c}"' for c in table_pks)
        col_defs.append(f"PRIMARY KEY ({pk_cols_str})")

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

# Recreate Unique Indexes from MSSQL
print("Creating unique indexes...")
for (tbl, idx_name), info in uniq_indexes.items():
    cols_str = ", ".join(f'"{c}"' for c in info["cols"])
    where_clause = convert_filter(info["filter"])
    idx_sql = f'CREATE UNIQUE INDEX IF NOT EXISTS "{idx_name}" ON "{tbl}" ({cols_str}){where_clause};'
    try:
        sq_cur.execute(idx_sql)
        print(f"  Created unique index: {idx_name} on {tbl}({cols_str})")
    except Exception as e:
        print(f"  Warning creating unique index {idx_name}: {e}")

# Add helpful lookup indexes for child tables
lookup_indexes = [
    ("personaddress", "NationId"),
    ("personaffiliation", "NationId"),
    ("personcourse", "NationId"),
    ("persondocument", "NationId"),
    ("personlicense", "NationId"),
    ("personother", "NationId"),
    ("personregistration", "NationId"),
    ("register_history", "register_id"),
    ("trn_training_result", "nation_id"),
]
for tbl, col in lookup_indexes:
    if tbl in tables:
        try:
            sq_cur.execute(f'CREATE INDEX IF NOT EXISTS "IX_{tbl}_{col}" ON "{tbl}" ("{col}");')
        except Exception as e:
            print(f"  Warning creating lookup index on {tbl}.{col}: {e}")

sq_conn.commit()
integrity = sq_cur.execute("PRAGMA integrity_check;").fetchone()
print("SQLite PRAGMA integrity_check:", integrity)

sq_conn.close()
ms_conn.close()
print("Export from MSSQL to SQLite complete!")
