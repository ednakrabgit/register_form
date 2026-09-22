import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import json
import os

# Load schema dump
with open('db_schema_dump.json', 'r', encoding='utf-8') as f:
    schema_data = json.load(f)

doc = docx.Document()

# Page setup (A4 with 1 inch margins)
sections = doc.sections
for section in sections:
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)

# Color constants
PRIMARY = RGBColor(30, 64, 175)     # Deep Blue
SECONDARY = RGBColor(79, 70, 229)   # Indigo
DARK = RGBColor(15, 23, 42)         # Slate 900
GRAY = RGBColor(100, 116, 139)      # Slate 500
LIGHT_BG = "F1F5F9"
HEADER_BG = "1E3A8A"
ALT_ROW_BG = "F8FAFC"

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(tcMar)

def add_styled_heading(text, level, color=PRIMARY):
    h = doc.add_heading(level=level)
    run = h.add_run(text)
    run.font.name = 'Prompt'
    run.font.color.rgb = color
    run.font.bold = True
    if level == 1:
        run.font.size = Pt(18)
        h.paragraph_format.space_before = Pt(16)
        h.paragraph_format.space_after = Pt(6)
    elif level == 2:
        run.font.size = Pt(14)
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(4)
    elif level == 3:
        run.font.size = Pt(12)
        h.paragraph_format.space_before = Pt(8)
        h.paragraph_format.space_after = Pt(2)
    return h

def add_paragraph(text, bold=False, italic=False, color=DARK, size=10, space_after=4):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    run.font.name = 'Prompt'
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.size = Pt(size)
    return p

# ----------------------------------------------------
# 1. Document Title & Header
# ----------------------------------------------------
title_p = doc.add_paragraph()
title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
title_p.paragraph_format.space_before = Pt(10)
title_p.paragraph_format.space_after = Pt(4)

badge_run = title_p.add_run("เอกสารโครงสร้างฐานข้อมูลระดับองค์กร (ENTERPRISE DATA ARCHITECTURE)\n")
badge_run.font.name = 'Prompt'
badge_run.font.size = Pt(9)
badge_run.font.bold = True
badge_run.font.color.rgb = SECONDARY

title_run = title_p.add_run("คู่มือและแผนผังโครงสร้างฐานข้อมูล (Database Schema & Relationship Diagram)\n")
title_run.font.name = 'Prompt'
title_run.font.size = Pt(20)
title_run.font.bold = True
title_run.font.color.rgb = PRIMARY

sub_run = title_p.add_run("ระบบลงทะเบียนและจัดการฝึกอบรมตัวแทน/นายหน้าประกันภัย (thaiairp_iptc)\nบมจ.วิริยะประกันภัย")
sub_run.font.name = 'Prompt'
sub_run.font.size = Pt(12)
sub_run.font.color.rgb = GRAY

doc.add_paragraph().paragraph_format.space_after = Pt(8)

# ----------------------------------------------------
# 2. Executive Summary & Stat Cards Table
# ----------------------------------------------------
add_styled_heading("1. บทสรุปสถาปัตยกรรมฐานข้อมูล (Executive Summary)", level=1)

p_desc = add_paragraph(
    "ฐานข้อมูล thaiairp_iptc ได้รับการออกแบบตามมาตรฐานสากล Normalized Relational Database (3NF) "
    "เพื่อรองรับการบันทึกข้อมูลผู้สมัครลงทะเบียนต่ออายุใบอนุญาตตัวแทนและนายหน้าประกันวินาศภัย, "
    "การเชื่อมโยงระบบยืนยันตัวตนกับสำนักงาน คปภ. (OIC Gateway), การจัดการหมวดวิชาและหลักสูตร, "
    "ตลอดจนการประทับตราผลการสอบและการฝึกอบรมจากระบบ LMS ภายนอก"
)

