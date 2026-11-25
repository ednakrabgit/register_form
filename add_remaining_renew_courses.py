import openpyxl
import pyodbc
import pymysql
import hashlib
from decimal import Decimal

# Load Excel data
excel_path = 'C:/Users/ednak/.gemini/antigravity/brain/f23ac016-f51f-4c12-aeed-7e6c6820bb56/.user_uploaded/media_1795594412484_3aa16e5e.xlsx'
wb = openpyxl.load_workbook(excel_path)
ws = wb.active
rows = list(ws.iter_rows(values_only=True))[1:]

# The 17 course codes already in DB:
from apply_oic_master_data import MAP_17
codes_17 = set([x[1] for x in MAP_17])

# Filter renew 4 courses excluding the 17 and excluding ตนว4364203714
renew_4_all = [r for r in rows if r[4] and 'ครั้งที่ 4' in str(r[4])]

courses_to_add = []
for r in renew_4_all:
    code = r[0].strip() if r[0] else ''
    name = r[1].strip() if r[1] else ''
    p_str = r[3].strip() if r[3] else ''
    p_no = int(p_str[1]) if len(p_str) >= 2 and p_str[1].isdigit() else 1
    
    if code in codes_17:
        continue
    if code == 'ตนว4364203714':
        print(f"Skipping excluded code: {code} - {name}")
        continue
    
    courses_to_add.append({
        'code': code,
        'name': name,
        'pillar_id': p_no,
        'hours': Decimal('3.00')
    })

print(f"Total courses to add: {len(courses_to_add)}")

def add_to_mssql():
    print("\n================== MSSQL ADD COURSES ==================")
    conn = pyodbc.connect('DRIVER={ODBC Driver 18 for SQL Server};SERVER=localhost,14333;DATABASE=thaiairp_iptc;UID=sa;PWD=Pass@456981@XKTT;TrustServerCertificate=yes;')
    cursor = conn.cursor()
    
    # Check current max id in mst_renew_course
    cursor.execute("SELECT MAX(id) FROM mst_renew_course")
    start_id = cursor.fetchone()[0] or 17
    print(f"Current max ID in mst_renew_course: {start_id}")
    
    cursor.execute("SET IDENTITY_INSERT mst_renew_course ON")
    
    added_courses = []
    current_id = start_id
    for item in courses_to_add:
        # Check if already exists by name or code
        cursor.execute("SELECT id FROM mst_renew_course WHERE name = ?", (item['name'],))
        existing = cursor.fetchone()
        if existing:
            cid = existing[0]
            print(f"Course already in mst_renew_course: ID {cid} - {item['name'][:30]}")
        else:
            current_id += 1
            cid = current_id
            cursor.execute("""
                INSERT INTO mst_renew_course (id, name, default_pillar_id, status, display_order, is_active_backend, is_active_frontend)
                VALUES (?, ?, ?, 'active', ?, 1, 1)
            """, (cid, item['name'], item['pillar_id'], cid))
            print(f"Inserted mst_renew_course ID {cid:2d} (Pillar {item['pillar_id']}): {item['code']} - {item['name'][:40]}...")
        added_courses.append((cid, item))
        
    cursor.execute("SET IDENTITY_INSERT mst_renew_course OFF")
    conn.commit()
    
    # Insert curriculum and sub details
    print("\n--- Inserting into mst_course_curriculum and mst_course_sub_detail ---")
    for cid, item in added_courses:
        code = item['code']
        suffix = code[-2:]
        p_no = item['pillar_id']
        
        for agent_type in ['agent', 'broker']:
            prefix = 'A' if agent_type == 'agent' else 'B'
            training_code = f"{prefix}4P{p_no}_{suffix}"
            
            # Check if curriculum already exists
            cursor.execute("""
                SELECT id FROM mst_course_curriculum 
                WHERE course_type = 'renew' AND course_id = ? AND agent_type = ?
            """, (cid, agent_type))
            curr = cursor.fetchone()
            if curr:
                curr_id = curr[0]
            else:
                cursor.execute("""
                    INSERT INTO mst_course_curriculum (
                        course_type, course_id, agent_type, training_course_code, announcement_code,
                        curriculum_code, course_short_name, display_order, status, is_active_backend, is_active_frontend
                    )
                    OUTPUT INSERTED.id
                    VALUES (
                        'renew', ?, ?, ?, 'NLGA-2564',
                        'ตนว4642037', 'ตนว4', ?, 'active', 1, 1
                    )
                """, (cid, agent_type, training_code, cid))
                curr_id = cursor.fetchone()[0]
                print(f"Inserted curriculum ID {curr_id:2d} for course {cid} ({agent_type})")
                
            # Check if sub detail exists
            cursor.execute("SELECT id FROM mst_course_sub_detail WHERE curriculum_id = ?", (curr_id,))
            sd = cursor.fetchone()
            if not sd:
                cursor.execute("""
                    INSERT INTO mst_course_sub_detail (
                        curriculum_id, oic_course_code, sub_course_name, hours,
                        display_order, status, is_active_backend, is_active_frontend
                    )
                    VALUES (?, ?, ?, ?, 1, 'active', 1, 1)
                """, (curr_id, code, item['name'], item['hours']))
                print(f"  Inserted sub detail for curriculum {curr_id}: {code} - {item['name'][:30]}...")
            else:
                cursor.execute("""
                    UPDATE mst_course_sub_detail
                    SET oic_course_code = ?, sub_course_name = ?, hours = ?
                    WHERE id = ?
                """, (code, item['name'], item['hours'], sd[0]))
                
    conn.commit()
    conn.close()
    print("MSSQL INSERTION COMPLETE!")

