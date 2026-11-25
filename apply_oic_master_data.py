import pyodbc
import pymysql
import openpyxl
from decimal import Decimal

# Load Excel data
excel_path = 'C:/Users/ednak/.gemini/antigravity/brain/f23ac016-f51f-4c12-aeed-7e6c6820bb56/.user_uploaded/media_1795594412484_3aa16e5e.xlsx'
wb = openpyxl.load_workbook(excel_path)
ws = wb.active
rows = list(ws.iter_rows(values_only=True))[1:]

# Course dictionaries
# r[0] = รหัสวิชา, r[1] = ชื่อวิชา, r[2] = ระยะเวลา, r[3] = รหัส Pillar, r[4] = ครั้งที่ขอรับ/ขอต่อ
renew_4_courses = {}
basic_sub_courses = {}

for r in rows:
    code = r[0]
    if not code or not isinstance(code, str) or not code.strip():
        continue
    code = code.strip()
    name = str(r[1]).strip() if r[1] else ''
    hours = Decimal(str(r[2]).strip()) if r[2] else Decimal('0.00')
    pillar = str(r[3]).strip() if r[3] else ''
    col_e = str(r[4]).strip() if r[4] else ''
    
    if 'ครั้งที่ 4' in col_e:
        renew_4_courses[code] = {
            'code': code,
            'name': name,
            'hours': hours,
            'pillar': pillar
        }
    else:
        basic_sub_courses[code] = {
            'code': code,
            'name': name,
            'hours': hours,
            'pillar': pillar,
            'col_e': col_e
        }

print(f"Loaded from Excel: {len(renew_4_courses)} renew courses, {len(basic_sub_courses)} basic sub courses")

# 17 Subject mapping
MAP_17 = [
    (1, 'ตนว4164203701', 1),
    (2, 'ตนว4164203716', 1),
    (3, 'ตนว4164203710', 1),
    (4, 'ตนว4164203708', 1),
    (5, 'ตนว4164203709', 1),
    (6, 'ตนว4164203714', 1),
    (7, 'ตนว4364203704', 3),
    (8, 'ตนว4364203708', 3),
    (9, 'ตนว4364203711', 3),
    (10, 'ตนว4164203705', 1),
    (11, 'ตนว4364203705', 3),
    (12, 'ตนว4164203721', 1),
    (13, 'ตนว4364203706', 3),
    (14, 'ตนว4364203702', 3),
    (15, 'ตนว4264203702', 2),
    (16, 'ตนว4164203720', 1),
    (17, 'ตนว4164203718', 1),
]

def migrate_mssql():
    print("\n================== MSSQL MIGRATION ==================")
    conn = pyodbc.connect('DRIVER={ODBC Driver 18 for SQL Server};SERVER=localhost,14333;DATABASE=thaiairp_iptc;UID=sa;PWD=Pass@456981@XKTT;TrustServerCertificate=yes;')
    cursor = conn.cursor()
    
    # 1. Update mst_renew_course (17 subjects)
    print("--- 1. Updating mst_renew_course ---")
    for cid, code, pillar_id in MAP_17:
        info = renew_4_courses[code]
        name = info['name']
        cursor.execute("UPDATE mst_renew_course SET name = ?, default_pillar_id = ? WHERE id = ?", (name, pillar_id, cid))
        print(f"Updated mst_renew_course ID {cid:2d}: {name} (Pillar {pillar_id})")
        
    # 2. Update mst_course_sub_detail for basic courses (42 rows)
    print("\n--- 2. Updating mst_course_sub_detail for basic courses ---")
    basic_updated = 0
    for code, info in basic_sub_courses.items():
        cursor.execute("""
            UPDATE mst_course_sub_detail
            SET sub_course_name = ?, hours = ?
            WHERE oic_course_code = ?
        """, (info['name'], info['hours'], code))
        if cursor.rowcount > 0:
            basic_updated += cursor.rowcount
            print(f"Updated basic sub detail {code}: {info['hours']} hrs - {info['name'][:40]}...")
    print(f"Total basic sub details updated: {basic_updated}")
    
    # 3. Update mst_course_sub_detail for renew courses (curriculum_id 6..39)
    print("\n--- 3. Updating mst_course_sub_detail for renew courses ---")
    renew_updated = 0
    for cid, code, pillar_id in MAP_17:
        info = renew_4_courses[code]
        cursor.execute("""
            UPDATE mst_course_sub_detail
            SET sub_course_name = ?, hours = ?
            WHERE oic_course_code = ?
        """, (info['name'], info['hours'], code))
        if cursor.rowcount > 0:
            renew_updated += cursor.rowcount
            print(f"Updated renew sub detail {code}: {info['hours']} hrs - {info['name'][:40]}...")
    print(f"Total renew sub details updated: {renew_updated}")

    # 4. Synchronize trn_training_result strings
    print("\n--- 4. Updating trn_training_result historical strings ---")
    # Replace old traffic law name with exact OIC traffic law name
    old_traffic = 'พระราชบัญญัติจราจรทางบก พ.ศ.2522 (แก้ไขเพิ่มเติม 2562)และการพิจารณาคดีแพ่ง/คดีอาญา จากเหตุที่เกิดจากอุบัติเหตุจราจร'
    new_traffic = renew_4_courses['ตนว4364203708']['name']
    
    cursor.execute("""
        UPDATE trn_training_result
        SET subject_names = REPLACE(subject_names, ?, ?)
        WHERE subject_names LIKE ?
    """, (old_traffic, new_traffic, f'%{old_traffic}%'))
    print(f"trn_training_result traffic law updated: {cursor.rowcount} rows")
    
    # 5. Synchronize register table (renew_other and past_training_5y)
    print("\n--- 5. Updating register table strings ---")
    replacements = [
        ('การวางแผนภาษีสำหรับตัวแทนและนายหน้าประกันภัย', renew_4_courses['ตนว4164203709']['name']),
        ('ความเสี่ยงต่อความรับผิดในฐานะตัวแทน/นายหน้าประกันภัย', renew_4_courses['ตนว4364203702']['name']),
        (old_traffic, new_traffic)
    ]
    for old_s, new_s in replacements:
        for col in ['renew_other', 'past_training_5y']:
            cursor.execute(f"""
                UPDATE register
                SET [{col}] = REPLACE([{col}], ?, ?)
                WHERE [{col}] LIKE ?
            """, (old_s, new_s, f'%{old_s}%'))
            print(f"register.{col} replaced '{old_s[:25]}...' -> {cursor.rowcount} rows")
            
    conn.commit()
    conn.close()
    print("MSSQL MIGRATION COMPLETED SUCCESSFULLY!")

