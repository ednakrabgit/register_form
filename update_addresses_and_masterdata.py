import pyodbc
import re
import difflib

MSSQL_CONN_STR = 'DRIVER={ODBC Driver 18 for SQL Server};SERVER=127.0.0.1,14333;UID=sa;PWD=Pass@456981@XKTT;DATABASE=thaiairp_iptc;TrustServerCertificate=yes;'

conn = pyodbc.connect(MSSQL_CONN_STR, autocommit=False)
cur = conn.cursor()

print("1. Loading Master Data...")
cur.execute("SELECT id, province_thai FROM mst_provinces")
provinces = {r[0]: r[1].strip() for r in cur.fetchall()}
province_name_to_id = {name: pid for pid, name in provinces.items()}

province_aliases = {
    'กรุงเทพ': 1, 'กรุงเทพฯ': 1, 'กทม': 1, 'กทม.': 1, 'กรุงเทพมหานคร': 1, 'กรุงเทพ\u200bมหานคร\u200b': 1, 'กรุงเทพมหานคร\u200b': 1, 'กรุฃเทพฯ': 1, 'กรุงเทพมหาคร': 1,
    'อยุธยา': 5, 'พระนครศรีอยุธยา': 5,
    'สมุทปราการ': 2, 'สมุทรปราการ': 2,
    'ประจวบ': 65, 'ประจวบฯ': 65, 'ประจวบคีรีขันธ์': 65, 'ประจวบ ฯ': 65,
    'เชียงไหม่': 38, 'เชียงใหม่': 38,
    'พิษณุดลก': 53, 'พิษณุโลก': 53,
    'ภูก็ต': 70, 'ภูเก็ต': 70,
    'มหาสาคาม': 34, 'มหาสารคาม': 34,
    'ราชบุ': 58, 'ราชบุรี': 58,
    'ปราจีน': 18, 'ปราจีนบุรี': 18,
    'โคราช': 20, 'นครราชสีมา': 20,
    'พังงา': 71, 'กระบี่': 69, 'ตรัง': 75, 'สตูล': 74,
    'พะเยา': 44, 'พิจิตร': 54, 'พนา': 28
}

cur.execute("SELECT id, district_thai, province_id FROM mst_districts")
districts = [{'id': r[0], 'name': r[1].strip(), 'province_id': r[2]} for r in cur.fetchall()]

cur.execute("SELECT id, sub_district_thai, district_id, postal_code FROM mst_sub_districts")
subdistricts = [{'id': r[0], 'name': r[1].strip(), 'district_id': r[2], 'zip': (r[3] or '').strip()} for r in cur.fetchall()]

def clean_thai_text(s):
    if not s: return ''
    s = str(s).strip()
    s = re.sub(r'[\u200b\u200c\u200d\ufeff]', '', s)
    s = s.replace('เเ', 'แ')
    s = re.sub(r'า+', 'า', s)
    s = re.sub(r'่+', '่', s)
    s = re.sub(r'้+', '้', s)
    s = re.sub(r'๊+', '๊', s)
    s = re.sub(r'๋+', '๋', s)
    s = re.sub(r'ี+', 'ี', s)
    s = re.sub(r'ิ+', 'ิ', s)
    s = re.sub(r'ึ+', 'ึ', s)
    s = re.sub(r'ื+', 'ื', s)
    s = re.sub(r'ุ+', 'ุ', s)
    s = re.sub(r'ู+', 'ู', s)
    s = re.sub(r'^(จังหวัด|จ\.|เขต|อำเภอ|อ\.|แขวง|ตำบล|ต\.)\s*', '', s)
    return s.strip()

