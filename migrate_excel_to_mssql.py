import pyodbc
from lxml import etree
import re
import datetime
import sys

EXCEL_PATH = r"C:\Users\ednak\OneDrive\Desktop\datamangement\www\db\register_page_1.xls"
SQL_CONN_STR = (
    'DRIVER={ODBC Driver 18 for SQL Server};'
    'SERVER=127.0.0.1,14333;'
    'UID=sa;'
    'PWD=Pass@456981@XKTT;'
    'DATABASE=thaiairp_iptc;'
    'TrustServerCertificate=yes;'
)

thai_months = {
    'มกราคม': 1, 'กุมภาพันธ์': 2, 'มีนาคม': 3, 'เมษายน': 4,
    'พฤษภาคม': 5, 'มิถุนายน': 6, 'กรกฎาคม': 7, 'สิงหาคม': 8,
    'กันยายน': 9, 'ตุลาคม': 10, 'พฤศจิกายน': 11, 'ธันวาคม': 12
}

def parse_thai_date(s):
    if not s: return None
    s = s.strip()
    match = re.match(r'(\d+)\s+([^\s\d]+)\s+(\d{4})', s)
    if match:
        day = int(match.group(1))
        month_name = match.group(2)
        year = int(match.group(3))
        if year > 2400:
            year -= 543
        month = thai_months.get(month_name, 1)
        try:
            return datetime.datetime(year, month, day)
        except:
            return None
    return None

def parse_datetime(val):
    if not val: return None
    val = val.strip()
    if val in ('0000-00-00', '0000-00-00 00:00:00', 'NULL', 'null', ''):
        return None
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y %H:%M:%S', '%d/%m/%Y'):
        try:
            return datetime.datetime.strptime(val, fmt)
        except:
            pass
    td = parse_thai_date(val)
    if td:
        return td
    return None

def clean_str(val):
    if val is None: return None
    s = str(val).strip()
    return None if s == '' or s.upper() == 'NULL' else s

def clean_loc(s):
    if not s: return ''
    s = s.strip()
    s = re.sub(r'^(จังหวัด|จ\.|เขต|อำเภอ|อ\.|แขวง|ตำบล|ต\.)\s*', '', s)
    return s.strip()

print("1. Connecting to SQL Server...", flush=True)
conn = pyodbc.connect(SQL_CONN_STR, autocommit=False)
cursor = conn.cursor()

print("2. Reading and parsing Excel file...", flush=True)
with open(EXCEL_PATH, 'rb') as f:
    content = f.read()

tree = etree.fromstring(content, etree.HTMLParser(encoding='utf-8'))
tr_nodes = tree.xpath('//tr')
headers = [th.text.strip() if th.text else '' for th in tr_nodes[0].xpath('.//th | .//td')]

rows_data = []
for tr in tr_nodes[1:]:
    cells = [td.text.strip() if td.text else '' for td in tr.xpath('.//td')]
    d = dict(zip(headers, cells))
    rows_data.append(d)

print(f"   Parsed {len(rows_data)} rows from Excel.", flush=True)

# 3. Synchronize missing dates in mst_renew_dates
print("3. Checking and synchronizing mst_renew_dates...", flush=True)
cursor.execute("SELECT id, course_date_display FROM mst_renew_dates")
existing_dates = {r[1].strip(): r[0] for r in cursor.fetchall() if r[1]}

date_fields = ['renew_agent_1', 'renew_agent_2', 'renew_agent_3', 'renew_broker_1', 'renew_broker_2', 'renew_broker_3']
for r in rows_data:
    for df in date_fields:
        raw_d = r.get(df, '').strip()
        if raw_d and raw_d not in existing_dates and not raw_d.startswith('ยกเลิก'):
            dt = parse_thai_date(raw_d)
            if dt:
                cursor.execute("SELECT ISNULL(MAX(id), 0) + 1, ISNULL(MAX(display_order), 0) + 1 FROM mst_renew_dates")
                nid, nord = cursor.fetchone()
                cursor.execute("""
                    SET IDENTITY_INSERT [mst_renew_dates] ON;
                    INSERT INTO [mst_renew_dates] (id, course_date_display, course_date, status, display_order, is_active_backend, is_active_frontend)
                    VALUES (?, ?, ?, 'active', ?, 1, 1);
                    SET IDENTITY_INSERT [mst_renew_dates] OFF;
                """, nid, raw_d, dt, nord)
                conn.commit()
                existing_dates[raw_d] = nid
                print(f"   Added new date to mst_renew_dates: ID {nid} -> {raw_d}")