def migrate_mysql():
    print("\n================== MYSQL MIGRATION ==================")
    conn = pymysql.connect(host='localhost', user='thaiairp_iptc', password='Pass@456981@XKTT', database='thaiairp_iptc', charset='utf8mb4')
    cursor = conn.cursor()
    
    # 1. Update mst_renew_course (17 subjects)
    print("--- 1. Updating MySQL mst_renew_course ---")
    for cid, code, pillar_id in MAP_17:
        info = renew_4_courses[code]
        name = info['name']
        cursor.execute("UPDATE mst_renew_course SET name = %s WHERE id = %s", (name, cid))
        print(f"Updated MySQL mst_renew_course ID {cid:2d}: {name}")
        
    # 2. Update masterdatacourse in MySQL
    print("\n--- 2. Updating MySQL masterdatacourse ---")
    old_traffic = 'พระราชบัญญัติจราจรทางบก พ.ศ.2522 (แก้ไขเพิ่มเติม 2562)และการพิจารณาคดีแพ่ง/คดีอาญา จากเหตุที่เกิดจากอุบัติเหตุจราจร'
    new_traffic = renew_4_courses['ตนว4364203708']['name']
    
    replacements_md = [
        ('การวางแผนภาษีสำหรับตัวแทนและนายหน้าประกันภัย', renew_4_courses['ตนว4164203709']['name'], 1),
        ('ความเสี่ยงต่อความรับผิดในฐานะตัวแทน/นายหน้าประกันภัย', renew_4_courses['ตนว4364203702']['name'], 3),
        (old_traffic, new_traffic, 3)
    ]
    for old_s, new_s, p_no in replacements_md:
        cursor.execute("""
            UPDATE masterdatacourse
            SET course_name = %s, pillar_no = %s, pillar_name = %s
            WHERE course_name = %s
        """, (new_s, p_no, f"Pillar {p_no}", old_s))
        print(f"MySQL masterdatacourse updated '{old_s[:25]}...' -> {cursor.rowcount} rows")
        
    # 3. Update register in MySQL
    print("\n--- 3. Updating MySQL register table ---")
    replacements_reg = [
        ('การวางแผนภาษีสำหรับตัวแทนและนายหน้าประกันภัย', renew_4_courses['ตนว4164203709']['name']),
        ('ความเสี่ยงต่อความรับผิดในฐานะตัวแทน/นายหน้าประกันภัย', renew_4_courses['ตนว4364203702']['name']),
        (old_traffic, new_traffic)
    ]
    for old_s, new_s in replacements_reg:
        for col in ['renew_other', 'past_training_5y']:
            cursor.execute(f"""
                UPDATE register
                SET `{col}` = REPLACE(`{col}`, %s, %s)
                WHERE `{col}` LIKE %s
            """, (old_s, new_s, f'%{old_s}%'))
            print(f"MySQL register.{col} replaced '{old_s[:25]}...' -> {cursor.rowcount} rows")
            
    conn.commit()
    conn.close()
    print("MYSQL MIGRATION COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    migrate_mssql()
    migrate_mysql()