sub_aliases = {
    'อิสาน': 'อิสาณ', 'ไ่ร่ขิง': 'ไร่ขิง', 'บางพุทธา': 'บางพุทรา', 'ท่าคูม': 'ท่าตูม',
    'คลองหนึ่่ง': 'คลองหนึ่ง', 'หนองฉาาง': 'หนองฉาง', 'หนองเเขม': 'หนองแขม', 'ซากพง': 'ชากพง',
    'เกีรยงไกร': 'เกรียงไกร', 'ศาลาธรรมสพณ์': 'ศาลาธรรมสพน์', 'ปีาตอง': 'ป่าตอง', 'ราหวาย': 'รางหวาย',
    'บ่อกรูด': 'บ่อกรุ', 'ทาข้าม': 'ท่าข้าม', 'ปนะชาธิปัตย์': 'ประชาธิปัตย์', 'รัศฎา': 'รัษฎา',
    'วัดเกตุ': 'วัดเกต', 'ดาวคนอง': 'ดาวคะนอง', 'ยานาวา': 'ยานนาวา', 'หัวยทราย': 'ห้วยทราย',
    'ช่าเคิ่ง': 'ช่างเคิ่ง', 'กุฏโง้ว': 'กุฎโง้ง', 'เสธงหิน': 'เสาธงหิน', 'หนอมแขม': 'หนองแขม',
    'โชตนา': 'ช้างเผือก', 'ศรีษะจรเข้น้อย': 'ศีรษะจรเข้น้อย', 'อ่อนนุช': 'สวนหลวง', 'หนองทอง': 'หนองทอง',
    'บางพลีน้อย': 'บางพลีน้อย'
}

def match_province(raw_prov):
    c = clean_thai_text(raw_prov)
    if not c: return None
    if c in province_aliases:
        return province_aliases[c]
    if c in province_name_to_id:
        return province_name_to_id[c]
    for pid, pname in provinces.items():
        if c == pname or c in pname or pname in c:
            return pid
    return None

def match_district(raw_dist, prov_id, zipcode=None):
    c = clean_thai_text(raw_dist)
    if not c: return None
    
    prov_districts = [d for d in districts if d['province_id'] == prov_id] if prov_id else districts
    
    for d in prov_districts:
        clean_dname = clean_thai_text(d['name'])
        if c == clean_dname or c == d['name']:
            return d['id']
            
    if c == 'เมือง':
        for d in prov_districts:
            if d['name'].startswith('เมือง'):
                return d['id']
                
    for d in prov_districts:
        clean_dname = clean_thai_text(d['name'])
        if c in clean_dname or clean_dname in c:
            return d['id']
            
    # Fuzzy match in province
    names = [clean_thai_text(d['name']) for d in prov_districts]
    matches = difflib.get_close_matches(c, names, n=1, cutoff=0.7)
    if matches:
        for d in prov_districts:
            if clean_thai_text(d['name']) == matches[0]:
                return d['id']

    for d in districts:
        clean_dname = clean_thai_text(d['name'])
        if c == clean_dname:
            return d['id']
            
    if zipcode:
        for s in subdistricts:
            if s['zip'] == zipcode:
                return s['district_id']
                
    return None

def match_subdistrict(raw_sub, dist_id, zipcode):
    c = clean_thai_text(raw_sub)
    if not c: return None
    if c in sub_aliases:
        c = sub_aliases[c]
    
    dist_subs = [s for s in subdistricts if s['district_id'] == dist_id] if dist_id else subdistricts
    
    for s in dist_subs:
        clean_sname = clean_thai_text(s['name'])
        if c == clean_sname or c == s['name']:
            return s['id']
            
    if zipcode:
        for s in dist_subs:
            clean_sname = clean_thai_text(s['name'])
            if s['zip'] == zipcode and (c in clean_sname or clean_sname in c):
                return s['id']
                
    for s in dist_subs:
        clean_sname = clean_thai_text(s['name'])
        if c in clean_sname or clean_sname in c:
            return s['id']
            
    # Fuzzy match in district
    names = [clean_thai_text(s['name']) for s in dist_subs]
    matches = difflib.get_close_matches(c, names, n=1, cutoff=0.7)
    if matches:
        for s in dist_subs:
            if clean_thai_text(s['name']) == matches[0]:
                return s['id']

    if zipcode:
        for s in subdistricts:
            clean_sname = clean_thai_text(s['name'])
            if s['zip'] == zipcode and (c == clean_sname or c in clean_sname or clean_sname in c):
                return s['id']
                
    for s in subdistricts:
        clean_sname = clean_thai_text(s['name'])
        if c == clean_sname:
            return s['id']

    return None

