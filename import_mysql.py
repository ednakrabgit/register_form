import subprocess
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
sql_path = os.path.join(base_dir, "db", "thaiairp_iptc_20260916_131122.sql")
if not os.path.exists(sql_path):
    sql_path = os.path.join(base_dir, "thaiairp_iptc_20260916_131122.sql")

mysql_exe = r"C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe"
db_user = "thaiairp_iptc"
db_pass = "Pass@456981@XKTT"

print(f"Starting MySQL import from: {sql_path}")

# 1. Reset database cleanly
print("Recreating database thaiairp_iptc...")
subprocess.run(
    [mysql_exe, "-u", db_user, f"-p{db_pass}", "-e", "DROP DATABASE IF EXISTS thaiairp_iptc; CREATE DATABASE thaiairp_iptc DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"],
    check=True
)

# 2. Stream dump with compatibility replacements and --force
print("Importing SQL dump...")
process = subprocess.Popen(
    [mysql_exe, "-u", db_user, f"-p{db_pass}", "--default-character-set=utf8mb4", "--force", "thaiairp_iptc"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    encoding='utf-8',
    errors='ignore'
)

with open(sql_path, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        # replace MySQL 8.0 specific collation
        if 'utf8mb4_0900_ai_ci' in line:
            line = line.replace('utf8mb4_0900_ai_ci', 'utf8mb4_unicode_ci')
        process.stdin.write(line)

stdout, stderr = process.communicate()

print("MySQL import process output:")
if stderr:
    print(stderr)

print("Verifying imported tables...")
verify = subprocess.run(
    [mysql_exe, "-u", db_user, f"-p{db_pass}", "-e", "USE thaiairp_iptc; SHOW TABLES; SELECT 'register' as tbl, count(*) as count FROM register UNION ALL SELECT 'person', count(*) FROM person UNION ALL SELECT 'mst_provinces', count(*) FROM mst_provinces;"],
    capture_output=True,
    text=True
)
print(verify.stdout)
print("Import completed successfully!")

