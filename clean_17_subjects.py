import pyodbc
import sqlite3
import re

CANONICAL_SUBJECTS = [
    {"order": 1, "pillar_id": 1, "name": "การกำกับดูแลบริษัทประกันภัยตามระดับความเสี่ยง"},
    {"order": 2, "pillar_id": 1, "name": "การจัดการสินไหมทดแทน Non-Motor"},
    {"order": 3, "pillar_id": 1, "name": "การประกันความเสี่ยงภัยทรัพย์สิน"},
    {"order": 4, "pillar_id": 1, "name": "การวางแผนเพื่อวัยเกษียณ"},
    {"order": 5, "pillar_id": 1, "name": "การวางแผนภาษีสำหรับตัวแทนและนายหน้าประกันภัย"},
    {"order": 6, "pillar_id": 1, "name": "การประกันภัยต่อ"},
    {"order": 7, "pillar_id": 3, "name": "จรรยาบรรณและศีลธรรมของตัวแทน/นายหน้าประกันภัย"},
    {"order": 8, "pillar_id": 3, "name": "พ.ร.บ. จราจรทางบก พ.ศ.2522 (แก้ไขเพิ่มเติม2562) และการพิจารณาคดีแพ่ง/อาญาเมื่อเกิดอุบัติเหตุจราจร"},
    {"order": 9, "pillar_id": 3, "name": "พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล"},
    {"order": 10, "pillar_id": 1, "name": "เสนอขายถูกหลักประกันภัยเติบโต"},
    {"order": 11, "pillar_id": 3, "name": "กฏหมายว่าด้วยการป้องกันและปราบปรามการฟอกเงินและต่อต้านการสนับสนุนทางการเงินแก่การก่อการร้าย"},
    {"order": 12, "pillar_id": 1, "name": "กรมธรรม์ประกันภัยรถยนต์ไฟฟ้ารวมการคุ้มครองผู้ประสบภัยจากรถ"},
    {"order": 13, "pillar_id": 3, "name": "พ.ร.บ.การทวงถามหนี้"},
    {"order": 14, "pillar_id": 3, "name": "ความเสี่ยงต่อความรับผิดในฐานะตัวแทน/นายหน้าประกันภัย"},
    {"order": 15, "pillar_id": 2, "name": "การตลาดยุคใหม่"},
    {"order": 16, "pillar_id": 1, "name": "รู้จักประกันภัยสุขภาพ"},
    {"order": 17, "pillar_id": 1, "name": "การพิจารณารับประกันภัยรถยนต์"}
]

def normalize_text(t):
    if not t: return ""
    return re.sub(r'[\s\.\(\)\/,-]+', '', t).lower()

def match_canonical(name):
    norm = normalize_text(name)
    for idx, s in enumerate(CANONICAL_SUBJECTS, 1):
        if normalize_text(s["name"]) in norm or norm in normalize_text(s["name"]):
            return idx
    # Specific keywords
    if "จราจร" in norm: return 8
    if "ฟอกเงิน" in norm: return 11
    if "สินไหม" in norm: return 2
    if "ความเสี่ยงต่อความรับผิด" in norm: return 14
    if "คุ้มครองข้อมูล" in norm: return 9
    return None

def update_sqlite():
    conn = sqlite3.connect('dotnet/backend/app.db')
    cursor = conn.cursor()
    
    # Get current courses
    cursor.execute("SELECT id, name FROM mst_renew_course")
    old_courses = cursor.fetchall()
    id_map = {}
    for cid, cname in old_courses:
        matched = match_canonical(cname)
        if matched:
            id_map[cid] = matched
        else:
            id_map[cid] = 1 # fallback
    
    print("Old ID to New Canonical ID mapping:", id_map)
    
    # Update personcourse / any other tables referencing subject_id / course_id if any
    # mst_renew_other: subject_id
    cursor.execute("SELECT id, pillar_id, date_id, subject_id FROM mst_renew_other")
    others = cursor.fetchall()
    cursor.execute("DELETE FROM mst_renew_other")
    
    seen_others = set()
    new_other_rows = []
    for oid, pid, did, sid in others:
        new_sid = id_map.get(sid, 1)
        # also verify default pillar
        canon_pillar = CANONICAL_SUBJECTS[new_sid - 1]["pillar_id"]
        key = (canon_pillar, did, new_sid)
        if key not in seen_others:
            seen_others.add(key)
            new_other_rows.append((canon_pillar, did, new_sid, 'active', 1, 1, len(new_other_rows)+1))
            
    cursor.executemany("""
        INSERT INTO mst_renew_other (pillar_id, date_id, subject_id, status, is_active_backend, is_active_frontend, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, new_other_rows)
    
    # Recreate mst_renew_course with exactly 17 records
    cursor.execute("DELETE FROM mst_renew_course")
    
    for s in CANONICAL_SUBJECTS:
        cursor.execute("""
            INSERT INTO mst_renew_course (id, default_pillar_id, name, status, is_active_backend, is_active_frontend, display_order)
            VALUES (?, ?, ?, 'active', 1, 1, ?)
        """, (s["order"], s["pillar_id"], s["name"], s["order"]))
        
    conn.commit()
    print(f"SQLite updated: {len(CANONICAL_SUBJECTS)} subjects, {len(new_other_rows)} renew_other rows.")
    conn.close()

def update_mssql():
    conn_str = "DRIVER={ODBC Driver 18 for SQL Server};SERVER=127.0.0.1,14333;DATABASE=thaiairp_iptc;UID=sa;PWD=YourStrong!Passw0rd;TrustServerCertificate=yes;"
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, name FROM mst_renew_course")
        old_courses = cursor.fetchall()
        id_map = {}
        for cid, cname in old_courses:
            matched = match_canonical(cname)
            if matched:
                id_map[cid] = matched
            else:
                id_map[cid] = 1
                
        cursor.execute("SELECT id, pillar_id, date_id, subject_id FROM mst_renew_other")
        others = cursor.fetchall()
        cursor.execute("DELETE FROM mst_renew_other")
        
        seen_others = set()
        new_other_rows = []
        for oid, pid, did, sid in others:
            new_sid = id_map.get(sid, 1)
            canon_pillar = CANONICAL_SUBJECTS[new_sid - 1]["pillar_id"]
            key = (canon_pillar, did, new_sid)
            if key not in seen_others:
                seen_others.add(key)
                new_other_rows.append((canon_pillar, did, new_sid, 'active', 1, 1, len(new_other_rows)+1))
                
        for row in new_other_rows:
            cursor.execute("""
                INSERT INTO mst_renew_other (pillar_id, date_id, subject_id, status, is_active_backend, is_active_frontend, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, row)
            
        cursor.execute("DELETE FROM mst_renew_course")
        cursor.execute("SET IDENTITY_INSERT mst_renew_course ON")
        for s in CANONICAL_SUBJECTS:
            cursor.execute("""
                INSERT INTO mst_renew_course (id, default_pillar_id, name, status, is_active_backend, is_active_frontend, display_order)
                VALUES (?, ?, ?, 'active', 1, 1, ?)
            """, (s["order"], s["pillar_id"], s["name"], s["order"]))
        cursor.execute("SET IDENTITY_INSERT mst_renew_course OFF")
        
        conn.commit()
        print(f"MSSQL updated: {len(CANONICAL_SUBJECTS)} subjects, {len(new_other_rows)} renew_other rows.")
        conn.close()
    except Exception as e:
        print("MSSQL update exception:", e)

if __name__ == "__main__":
    update_sqlite()
    update_mssql()
