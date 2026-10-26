import pyodbc
from lxml import etree
import re
import datetime

EXCEL_PATH = r"C:\Users\ednak\OneDrive\Desktop\datamangement\www\db\register_page_1.xls"
SQL_CONN_STR = 'DRIVER={ODBC Driver 18 for SQL Server};SERVER=127.0.0.1,14333;UID=sa;PWD=Pass@456981@XKTT;DATABASE=thaiairp_iptc;TrustServerCertificate=yes;'

conn = pyodbc.connect(SQL_CONN_STR)
cur = conn.cursor()

print("Reading Excel...")
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

print(f"Total Excel rows: {len(rows_data)}")

# Extract all course fields
course_cols = ['renew_other', 'course_type', 'renew_agent_1', 'renew_agent_2', 'renew_agent_3', 'renew_broker_1', 'renew_broker_2', 'renew_broker_3', 'past_training_5y', 'previous_courses']

all_renew_other_items = set()
for r in rows_data:
    ro = r.get('renew_other', '')
    if ro:
        items = [x.strip() for x in ro.split(';') if x.strip()]
        for it in items:
            all_renew_other_items.add(it)

print(f"\nUnique renew_other course combinations found in Excel: {len(all_renew_other_items)}")
for it in sorted(all_renew_other_items):
    print(" ", it)

# Parse [Pillar X] [Date] : Subject Name
parsed_items = []
for it in sorted(all_renew_other_items):
    m = re.match(r'\[(Pillar\s*\d+)\]\s*\[(.*?)\]\s*:\s*(.*)', it)
    if m:
        pillar_str = m.group(1).strip()
        date_str = m.group(2).strip()
        subject_str = m.group(3).strip()
        parsed_items.append((pillar_str, date_str, subject_str, it))
    else:
        print("  Could not regex parse:", it)

print(f"\nParsed {len(parsed_items)} structured course items:")
for p, d, s, full in parsed_items[:5]:
    print(f"  Pillar: {p} | Date: {d} | Subject: {s}")

# Check current master data in database
cur.execute("SELECT id, name FROM mst_renew_pillars")
db_pillars = {r[1].strip(): r[0] for r in cur.fetchall()}
print(f"\nDB Pillars: {db_pillars}")

cur.execute("SELECT id, course_date_display FROM mst_renew_dates")
db_dates = {r[1].strip(): r[0] for r in cur.fetchall()}
print(f"DB Dates ({len(db_dates)}):", list(db_dates.keys())[:5])

cur.execute("SELECT id, name, default_pillar_id FROM mst_renew_course")
db_subjects = {r[1].strip(): (r[0], r[2]) for r in cur.fetchall()}
print(f"DB Subjects ({len(db_subjects)}):", list(db_subjects.keys())[:5])

cur.execute("SELECT id, pillar_id, date_id, subject_id FROM mst_renew_other")
db_other_mappings = cur.fetchall()
print(f"DB mst_renew_other mappings: {len(db_other_mappings)}")
