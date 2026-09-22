# -*- coding: utf-8 -*-
import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

doc = docx.Document()

# Page setup (A4 with 0.8 inch margins)
for section in doc.sections:
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)

# Color constants (Viriyah Corporate Blue Theme)
COLOR_PRIMARY = RGBColor(14, 56, 122)      # Deep Navy / Viriyah Blue
COLOR_SECONDARY = RGBColor(30, 64, 175)    # Royal Blue
COLOR_ACCENT = RGBColor(234, 88, 12)       # Orange / Accent
COLOR_DARK = RGBColor(30, 41, 59)          # Slate Dark
COLOR_MUTED = RGBColor(100, 116, 139)      # Slate Gray
COLOR_SUCCESS = RGBColor(22, 101, 52)      # Forest Green
COLOR_DANGER = RGBColor(185, 28, 28)       # Crimson Red

HEX_PRIMARY = "0E387A"
HEX_LIGHT_BG = "F1F5F9"
HEX_ALT_BG = "F8FAFC"
HEX_BORDER = "CBD5E1"
HEX_TH_BG = "1E3A8A"

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

def set_table_borders(table, color_hex="D1D5DB"):
    tblPr = table._element.xpath('w:tblPr')
    if tblPr:
        borders = parse_xml(f'''
            <w:tblBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="{color_hex}"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>
                <w:insideV w:val="none"/>
                <w:left w:val="none"/>
                <w:right w:val="none"/>
            </w:tblBorders>
        ''')
        tblPr[0].append(borders)

def add_title(text, subtitle=None):
    # Title Header Box
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text)
    run.font.name = 'TH Sarabun New'
    run.font.size = Pt(24)
    run.font.bold = True
    run.font.color.rgb = COLOR_PRIMARY

    if subtitle:
        p2 = doc.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(18)
        run2 = p2.add_run(subtitle)
        run2.font.name = 'TH Sarabun New'
        run2.font.size = Pt(16)
        run2.font.color.rgb = COLOR_MUTED

def add_heading_1(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    run.font.name = 'TH Sarabun New'
    run.font.size = Pt(18)
    run.font.bold = True
    run.font.color.rgb = COLOR_PRIMARY

def add_heading_2(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text)
    run.font.name = 'TH Sarabun New'
    run.font.size = Pt(15)
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
        r_pre.font.size = Pt(14)
        r_pre.font.bold = True
        r_pre.font.color.rgb = COLOR_DARK
    
    r = p.add_run(text)
    r.font.name = 'TH Sarabun New'
    r.font.size = Pt(14)
    r.font.italic = italic
    r.font.color.rgb = COLOR_DARK
    return p

def create_testcase_table(headers, rows, col_widths=None):
    table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table)

    # Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_bg(hdr_cells[i], HEX_TH_BG)
        set_cell_margins(hdr_cells[i], top=140, bottom=140, left=140, right=140)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in p.runs:
            run.font.name = 'TH Sarabun New'
            run.font.size = Pt(14)
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)

    # Data Rows
    for r_idx, row_data in enumerate(rows):
        row_cells = table.rows[r_idx + 1].cells
        bg_color = HEX_ALT_BG if (r_idx % 2 == 1) else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            row_cells[c_idx].text = str(val)
            set_cell_bg(row_cells[c_idx], bg_color)
            set_cell_margins(row_cells[c_idx], top=100, bottom=100, left=140, right=140)
            p = row_cells[c_idx].paragraphs[0]
            
            # Alignments
            if c_idx in [0, 4]: # ID & Priority
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT

            for run in p.runs:
                run.font.name = 'TH Sarabun New'
                run.font.size = Pt(13)
                run.font.color.rgb = COLOR_DARK
                if c_idx == 0:
                    run.font.bold = True
                if c_idx == 4:
                    run.font.bold = True
                    if val == "P1 (Critical)":
                        run.font.color.rgb = COLOR_DANGER
                    elif val == "P2 (High)":
                        run.font.color.rgb = COLOR_ACCENT
                    elif val == "P3 (Medium)":
                        run.font.color.rgb = COLOR_SECONDARY
                    else:
                        run.font.color.rgb = COLOR_MUTED

    # Set Column Widths if given
    if col_widths:
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Inches(w)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

