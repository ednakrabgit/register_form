import pyodbc
from lxml import etree
import re
import datetime

EXCEL_PATH = r"C:\Users\ednak\OneDrive\Desktop\datamangement\www\db\register_page_1.xls"
SQL_CONN_STR = 'DRIVER={ODBC Driver 18 for SQL Server};SERVER=127.0.0.1,14333;UID=sa;PWD=Pass@456981@XKTT;DATABASE=thaiairp_iptc;TrustServerCertificate=yes;'

thai_months = {
    'มกราคม': 1, 'กุมภาพันธ์': 2, 'มีนาคม': 3, 'เมษายน': 4,
    'พฤษภาคม': 5, 'มิถุนายน': 6, 'กรกฎาคม': 7, 'สิงหาคม': 8,
    'กันยายน': 9, 'ตุลาคม': 10, 'พฤศจิกายน': 11, 'ธันวาคม': 12
}

def parse_thai_date(s):
    if not s: return None
    s = s.strip()
    match = re.search(r'(\d+)\s+([^\s\d]+)\s+(\d{4})', s)
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

conn = pyodbc.connect(SQL_CONN_STR, autocommit=False)
cur = conn.cursor()

print("1. Reading Excel...")
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

print(f"Total rows in Excel: {len(rows_data)}")

# 2. Extract and Normalize Pillars
print("\n2. Synchronizing mst_renew_pillars...")
pillars_map = {'Pillar 1': 1, 'Pillar 2': 2, 'Pillar 3': 3, 'Pillar 4': 4}
for p_name, p_id in pillars_map.items():
    cur.execute("SELECT id FROM mst_renew_pillars WHERE id = ?", p_id)
    if not cur.fetchone():
        cur.execute("""
            SET IDENTITY_INSERT [mst_renew_pillars] ON;
            INSERT INTO [mst_renew_pillars] (id, name, status, display_order, is_active_backend, is_active_frontend)
            VALUES (?, ?, 'active', ?, 1, 1);
            SET IDENTITY_INSERT [mst_renew_pillars] OFF;
        """, p_id, p_name, p_id)
conn.commit()

# 3. Synchronize mst_renew_dates
print("\n3. Synchronizing mst_renew_dates...")
cur.execute("SELECT id, course_date_display FROM mst_renew_dates")
dates_map = {r[1].strip(): r[0] for r in cur.fetchall() if r[1]}

# Scan all date fields from excel
all_raw_dates = set()
for r in rows_data:
    for df in ['renew_agent_1', 'renew_agent_2', 'renew_agent_3', 'renew_broker_1', 'renew_broker_2', 'renew_broker_3']:
        val = r.get(df, '').strip()
        if val and not val.startswith('ยกเลิก') and len(val) > 4:
            all_raw_dates.add(val)
    ro = r.get('renew_other', '')
    if ro:
        for it in ro.split(';'):
            m = re.search(r'\[(Pillar\s*\d+)\]\s*\[(.*?)\]', it)
            if m:
                d_str = m.group(2).strip()
                if d_str and not d_str.startswith('ยกเลิก') and len(d_str) > 4:
                    all_raw_dates.add(d_str)

for rd in sorted(all_raw_dates):
    if rd not in dates_map:
        dt = parse_thai_date(rd)
        if dt:
            cur.execute("SELECT ISNULL(MAX(id), 0) + 1, ISNULL(MAX(display_order), 0) + 1 FROM mst_renew_dates")
            nid, nord = cur.fetchone()
            cur.execute("""
                SET IDENTITY_INSERT [mst_renew_dates] ON;
                INSERT INTO [mst_renew_dates] (id, course_date_display, course_date, status, display_order, is_active_backend, is_active_frontend)
                VALUES (?, ?, ?, 'active', ?, 1, 1);
                SET IDENTITY_INSERT [mst_renew_dates] OFF;
            """, nid, rd, dt, nord)
            conn.commit()
            dates_map[rd] = nid
            print(f"   [+] Added date to mst_renew_dates: {nid} -> {rd}")

# 4. Synchronize mst_renew_course (Subjects) and default pillar
print("\n4. Synchronizing mst_renew_course (Subjects)...")
cur.execute("SELECT id, name, default_pillar_id FROM mst_renew_course")
subjects_map = {r[1].strip(): {'id': r[0], 'pillar_id': r[2]} for r in cur.fetchall()}