# 4. Load Master Data Caches
print("4. Preloading master lookup dictionaries...", flush=True)
def get_map(sql):
    cursor.execute(sql)
    return {r[1].strip(): r[0] for r in cursor.fetchall() if r[1]}

titles_map = get_map("SELECT id, name FROM mst_titles")
gender_map = {'ชาย': 1, 'หญิง': 2, 'ไม่ต้องการระบุ': 3, '1': 1, '2': 2, '3': 3}
religion_map = {'พุทธ': 1, 'คริสต์': 2, 'อิสลาม': 3, 'ฮินดู': 4, 'ซิกข์': 5, 'อื่นๆ': 6, 'ไม่ระบุ': 6, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6}
blood_map = {'A': 1, 'B': 2, 'AB': 3, 'O': 4, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5}

provinces_map = get_map("SELECT id, province_thai FROM mst_provinces")
cursor.execute("SELECT id, district_thai, province_id FROM mst_districts")
districts_map = {(r[1].strip(), r[2]): r[0] for r in cursor.fetchall() if r[1]}
districts_by_name = get_map("SELECT id, district_thai FROM mst_districts")

cursor.execute("SELECT id, sub_district_thai, district_id FROM mst_sub_districts")
subdistricts_map = {(r[1].strip(), r[2]): r[0] for r in cursor.fetchall() if r[1]}

regions_map = get_map("SELECT id, name FROM mst_agent_regions")
branches_map = get_map("SELECT id, name FROM mst_agent_branches")

cursor.execute("SELECT id, course_date_display FROM mst_renew_dates")
renew_dates_map = {r[1].strip(): r[0] for r in cursor.fetchall() if r[1]}

territories_map = get_map("SELECT id, name FROM mst_territories")

cursor.execute("SELECT id, name FROM mst_companies")
comp_raw_list = cursor.fetchall()
def clean_comp(s):
    s = re.sub(r'^(บริษัท|บ\.|บมจ\.|หจก\.)\s*', '', s)
    s = re.sub(r'\s*(จำกัด|มหาชน|\(มหาชน\)|\(ประเทศไทย\))\s*', '', s)
    return s.strip().replace(' ', '')
clean_comps = [(cid, clean_comp(cname)) for cid, cname in comp_raw_list]

cursor.execute("SELECT id, name FROM mst_expertises")
exp_raw_list = cursor.fetchall()
clean_exps = [(eid, ename.replace('ประกันภัย', 'ประกัน').replace(' ', '')) for eid, ename in exp_raw_list]

cursor.execute("SELECT id, name FROM mst_renew_course")
renew_course_subjects = {r[1].strip().replace(' ', ''): r[0] for r in cursor.fetchall()}

# 5. Disable SQL Server Constraints & Clear Tables
print("5. Disabling constraints and clearing tables...", flush=True)
cursor.execute("EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT all'")
conn.commit()

target_tables_to_clear = [
    'personothersalesarea', 'personothercompanies', 'personotherspecialty', 'personother',
    'persontraining5y', 'personcourse', 'personaffiliation', 'personlicense',
    'personaddress', 'registrationhistory', 'personregistration', 'person', 'register'
]

for t in target_tables_to_clear:
    try:
        cursor.execute(f"DELETE FROM [{t}]")
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"   Warning clearing {t}: {e}")

# 6. Migrate [register] table (all 4,866 rows)
print("6. Migrating [register] table (Full raw dataset)...", flush=True)
cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'register'")
db_cols_info = {r[0].lower(): (r[0], r[1].lower()) for r in cursor.fetchall()}

excel_matched_cols = []
for h in headers:
    if h.lower() in db_cols_info:
        excel_matched_cols.append((h, db_cols_info[h.lower()][0], db_cols_info[h.lower()][1]))

