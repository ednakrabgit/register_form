import pyodbc
import re
from collections import Counter

conn = pyodbc.connect('DRIVER={ODBC Driver 18 for SQL Server};SERVER=127.0.0.1,14333;UID=sa;PWD=Pass@456981@XKTT;DATABASE=thaiairp_iptc;TrustServerCertificate=yes;')
cur = conn.cursor()

# 1. Load Master Provinces
cur.execute("SELECT id, province_thai FROM mst_provinces")
provinces = {r[0]: r[1].strip() for r in cur.fetchall()}
province_name_to_id = {name: pid for pid, name in provinces.items()}

province_aliases = {
    'กรุงเทพ': 1, 'กรุงเทพฯ': 1, 'กทม': 1, 'กทม.': 1, 'กรุงเทพมหานคร': 1, 'กรุงเทพ\u200bมหานคร\u200b': 1, 'กรุงเทพมหานคร\u200b': 1, 'กรุฃเทพฯ': 1, 'กรุงเทพมหาคร': 1,
    'อยุธยา': 5, 'พระนครศรีอยุธยา': 5,
    'สมุทปราการ': 2, 'สมุทรปราการ': 2,
    'ประจวบ': 65, 'ประจวบฯ': 65, 'ประจวบคีรีขันธ์': 65,
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
    'อิสาน': 'อิสาณ',
    'ไ่ร่ขิง': 'ไร่ขิง',
    'บางพุทธา': 'บางพุทรา',
    'ท่าคูม': 'ท่าตูม',
    'คลองหนึ่่ง': 'คลองหนึ่ง',
    'หนองฉาาง': 'หนองฉาง',
    'หนองเเขม': 'หนองแขม',
    'ซากพง': 'ชากพง',
    'เกีรยงไกร': 'เกรียงไกร',
    'ศาลาธรรมสพณ์': 'ศาลาธรรมสพน์',
    'ปีาตอง': 'ป่าตอง',
    'ราหวาย': 'รางหวาย',
    'บ่อกรูด': 'บ่อกรุ',
    'ทาข้าม': 'ท่าข้าม',
    'สระแก้ว': 'สระแก้ว',
    'พระบาท': 'พระบาท',
    'ชมพู': 'ชมพู',
    'พิชัย': 'พิชัย',
    'มะเขือแจ้': 'มะเขือแจ้',
    'ปงแสนทอง': 'ปงแสนทอง',
    'เวียงยอง': 'เวียงยอง',
    'กล้วยแพะ': 'กล้วยแพะ',
    'หัวเสือ': 'หัวเสือ',
    'อ่อนนุช': 'สวนหลวง',
    'หนองทอง': 'หนองทอง',
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
    
    # 1. Exact match in province
    for d in prov_districts:
        clean_dname = clean_thai_text(d['name'])
        if c == clean_dname or c == d['name']:
            return d['id']
            
    # 2. If 'เมือง', match 'เมือง...' for that province
    if c == 'เมือง':
        for d in prov_districts:
            if d['name'].startswith('เมือง'):
                return d['id']
                
    # 3. Starts with / Substring match in province
    for d in prov_districts:
        clean_dname = clean_thai_text(d['name'])
        if c in clean_dname or clean_dname in c:
            return d['id']
            
    # 4. Across all districts
    for d in districts:
        clean_dname = clean_thai_text(d['name'])
        if c == clean_dname or c in clean_dname:
            return d['id']
            
    # 5. Zipcode fallback
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
    
    # 1. Exact match in district
    for s in dist_subs:
        clean_sname = clean_thai_text(s['name'])
        if c == clean_sname or c == s['name']:
            return s['id']
            
    # 2. Match with zipcode in district
    if zipcode:
        for s in dist_subs:
            clean_sname = clean_thai_text(s['name'])
            if s['zip'] == zipcode and (c in clean_sname or clean_sname in c):
                return s['id']
                
    # 3. Substring match in district
    for s in dist_subs:
        clean_sname = clean_thai_text(s['name'])
        if c in clean_sname or clean_sname in c:
            return s['id']
            
    # 4. Global match by zipcode + subdistrict name
    if zipcode:
        for s in subdistricts:
            clean_sname = clean_thai_text(s['name'])
            if s['zip'] == zipcode and (c == clean_sname or c in clean_sname or clean_sname in c):
                return s['id']
                
    # 5. Global match across all subdistricts
    for s in subdistricts:
        clean_sname = clean_thai_text(s['name'])
        if c == clean_sname:
            return s['id']

    return None

cur.execute("SELECT national_id, addr_province, addr_district, addr_subdistrict, addr_postcode FROM register")
rows = cur.fetchall()

p_matched, d_matched, s_matched = 0, 0, 0
unmatched = []

for r in rows:
    nid, rp, rd, rs, rz = r
    pid = match_province(rp)
    did = match_district(rd, pid, rz)
    sid = match_subdistrict(rs, did, rz)
    
    # If subdistrict was matched globally, infer district and province if missing!
    if sid and not did:
        sub_obj = next((s for s in subdistricts if s['id'] == sid), None)
        if sub_obj:
            did = sub_obj['district_id']
    if did and not pid:
        dist_obj = next((d for d in districts if d['id'] == did), None)
        if dist_obj:
            pid = dist_obj['province_id']
            
    if pid: p_matched += 1
    if did: d_matched += 1
    if sid: s_matched += 1
    
    if not (pid and did and sid) and (rp or rd or rs):
        unmatched.append((nid, rp, rd, rs, rz, pid, did, sid))

print(f"Total Rows: {len(rows)}")
print(f"Province matched:    {p_matched}/{len(rows)} ({p_matched/len(rows)*100:.2f}%)")
print(f"District matched:    {d_matched}/{len(rows)} ({d_matched/len(rows)*100:.2f}%)")
print(f"Subdistrict matched: {s_matched}/{len(rows)} ({s_matched/len(rows)*100:.2f}%)")
print(f"\nRemaining unmapped records (out of 4866): {len(unmatched)}")
for u in unmatched[:15]:
    print(" ", u)
