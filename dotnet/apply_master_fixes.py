import sqlite3
import os

courses = [
    (1, 'การกำกับดูแลบริษัทประกันภัยตามระดับความเสี่ยง'),
    (2, 'การจัดการสินไหมทดแทน Non-Motor'),
    (3, 'การประกันความเสี่ยงภัยทรัพย์สิน'),
    (4, 'การวางแผนเพื่อวัยเกษียณ'),
    (5, 'การวางแผนภาษีสำหรับตัวแทนและนายหน้าประกันภัย'),
    (6, 'การประกันภัยต่อ'),
    (7, 'จรรยาบรรณและศีลธรรมของตัวแทน/นายหน้าประกันภัย'),
    (8, 'พ.ร.บ. จราจรทางบก พ.ศ.2522 (แก้ไขเพิ่มเติม2562) และการพิจารณาคดีแพ่ง/อาญาเมื่อเกิดอุบัติเหตุจราจร'),
    (9, 'พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล'),
    (10, 'เสนอขายถูกหลักประกันภัยเติบโต'),
    (11, 'กฎหมายว่าด้วยการป้องกันและปราบปรามการฟอกเงินและต่อต้านการสนับสนุนทางการเงินแก่การก่อการร้าย'),
    (12, 'กรมธรรม์ประกันภัยรถยนต์ไฟฟ้ารวมการคุ้มครองผู้ประสบภัยจากรถ'),
    (13, 'พ.ร.บ.การทวงถามหนี้'),
    (14, 'ความเสี่ยงต่อความรับผิดในฐานะตัวแทน/นายหน้าประกันภัย'),
    (15, 'การตลาดยุคใหม่'),
    (16, 'รู้จักประกันภัยสุขภาพ'),
    (17, 'การพิจารณารับประกันภัยรถยนต์')
]

sqlite_dbs = [
    r'c:\Users\ednak\OneDrive\Desktop\datamangement\www\register_form\dotnet\backend\app.db',
    r'c:\Users\ednak\OneDrive\Desktop\datamangement\www\register_form\dotnet\backend\out_linux\app.db'
]

for p in sqlite_dbs:
    if not os.path.exists(p):
        continue
    conn = sqlite3.connect(p)
    cur = conn.cursor()
    # 1. Update mst_renew_course
    for cid, name in courses:
        cur.execute("UPDATE mst_renew_course SET name = ? WHERE id = ?", (name, cid))
    
    # 2. Update mst_agent_branches
    cur.execute("UPDATE mst_agent_branches SET name = 'กิจกรรมพิเศษ1' WHERE id = 35")
    cur.execute("UPDATE mst_agent_branches SET name = 'กิจกรรมพิเศษ2' WHERE id = 36")

    # 3. Update mst_course_curriculum
    cur.execute("UPDATE mst_course_curriculum SET course_short_name = TRIM(course_short_name) WHERE course_short_name LIKE '%\t%'")

    # 4. Update mst_course_sub_detail
    cur.execute("UPDATE mst_course_sub_detail SET sub_course_name = REPLACE(sub_course_name, 'นาที่', 'นาที') WHERE sub_course_name LIKE '%นาที่%'")
    cur.execute("UPDATE mst_course_sub_detail SET sub_course_name = REPLACE(sub_course_name, 'ชั่วโมง)', 'ชั่วโมง') WHERE id = 72")

    # 5. Update mst_renew_basic
    cur.execute("UPDATE mst_renew_basic SET course_name = 'ขอรับใบอนุญาตเป็นตัวแทนประกันวินาศภัย' WHERE id = 1")

    conn.commit()
    conn.close()
    print('Updated master fixes in SQLite:', p)

print('Done SQLite updates.')