# ==================== DOCUMENT CONTENT ====================

add_title("แผนการทดสอบระบบและกรณีทดสอบแบบละเอียด (Comprehensive Test Plan & Test Cases)",
          "ระบบลงทะเบียนขอรับ/ขอต่ออายุใบอนุญาตตัวแทนและนายหน้าประกันวินาศภัย | บมจ. วิริยะประกันภัย")

# Metadata Box
add_para("ระบบลงทะเบียนตัวแทนและนายหน้าประกันวินาศภัย (Viriyah Registration System)", bold_prefix="ชื่อระบบ/โครงการ: ")
add_para("1.0.0 (ครอบคลุมทั้งเวอร์ชัน PHP Web Form และ .NET Core Architecture)", bold_prefix="เวอร์ชันระบบ: ")
add_para("Functional Testing, Data Validation, Security & Integrity, Integration Testing", bold_prefix="ประเภทการทดสอบ: ")
add_para("Localhost (Apache Port 80 / PHP Server Port 8000), MySQL Database (thaiairp_iptc)", bold_prefix="สภาพแวดล้อมที่ใช้ทดสอบ: ")
add_para("17 กันยายน 2569", bold_prefix="วันที่จัดทำเอกสาร: ")

add_heading_1("1. บทนำและวัตถุประสงค์ (Introduction & Objectives)")
add_para("เอกสารฉบับนี้จัดทำขึ้นเพื่อกำหนดกรอบการทำงาน ขั้นตอน และกรณีทดสอบ (Test Cases) สำหรับการตรวจสอบคุณภาพของ 'ระบบลงทะเบียนขอรับและขอต่ออายุใบอนุญาตตัวแทน/นายหน้าประกันวินาศภัย' ของ บมจ. วิริยะประกันภัย เพื่อให้มั่นใจว่าระบบมีคุณสมบัติดังนี้:")
add_para("ทำงานได้ถูกต้อง ครบถ้วนตามกระบวนการทางธุรกิจ (Business Workflow) ตั้งแต่การคัดกรอง ยินยอมเงื่อนไข จนถึงการยืนยันและออกรหัสลงทะเบียน", bold_prefix="1. ความถูกต้องตามเงื่อนไขธุรกิจ (Functional Accuracy): ")
add_para("มีการตรวจสอบความถูกต้องของข้อมูลนำเข้า (Data Validation Rules) เช่น เลขบัตรประจำตัวประชาชน 13 หลักตามสูตร Checksum ทางการ, วันหมดอายุบัตร, อีเมล, เบอร์โทรศัพท์ และความสัมพันธ์ของหลักสูตร", bold_prefix="2. ความแม่นยำของข้อมูล (Data Validation): ")
add_para("ป้องกันการบันทึกข้อมูลผิดพลาด การลงทะเบียนซ้ำซ้อน (Duplicate Entry) ป้องกันช่องโหว่ SQL Injection / XSS และรองรับตัวอักษรภาษาไทย (UTF-8 / utf8mb4) ครบถ้วน", bold_prefix="3. ความปลอดภัยและความสมบูรณ์ของฐานข้อมูล (Security & Integrity): ")
add_para("สามารถเชื่อมโยงและซิงค์ข้อมูลระหว่าง MySQL และ SQL Server ขององค์กรได้อย่างแม่นยำไร้รอยต่อ", bold_prefix="4. การเชื่อมต่อระบบ (System Integration): ")