# Scan all subject items
subject_pillar_counts = {}
all_other_combinations = set()

for r in rows_data:
    ro = r.get('renew_other', '')
    if ro:
        for it in ro.split(';'):
            it = it.strip()
            if not it: continue
            m = re.match(r'\[(Pillar\s*(\d+))\]\s*\[(.*?)\]\s*:\s*(.*)', it)
            if m:
                p_name = f"Pillar {m.group(2).strip()}"
                p_id = int(m.group(2).strip())
                d_str = m.group(3).strip()
                s_str = m.group(4).strip()
                
                if s_str:
                    clean_s = re.sub(r'^(หัวข้อการบรรยาย\s*:\s*|หัวข้อ\s*:\s*)', '', s_str).strip()
                    if clean_s not in subject_pillar_counts:
                        subject_pillar_counts[clean_s] = {}
                    subject_pillar_counts[clean_s][p_id] = subject_pillar_counts[clean_s].get(p_id, 0) + 1
                    all_other_combinations.add((p_id, d_str, clean_s))

for s_name, p_counts in subject_pillar_counts.items():
    # dominant pillar
    best_pillar = max(p_counts.items(), key=lambda x: x[1])[0]
    
    # Check if exists in db
    cur.execute("SELECT id, default_pillar_id FROM mst_renew_course WHERE name = ?", s_name)
    row = cur.fetchone()
    if row:
        sid, cur_p = row
        if cur_p != best_pillar:
            cur.execute("UPDATE mst_renew_course SET default_pillar_id = ? WHERE id = ?", best_pillar, sid)
            print(f"   [*] Updated mst_renew_course: ID {sid} '{s_name}' -> Default Pillar {best_pillar}")
        subjects_map[s_name] = {'id': sid, 'pillar_id': best_pillar}
    else:
        cur.execute("SELECT ISNULL(MAX(id), 0) + 1, ISNULL(MAX(display_order), 0) + 1 FROM mst_renew_course")
        nid, nord = cur.fetchone()
        cur.execute("""
            SET IDENTITY_INSERT [mst_renew_course] ON;
            INSERT INTO [mst_renew_course] (id, name, status, display_order, default_pillar_id, is_active_backend, is_active_frontend)
            VALUES (?, ?, 'active', ?, ?, 1, 1);
            SET IDENTITY_INSERT [mst_renew_course] OFF;
        """, nid, s_name, nord, best_pillar)
        conn.commit()
        subjects_map[s_name] = {'id': nid, 'pillar_id': best_pillar}
        print(f"   [+] Added subject to mst_renew_course: ID {nid} '{s_name}' (Pillar {best_pillar})")

conn.commit()

# 5. Synchronize mst_renew_other combinations
print(f"\n5. Synchronizing mst_renew_other ({len(all_other_combinations)} combinations)...")
cur.execute("SELECT id, pillar_id, date_id, subject_id FROM mst_renew_other")
existing_others = {(r[1], r[2], r[3]): r[0] for r in cur.fetchall()}

added_others = 0
for pid, dstr, sname in all_other_combinations:
    did = dates_map.get(dstr)
    sinfo = subjects_map.get(sname)
    sid = sinfo['id'] if sinfo else None
    
    if did and sid:
        if (pid, did, sid) not in existing_others:
            cur.execute("SELECT ISNULL(MAX(id), 0) + 1, ISNULL(MAX(display_order), 0) + 1 FROM mst_renew_other")
            nid, nord = cur.fetchone()
            cur.execute("""
                SET IDENTITY_INSERT [mst_renew_other] ON;
                INSERT INTO [mst_renew_other] (id, pillar_id, date_id, subject_id, status, display_order, is_active_backend, is_active_frontend)
                VALUES (?, ?, ?, ?, 'active', ?, 1, 1);
                SET IDENTITY_INSERT [mst_renew_other] OFF;
            """, nid, pid, did, sid, nord)
            existing_others[(pid, did, sid)] = nid
            added_others += 1

conn.commit()
print(f"   Total mst_renew_other combinations now: {len(existing_others)} (Added {added_others})")

# 6. Reconcile personcourse relationships
print("\n6. Reconciling personcourse relationships for all trainees...")
cur.execute("SELECT COUNT(*) FROM personcourse")
print(f"   Current personcourse rows: {cur.fetchone()[0]}")

cur.close()
conn.close()
print("\nMaster Data Import and Relations Complete!")
