import pyodbc
import time

conn_str = 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost,14333;DATABASE=master;UID=sa;PWD=Pass@456981@XKTT;TrustServerCertificate=yes;'
conn = pyodbc.connect(conn_str, autocommit=True)
cursor = conn.cursor()

print("1. Checking database state...")
cursor.execute("SELECT state_desc FROM sys.databases WHERE name = 'thaiairp_iptc'")
row = cursor.fetchone()
print("   Current state:", row[0] if row else "NOT FOUND")

print("2. Restoring database [thaiairp_iptc] from /var/opt/mssql/backup/thaiairp_iptc_migrated_20261005_083659.bak...")
try:
    cursor.execute("""
    RESTORE DATABASE [thaiairp_iptc]
    FROM DISK = '/var/opt/mssql/backup/thaiairp_iptc_migrated_20261005_083659.bak'
    WITH REPLACE, RECOVERY,
    MOVE 'thaiairp_iptc' TO '/var/opt/mssql/data/thaiairp_iptc.mdf',
    MOVE 'thaiairp_iptc_log' TO '/var/opt/mssql/data/thaiairp_iptc_log.ldf';
    """)
    while cursor.nextset():
        pass
    print("   Restore statement executed.")
except Exception as ex:
    print("   Restore error, trying RECOVERY:", ex)
    try:
        cursor.execute("RESTORE DATABASE [thaiairp_iptc] WITH RECOVERY")
        while cursor.nextset():
            pass
        print("   Database brought online via WITH RECOVERY.")
    except Exception as ex2:
        print("   Recovery error:", ex2)

try:
    cursor.execute("ALTER DATABASE [thaiairp_iptc] SET MULTI_USER;")
    print("   Set MULTI_USER mode.")
except Exception as ex:
    print("   Note:", ex)

time.sleep(1)

print("3. Verifying tables and row counts...")
cursor.execute("USE [thaiairp_iptc];")
cursor.execute("""
SELECT 
    t.NAME AS TableName,
    p.rows AS RowCounts
FROM 
    sys.tables t
INNER JOIN      
    sys.indexes i ON t.OBJECT_ID = i.object_id
INNER JOIN 
    sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
WHERE 
    t.NAME IN ('person', 'personregistration', 'personcourse', 'personaddress', 'personlicense', 'personaffiliation', 'mst_renew_basic', 'mst_renew_course')
    AND i.index_id < 2
ORDER BY 
    t.NAME
""")

for r in cursor.fetchall():
    print(f"   Table: {r.TableName:<25} Rows: {r.RowCounts}")

with open('create_export_stored_procedure.sql', 'r', encoding='utf-8') as f:
    sql_text = f.read()

batches = [b.strip() for b in sql_text.split('\nGO') if b.strip()]
for b in batches:
    if b.upper().startswith('USE '):
        continue
    cursor.execute(b)

print("4. Stored Procedure & Views re-applied successfully!")
cursor.execute("SELECT COUNT(*) FROM vw_TraineeRegistrationExport")
print(f"   vw_TraineeRegistrationExport count: {cursor.fetchone()[0]}")

print("\nSUCCESS: Database thaiairp_iptc updated to latest state from backup!")
conn.close()