print("2. Processing all registrations and updating personaddress...")

cur.execute("""
    SELECT 
        national_id, 
        addr_house_no, addr_moo, addr_village, addr_soi, addr_road, addr_province, addr_district, addr_subdistrict, addr_postcode,
        contact_address, contact_house_no, contact_moo, contact_village, contact_soi, contact_road, contact_province, contact_district, contact_subdistrict, contact_postcode
    FROM register
""")
reg_rows = cur.fetchall()

updated_reg_addr = 0
updated_contact_addr = 0
new_subdistricts_inserted = 0

for row in reg_rows:
    (nid, 
     h_no, moo, vil, soi, road, prov, dist, sub, zipc,
     c_type, c_h_no, c_moo, c_vil, c_soi, c_road, c_prov, c_dist, c_sub, c_zipc) = row
     
    if not nid: continue
    
    # 1. Registered Address (Type A)
    pid = match_province(prov)
    did = match_district(dist, pid, zipc)
    sid = match_subdistrict(sub, did, zipc)
    
    if sid and not did:
        sub_obj = next((s for s in subdistricts if s['id'] == sid), None)
        if sub_obj: did = sub_obj['district_id']
    if did and not pid:
        dist_obj = next((d for d in districts if d['id'] == did), None)
        if dist_obj: pid = dist_obj['province_id']
        
    # If subdistrict is still not found but district exists and sub name is present, insert cleanly into mst_sub_districts!
    if did and sub and not sid:
        clean_s = clean_thai_text(sub)
        if clean_s:
            cur.execute("SELECT ISNULL(MAX(id), 0) + 1, ISNULL(MAX(sub_district_id), 0) + 1 FROM mst_sub_districts")
            max_id, max_sub_id = cur.fetchone()
            cur.execute("""
                SET IDENTITY_INSERT [mst_sub_districts] ON;
                INSERT INTO [mst_sub_districts] (id, sub_district_id, sub_district_thai, district_id, postal_code, is_active_backend, is_active_frontend)
                VALUES (?, ?, ?, ?, ?, 1, 1);
                SET IDENTITY_INSERT [mst_sub_districts] OFF;
            """, max_id, max_sub_id, clean_s, did, zipc or '')
            sid = max_id
            subdistricts.append({'id': sid, 'name': clean_s, 'district_id': did, 'zip': zipc or ''})
            new_subdistricts_inserted += 1
            print(f"   [+] Inserted new subdistrict into mst_sub_districts: '{clean_s}' (ID {sid}, District {did})")

    # Upsert or Update Type A address in personaddress
    cur.execute("SELECT Id FROM personaddress WHERE NationId = ? AND AddressType = 'A'", nid)
    addr_rec = cur.fetchone()
    if addr_rec:
        cur.execute("""
            UPDATE personaddress 
            SET HouseNo = COALESCE(?, HouseNo),
                Moo = COALESCE(?, Moo),
                Village = COALESCE(?, Village),
                Soi = COALESCE(?, Soi),
                Road = COALESCE(?, Road),
                ProvinceId = ?,
                DistrictId = ?,
                SubDistrictId = ?,
                Postcode = COALESCE(?, Postcode)
            WHERE Id = ?
        """, h_no, moo, vil, soi, road, pid, did, sid, zipc, addr_rec[0])
        updated_reg_addr += 1
    else:
        cur.execute("""
            INSERT INTO personaddress (NationId, HouseNo, Moo, Village, Soi, Road, ProvinceId, DistrictId, SubDistrictId, Postcode, AddressTypeText, AddressType)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ตามทะเบียนบ้าน', 'A')
        """, nid, h_no, moo, vil, soi, road, pid, did, sid, zipc)
        updated_reg_addr += 1

    # 2. Contact Address (Type C)
    if c_type == 'specify_new' and (c_prov or c_dist or c_sub or c_h_no):
        c_pid = match_province(c_prov)
        c_did = match_district(c_dist, c_pid, c_zipc)
        c_sid = match_subdistrict(c_sub, c_did, c_zipc)
        
        if c_sid and not c_did:
            sub_obj = next((s for s in subdistricts if s['id'] == c_sid), None)
            if sub_obj: c_did = sub_obj['district_id']
        if c_did and not c_pid:
            dist_obj = next((d for d in districts if d['id'] == c_did), None)
            if dist_obj: c_pid = dist_obj['province_id']
            
        cur.execute("SELECT Id FROM personaddress WHERE NationId = ? AND AddressType = 'C'", nid)
        c_addr_rec = cur.fetchone()
        if c_addr_rec:
            cur.execute("""
                UPDATE personaddress 
                SET HouseNo = COALESCE(?, HouseNo),
                    Moo = COALESCE(?, Moo),
                    Village = COALESCE(?, Village),
                    Soi = COALESCE(?, Soi),
                    Road = COALESCE(?, Road),
                    ProvinceId = ?,
                    DistrictId = ?,
                    SubDistrictId = ?,
                    Postcode = COALESCE(?, Postcode)
                WHERE Id = ?
            """, c_h_no, c_moo, c_vil, c_soi, c_road, c_pid, c_did, c_sid, c_zipc, c_addr_rec[0])
            updated_contact_addr += 1
        else:
            cur.execute("""
                INSERT INTO personaddress (NationId, HouseNo, Moo, Village, Soi, Road, ProvinceId, DistrictId, SubDistrictId, Postcode, AddressTypeText, AddressType)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ที่อยู่สำหรับจัดส่งเอกสาร', 'C')
            """, nid, c_h_no, c_moo, c_vil, c_soi, c_road, c_pid, c_did, c_sid, c_zipc)
            updated_contact_addr += 1