# Stat summary table (5 columns)
stat_table = doc.add_table(rows=2, cols=5)
stat_table.alignment = WD_TABLE_ALIGNMENT.CENTER
stat_headers = ["จำนวนตาราง", "จำนวนคอลัมน์", "กลุ่มโดเมน", "สถาปัตยกรรม DB", "เวอร์ชันระบบ"]
stat_vals = [f"{len(schema_data)} ตาราง", "481 คอลัมน์", "6 โดเมนหลัก", "SQL Server 2025 / MySQL", "v2026.09 (LMS Sync)"]
stat_colors = ["1E40AF", "4338CA", "059669", "D97706", "BE123C"]

for col_idx in range(5):
    # Header cell
    cell_h = stat_table.cell(0, col_idx)
    cell_h.text = stat_headers[col_idx]
    set_cell_background(cell_h, "F1F5F9")
    set_cell_margins(cell_h, top=80, bottom=80, left=80, right=80)
    p_h = cell_h.paragraphs[0]
    p_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_h.runs[0].font.name = 'Prompt'
    p_h.runs[0].font.size = Pt(8.5)
    p_h.runs[0].font.bold = True
    p_h.runs[0].font.color.rgb = GRAY
    
    # Value cell
    cell_v = stat_table.cell(1, col_idx)
    cell_v.text = stat_vals[col_idx]
    set_cell_background(cell_v, "FFFFFF")
    set_cell_margins(cell_v, top=100, bottom=100, left=80, right=80)
    p_v = cell_v.paragraphs[0]
    p_v.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_v.runs[0].font.name = 'Prompt'
    p_v.runs[0].font.size = Pt(10)
    p_v.runs[0].font.bold = True
    p_v.runs[0].font.color.rgb = PRIMARY

doc.add_paragraph().paragraph_format.space_after = Pt(12)

# ----------------------------------------------------
# 3. Domain Summary & Relationships
# ----------------------------------------------------
add_styled_heading("2. โครงสร้างความสัมพันธ์ 6 กลุ่มโดเมนหลัก (Domain Architecture)", level=1)

