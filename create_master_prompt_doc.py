# -*- coding: utf-8 -*-
import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

doc = docx.Document()

# Page setup (A4 with 0.8 inch margins)
for section in doc.sections:
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)

# Viriyah Theme Colors
COLOR_PRIMARY = RGBColor(14, 56, 122)      # Deep Navy Blue
COLOR_SECONDARY = RGBColor(30, 64, 175)    # Royal Blue
COLOR_ACCENT = RGBColor(194, 65, 12)       # Amber / Orange
COLOR_DARK = RGBColor(30, 41, 59)          # Slate Dark
COLOR_MUTED = RGBColor(100, 116, 139)      # Slate Gray
COLOR_CODE_BG = "0F172A"                   # Dark Slate for Code
HEX_TH_BG = "1E3A8A"
HEX_ALT_BG = "F8FAFC"
HEX_PROMPT_BOX = "F1F5F9"

def set_cell_bg(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
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

def set_table_borders(table, color_hex="CBD5E1"):
    tblPr = table._element.xpath('w:tblPr')
    if tblPr:
        borders = parse_xml(f'''
            <w:tblBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="{color_hex}"/>
                <w:bottom w:val="single" w:sz="8" w:space="0" w:color="{color_hex}"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>
                <w:insideV w:val="none"/>
                <w:left w:val="none"/>
                <w:right w:val="none"/>
            </w:tblBorders>
        ''')
        tblPr[0].append(borders)

def add_title(text, subtitle=None):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text)
    run.font.name = 'TH Sarabun New'
    run.font.size = Pt(22)
    run.font.bold = True
    run.font.color.rgb = COLOR_PRIMARY

    if subtitle:
        p2 = doc.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(14)
        run2 = p2.add_run(subtitle)
        run2.font.name = 'TH Sarabun New'
        run2.font.size = Pt(15)
        run2.font.color.rgb = COLOR_MUTED

def add_heading_1(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text)
    run.font.name = 'TH Sarabun New'
    run.font.size = Pt(17)
    run.font.bold = True
    run.font.color.rgb = COLOR_PRIMARY