sql_col_names = [c[1] for c in excel_matched_cols]
sql_data_types = [c[2] for c in excel_matched_cols]
placeholders = ",".join(["?"] * len(sql_col_names))
cols_clause = ",".join([f"[{c}]" for c in sql_col_names])
insert_register_sql = f"INSERT INTO [register] ({cols_clause}) VALUES ({placeholders})"

cursor.execute("SET IDENTITY_INSERT [register] ON")
conn.commit()

reg_batch = []
for r in rows_data:
    val_tuple = []
    for idx, (ex_h, col_name, dtype) in enumerate(excel_matched_cols):
        raw_val = r.get(ex_h, '')
        cleaned = clean_str(raw_val)
        if 'datetime' in dtype or 'date' in dtype:
            val = parse_datetime(cleaned)
        elif 'int' in dtype or 'bigint' in dtype:
            try:
                val = int(cleaned) if cleaned is not None else None
            except:
                val = None
        elif 'decimal' in dtype or 'numeric' in dtype or 'float' in dtype:
            try:
                val = float(cleaned) if cleaned is not None else None
            except:
                val = None
        elif dtype == 'bit':
            val = 1 if cleaned in ('1', 'true', 'True', 'Y', 'y', 'รับทราบ') else 0
        else:
            val = cleaned
        val_tuple.append(val)
    reg_batch.append(tuple(val_tuple))
    if len(reg_batch) >= 250:
        cursor.executemany(insert_register_sql, reg_batch)
        conn.commit()
        reg_batch = []

if reg_batch:
    cursor.executemany(insert_register_sql, reg_batch)
    conn.commit()

cursor.execute("SET IDENTITY_INSERT [register] OFF")
conn.commit()
print("   [register] table populated successfully.", flush=True)

# 7. Group records by NationId for Relational Modeling
print("7. Processing relational data: Persons, Addresses, Licenses, Affiliations, Courses...", flush=True)

# Sort rows by registration ID ascending so later registrations overwrite person demographic data
sorted_rows = sorted(rows_data, key=lambda x: int(x['id']) if x.get('id') and x['id'].isdigit() else 0)

persons_dict = {}
person_registrations = []
person_addresses = []
person_licenses = []
person_affiliations = []
person_courses = []
person_trainings5y = []
person_others = []
person_sales_areas = []
person_companies = []
person_specialties = []

other_id_counter = 1

for r in sorted_rows:
    reg_id = int(r['id']) if r.get('id') and r['id'].isdigit() else None
    raw_nid = r.get('national_id', '').strip()
    nid = re.sub(r'[^0-9]', '', raw_nid)
    if not nid or len(nid) < 13:
        continue
    nid = nid[:13]
    
    # 7.1 Person Core Record
    t_th = r.get('title_th', '').strip()
    title_val = r.get('title_custom', '').strip() if t_th in ('อื่นๆ', '4') else t_th
    
    b_date = parse_datetime(r.get('birth_date'))
    exp_date = parse_datetime(r.get('id_card_expiry'))
    g_val = r.get('gender', '').strip()
    gender_id = gender_map.get(g_val) or (int(g_val) if g_val.isdigit() and int(g_val) in (1,2,3) else None)
    rel_val = r.get('religion', '').strip()
    religion_id = religion_map.get(rel_val) or (int(rel_val) if rel_val.isdigit() and int(rel_val) in range(1,7) else 6)
    bld_val = r.get('blood_group', '').strip().upper()
    blood_id = blood_map.get(bld_val) or (int(bld_val) if bld_val.isdigit() and int(bld_val) in range(1,6) else None)
    
    persons_dict[nid] = (
        nid,
        exp_date,
        title_val or None,
        clean_str(r.get('first_name_th')),
        clean_str(r.get('middle_name_th')),
        clean_str(r.get('last_name_th')),
        clean_str(r.get('title_old_th') or r.get('title_prev')),
        clean_str(r.get('first_name_old_th')),
        clean_str(r.get('middle_name_old_th')),
        clean_str(r.get('last_name_old_th')),
        b_date,
        religion_id,
        gender_id,
        blood_id,
        clean_str(r.get('phone_otp')),
        clean_str(r.get('email_alt')),
        clean_str(r.get('line_id')),
        clean_str(r.get('facebook')),
        clean_str(r.get('instagram')),
        clean_str(r.get('food_allergy')),
        clean_str(r.get('medical_condition')),
        clean_str(r.get('emergency_contact_name')),
        clean_str(r.get('emergency_contact_phone'))
    )
    
    # 7.2 PersonRegistration
    pdpa = 1 if r.get('pdpa_consent', '').strip() in ('รับทราบ', 'true', '1', 'yes') else 0
    s_time = parse_datetime(r.get('start_time'))
    c_time = parse_datetime(r.get('completion_time'))
    confirmed = 1 if c_time or r.get('confirmed') in ('1', 'true', 'confirmed') else 0
    deduction = clean_str(r.get('training_exemption') or r.get('deduction_privilege'))
    master_deg = clean_str(r.get('highest_education') or r.get('master_degree_status'))
    
    person_registrations.append((
        reg_id,
        nid,
        pdpa,
        s_time,
        c_time,
        confirmed,
        deduction,
        master_deg
    ))