add_heading_1("2. ขอบเขตและกลยุทธ์การทดสอบ (Scope & Testing Strategy)")
add_para("ครอบคลุมการทดสอบทั้ง End-to-End ตั้งแต่ผู้ใช้งานทั่วไป (Frontend User) จนถึงเจ้าหน้าที่ตรวจสอบ (Admin/Data Management):")
add_para("ทดสอบการนำทางระหว่างขั้นตอน (Step 1 ถึง Step 7), การแสดงผลแบบ Responsive บนอุปกรณ์ต่างๆ, Dropdown จังหวัด-อำเภอ-ตำบล และการ Preview ไฟล์", bold_prefix="• ส่วนติดต่อผู้ใช้งาน (UI/UX Testing): ")
add_para("ทดสอบการเรียกใช้งาน save_tab2.php ถึง save_tab6.php, submit_register.php และ api_locations.php", bold_prefix="• การประมวลผลหลังบ้าน (Backend API Testing): ")
add_para("ทดสอบความถูกต้องของตาราง register, register_history, mst_renew_basic, mst_renew_other, mst_renew_pillars, mst_renew_dates", bold_prefix="• ความสมบูรณ์ของฐานข้อมูล (Database Integrity): ")
add_para("ทดสอบการค้นหารายการ (enquiry.corse.php) และการส่งออกข้อมูล Excel (export_data.php)", bold_prefix="• การบริหารจัดการข้อมูล (Admin & Export): ")

add_heading_1("3. ระดับความสำคัญและเกณฑ์การประเมิน (Priority & Sign-off Criteria)")
add_para("ข้อผิดพลาดระดับวิกฤต กระทบต่อความปลอดภัย โครงสร้างฐานข้อมูล หรือไม่สามารถลงทะเบียนได้ (ต้องผ่าน 100% จึงจะขึ้น Production ได้)", bold_prefix="• P1 (Critical): ")
add_para("ข้อผิดพลาดด้าน Business Logic หลัก เช่น การคำนวณชั่วโมงอบรมไม่ตรง หรือการเลือกหลักสูตรผิดประเภท (ต้องผ่าน 100%)", bold_prefix="• P2 (High): ")
add_para("ข้อผิดพลาดด้านการแสดงผล ข้อความแจ้งเตือน หรือพฤติกรรมที่ไม่ราบรื่นของหน้าจอ (ต้องได้รับการแก้ไขอย่างน้อย 95%)", bold_prefix="• P3 (Medium): ")
add_para("ข้อผิดพลาดเล็กน้อย เช่น ข้อความสะกดผิด หรือการจัดตำแหน่งเล็กน้อย", bold_prefix="• P4 (Low): ")

# ==================== TEST SUITES ====================

add_heading_1("4. รายการกรณีทดสอบโดยละเอียด (Detailed Test Cases)")

# Suite 1
add_heading_2("หมวดที่ 1: ระบบควบคุมการเปิด-ปิดระบบ (System Availability & Schedule)")
headers = ["Test ID", "รายละเอียดการทดสอบ", "ขั้นตอนและข้อมูลนำเข้า", "ผลลัพธ์ที่คาดหวัง", "ระดับ"]
rows = [
    ["SYS-01", "ตรวจสอบกรณีปิดระบบถาวร (Offline Mode)", "ตั้งค่า SYSTEM_IS_ONLINE = false ใน appconfig.php แล้วเข้า URL index.php", "ระบบ Redirect ไปหน้า closed.php ทันที พร้อมแสดงข้อความระบบปิดให้บริการ", "P1 (Critical)"],
    ["SYS-02", "ตรวจสอบช่วงเวลาก่อนเปิดรับสมัคร (Before Open)", "เข้าใช้งานก่อนเวลาเริ่มต้นที่ระบุใน SYSTEM_OPEN_PERIODS", "ระบบ Redirect ไปหน้า closed.php และระบุวันเวลาที่จะเปิดรับสมัคร", "P1 (Critical)"],
    ["SYS-03", "ตรวจสอบช่วงเวลาระหว่างเปิดรับสมัคร (Within Open Period)", "เข้าใช้งานในช่วงเวลาที่เปิดรับสมัครตาม Config", "สามารถเข้าสู่หน้า index.php และกรอกแบบฟอร์มได้ตามปกติ", "P1 (Critical)"],
    ["SYS-04", "ตรวจสอบช่วงเวลาหลังปิดรับสมัคร (After Close Period)", "เข้าใช้งานหลังจากเวลาสิ้นสุดที่ระบุใน Config", "ระบบ Redirect ไปหน้า closed.php แจ้งว่าสิ้นสุดช่วงเวลารับสมัครแล้ว", "P1 (Critical)"]
]
create_testcase_table(headers, rows, [0.9, 1.6, 1.8, 1.8, 0.9])