def add_heading_2(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(3)
    run = p.add_run(text)
    run.font.name = 'TH Sarabun New'
    run.font.size = Pt(14)
    run.font.bold = True
    run.font.color.rgb = COLOR_SECONDARY

def add_para(text, bold_prefix=None, italic=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = 'TH Sarabun New'
        r_pre.font.size = Pt(13)
        r_pre.font.bold = True
        r_pre.font.color.rgb = COLOR_DARK
    
    r = p.add_run(text)
    r.font.name = 'TH Sarabun New'
    r.font.size = Pt(13)
    r.font.italic = italic
    r.font.color.rgb = COLOR_DARK
    return p

def add_callout_box(text, heading="คำชี้แจงการใช้งาน (Usage Guide):"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.rows[0].cells[0]
    cell.width = Inches(6.8)
    set_cell_bg(cell, "EFF6FF")
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    tcPr = cell._element.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="2563EB"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    r_h = p.add_run(heading + "\n")
    r_h.font.name = 'TH Sarabun New'
    r_h.font.size = Pt(13)
    r_h.font.bold = True
    r_h.font.color.rgb = COLOR_SECONDARY

    r_t = p.add_run(text)
    r_t.font.name = 'TH Sarabun New'
    r_t.font.size = Pt(12)
    r_t.font.color.rgb = COLOR_DARK
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_code_prompt_box(prompt_text):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.rows[0].cells[0]
    cell.width = Inches(6.8)
    set_cell_bg(cell, "F8FAFC")
    set_cell_margins(cell, top=160, bottom=160, left=180, right=180)

    tcPr = cell._element.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="0E387A"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="0E387A"/>
            <w:left w:val="single" w:sz="18" w:space="0" w:color="0E387A"/>
            <w:right w:val="single" w:sz="6" w:space="0" w:color="0E387A"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    
    lines = prompt_text.strip().split('\n')
    for idx, line in enumerate(lines):
        r = p.add_run(line + ("\n" if idx < len(lines)-1 else ""))
        r.font.name = 'Consolas'
        r.font.size = Pt(9.5)
        if line.startswith("# "):
            r.font.bold = True
            r.font.size = Pt(11)
            r.font.color.rgb = COLOR_PRIMARY
        elif line.startswith("## "):
            r.font.bold = True
            r.font.size = Pt(10.5)
            r.font.color.rgb = COLOR_SECONDARY
        elif line.startswith("### "):
            r.font.bold = True
            r.font.color.rgb = COLOR_DARK
        elif line.startswith("- [ ]") or line.startswith("- [x]") or line.startswith("* "):
            r.font.color.rgb = COLOR_DARK
        else:
            r.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

# ==================== BUILD DOCUMENT ====================

add_title("Master Reconstruction Prompt: ระบบลงทะเบียนตัวแทน/นายหน้า",
          "Prompt แม่แบบฉบับสมบูรณ์สำหรับสั่ง AI สร้างระบบใหม่ทั้งหมดจากศูนย์ (Zero-Base Re-creation)")

add_callout_box(
    "Prompt ในเอกสารนี้ถูกออกแบบอย่างเป็นระบบ (Comprehensive Specification Prompt) ครอบคลุมทั้ง Business Rules, Multi-step Form, Schema ฐานข้อมูล, การคำนวณ Checksum บัตรประชาชน, ระบบควบคุมเปิด-ปิดรับสมัคร, การจัดการไฟล์ และระบบซิงค์ข้อมูล หาก Source Code สูญหาย สามารถคัดลอก Prompt ด้านล่างนี้ทั้งชุด ป้อนให้กับ AI (เช่น Antigravity, Claude, ChatGPT) เพื่อสร้าง Code Base ใหม่ให้พร้อมใช้งานได้ทันที 100%",
    heading="💡 วัตถุประสงค์และคำแนะนำการใช้งาน:"
)

MASTER_PROMPT = """# System Re-creation Prompt: Viriyah Agent & Broker Registration System

You are a Senior Full-Stack Architect & Principal Software Engineer. Your task is to build a complete, production-ready web application from scratch: "ระบบลงทะเบียนขอรับและขอต่ออายุใบอนุญาตตัวแทนและนายหน้าประกันวินาศภัย" for Viriyah Insurance (บมจ. วิริยะประกันภัย).

Please generate all files, backend endpoints, frontend logic, styles, configuration files, and database scripts according to the following complete specifications:

---

## 1. Tech Stack & Environment
- **Backend**: PHP 8.x (Native / Object-Oriented MySQLi or PDO) with utf8mb4 encoding.
- **Frontend**: HTML5, Vanilla JavaScript / jQuery, Custom Responsive CSS (Viriyah Blue theme #0E387A, #1E40AF), SweetAlert2 for dialogs.
- **Database**: MySQL 8.x / MariaDB (Database Name: `thaiairp_iptc`).
- **Integration**: Python 3.x background ETL sync script connecting MySQL to Enterprise Microsoft SQL Server.

---

## 2. System Configuration & Scheduled Access (`appconfig.php` & `closed.php`)
Implement a centralized configuration file `appconfig.php`:
1. **Error Logging**: Configure daily log files in `./logs/app_error_YYYY-MM-DD.log`.
2. **Session Management**: Session timeout of 3600 seconds with Lax SameSite cookie.
3. **Database Constants**: `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`.
4. **Environment Mode**: `APP_ENV` ('prd' or 'uat').
   - If 'prd': Use `register` and `register_history` tables.
   - If 'uat': Use `register_uat` and `register_history_uat` tables.
5. **System Open/Close Periods Engine**:
   - `SYSTEM_IS_ONLINE`: Boolean flag (true/false).
   - `SYSTEM_OPEN_PERIODS`: JSON Array containing open and close datetime windows, e.g.:
     `[{"open": "2026-07-01 00:00:00", "close": "2026-07-02 08:37:00"}, {"open": "2026-07-02 08:46:00"}]`
   - If `SYSTEM_IS_ONLINE` is false, or if current Bangkok timestamp is outside the configured open windows, redirect immediately to `closed.php` displaying dynamic open/close notification messages and countdown/schedules.

---

## 3. Database Schema Specifications (MySQL)
Create complete DDL and Seed scripts for the following tables:
1. `register` / `register_uat`:
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `register_no` (VARCHAR(50) UNIQUE)
   - `pdpa_consent` (VARCHAR(20) DEFAULT 'รับทราบ')
   - `id_card` (VARCHAR(13) NOT NULL)
   - `id_card_expiry` (DATE)
   - `title_th`, `first_name_th`, `last_name_th` (VARCHAR(100))
   - `birth_date` (DATE), `age` (INT), `gender` (VARCHAR(10))
   - `phone` (VARCHAR(20)), `email` (VARCHAR(150))
   - **ID Card Address**: `id_address_no`, `id_moo`, `id_soi`, `id_road`, `id_province_id`, `id_amphur_id`, `id_district_id`, `id_zipcode`
   - **Current Address**: `current_address_no`, `current_moo`, `current_soi`, `current_road`, `current_province_id`, `current_amphur_id`, `current_district_id`, `current_zipcode`, `is_same_address` (TINYINT)
   - **Education & Work**: `education_level`, `institution_name`, `major`, `occupation`, `company_name`, `branch_id`, `work_status`
   - **License Info**: `agent_type` ('agent' / 'broker'), `license_no`, `license_expiry_date`, `is_training_exempt` (TINYINT), `exempt_reason`
   - **Course Selection**: `course_category`, `course_id`, `course_name`, `course_date_id`, `course_date_display`, `complex_selected_courses` (TEXT/JSON), `total_training_hours` (INT)
   - **Documents**: `photo_path`, `id_card_doc_path`, `house_reg_doc_path`, `education_doc_path`, `license_doc_path`, `exempt_doc_path`
   - `status` (VARCHAR(20) DEFAULT 'pending'), `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP), `updated_at` (DATETIME ON UPDATE CURRENT_TIMESTAMP)
2. `register_history` / `register_history_uat`:
   - `id` (INT AUTO_INCREMENT PRIMARY KEY), `register_id` (INT), `action` (VARCHAR(50)), `changed_fields` (LONGTEXT/JSON), `ip_address` (VARCHAR(45)), `user_agent` (TEXT), `created_at` (DATETIME).
3. **Master Tables**:
   - `mst_title_name`: (`id`, `title_th`, `status`)
   - `mst_renew_basic`: (`id`, `course_name`, `agent_type` enum('agent','broker'), `date_id`, `status`)
   - `mst_renew_pillars`: (`id`, `name`, `code`, `status`) -- 4 Pillars for ต่ออายุครั้งที่ 4+
   - `mst_renew_course`: (`id`, `pillar_id`, `name`, `hours`, `status`)
   - `mst_renew_dates`: (`id`, `course_date`, `course_date_display`, `start_time`, `end_time`, `status`)
   - `mst_renew_other`: Junction table mapping (`id`, `pillar_id`, `subject_id`, `date_id`, `display_order`, `status`)
   - Location Tables: `mst_provinces`, `mst_amphurs`, `mst_districts`, `mst_zipcodes`.

---

## 4. Multi-Step Wizard Flow & Business Logic
Implement a seamless, tabbed registration wizard with individual AJAX autosave/validation endpoints:

### Step 1: ข้อตกลงและเงื่อนไข (PDPA Consent)
- Present Terms of Service and PDPA Data Privacy statement.
- Require checkbox consent before unlocking the next steps.

### Step 2: ข้อมูลส่วนบุคคล (Personal Info - `save_tab2.php`)
- **Thai National ID Card Validation**:
  1. Exactly 13 numeric digits.
  2. Implement official Thai Government Modulo 11 Checksum:
     `sum = sum_{i=0}^{11} (digit[i] * (13 - i)); check_digit = (11 - (sum % 11)) % 10;`
     Must match `digit[12]`.
- **Date of Birth & Age**: Thai Buddhist Era (พ.ศ.) / CE converter, calculate age dynamically.
- **ID Card Expiry Date**: Must be strictly greater than current date (`expiry > today`).
- **Phone Number**: Exactly 10 digits (`/^[0-9]{10}$/`).
- **Email**: Strict RFC format validation (`FILTER_VALIDATE_EMAIL`).
- **Address Selection**: Dynamic Cascading Dropdown (Province -> Amphur -> District -> Auto-fill Zipcode) fetched via `api_locations.php`.
- **Sync Current Address**: "Use same address as ID Card" checkbox to copy and disable current address inputs.

### Step 3: ข้อมูลการศึกษาและการทำงาน (Education & Work - `save_tab3.php`)
- Highest Education Degree, Institution, Major.
- Current employment status, company name, branch, agent code/staff code.

### Step 4: ข้อมูลใบอนุญาตเดิมและการขอยกเว้น (License - `save_tab4.php`)
- License Type: Radio button `agent` (ตัวแทนประกันวินาศภัย) or `broker` (นายหน้าประกันวินาศภัย).
- Existing License No. and License Expiry Date (if renewal).
- **Training Exemption Checkbox**: "ขอยกเว้นการอบรมตามเกณฑ์ คปภ." with reason. If checked, bypasses Step 5.

### Step 5: การเลือกหลักสูตรและรอบการอบรม (Course Selection - `save_tab5.php`)
- Dynamically filter course list based on selected `agent_type` from Step 4.
- **Standard Courses** (ขอรับใหม่, ขอต่ออายุครั้งที่ 1, 2, 3):
  - Select 1 course -> Select 1 scheduled date from `mst_renew_dates`.
- **Complex Renewal Course (ขอต่ออายุครั้งที่ 4 เป็นต้นไป)**:
  - Render an interactive matrix of 4 Pillars (`mst_renew_pillars`).
  - User chooses subjects across Pillars (`mst_renew_other`).
  - Calculate total accumulated training hours in real-time (e.g. must reach 50 hours).
  - Overlap Date/Time Validation: Prevent selecting multiple subjects that share the exact same training datetime.

### Step 6: การแนบเอกสารหลักฐาน (File Upload - `save_tab6.php` / `upload_images.php`)
- Upload slots for: (1) Photo, (2) ID Card Copy, (3) House Registration, (4) Degree Certificate, (5) Old License, (6) Exemption Proof.
- Allowed MIME types: `image/jpeg`, `image/png`, `application/pdf`.
- Max file size: 5MB per file.
- Secure filename hashing with UUID/timestamp to prevent path traversal.
- Live client-side preview for images and PDF indicators.

### Step 7: สรุปข้อมูลและยืนยันการลงทะเบียน (`submit_register.php`)
- Comprehensive review card showing all entered data across tabs.
- Duplicate Registration Prevention: Reject if `id_card` is already registered for the active course and period.
- Atomic Database Transaction: Insert into `register`, insert audit log into `register_history`.
- Return Registration Reference Number and show success modal with print/download summary option.

---

## 5. Administrative Tools & Utilities
1. `api_locations.php`: High-performance JSON API for cascading addresses.
2. `enquiry.corse.php`: Search, filter, and inspect applicant records by ID Card, Name, Date, or Course.
3. `export_data.php`: Export applicant list to Excel (`.xlsx` / `.csv`) with proper Thai UTF-8 BOM encoding.
4. `sync_to_sqlserver.py`: Python script utilizing `pyodbc` / `pymysql` to ETL delta records from MySQL into enterprise SQL Server.

---

## 6. Security & Best Practices
- Prevent SQL Injection: Use Prepared Statements (`$stmt->bind_param` or PDO).
- Prevent XSS: Sanitize inputs and apply `htmlspecialchars()` on output rendering.
- Ensure Full UTF-8 support: Set database charset and collation to `utf8mb4_unicode_ci`.
- Mobile Responsive Design: Flexbox/Grid layout optimized for mobile, tablet, and desktop viewports.

---

Generate complete, runnable, and robust code for all files described above."""

add_heading_1("1. โครงสร้างและเนื้อหาของ Master Prompt")
add_para("Prompt ด้านล่างนี้ประกอบด้วยข้อกำหนดทางเทคนิค (Technical Specification) ทั้งหมด 6 ส่วนหลัก:")
add_para("ระบุเวอร์ชันของภาษา ฐานข้อมูล และเครื่องมือที่ใช้ทั้งหมด", bold_prefix="• ส่วนที่ 1: สภาพแวดล้อมและเทคโนโลยี (Tech Stack): ")
add_para("ระบุการตั้งค่า Session, โหมด PRD/UAT และเงื่อนไขการเปิด-ปิดระบบตามช่วงเวลา", bold_prefix="• ส่วนที่ 2: ระบบควบคุมการเข้าถึง (System Schedule): ")
add_para("โครงสร้างตารางหลัก ข้อมูลประวัติ และ Master Data ทั้งหมด", bold_prefix="• ส่วนที่ 3: โครงสร้างฐานข้อมูล (Database Schema): ")
add_para("การคำนวณ Checksum บัตรประชาชน 13 หลัก, ตรรกะ 4 Pillars, การนับชั่วโมง และการอัปโหลดไฟล์", bold_prefix="• ส่วนที่ 4: กระบวนการทำงาน 7 ขั้นตอน (7-Step Wizard & Rules): ")
add_para("ระบบค้นหา รายงาน Excel และ Script ซิงค์ข้อมูลเข้า SQL Server", bold_prefix="• ส่วนที่ 5: ระบบผู้ดูแลและการเชื่อมต่อ (Admin & Integration): ")
add_para("การป้องกัน SQL Injection, XSS, Path Traversal และ UTF-8 Thai Encoding", bold_prefix="• ส่วนที่ 6: ความปลอดภัย (Security & Best Practices): ")

add_heading_1("2. ชุดคำสั่ง Master Reconstruction Prompt (พร้อมใช้งาน)")
add_code_prompt_box(MASTER_PROMPT)

add_heading_1("3. วิธีการนำ Prompt ไปใช้งาน (How to Use)")
add_para("1. ทำการคัดลอก (Copy) ข้อความทั้งหมดในกล่อง Prompt ด้านบน")
add_para("2. วาง (Paste) ลงใน AI Coding Assistant (เช่น Antigravity, Claude Code, ChatGPT, Cursor)")
add_para("3. สั่งให้ AI ทยอยสร้างโครงสร้างโฟลเดอร์ และสร้างไฟล์หลักตามลำดับ (Database Script -> appconfig.php -> api_locations.php -> index.php -> save_tab*.php -> submit_register.php -> admin/enquiry)")
add_para("4. รันคำสั่งทดสอบระบบตามเอกสาร Test Plan เพื่อตรวจสอบความสมบูรณ์ 100%")

# Save document
output_path = "Viriyah_Registration_System_Master_Recreation_Prompt.docx"
doc.save(output_path)
print(f"Document successfully created: {output_path}")