# 7.3 Addresses, Affiliations, Licenses, Courses, and Others (using latest registration data per person)
latest_reg_per_person = {}
for r in sorted_rows:
    raw_nid = r.get('national_id', '').strip()
    nid = re.sub(r'[^0-9]', '', raw_nid)[:13]
    if nid and len(nid) == 13:
        latest_reg_per_person[nid] = r

for nid, r in latest_reg_per_person.items():
    # --- Addresses ---
    # House Address (A)
    p_name = clean_loc(r.get('addr_province', ''))
    pid = provinces_map.get(p_name) or provinces_map.get(r.get('addr_province', '').strip())
    did = None
    sid = None
    if pid:
        d_name = clean_loc(r.get('addr_district', ''))
        did = districts_map.get((d_name, pid)) or districts_map.get((r.get('addr_district', '').strip(), pid)) or districts_by_name.get(d_name)
        if did:
            s_name = clean_loc(r.get('addr_subdistrict', ''))
            sid = subdistricts_map.get((s_name, did)) or subdistricts_map.get((r.get('addr_subdistrict', '').strip(), did))
            
    person_addresses.append((
        nid,
        clean_str(r.get('addr_house_no')),
        clean_str(r.get('addr_moo')),
        clean_str(r.get('addr_village')),
        clean_str(r.get('addr_soi')),
        clean_str(r.get('addr_road')),
        pid,
        did,
        sid,
        clean_str(r.get('addr_postcode')),
        "ตามทะเบียนบ้าน",
        "A"
    ))
    
    # Contact Address (C)
    contact_type = r.get('contact_address', '').strip()
    if contact_type and contact_type not in ('ตรงกับที่อยู่ตามทะเบียนบ้าน', 'same'):
        cp_name = clean_loc(r.get('contact_province', ''))
        cpid = provinces_map.get(cp_name) or provinces_map.get(r.get('contact_province', '').strip())
        cdid = None
        csid = None
        if cpid:
            cd_name = clean_loc(r.get('contact_district', ''))
            cdid = districts_map.get((cd_name, cpid)) or districts_map.get((r.get('contact_district', '').strip(), cpid)) or districts_by_name.get(cd_name)
            if cdid:
                cs_name = clean_loc(r.get('contact_subdistrict', ''))
                csid = subdistricts_map.get((cs_name, cdid)) or subdistricts_map.get((r.get('contact_subdistrict', '').strip(), cdid))
        
        person_addresses.append((
            nid,
            clean_str(r.get('contact_house_no')),
            clean_str(r.get('contact_moo')),
            clean_str(r.get('contact_village')),
            clean_str(r.get('contact_soi')),
            clean_str(r.get('contact_road')),
            cpid,
            cdid,
            csid,
            clean_str(r.get('contact_postcode')),
            "ที่อยู่ปัจจุบัน",
            "C"
        ))
        
    # --- License ---
    lic_no = clean_str(r.get('license_no'))
    lic_issue = parse_datetime(r.get('license_issue_date'))
    lic_exp = parse_datetime(r.get('license_expiry_date'))
    ctype = clean_str(r.get('course_type') or r.get('license_type'))
    ctype_code = clean_str(r.get('course_type_code'))
    if lic_no or lic_issue or lic_exp or ctype:
        person_licenses.append((
            nid,
            lic_no,
            lic_issue,
            lic_exp,
            ctype,
            ctype_code
        ))
        
    # --- Affiliation ---
    reg_aff = r.get('region_affiliation', '').strip()
    region_id = None
    if 'ภาค 1' in reg_aff or 'เหนือ' in reg_aff: region_id = 1
    elif 'ภาค 2' in reg_aff or 'ตะวันออกเฉียงเหนือ' in reg_aff or 'อีสาน' in reg_aff: region_id = 2
    elif 'ภาค 3' in reg_aff or 'ตะวันออก' in reg_aff: region_id = 3
    elif 'ภาค 4' in reg_aff or 'กลางและภาคตะวันตก' in reg_aff or 'กลาง' in reg_aff: region_id = 4
    elif 'ภาค 5' in reg_aff or 'ใต้' in reg_aff: region_id = 5
    elif 'ภาค 6' in reg_aff or 'กรุงเทพ' in reg_aff: region_id = 6
    
    branch_name = (
        r.get('region_bangkok') or r.get('region_east') or r.get('region_north') or 
        r.get('region_northeast') or r.get('region_central_west') or r.get('region_south') or 
        r.get('broker_branch') or ''
    ).strip()
    branch_id = branches_map.get(branch_name) or branches_map.get(clean_loc(branch_name))
    
    b_comp = clean_str(r.get('broker_company'))
    b_branch = clean_str(r.get('broker_branch') or branch_name)
    v_code = clean_str(r.get('viriyah_agent_code'))
    b_type = clean_str(r.get('broker_level') or r.get('agent_level'))
    
    person_affiliations.append((
        nid,
        region_id,
        branch_id,
        b_comp,
        b_branch,
        v_code,
        b_type
    ))
    
    # --- Course Selection ---
    course_id = None
    course_type_str = (r.get('course_type') or '').strip()
    agent_lvl = (r.get('agent_level') or '').strip()
    broker_lvl = (r.get('broker_level') or '').strip()
    
    is_broker = 'นายหน้า' in course_type_str or bool(broker_lvl)
    level_str = broker_lvl if is_broker else agent_lvl
    
    if is_broker:
        if 'ขอรับ' in level_str: course_id = 5
        elif '1' in level_str: course_id = 6
        elif '2' in level_str: course_id = 7
        elif '3' in level_str: course_id = 8
        elif '4' in level_str: course_id = 10
    else:
        if 'ขอรับ' in level_str: course_id = 1
        elif '1' in level_str: course_id = 2
        elif '2' in level_str: course_id = 3
        elif '3' in level_str: course_id = 4
        elif '4' in level_str: course_id = 9
        
    # Find matching date
    date_id = None
    for df in date_fields:
        d_val = r.get(df, '').strip()
        if d_val and d_val in renew_dates_map:
            date_id = renew_dates_map[d_val]
            break
            
    if course_id:
        person_courses.append((
            nid,
            course_id,
            date_id,
            None
        ))
        
    # Process renew_other (Pillar subjects for Course 4)
    raw_renew_other = r.get('renew_other', '').strip()
    if raw_renew_other:
        for it in raw_renew_other.split(';'):
            it = it.strip()
            if not it: continue
            m = re.search(r':\s*(.+)$', it)
            if m:
                s_name_clean = m.group(1).strip().replace(' ', '')
                if s_name_clean in renew_course_subjects:
                    sub_id = renew_course_subjects[s_name_clean]
                    person_courses.append((
                        nid,
                        10 if is_broker else 9,
                        None,
                        sub_id
                    ))
        
    # --- Past Training 5Y ---
    past_tr = clean_str(r.get('past_training_5y'))
    if past_tr:
        if past_tr.isdigit():
            person_trainings5y.append((nid, int(past_tr)))
            
    # --- Other Info ---
    exp_years_str = r.get('insurance_experience_years', '').strip()
    try:
        exp_years = int(float(exp_years_str)) if exp_years_str else None
    except:
        exp_years = None
        
    person_others.append((
        other_id_counter,
        nid,
        clean_str(r.get('extra_training_interest')),
        clean_str(r.get('main_business')),
        clean_str(r.get('broker_branch')),
        exp_years
    ))
    
    # Sales Area
    sales_area_str = r.get('sales_area', '').strip()
    if sales_area_str:
        seen_t = set()
        for t_name in sales_area_str.replace(',', ';').split(';'):
            t_name = t_name.strip()
            if t_name in territories_map and territories_map[t_name] not in seen_t:
                seen_t.add(territories_map[t_name])
                person_sales_areas.append((other_id_counter, nid, territories_map[t_name]))
                
    # Other Companies (Normalized Match)
    comp_str = r.get('other_insurance_companies', '').strip()
    if comp_str:
        seen_c = set()
        for c_name in comp_str.replace(',', ';').split(';'):
            c_name = c_name.strip()
            if not c_name: continue
            t_c = clean_comp(c_name)
            matched_cid = None
            for cid, c_c in clean_comps:
                if t_c in c_c or c_c in t_c:
                    matched_cid = cid
                    break
            if matched_cid and matched_cid not in seen_c:
                seen_c.add(matched_cid)
                person_companies.append((other_id_counter, nid, matched_cid))
                
    # Specialty (Normalized Match)
    spec_str = r.get('insurance_specialty', '').strip()
    if spec_str:
        seen_s = set()
        for s_name in spec_str.replace(',', ';').split(';'):
            s_name = s_name.strip()
            if not s_name: continue
            t_clean = s_name.replace('ประกันภัย', 'ประกัน').replace(' ', '')
            matched_eid = None
            for eid, e_clean in clean_exps:
                if t_clean in e_clean or e_clean in t_clean:
                    matched_eid = eid
                    break
            if matched_eid and matched_eid not in seen_s:
                seen_s.add(matched_eid)
                person_specialties.append((other_id_counter, nid, matched_eid))
                
    other_id_counter += 1