# Suite 2
add_heading_2("หมวดที่ 2: ขั้นตอนที่ 1 - เงื่อนไขและ PDPA (Consent & Step 1)")
rows = [
    ["PDP-01", "กดปุ่มถัดไปโดยไม่กดยินยอมข้อตกลง", "ไม่ทำเครื่องหมายในช่องยินยอม PDPA แล้วคลิกปุ่ม 'ถัดไป'", "ระบบไม่อนุญาตให้ไปขั้นตอนถัดไป และแสดง Alert เตือนให้กดยินยอม", "P2 (High)"],
    ["PDP-02", "กดยินยอมข้อตกลงและ PDPA ครบถ้วน", "ติ๊กเลือก 'ข้าพเจ้ารับทราบและยินยอม' แล้วคลิก 'ถัดไป'", "ระบบเปิดแท็บถัดไป (ข้อมูลส่วนบุคคล) พร้อมส่งสถานะ consent = 'รับทราบ'", "P2 (High)"]
]
create_testcase_table(headers, rows, [0.9, 1.6, 1.8, 1.8, 0.9])

# Suite 3
add_heading_2("หมวดที่ 3: ขั้นตอนที่ 2 - ข้อมูลส่วนบุคคลและการตรวจสอบ (Personal Info Validation - Step 2)")
rows = [
    ["PER-01", "ตรวจสอบเลขบัตรประชาชนว่างหรือสั้นกว่า 13 หลัก", "กรอกเลข '1234567890' (10 หลัก)", "แสดง Error: 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก'", "P1 (Critical)"],
    ["PER-02", "ตรวจสอบเลขบัตรประชาชนไม่ถูกต้องตามสูตร Checksum", "กรอกเลข '1111111111111' (Mod 11 ผิด)", "แสดง Error: 'เลขบัตรประชาชนไม่ถูกต้องตามรูปแบบราชการ'", "P1 (Critical)"],
    ["PER-03", "ตรวจสอบเลขบัตรประชาชนถูกต้องตามมาตรฐานราชการ", "กรอกเลขบัตรประชาชนที่มี Checksum ถูกต้อง", "ผ่านการตรวจสอบ ไม่มี Error และอนุญาตให้ไปต่อ", "P1 (Critical)"],
    ["PER-04", "ตรวจสอบหมายเลขโทรศัพท์มือถือ", "กรอกเบอร์โทรไม่ครบ 10 หลัก หรือมีตัวอักษร", "แสดง Error: 'หมายเลขโทรศัพท์ต้องมี 10 หลัก'", "P2 (High)"],
    ["PER-05", "ตรวจสอบรูปแบบอีเมล (Email Validation)", "กรอก 'user@' หรือ 'test.com'", "แสดง Error: 'อีเมลไม่ถูกต้อง'", "P2 (High)"],
    ["PER-06", "ตรวจสอบวันหมดอายุบัตรประชาชน (Expiry Date)", "เลือกวันหมดอายุบัตรที่เป็นอดีต หรือวันปัจจุบัน", "แสดง Error: 'วันหมดอายุบัตรประชาชน ต้องมากกว่าวันที่ปัจจุบันเท่านั้น'", "P2 (High)"],
    ["PER-07", "ทดสอบการเชื่อมโยง ที่อยู่ (จังหวัด -> อำเภอ -> ตำบล)", "เลือก จังหวัดกรุงเทพฯ -> เขตพญาไท -> แขวงสามเสนใน", "Dropdown โหลดข้อมูลสัมพันธ์ถูกต้อง และ Auto-fill รหัสไปรษณีย์อัตโนมัติ", "P2 (High)"],
    ["PER-08", "ทดสอบคัดลอกที่อยู่ปัจจุบันตามบัตรประชาชน", "ติ๊กเลือก 'ใช้ที่อยู่เดียวกับที่อยู่ตามบัตรประชาชน'", "ระบบคัดลอกข้อมูลที่อยู่ เลขที่ ซอย ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์ครบถ้วน", "P3 (Medium)"]
]
create_testcase_table(headers, rows, [0.9, 1.6, 1.8, 1.8, 0.9])