domains = [
    {
        "name": "Domain 1: Core Person & Registration (ระบบผู้สมัครและการลงทะเบียน)",
        "desc": "จัดเก็บข้อมูลส่วนบุคคลของผู้สมัครและรายละเอียดการยื่นคำขอในแต่ละรอบแบบ Normalized เพื่อลดความซ้ำซ้อนและรองรับประวัติย้อนหลัง",
        "tables": ["person", "personregistration", "personaddress", "personlicense", "personaffiliation", "personcourse", "persondocument", "persontraining5y", "personother", "personothersalesarea", "personothercompanies", "personotherspecialty", "registrationhistory"],
        "relations": [
            "person (NationId) 1 : N personregistration (NationId)",
            "person (NationId) 1 : N personaddress (NationId) [ประเภทที่อยู่: Card, Current, Delivery, Doc]",
            "person (NationId) 1 : N personlicense (NationId) [ใบอนุญาตเดิมที่ขอต่ออายุ]",
            "person (NationId) 1 : N personaffiliation (NationId) [สังกัดสาขาวิริยะ]",
            "person (NationId) 1 : N personcourse (NationId) [วิชาที่เลือกลงทะเบียน]",
            "person (NationId) 1 : N persondocument (NationId) [ไฟล์แนบ บัตรปชช./วุฒิ/สลิป]",
            "personother (Id) 1 : N personothersalesarea / personothercompanies / personotherspecialty"
        ]
    },
    {
        "name": "Domain 2: Master Data & Geographic Hierarchy (ข้อมูลหลักและภูมิศาสตร์)",
        "desc": "ตารางข้อมูลอ้างอิงมาตรฐานสำหรับ Cascading Dropdowns, ภูมิศาสตร์ 77 จังหวัด และสังกัดสาขาวิริยะประกันภัย",
        "tables": ["mst_provinces", "mst_districts", "mst_sub_districts", "mst_agent_regions", "mst_agent_branches", "mst_titles", "mst_gender", "mst_blood", "mst_religion", "mst_companies", "mst_territories", "mst_expertises"],
        "relations": [
            "mst_provinces (province_id) 1 : N mst_districts (province_id)",
            "mst_districts (district_id) 1 : N mst_sub_districts (district_id)",
            "mst_agent_regions (id) 1 : N mst_agent_branches (region_id)",
            "mst_titles / mst_gender / mst_blood / mst_religion 1 : N person",
            "mst_companies / mst_territories / mst_expertises 1 : N personother"
        ]
    },
    {
        "name": "Domain 3: Course Curriculum & Training Results (หลักสูตรและการอบรม)",
        "desc": "โครงสร้างการจัดหมวดวิชา (Pillars 1-4), หลักสูตรตามประกาศ คปภ., รายวิชาย่อย, ตารางรอบวันอบรม และผลคะแนนการอบรม/LMS",
        "tables": ["mst_renew_pillars", "mst_renew_basic", "mst_renew_other", "mst_renew_course", "mst_course_curriculum", "mst_course_sub_detail", "mst_renew_dates", "trn_training_result"],
        "relations": [
            "mst_renew_pillars (id) 1 : N mst_renew_course (default_pillar_id)",
            "mst_renew_pillars (id) 1 : N mst_renew_basic (pillar_id)",
            "mst_renew_course / mst_renew_basic 1 : N mst_course_curriculum (course_id)",
            "mst_course_curriculum (id) 1 : N mst_course_sub_detail (curriculum_id)",
            "personregistration (Id) 1 : N trn_training_result (person_registration_id)"
        ]
    },
    {
        "name": "Domain 4: OIC Integration & Mapping (การเชื่อมโยงระบบ คปภ.)",
        "desc": "บันทึกข้อมูล Raw Payload API, ข้อมูลโปรไฟล์ตัวแทนที่แคชจาก คปภ., กฎการแปลงฟิลด์ และ Audit Log",
        "tables": ["oic_raw_api_store", "oic_agent_profile_store", "oic_api_request_log", "oic_field_mapping", "oic_value_mapping"],
        "relations": [
            "oic_api_request_log 1 : N oic_raw_api_store (บันทึก Request/Response Payload)",
            "oic_raw_api_store 1 : 1 oic_agent_profile_store (แปลงเป็นโครงสร้างแบบ Normalized)",
            "oic_field_mapping / oic_value_mapping (ตารางกฎการแปลงข้อมูลระหว่างระบบ)"
        ]
    },
    {
        "name": "Domain 5: Security, Users & System Configuration (ระบบผู้ใช้และสิทธิ์)",
        "desc": "ระบบจัดการผู้ดูแลระบบ, บทบาท (Roles), สิทธิ์การเข้าถึงแบบ Dynamic Permissions และการตั้งค่าระบบ",
        "tables": ["users", "admin_users", "roles", "role_permissions", "sys_config", "admin_login_logs"],
        "relations": [
            "roles (Id) 1 : N role_permissions (RoleId)",
            "roles (Id) 1 : N users (RoleId)",
            "users (Id) 1 : N admin_login_logs (UserId)"
        ]
    },
    {
        "name": "Domain 6: Legacy Compatibility Layer (ตารางประวัติย้อนหลัง)",
        "desc": "ตารางข้อมูล Flat เดิมสำหรับรองรับการออกรายงานย้อนหลังและ Backward Compatibility",
        "tables": ["register", "register_history"],
        "relations": [
            "register (id) 1 : N register_history (register_id)"
        ]
    }
]

for d in domains:
    add_styled_heading(d["name"], level=2, color=SECONDARY)
    add_paragraph(d["desc"], italic=True, color=DARK)
    
    p_t = add_paragraph("ตารางในกลุ่มนี้: ", bold=True, size=9.5)
    t_run = p_t.add_run(", ".join(d["tables"]))
    t_run.font.name = 'Prompt'
    t_run.font.color.rgb = PRIMARY
    
    p_r = add_paragraph("ความสัมพันธ์หลัก (Key Relationships):", bold=True, size=9.5)
    for rel in d["relations"]:
        p_item = doc.add_paragraph(style='List Bullet')
        p_item.paragraph_format.space_after = Pt(2)
        r_run = p_item.add_run(rel)
        r_run.font.name = 'Prompt'
        r_run.font.size = Pt(9)
        r_run.font.color.rgb = DARK

