import pyodbc

conn = pyodbc.connect('DRIVER={ODBC Driver 18 for SQL Server};SERVER=127.0.0.1,14333;UID=sa;PWD=Pass@456981@XKTT;DATABASE=thaiairp_iptc;TrustServerCertificate=yes;')
cur = conn.cursor()

print("--- Register row for 1100600359236 ---")
cur.execute("SELECT national_id, first_name_th, last_name_th, addr_house_no, addr_moo, addr_soi, addr_road, addr_subdistrict, addr_district, addr_province, addr_postcode FROM register WHERE national_id = '1100600359236'")
cols = [c[0] for c in cur.description]
for r in cur.fetchall():
    print(dict(zip(cols, r)))

print("\n--- Summary of NULL IDs in personaddress ---")
cur.execute("""
    SELECT 
        COUNT(*) AS total_rows,
        SUM(CASE WHEN ProvinceId IS NULL THEN 1 ELSE 0 END) AS null_province_id,
        SUM(CASE WHEN DistrictId IS NULL THEN 1 ELSE 0 END) AS null_district_id,
        SUM(CASE WHEN SubDistrictId IS NULL THEN 1 ELSE 0 END) AS null_sub_district_id
    FROM personaddress
""")
cols = [c[0] for c in cur.description]
print(dict(zip(cols, cur.fetchone())))

print("\n--- Top unmapped province text values from register ---")
cur.execute("""
    SELECT r.addr_province, COUNT(*) as cnt 
    FROM register r
    LEFT JOIN personaddress pa ON r.national_id = pa.NationId
    WHERE r.addr_province IS NOT NULL AND r.addr_province <> '' AND (pa.ProvinceId IS NULL OR pa.NationId IS NULL)
    GROUP BY r.addr_province 
    ORDER BY cnt DESC
""")
for r in cur.fetchall()[:25]:
    print(r)

print("\n--- Top unmapped district text values from register ---")
cur.execute("""
    SELECT r.addr_district, r.addr_province, COUNT(*) as cnt 
    FROM register r
    LEFT JOIN personaddress pa ON r.national_id = pa.NationId
    WHERE r.addr_district IS NOT NULL AND r.addr_district <> '' AND (pa.DistrictId IS NULL OR pa.NationId IS NULL)
    GROUP BY r.addr_district, r.addr_province 
    ORDER BY cnt DESC
""")
for r in cur.fetchall()[:25]:
    print(r)

print("\n--- Top unmapped subdistrict text values from register ---")
cur.execute("""
    SELECT r.addr_subdistrict, r.addr_district, r.addr_province, COUNT(*) as cnt 
    FROM register r
    LEFT JOIN personaddress pa ON r.national_id = pa.NationId
    WHERE r.addr_subdistrict IS NOT NULL AND r.addr_subdistrict <> '' AND (pa.SubDistrictId IS NULL OR pa.NationId IS NULL)
    GROUP BY r.addr_subdistrict, r.addr_district, r.addr_province 
    ORDER BY cnt DESC
""")
for r in cur.fetchall()[:25]:
    print(r)