# Suite 4
add_heading_2("หมวดที่ 4: ขั้นตอนที่ 3 & 4 - การศึกษา การทำงาน และใบอนุญาต (Education & License - Step 3 & 4)")
rows = [
    ["LIC-01", "บันทึกระดับการศึกษาและสถาบัน", "เลือกระดับการศึกษา 'ปริญญาตรี' ระบุสาขาวิชาและสถาบัน", "บันทึกลง Session/DB ได้ถูกต้อง ครบถ้วน", "P3 (Medium)"],
    ["LIC-02", "เลือกประเภทผู้สมัคร (ตัวแทน vs นายหน้า)", "เลือก Radio 'ตัวแทนประกันวินาศภัย' หรือ 'นายหน้าประกันวินาศภัย'", "ระบบกรองรายการหลักสูตรในขั้นตอนที่ 5 ให้ตรงตามประเภทที่เลือกอย่างถูกต้อง", "P1 (Critical)"],
    ["LIC-03", "กรณีขอต่ออายุ: ตรวจสอบเลขที่ใบอนุญาตเดิม", "กรอกเลขที่ใบอนุญาตเดิม และวันหมดอายุของใบอนุญาตเดิม", "บันทึกข้อมูลใบอนุญาตเดิมได้สมบูรณ์และถูกต้อง", "P2 (High)"],
    ["LIC-04", "ตรวจสอบเงื่อนไขขอยกเว้นการอบรม", "ติ๊กเลือก 'ขอยกเว้นการอบรมตามเกณฑ์ คปภ.' พร้อมระบุเหตุผล", "ระบบอนุญาตให้ข้ามการเลือกหลักสูตรในขั้นตอนที่ 5 ตามระเบียบข้อบังคับ", "P2 (High)"]
]
create_testcase_table(headers, rows, [0.9, 1.6, 1.8, 1.8, 0.9])

# Suite 5
add_heading_2("หมวดที่ 5: ขั้นตอนที่ 5 - การเลือกหลักสูตรและรอบการอบรม (Course Selection - Step 5)")
rows = [
    ["CRS-01", "แสดงหลักสูตรตรงตามประเภทตัวแทน/นายหน้า", "สลับประเภทระหว่าง ตัวแทน กับ นายหน้า", "หลักสูตรใน mst_renew_basic โหลดตรงตาม agent_type", "P1 (Critical)"],
    ["CRS-02", "เลือกหลักสูตรปกติ (ขอรับใหม่, ขอต่อ 1, 2, 3)", "เลือกหลักสูตรขอต่ออายุครั้งที่ 1", "แสดงรอบวันที่จัดอบรมตาม Master Data (mst_renew_dates) ถูกต้อง", "P1 (Critical)"],
    ["CRS-03", "เลือกหลักสูตรต่ออายุครั้งที่ 4 เป็นต้นไป (Complex Course)", "เลือกหลักสูตรขอต่ออายุครั้งที่ 4 เป็นต้นไป", "แสดงตารางแยกตามหมวด/เสาหลัก (Pillars 1-4) และรายวิชาพร้อมรอบวัน", "P1 (Critical)"],
    ["CRS-04", "ตรวจสอบการเลือกวิชาและนับจำนวนชั่วโมง", "เลือกวิชาในแต่ละหมวดให้ครบตามเกณฑ์ที่กำหนด (เช่น 50 ชม.)", "ระบบคำนวณชั่วโมงรวมถูกต้อง และไม่อนุญาตให้ไปต่อหากชั่วโมงไม่ครบ", "P1 (Critical)"],
    ["CRS-05", "ป้องกันการเลือกรอบวันอบรมที่วันเวลาทับซ้อนกัน", "เลือก 2 วิชาที่มีวันและเวลาจัดอบรมตรงกัน", "แสดง Error: 'ไม่สามารถเลือกวิชาที่จัดอบรมในวันและเวลาเดียวกันได้'", "P2 (High)"]
]
create_testcase_table(headers, rows, [0.9, 1.6, 1.8, 1.8, 0.9])