def add_to_mysql():
    print("\n================== MYSQL ADD COURSES ==================")
    conn = pymysql.connect(host='localhost', user='thaiairp_iptc', password='Pass@456981@XKTT', database='thaiairp_iptc', charset='utf8mb4')
    cursor = conn.cursor()
    
    # Check max id in mst_renew_course
    cursor.execute("SELECT MAX(id) FROM mst_renew_course")
    start_id = cursor.fetchone()[0] or 17
    print(f"Current max ID in MySQL mst_renew_course: {start_id}")
    
    current_id = start_id
    for item in courses_to_add:
        cursor.execute("SELECT id FROM mst_renew_course WHERE name = %s", (item['name'],))
        existing = cursor.fetchone()
        if existing:
            cid = existing[0]
            print(f"Course already in MySQL mst_renew_course: ID {cid} - {item['name'][:30]}")
        else:
            current_id += 1
            cid = current_id
            cursor.execute("""
                INSERT INTO mst_renew_course (id, name, status, display_order)
                VALUES (%s, %s, 'active', %s)
            """, (cid, item['name'], cid))
            print(f"Inserted MySQL mst_renew_course ID {cid:2d}: {item['code']} - {item['name'][:40]}...")
            
    # Synchronize/Insert masterdatacourse
    print("\n--- Synchronizing MySQL masterdatacourse ---")
    for item in courses_to_add:
        name = item['name']
        p_no = item['pillar_id']
        p_name = f"Pillar {p_no}"
        ckey = hashlib.sha256(name.encode('utf-8')).hexdigest()
        
        cursor.execute("SELECT id FROM masterdatacourse WHERE course_name = %s OR course_key = %s", (name, ckey))
        md = cursor.fetchone()
        if md:
            cursor.execute("""
                UPDATE masterdatacourse 
                SET course_name = %s, pillar_no = %s, pillar_name = %s, is_active = 1
                WHERE id = %s
            """, (name, p_no, p_name, md[0]))
            print(f"Updated masterdatacourse ID {md[0]}: {name[:35]}...")
        else:
            cursor.execute("""
                INSERT INTO masterdatacourse (course_key, course_name, pillar_no, pillar_name, is_active, source_note)
                VALUES (%s, %s, %s, %s, 1, 'OIC master 2026-11')
            """, (ckey, name, p_no, p_name))
            print(f"Inserted masterdatacourse: {name[:35]}...")
            
    conn.commit()
    conn.close()
    print("MYSQL INSERTION COMPLETE!")

if __name__ == '__main__':
    add_to_mssql()
    add_to_mysql()