doc.add_paragraph().paragraph_format.space_after = Pt(12)

# ----------------------------------------------------
# 4. Detailed Data Dictionary (All Tables)
# ----------------------------------------------------
add_styled_heading("3. พจนานุกรมข้อมูลและโครงสร้างทุกตาราง (Data Dictionary)", level=1)

add_paragraph(
    "รายละเอียดโครงสร้างตารางทุกตารางในระบบ thaiairp_iptc ประกอบด้วยชื่อคอลัมน์, "
    "ประเภทข้อมูล (Data Type), การอนุญาตค่าว่าง (Nullability), และการเป็น Primary Key (PK) / Foreign Key (FK)"
)

table_idx = 1
for t_name, cols in sorted(schema_data.items()):
    add_styled_heading(f"3.{table_idx} ตาราง: {t_name}", level=3, color=PRIMARY)
    table_idx += 1
    
    # Table description
    desc_text = f"จำนวนคอลัมน์: {len(cols)} คอลัมน์"
    add_paragraph(desc_text, size=9, italic=True, color=GRAY)
    
    # Create Table in Word
    t = doc.add_table(rows=len(cols) + 1, cols=4)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Header
    headers = ["ชื่อคอลัมน์ (Column Name)", "ประเภทข้อมูล (Data Type)", "Nullable", "Key / Index"]
    col_widths = [Inches(2.5), Inches(1.8), Inches(1.0), Inches(1.4)]
    
    for c_idx in range(4):
        cell = t.cell(0, c_idx)
        cell.text = headers[c_idx]
        set_cell_background(cell, HEADER_BG)
        set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
        p = cell.paragraphs[0]
        p.runs[0].font.name = 'Prompt'
        p.runs[0].font.size = Pt(8.5)
        p.runs[0].font.bold = True
        p.runs[0].font.color.rgb = RGBColor(255, 255, 255)
        
    # Rows
    for r_idx, col in enumerate(cols, start=1):
        c_name = col['name']
        c_type = col['type']
        if col.get('length') and col['length'] > 0 and c_type in ['nvarchar', 'varchar', 'char', 'nchar']:
            length_val = col['length'] // 2 if 'nvarchar' in c_type else col['length']
            if length_val == -1 or col['length'] == -1:
                c_type += "(max)"
            else:
                c_type += f"({length_val})"
                
        c_null = "NULL" if col.get('nullable') else "NOT NULL"
        c_key = "PK (Primary Key)" if col.get('pk') else ("FK (Reference)" if (c_name.lower().endswith('id') and c_name.lower() != 'id') else "-")
        
        row_cells = t.rows[r_idx].cells
        row_vals = [c_name, c_type, c_null, c_key]
        
        bg_color = ALT_ROW_BG if r_idx % 2 == 1 else "FFFFFF"
        
        for c_idx in range(4):
            cell = row_cells[c_idx]
            cell.text = row_vals[c_idx]
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=40, bottom=40, left=80, right=80)
            p = cell.paragraphs[0]
            p.runs[0].font.name = 'Prompt'
            p.runs[0].font.size = Pt(8.5)
            
            if c_idx == 0:
                p.runs[0].font.bold = True
                p.runs[0].font.color.rgb = PRIMARY if col.get('pk') else DARK
            elif c_idx == 3 and col.get('pk'):
                p.runs[0].font.bold = True
                p.runs[0].font.color.rgb = RGBColor(225, 29, 72)
            elif c_idx == 3 and "FK" in c_key:
                p.runs[0].font.bold = True
                p.runs[0].font.color.rgb = SECONDARY
            else:
                p.runs[0].font.color.rgb = DARK
                
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

# Save document
output_path1 = r"c:\Users\ednak\OneDrive\Desktop\datamangement\www\register_form\Database_Architecture_and_Relationship_Infographic.docx"
output_path2 = r"C:\Users\ednak\Downloads\Database_Architecture_and_Relationship_Infographic.docx"

doc.save(output_path1)
doc.save(output_path2)

print(f"Document successfully created and saved to:\n1. {output_path1}\n2. {output_path2}")