# Suite 6
add_heading_2("หมวดที่ 6: ขั้นตอนที่ 6 - การแนบเอกสารหลักฐาน (File Upload - Step 6)")
rows = [
    ["UPL-01", "ตรวจสอบการอัปโหลดไฟล์ต้องห้าม/อันตราย", "ทดลองอัปโหลดไฟล์นามสกุล .exe, .php, .bat, .sh", "ระบบปฏิเสธทันที แสดง Error: 'รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG) หรือ PDF เท่านั้น'", "P1 (Critical)"],
    ["UPL-02", "ตรวจสอบขนาดไฟล์เกินขีดจำกัด (Max Size)", "อัปโหลดไฟล์ที่มีขนาดมากกว่า 5MB", "ระบบปฏิเสธและแจ้งเตือน: 'ขนาดไฟล์ต้องไม่เกิน 5MB'", "P2 (High)"],
    ["UPL-03", "อัปโหลดไฟล์ที่ถูกต้องและตรวจสอบ Preview", "อัปโหลดไฟล์ .jpg ขนาด 1.5MB สำหรับรูปถ่ายหน้าตรง", "อัปโหลดสำเร็จ แสดงภาพตัวอย่าง (Thumbnail Preview) ได้ชัดเจน", "P2 (High)"],
    ["UPL-04", "ตรวจสอบการแนบเอกสารบังคับ (Mandatory Files)", "ไม่อัปโหลดสำเนาบัตรประชาชน แล้วกดส่งข้อมูล", "ระบบไม่อนุญาตให้ผ่าน แจ้งเตือนให้แนบเอกสารบังคับให้ครบถ้วน", "P1 (Critical)"]
]
create_testcase_table(headers, rows, [0.9, 1.6, 1.8, 1.8, 0.9])

# Suite 7
add_heading_2("หมวดที่ 7: การยืนยันและบันทึกฐานข้อมูล (Submission & Database Integrity)")
rows = [
    ["SUB-01", "ทดสอบการลงทะเบียนสำเร็จ (Happy Path)", "กรอกข้อมูลครบถ้วน ถูกต้องทุกขั้นตอน แนบไฟล์ครบ แล้วกดยืนยัน", "1. บันทึกข้อมูลลงตาราง register หรือ register_uat\n2. บันทึกประวัติลง register_history\n3. แสดงหน้ารหัสอ้างอิงการสมัคร", "P1 (Critical)"],
    ["SUB-02", "ป้องกันการลงทะเบียนซ้ำซ้อน (Duplicate Entry)", "ใช้เลขบัตรประชาชนเดิมที่สมัครหลักสูตรเดียวกันในรอบที่เปิดอยู่มาสมัครซ้ำ", "ระบบแจ้งเตือน: 'ท่านได้ทำการลงทะเบียนในหลักสูตรนี้เรียบร้อยแล้ว'", "P1 (Critical)"],
    ["SUB-03", "ทดสอบการบันทึกภาษาไทยและวรรณยุกต์ (Encoding)", "กรอกชื่อ-ที่อยู่ภาษาไทยที่มีสระบน-ล่างและวรรณยุกต์", "บันทึกและแสดงผลภาษาไทยถูกต้องสมบูรณ์ ไม่มีปัญหาตัวอักษรต่างดาว (Mojibake)", "P1 (Critical)"],
    ["SUB-04", "ทดสอบความปลอดภัย SQL Injection & XSS", "กรอก ' OR '1'='1 หรือ <script>alert('xss')</script> ในช่องข้อความ", "ระบบทำการ Sanitize / Parameterize ปลอดภัย ไม่เกิดข้อผิดพลาดด้านความปลอดภัย", "P1 (Critical)"]
]
create_testcase_table(headers, rows, [0.9, 1.6, 1.8, 1.8, 0.9])

