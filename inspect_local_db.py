import pyodbc

conn = pyodbc.connect('DRIVER={ODBC Driver 18 for SQL Server};SERVER=127.0.0.1,14333;UID=sa;PWD=Pass@456981@XKTT;DATABASE=thaiairp_iptc;TrustServerCertificate=yes;')
cursor = conn.cursor()
cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")
tables = [r[0] for r in cursor.fetchall()]
print(f"Total tables in local MSSQL: {len(tables)}")
for t in tables:
    try:
        cursor.execute(f"SELECT COUNT(*) FROM [{t}]")
        cnt = cursor.fetchone()[0]
        print(f"  {t}: {cnt} rows")
    except Exception as e:
        print(f"  {t}: err {e}")