# 8. Insert into [person]
print(f"8. Inserting {len(persons_dict)} records into [person]...", flush=True)
insert_person_sql = """
INSERT INTO [person] (
    NationId, IdCardExpiry, TitleTh, FirstNameTh, MiddleNameTh, LastNameTh,
    TitleOldTh, FirstNameOldTh, MiddleNameOldTh, LastNameOldTh, BirthDate,
    ReligionId, GenderId, BloodGroupId, PhoneOtp, EmailAlt, LineId,
    Facebook, Instagram, FoodAllergy, MedicalCondition, EmergencyContactName, EmergencyContactPhone
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""
p_list = list(persons_dict.values())
for i in range(0, len(p_list), 250):
    cursor.executemany(insert_person_sql, p_list[i:i+250])
    conn.commit()

# 9. Insert into [personregistration]
print(f"9. Inserting {len(person_registrations)} records into [personregistration]...", flush=True)
insert_reg_sql = """
INSERT INTO [personregistration] (
    Id, NationId, PdpaConsent, start_time, completion_time, confirmed, DeductionPrivilege, MasterDegreeStatus
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
"""
cursor.execute("SET IDENTITY_INSERT [personregistration] ON")
conn.commit()
for i in range(0, len(person_registrations), 250):
    cursor.executemany(insert_reg_sql, person_registrations[i:i+250])
    conn.commit()
cursor.execute("SET IDENTITY_INSERT [personregistration] OFF")
conn.commit()

# 10. Insert into [personaddress]
print(f"10. Inserting {len(person_addresses)} records into [personaddress]...", flush=True)
insert_addr_sql = """
INSERT INTO [personaddress] (
    NationId, HouseNo, Moo, Village, Soi, Road, ProvinceId, DistrictId, SubDistrictId, Postcode, AddressTypeText, AddressType
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""
for i in range(0, len(person_addresses), 250):
    cursor.executemany(insert_addr_sql, person_addresses[i:i+250])
    conn.commit()

# 11. Insert into [personlicense]
print(f"11. Inserting {len(person_licenses)} records into [personlicense]...", flush=True)
insert_lic_sql = """
INSERT INTO [personlicense] (
    NationId, LicenseNo, LicenseIssueDate, LicenseExpiryDate, CourseType, CourseTypeCode
) VALUES (?, ?, ?, ?, ?, ?)
"""
for i in range(0, len(person_licenses), 250):
    cursor.executemany(insert_lic_sql, person_licenses[i:i+250])
    conn.commit()

# 12. Insert into [personaffiliation]
print(f"12. Inserting {len(person_affiliations)} records into [personaffiliation]...", flush=True)
insert_aff_sql = """
INSERT INTO [personaffiliation] (
    NationId, RegionId, BranchId, BrokerCompany, BrokerBranch, ViriyahAgentCode, BrokerType
) VALUES (?, ?, ?, ?, ?, ?, ?)
"""
for i in range(0, len(person_affiliations), 250):
    cursor.executemany(insert_aff_sql, person_affiliations[i:i+250])
    conn.commit()

# 13. Insert into [personcourse]
print(f"13. Inserting {len(person_courses)} records into [personcourse]...", flush=True)
insert_crs_sql = """
INSERT INTO [personcourse] (
    NationId, CourseId, CourseDateId, RenewOtherId
) VALUES (?, ?, ?, ?)
"""
for i in range(0, len(person_courses), 250):
    cursor.executemany(insert_crs_sql, person_courses[i:i+250])
    conn.commit()

# 14. Insert into [persontraining5y]
if person_trainings5y:
    print(f"14. Inserting {len(person_trainings5y)} records into [persontraining5y]...", flush=True)
    insert_tr_sql = "INSERT INTO [persontraining5y] (NationId, CourseId) VALUES (?, ?)"
    cursor.executemany(insert_tr_sql, person_trainings5y)
    conn.commit()

# 15. Insert into [personother], [personothersalesarea], [personothercompanies], [personotherspecialty]
print(f"15. Inserting {len(person_others)} records into [personother] and related tags...", flush=True)
insert_oth_sql = """
INSERT INTO [personother] (
    id, NationId, ExtraTrainingInterest, OtherBusiness, BrokerBranch, InsuranceExperienceYears
) VALUES (?, ?, ?, ?, ?, ?)
"""
cursor.execute("SET IDENTITY_INSERT [personother] ON")
conn.commit()
for i in range(0, len(person_others), 250):
    cursor.executemany(insert_oth_sql, person_others[i:i+250])
    conn.commit()
cursor.execute("SET IDENTITY_INSERT [personother] OFF")
conn.commit()

if person_sales_areas:
    cursor.executemany("INSERT INTO [personothersalesarea] (OtherId, NationId, TerritoriesId) VALUES (?, ?, ?)", person_sales_areas)
    conn.commit()

if person_companies:
    cursor.executemany("INSERT INTO [personothercompanies] (OtherId, NationId, CompanyId) VALUES (?, ?, ?)", person_companies)
    conn.commit()

if person_specialties:
    cursor.executemany("INSERT INTO [personotherspecialty] (OtherId, NationId, ExpertiseId) VALUES (?, ?, ?)", person_specialties)
    conn.commit()

# 16. Re-enable Constraints & Check
print("16. Re-enabling foreign key constraints...", flush=True)
cursor.execute("EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all'")
conn.commit()

print("\n=======================================================", flush=True)
print("             MIGRATION COMPLETED SUCCESSFULLY!         ", flush=True)
print("=======================================================", flush=True)

check_tables = [
    'register', 'person', 'personregistration', 'personaddress',
    'personlicense', 'personaffiliation', 'personcourse',
    'persontraining5y', 'personother', 'personothersalesarea',
    'personothercompanies', 'personotherspecialty'
]

for t in check_tables:
    cursor.execute(f"SELECT COUNT(*) FROM [{t}]")
    cnt = cursor.fetchone()[0]
    print(f"   [{t}]: {cnt:,} rows", flush=True)

conn.close()