# Suite 8
add_heading_2("หมวดที่ 8: ฝั่งผู้ดูแลระบบและการเชื่อมโยงข้อมูล (Admin, Export & Sync)")
rows = [
    ["ADM-01", "สืบค้นข้อมูลผู้ลงทะเบียน (enquiry.corse.php)", "ค้นหาด้วย เลขบัตรประชาชน, ชื่อ-สกุล หรือวันที่ลงทะเบียน", "แสดงผลรายการลงทะเบียนตรงตามเงื่อนไขที่ค้นหาได้อย่างรวดเร็ว", "P2 (High)"],
    ["ADM-02", "ส่งออกรายงาน Excel (export_data.php)", "กดปุ่ม Export Excel ตามหลักสูตรและช่วงวันที่", "ดาวน์โหลดไฟล์ .xlsx / .csv ที่มีข้อมูลครบทุกฟิลด์ ภาษาไทยอ่านได้ถูกต้อง", "P2 (High)"],
    ["ADM-03", "ทดสอบการซิงค์ข้อมูลไปยัง SQL Server (sync_to_sqlserver.py)", "รันคำสั่งซิงค์ข้อมูลจาก MySQL ไปยังตารางปลายทางใน SQL Server", "ข้อมูลถูกส่งต่อครบถ้วน Schema ตรงกัน และมี Log บันทึกผลการทำงานสำเร็จ", "P2 (High)"]
]
create_testcase_table(headers, rows, [0.9, 1.6, 1.8, 1.8, 0.9])

# ==================== SUMMARY & SIGN-OFF ====================
add_heading_1("5. สรุปผลและการลงนามอนุมัติ (Test Execution Summary & Sign-off)")
add_para("ตารางสรุปผลการทดสอบและการลงนามส่งมอบงานระหว่างทีมพัฒนา (Development Team) และทีมประกันคุณภาพ/ผู้ใช้งาน (QA & User Acceptance):")

summary_headers = ["หมวดการทดสอบ", "จำนวนเคสทั้งหมด", "ผ่าน (Pass)", "ไม่ผ่าน (Fail)", "สถานะการประเมิน"]
summary_rows = [
    ["1. การเปิด-ปิดระบบ (System Schedule)", "4", "-", "-", "รอดำเนินการ (Pending)"],
    ["2. ข้อตกลง PDPA (Consent)", "2", "-", "-", "รอดำเนินการ (Pending)"],
    ["3. ข้อมูลส่วนบุคคล (Personal Info)", "8", "-", "-", "รอดำเนินการ (Pending)"],
    ["4. ข้อมูลการศึกษา/ใบอนุญาต (License)", "4", "-", "-", "รอดำเนินการ (Pending)"],
    ["5. การเลือกหลักสูตร (Course Selection)", "5", "-", "-", "รอดำเนินการ (Pending)"],
    ["6. การแนบไฟล์หลักฐาน (File Upload)", "4", "-", "-", "รอดำเนินการ (Pending)"],
    ["7. การบันทึกข้อมูล (Submission & DB)", "4", "-", "-", "รอดำเนินการ (Pending)"],
    ["8. ระบบผู้ดูแล/ซิงค์ข้อมูล (Admin & Sync)", "3", "-", "-", "รอดำเนินการ (Pending)"],
    ["รวมทั้งสิ้น (Total)", "34", "-", "-", "พร้อมสำหรับการทดสอบ"]
]
create_testcase_table(summary_headers, summary_rows, [2.2, 1.2, 1.0, 1.0, 1.8])

# Sign-off box
add_para("ลงชื่อผู้ทดสอบ (QA / Tester): _____________________________ วันที่: ____ / ____ / ________", bold_prefix="ผู้รับผิดชอบการทดสอบ: ")
add_para("ลงชื่อผู้อนุมัติ (Project Manager / Business Owner): _____________________________ วันที่: ____ / ____ / ________", bold_prefix="ผู้อนุมัติผลการทดสอบ: ")

# Save document
output_path = "Viriyah_Registration_System_Test_Plan_and_Test_Cases.docx"
doc.save(output_path)
print(f"Document successfully created: {output_path}")