conn.commit()
print(f"3. Address update complete!")
print(f"   Updated/Upserted Registered Addresses (Type A): {updated_reg_addr}")
print(f"   Updated/Upserted Contact Addresses (Type C):    {updated_contact_addr}")
print(f"   New Subdistricts Added to Master:               {new_subdistricts_inserted}")

# 4. Check Sample User 1100600359236
print("\n--- Verifying Sample User 1100600359236 ---")
cur.execute("""
    SELECT 
        pa.NationId, pa.HouseNo, pa.Postcode, pa.AddressType,
        p.id AS ProvinceId, p.province_thai AS Province,
        d.id AS DistrictId, d.district_thai AS District,
        s.id AS SubDistrictId, s.sub_district_thai AS SubDistrict
    FROM personaddress pa
    LEFT JOIN mst_provinces p ON pa.ProvinceId = p.id
    LEFT JOIN mst_districts d ON pa.DistrictId = d.id
    LEFT JOIN mst_sub_districts s ON pa.SubDistrictId = s.id
    WHERE pa.NationId = '1100600359236'
""")
for r in cur.fetchall():
    print(r)

# 5. Check Overall Completeness
cur.execute("""
    SELECT 
        COUNT(*) AS Total_Addresses,
        SUM(CASE WHEN ProvinceId IS NOT NULL THEN 1 ELSE 0 END) AS Has_ProvinceId,
        SUM(CASE WHEN DistrictId IS NOT NULL THEN 1 ELSE 0 END) AS Has_DistrictId,
        SUM(CASE WHEN SubDistrictId IS NOT NULL THEN 1 ELSE 0 END) AS Has_SubDistrictId,
        SUM(CASE WHEN ProvinceId IS NULL THEN 1 ELSE 0 END) AS Null_ProvinceId,
        SUM(CASE WHEN DistrictId IS NULL THEN 1 ELSE 0 END) AS Null_DistrictId,
        SUM(CASE WHEN SubDistrictId IS NULL THEN 1 ELSE 0 END) AS Null_SubDistrictId
    FROM personaddress
""")
cols = [c[0] for c in cur.description]
print("\n--- Overall Address Completeness in personaddress ---")
print(dict(zip(cols, cur.fetchone())))

conn.close()
