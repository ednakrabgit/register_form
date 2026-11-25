import os
import shutil
import re
import datetime
import openpyxl
import pyodbc
import subprocess

SOURCE_EXCEL = r"C:\Users\ednak\Downloads\register_page_1.xlsx"
DEST_ARCHIVE = r"C:\Users\ednak\OneDrive\Desktop\datamangement\www\db\register_page_1_latest.xlsx"
MSSQL_CONN_STR = (
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
    s = str(s).strip()
    match = re.match(r'(\d+)\s+([^\s\d]+)\s+(\d{4})', s)
    if match:
        day = int(match.group(1))
        month_name = match.group(2)
        year = int(match.group(3))
        if year > 2400: year -= 543
        month = thai_months.get(month_name, 1)
        try:
            return datetime.datetime(year, month, day)
        except:
            return None
    return None

def parse_datetime(val):
    if val is None: return None
    if isinstance(val, datetime.datetime): return val
    if isinstance(val, datetime.date): return datetime.datetime(val.year, val.month, val.day)
    val = str(val).strip()
    if val in ('0000-00-00', '0000-00-00 00:00:00', 'NULL', 'null', ''): return None
    # Check Buddhist era date string e.g. 2569-12-15 00:00:00
    m_be = re.match(r'^(\d{4})-(\d{2})-(\d{2})', val)
    if m_be:
        y = int(m_be.group(1))
        if y > 2400:
            y -= 543
            val = f"{y:04d}-{m_be.group(2)}-{m_be.group(3)}" + val[10:]
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y %H:%M:%S', '%d/%m/%Y'):
        try:
            return datetime.datetime.strptime(val, fmt)
        except:
            pass
    td = parse_thai_date(val)
    if td: return td
    return None

def clean_str(val):
    if val is None: return None
    s = str(val).strip()
    return None if s == '' or s.upper() == 'NULL' else s

def clean_loc(s):
    if not s: return ''
    s = str(s).strip()
    s = re.sub(r'^(จังหวัด|จ\.|เขต|อำเภอ|อ\.|แขวง|ตำบล|ต\.)\s*', '', s)
    return s.strip()

print("=== Step 1: Archive and Load Excel File ===")
if os.path.exists(SOURCE_EXCEL):
    shutil.copy2(SOURCE_EXCEL, DEST_ARCHIVE)
    print(f"Copied {SOURCE_EXCEL} to {DEST_ARCHIVE}")

wb = openpyxl.load_workbook(DEST_ARCHIVE, data_only=True)
ws = wb[wb.sheetnames[0]]
iter_rows = ws.iter_rows(values_only=True)
header_row = next(iter_rows)
headers = [str(h).strip().lower() if h else f"col_{i}" for i, h in enumerate(header_row)]

rows_data = []
for r in iter_rows:
    if not r or r[0] is None: continue
    row_dict = {}
    for h, cell in zip(headers, r):
        row_dict[h] = cell
    rows_data.append(row_dict)

rows_data.sort(key=lambda x: int(x['id']) if str(x.get('id', '')).isdigit() else 0)
print(f"Loaded {len(rows_data)} rows from Excel (IDs: {rows_data[0].get('id')} to {rows_data[-1].get('id')})")

print("\n=== Step 2: Connect to MSSQL & Prepare Schema ===")
conn = pyodbc.connect(MSSQL_CONN_STR, autocommit=False)
cur = conn.cursor()

# Relax UNIQUE email constraints to standard non-unique indexes in MSSQL
cur.execute("""
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_register_email_alt' AND object_id = OBJECT_ID('register'))
    DROP INDEX UQ_register_email_alt ON [register];
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_register_email_alt' AND object_id = OBJECT_ID('register'))
    CREATE NONCLUSTERED INDEX IX_register_email_alt ON [register](email_alt);

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_person_EmailAlt' AND object_id = OBJECT_ID('person'))
    DROP INDEX UQ_person_EmailAlt ON [person];
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_person_EmailAlt' AND object_id = OBJECT_ID('person'))
    CREATE NONCLUSTERED INDEX IX_person_EmailAlt ON [person](EmailAlt);
""")
conn.commit()
print("Ensured non-unique indexes on email fields in MSSQL.")

# Load Master Lookups
def get_map(sql):
    cur.execute(sql)
    return {str(r[1]).strip(): r[0] for r in cur.fetchall() if r[1]}

titles_map = get_map("SELECT id, name FROM [mst_titles]")
provinces_map = get_map("SELECT id, province_thai FROM [mst_provinces]")

cur.execute("SELECT id, district_thai, province_id FROM [mst_districts]")
districts_map = {(str(r[1]).strip(), r[2]): r[0] for r in cur.fetchall() if r[1]}
districts_by_name = get_map("SELECT id, district_thai FROM [mst_districts]")

cur.execute("SELECT id, sub_district_thai, district_id FROM [mst_sub_districts]")
subdistricts_map = {(str(r[1]).strip(), r[2]): r[0] for r in cur.fetchall() if r[1]}

branches_map = get_map("SELECT id, name FROM [mst_agent_branches]")
renew_dates_map = get_map("SELECT id, course_date_display FROM [mst_renew_dates]")

# Map date strings e.g. '2026-12-15' or '2569-12-15' to date ids
cur.execute("SELECT id, course_date FROM [mst_renew_dates] WHERE course_date IS NOT NULL")
for rid, cdate in cur.fetchall():
    d_str = cdate.strftime('%Y-%m-%d')
    renew_dates_map[d_str] = rid
    # also add buddhist year string
    by_str = f"{cdate.year + 543}-{cdate.month:02d}-{cdate.day:02d} 00:00:00"
    renew_dates_map[by_str] = rid

renew_course_subjects = {str(r[1]).strip().replace(' ', ''): r[0] for r in cur.execute("SELECT id, name FROM [mst_renew_course]").fetchall()}
territories_map = get_map("SELECT id, name FROM [mst_territories]")

cur.execute("SELECT id, name FROM [mst_companies]")
clean_comps = [(cid, re.sub(r'^(บริษัท|บ\.|บมจ\.|หจก\.)\s*', '', str(cname)).replace('จำกัด','').replace('มหาชน','').replace(' ','')) for cid, cname in cur.fetchall()]

cur.execute("SELECT id, name FROM [mst_expertises]")
clean_exps = [(eid, str(ename).replace('ประกันภัย', 'ประกัน').replace(' ', '')) for eid, ename in cur.fetchall()]

# Check and insert any new renew dates (e.g. 15 ธันวาคม 2569)
date_fields = ['renew_agent_1', 'renew_agent_2', 'renew_agent_3', 'renew_broker_1', 'renew_broker_2', 'renew_broker_3']
for r in rows_data:
    for df in date_fields:
        raw_d = str(r.get(df) or '').strip()
        if raw_d and raw_d != 'None' and raw_d not in renew_dates_map and not raw_d.startswith('ยกเลิก') and not df.startswith(raw_d):
            dt = parse_datetime(raw_d)
            if dt:
                # Format Thai display
                th_display = f"{dt.day} {list(thai_months.keys())[dt.month-1]} {dt.year + 543}"
                cur.execute("SELECT COALESCE(MAX(display_order), 0) + 1 FROM [mst_renew_dates]")
                nord = cur.fetchone()[0]
                cur.execute("""
                    INSERT INTO [mst_renew_dates] (course_date_display, course_date, status, display_order, is_active_backend, is_active_frontend)
                    VALUES (?, ?, 'active', ?, 1, 1)
                """, (th_display, dt, nord))
                conn.commit()
                cur.execute("SELECT @@IDENTITY")
                new_date_id = int(cur.fetchone()[0])
                renew_dates_map[raw_d] = new_date_id
                renew_dates_map[th_display] = new_date_id
                renew_dates_map[dt.strftime('%Y-%m-%d')] = new_date_id
                print(f"Added new renew date to MSSQL: {th_display} (ID: {new_date_id})")

print("\n=== Step 3: Insert into MSSQL [register] ===")
cur.execute("SELECT id FROM [register]")
existing_reg_ids = set(r[0] for r in cur.fetchall())

cur.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'register'")
cols_info = {r[0].lower(): (r[0], r[1].lower()) for r in cur.fetchall()}

matched_cols = []
for h in headers:
    if h in cols_info:
        matched_cols.append((h, cols_info[h][0], cols_info[h][1]))

sql_col_names = [c[1] for c in matched_cols]
cols_clause = ",".join([f"[{c}]" for c in sql_col_names])
placeholders = ",".join(["?"] * len(sql_col_names))
insert_reg_sql = f"INSERT INTO [register] ({cols_clause}) VALUES ({placeholders})"

cur.execute("SET IDENTITY_INSERT [register] ON")
conn.commit()

reg_batch = []
inserted_reg = 0
for r in rows_data:
    rid = int(r['id']) if str(r.get('id', '')).isdigit() else None
    if not rid or rid in existing_reg_ids: continue

    val_tuple = []
    for ex_h, col_name, dtype in matched_cols:
        val = r.get(ex_h)
        cleaned = clean_str(val)
        if 'datetime' in dtype or 'date' in dtype:
            v = parse_datetime(cleaned)
        elif 'int' in dtype or 'bigint' in dtype:
            try: v = int(cleaned) if cleaned is not None else None
            except: v = None
        elif dtype == 'bit':
            v = 1 if cleaned in ('1', 'true', 'True', 'Y', 'y', 'รับทราบ') else 0
        else:
            v = cleaned
        val_tuple.append(v)
    reg_batch.append(tuple(val_tuple))
    existing_reg_ids.add(rid)
    inserted_reg += 1

if reg_batch:
    cur.executemany(insert_reg_sql, reg_batch)
    conn.commit()

cur.execute("SET IDENTITY_INSERT [register] OFF")
conn.commit()
print(f"Inserted {inserted_reg} new records into MSSQL [register].")

print("\n=== Step 4: Upsert MSSQL [person] & Relational Child Tables ===")
cur.execute("SELECT NationId FROM [person]")
existing_persons = set(r[0] for r in cur.fetchall())

cur.execute("SELECT Id FROM [personregistration]")
existing_person_regs = set(r[0] for r in cur.fetchall())

inserted_person = 0
updated_person = 0
inserted_reg_hist = 0

gender_map = {'ชาย': 1, 'หญิง': 2, 'ไม่ต้องการระบุ': 3, '1': 1, '2': 2, '3': 3}
religion_map = {'พุทธ': 1, 'คริสต์': 2, 'อิสลาม': 3, 'ฮินดู': 4, 'ซิกข์': 5, 'อื่นๆ': 6, 'ไม่ระบุ': 6}
blood_map = {'A': 1, 'B': 2, 'AB': 3, 'O': 4}

for r in rows_data:
    rid = int(r['id']) if str(r.get('id', '')).isdigit() else None
    raw_nid = str(r.get('national_id') or '').strip()
    nid = re.sub(r'[^0-9]', '', raw_nid)[:13]
    if not nid or len(nid) != 13: continue

    t_th = str(r.get('title_th') or '').strip()
    title_val = str(r.get('title_custom') or '').strip() if t_th in ('อื่นๆ', '4') else t_th
    b_date = parse_datetime(r.get('birth_date'))
    exp_date = parse_datetime(r.get('id_card_expiry'))
    g_val = str(r.get('gender') or '').strip()
    gender_id = gender_map.get(g_val) or (int(g_val) if g_val.isdigit() and int(g_val) in (1,2,3) else None)
    rel_val = str(r.get('religion') or '').strip()
    religion_id = religion_map.get(rel_val) or (int(rel_val) if rel_val.isdigit() and int(rel_val) in range(1,7) else 6)
    bld_val = str(r.get('blood_group') or '').strip().upper()
    blood_id = blood_map.get(bld_val)

    if nid not in existing_persons:
        cur.execute("""
            INSERT INTO [person] (
                NationId, IdCardExpiry, TitleTh, FirstNameTh, MiddleNameTh, LastNameTh,
                TitleOldTh, FirstNameOldTh, MiddleNameOldTh, LastNameOldTh, BirthDate,
                ReligionId, GenderId, BloodGroupId, PhoneOtp, EmailAlt, LineId,
                Facebook, Instagram, FoodAllergy, MedicalCondition, EmergencyContactName, EmergencyContactPhone
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            nid, exp_date, title_val or None,
            clean_str(r.get('first_name_th')), clean_str(r.get('middle_name_th')), clean_str(r.get('last_name_th')),
            clean_str(r.get('title_old_th') or r.get('title_prev')), clean_str(r.get('first_name_old_th')), clean_str(r.get('middle_name_old_th')), clean_str(r.get('last_name_old_th')),
            b_date, religion_id, gender_id, blood_id,
            clean_str(r.get('phone_otp')), clean_str(r.get('email_alt')), clean_str(r.get('line_id')),
            clean_str(r.get('facebook')), clean_str(r.get('instagram')), clean_str(r.get('food_allergy')),
            clean_str(r.get('medical_condition')), clean_str(r.get('emergency_contact_name')), clean_str(r.get('emergency_contact_phone'))
        ))
        existing_persons.add(nid)
        inserted_person += 1
    else:
        cur.execute("""
            UPDATE [person] SET
                IdCardExpiry = COALESCE(?, IdCardExpiry),
                TitleTh = COALESCE(?, TitleTh),
                FirstNameTh = COALESCE(?, FirstNameTh),
                LastNameTh = COALESCE(?, LastNameTh),
                BirthDate = COALESCE(?, BirthDate),
                PhoneOtp = COALESCE(?, PhoneOtp),
                EmailAlt = COALESCE(?, EmailAlt),
                LineId = COALESCE(?, LineId),
                Facebook = COALESCE(?, Facebook),
                Instagram = COALESCE(?, Instagram),
                FoodAllergy = COALESCE(?, FoodAllergy),
                MedicalCondition = COALESCE(?, MedicalCondition),
                EmergencyContactName = COALESCE(?, EmergencyContactName),
                EmergencyContactPhone = COALESCE(?, EmergencyContactPhone)
            WHERE NationId = ?
        """, (
            exp_date, title_val or None, clean_str(r.get('first_name_th')), clean_str(r.get('last_name_th')),
            b_date, clean_str(r.get('phone_otp')), clean_str(r.get('email_alt')), clean_str(r.get('line_id')),
            clean_str(r.get('facebook')), clean_str(r.get('instagram')), clean_str(r.get('food_allergy')),
            clean_str(r.get('medical_condition')), clean_str(r.get('emergency_contact_name')), clean_str(r.get('emergency_contact_phone')),
            nid
        ))
        updated_person += 1

    # PersonRegistration
    if rid and rid not in existing_person_regs:
        pdpa = 1 if str(r.get('pdpa_consent') or '').strip() in ('รับทราบ', 'true', '1', 'yes') else 0
        s_time = parse_datetime(r.get('start_time'))
        c_time = parse_datetime(r.get('completion_time'))
        confirmed = 1 if c_time or str(r.get('confirmed') or '') in ('1', 'true', 'confirmed') else 0
        deduction = clean_str(r.get('training_exemption') or r.get('deduction_privilege'))
        master_deg = clean_str(r.get('highest_education') or r.get('master_degree_status'))

        cur.execute("SET IDENTITY_INSERT [personregistration] ON")
        cur.execute("""
            INSERT INTO [personregistration] (Id, NationId, PdpaConsent, start_time, completion_time, confirmed, DeductionPrivilege, MasterDegreeStatus)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (rid, nid, pdpa, s_time, c_time, confirmed, deduction, master_deg))
        cur.execute("SET IDENTITY_INSERT [personregistration] OFF")
        existing_person_regs.add(rid)
        inserted_reg_hist += 1

    # Address House (A)
    p_name = clean_loc(r.get('addr_province'))
    pid = provinces_map.get(p_name) or provinces_map.get(str(r.get('addr_province') or '').strip())
    did = None
    sid = None
    if pid:
        d_name = clean_loc(r.get('addr_district'))
        did = districts_map.get((d_name, pid)) or districts_by_name.get(d_name)
        if did:
            s_name = clean_loc(r.get('addr_subdistrict'))
            sid = subdistricts_map.get((s_name, did))

    cur.execute("DELETE FROM [personaddress] WHERE NationId = ? AND AddressType = 'A'", (nid,))
    cur.execute("""
        INSERT INTO [personaddress] (NationId, HouseNo, Moo, Village, Soi, Road, ProvinceId, DistrictId, SubDistrictId, Postcode, AddressTypeText, AddressType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, N'ตามทะเบียนบ้าน', 'A')
    """, (
        nid, clean_str(r.get('addr_house_no')), clean_str(r.get('addr_moo')), clean_str(r.get('addr_village')),
        clean_str(r.get('addr_soi')), clean_str(r.get('addr_road')), pid, did, sid, clean_str(r.get('addr_postcode'))
    ))

    # Address Contact (C)
    contact_type = str(r.get('contact_address') or '').strip()
    if contact_type and contact_type not in ('ตรงกับที่อยู่ตามทะเบียนบ้าน', 'same'):
        cp_name = clean_loc(r.get('contact_province'))
        cpid = provinces_map.get(cp_name) or provinces_map.get(str(r.get('contact_province') or '').strip())
        cdid = None
        csid = None
        if cpid:
            cd_name = clean_loc(r.get('contact_district'))
            cdid = districts_map.get((cd_name, cpid)) or districts_by_name.get(cd_name)
            if cdid:
                cs_name = clean_loc(r.get('contact_subdistrict'))
                csid = subdistricts_map.get((cs_name, cdid))

        cur.execute("DELETE FROM [personaddress] WHERE NationId = ? AND AddressType = 'C'", (nid,))
        cur.execute("""
            INSERT INTO [personaddress] (NationId, HouseNo, Moo, Village, Soi, Road, ProvinceId, DistrictId, SubDistrictId, Postcode, AddressTypeText, AddressType)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, N'ที่อยู่ปัจจุบัน', 'C')
        """, (
            nid, clean_str(r.get('contact_house_no')), clean_str(r.get('contact_moo')), clean_str(r.get('contact_village')),
            clean_str(r.get('contact_soi')), clean_str(r.get('contact_road')), cpid, cdid, csid, clean_str(r.get('contact_postcode'))
        ))

    # License
    lic_no = clean_str(r.get('license_no'))
    lic_issue = parse_datetime(r.get('license_issue_date'))
    lic_exp = parse_datetime(r.get('license_expiry_date'))
    ctype = clean_str(r.get('course_type') or r.get('license_type'))
    ctype_code = clean_str(r.get('course_type_code'))
    if lic_no or lic_issue or lic_exp or ctype:
        cur.execute("DELETE FROM [personlicense] WHERE NationId = ?", (nid,))
        cur.execute("""
            INSERT INTO [personlicense] (NationId, LicenseNo, LicenseIssueDate, LicenseExpiryDate, CourseType, CourseTypeCode)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (nid, lic_no, lic_issue, lic_exp, ctype, ctype_code))

    # Affiliation
    reg_aff = str(r.get('region_affiliation') or '').strip()
    region_id = None
    if 'ภาค 1' in reg_aff or 'เหนือ' in reg_aff: region_id = 1
    elif 'ภาค 2' in reg_aff or 'อีสาน' in reg_aff or 'ตะวันออกเฉียงเหนือ' in reg_aff: region_id = 2
    elif 'ภาค 3' in reg_aff or 'ตะวันออก' in reg_aff: region_id = 3
    elif 'ภาค 4' in reg_aff or 'กลาง' in reg_aff: region_id = 4
    elif 'ภาค 5' in reg_aff or 'ใต้' in reg_aff: region_id = 5
    elif 'ภาค 6' in reg_aff or 'กรุงเทพ' in reg_aff: region_id = 6

    branch_name = (
        str(r.get('region_bangkok') or r.get('region_east') or r.get('region_north') or 
        r.get('region_northeast') or r.get('region_central_west') or r.get('region_south') or 
        r.get('broker_branch') or '')
    ).strip()
    branch_id = branches_map.get(branch_name) or branches_map.get(clean_loc(branch_name))

    cur.execute("DELETE FROM [personaffiliation] WHERE NationId = ?", (nid,))
    cur.execute("""
        INSERT INTO [personaffiliation] (NationId, RegionId, BranchId, BrokerCompany, BrokerBranch, ViriyahAgentCode, BrokerType)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        nid, region_id, branch_id, clean_str(r.get('broker_company')),
        clean_str(r.get('broker_branch') or branch_name), clean_str(r.get('viriyah_agent_code')),
        clean_str(r.get('broker_level') or r.get('agent_level'))
    ))

    # Courses
    course_type_str = str(r.get('course_type') or '').strip()
    agent_lvl = str(r.get('agent_level') or '').strip()
    broker_lvl = str(r.get('broker_level') or '').strip()
    is_broker = 'นายหน้า' in course_type_str or bool(broker_lvl)
    level_str = broker_lvl if is_broker else agent_lvl

    course_id = None
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

    date_id = None
    for df in date_fields:
        d_val = str(r.get(df) or '').strip()
        if d_val and d_val in renew_dates_map:
            date_id = renew_dates_map[d_val]
            break

    if course_id:
        cur.execute("SELECT COUNT(*) FROM [personcourse] WHERE NationId = ? AND CourseId = ?", (nid, course_id))
        if cur.fetchone()[0] == 0:
            cur.execute("INSERT INTO [personcourse] (NationId, CourseId, CourseDateId, RenewOtherId) VALUES (?, ?, ?, NULL)", (nid, course_id, date_id))

    raw_renew_other = str(r.get('renew_other') or '').strip()
    if raw_renew_other:
        for it in raw_renew_other.split(';'):
            it = it.strip()
            if not it: continue
            m = re.search(r':\s*(.+)$', it)
            if m:
                s_clean = m.group(1).strip().replace(' ', '')
                if s_clean in renew_course_subjects:
                    sub_id = renew_course_subjects[s_clean]
                    cid_renew4 = 10 if is_broker else 9
                    cur.execute("SELECT COUNT(*) FROM [personcourse] WHERE NationId = ? AND CourseId = ? AND RenewOtherId = ?", (nid, cid_renew4, sub_id))
                    if cur.fetchone()[0] == 0:
                        cur.execute("INSERT INTO [personcourse] (NationId, CourseId, CourseDateId, RenewOtherId) VALUES (?, ?, NULL, ?)", (nid, cid_renew4, sub_id))

    # Past Training 5y
    past_tr = clean_str(r.get('past_training_5y'))
    if past_tr and past_tr.isdigit():
        pid_5y = int(past_tr)
        cur.execute("SELECT COUNT(*) FROM [persontraining5y] WHERE NationId = ? AND CourseId = ?", (nid, pid_5y))
        if cur.fetchone()[0] == 0:
            cur.execute("INSERT INTO [persontraining5y] (NationId, CourseId) VALUES (?, ?)", (nid, pid_5y))

    # PersonOther
    exp_years_str = str(r.get('insurance_experience_years') or '').strip()
    try: exp_years = int(float(exp_years_str)) if exp_years_str else None
    except: exp_years = None

    cur.execute("SELECT id FROM [personother] WHERE NationId = ?", (nid,))
    row_o = cur.fetchone()
    if not row_o:
        cur.execute("""
            INSERT INTO [personother] (NationId, ExtraTrainingInterest, OtherBusiness, BrokerBranch, InsuranceExperienceYears)
            VALUES (?, ?, ?, ?, ?)
        """, (nid, clean_str(r.get('extra_training_interest')), clean_str(r.get('main_business')), clean_str(r.get('broker_branch')), exp_years))
        cur.execute("SELECT id FROM [personother] WHERE NationId = ?", (nid,))
        other_id = cur.fetchone()[0]
    else:
        other_id = row_o[0]

    # Sales Areas
    sales_str = str(r.get('sales_area') or '').strip()
    if sales_str:
        for t_name in sales_str.replace(',', ';').split(';'):
            t_name = t_name.strip()
            if t_name in territories_map:
                tid = territories_map[t_name]
                cur.execute("SELECT COUNT(*) FROM [personothersalesarea] WHERE OtherId = ? AND TerritoriesId = ?", (other_id, tid))
                if cur.fetchone()[0] == 0:
                    cur.execute("INSERT INTO [personothersalesarea] (OtherId, NationId, TerritoriesId) VALUES (?, ?, ?)", (other_id, nid, tid))

    # Companies
    comp_str = str(r.get('other_insurance_companies') or '').strip()
    if comp_str:
        for c_name in comp_str.replace(',', ';').split(';'):
            c_name = c_name.strip()
            if not c_name: continue
            tc = re.sub(r'^(บริษัท|บ\.|บมจ\.|หจก\.)\s*', '', c_name).replace('จำกัด','').replace('มหาชน','').replace(' ','')
            matched_cid = None
            for cid, cc in clean_comps:
                if tc in cc or cc in tc:
                    matched_cid = cid
                    break
            if matched_cid:
                cur.execute("SELECT COUNT(*) FROM [personothercompanies] WHERE OtherId = ? AND CompanyId = ?", (other_id, matched_cid))
                if cur.fetchone()[0] == 0:
                    cur.execute("INSERT INTO [personothercompanies] (OtherId, NationId, CompanyId) VALUES (?, ?, ?)", (other_id, nid, matched_cid))

    # Specialties
    spec_str = str(r.get('insurance_specialty') or '').strip()
    if spec_str:
        for s_name in spec_str.replace(',', ';').split(';'):
            s_name = s_name.strip()
            if not s_name: continue
            ts = s_name.replace('ประกันภัย', 'ประกัน').replace(' ', '')
            matched_eid = None
            for eid, ec in clean_exps:
                if ts in ec or ec in ts:
                    matched_eid = eid
                    break
            if matched_eid:
                cur.execute("SELECT COUNT(*) FROM [personotherspecialty] WHERE OtherId = ? AND ExpertiseId = ?", (other_id, matched_eid))
                if cur.fetchone()[0] == 0:
                    cur.execute("INSERT INTO [personotherspecialty] (OtherId, NationId, ExpertiseId) VALUES (?, ?, ?)", (other_id, nid, matched_eid))

conn.commit()
print(f"Persons inserted: {inserted_person}, updated: {updated_person}")
print(f"Person registrations inserted: {inserted_reg_hist}")

cur.execute("SELECT COUNT(*) FROM [register]")
tot_reg = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM [person]")
tot_p = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM [trn_training_result]")
tot_trn = cur.fetchone()[0]
print(f"[MSSQL Verified] Total register: {tot_reg}, Total person: {tot_p}, Total training results: {tot_trn}")
conn.close()

print("\n=== Step 5: Export MSSQL to SQLite (app.db) ===")
res = subprocess.run(["python", "export_mssql_to_sqlite.py"], capture_output=True, text=True, encoding='utf-8')
print(res.stdout)
if res.stderr:
    print("Stderr:", res.stderr)

print("\n=== All Local Imports & Exports Completed Successfully! ===")
