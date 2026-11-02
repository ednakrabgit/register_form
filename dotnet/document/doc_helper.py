# -*- coding: utf-8 -*-
"""
Helper module for generating professional enterprise Word (.docx) documents
with corporate styling (Viriyah Insurance theme).
"""

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

# Color Palette
COLOR_PRIMARY_HEX = "0E387A"      # Viriyah Deep Blue
COLOR_SECONDARY_HEX = "1E40AF"    # Bright Navy / Accent Blue
COLOR_ACCENT_HEX = "0284C7"       # Cyan / Sky
COLOR_DARK_TEXT_HEX = "1E293B"    # Slate 800
COLOR_MUTED_TEXT_HEX = "64748B"   # Slate 500
COLOR_LIGHT_BG_HEX = "F8FAFC"     # Slate 50
COLOR_CALLOUT_BG_HEX = "EFF6FF"   # Blue 50
COLOR_BORDER_HEX = "CBD5E1"       # Slate 300
COLOR_SUCCESS_HEX = "059669"      # Emerald 600
COLOR_WARNING_HEX = "D97706"      # Amber 600

PRIMARY_RGB = RGBColor(14, 56, 122)
SECONDARY_RGB = RGBColor(30, 64, 175)
DARK_TEXT_RGB = RGBColor(30, 41, 59)
MUTED_TEXT_RGB = RGBColor(100, 116, 139)

def create_document():
    doc = docx.Document()
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.page_width = Inches(8.27)  # A4
        section.page_height = Inches(11.69)
        
        # Header / Footer setup
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("บมจ. วิริยะประกันภัย | ระบบลงทะเบียนตัวแทนและนายหน้าประกันวินาศภัย — เอกสารควบคุมภายใน")
        f_run.font.name = "Cordia New"
        f_run.font.size = Pt(9)
        f_run.font.color.rgb = MUTED_TEXT_RGB

    return doc

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, border_color=COLOR_BORDER_HEX, sz="4"):
    tblPr = table._element.xpath('w:tblPr')
    if tblPr:
        tblBorders = OxmlElement('w:tblBorders')
        for b_name in ['top', 'left', 'bottom', 'right', 'insideH']:
            b = OxmlElement(f'w:{b_name}')
            b.set(qn('w:val'), 'single')
            b.set(qn('w:sz'), sz)
            b.set(qn('w:space'), '0')
            b.set(qn('w:color'), border_color)
            tblBorders.append(b)
        insideV = OxmlElement('w:insideV')
        insideV.set(qn('w:val'), 'none')
        tblBorders.append(insideV)
        tblPr[0].append(tblBorders)

def add_cover_header(doc, doc_title_th, doc_title_en, doc_type, version="1.0", date_str="30 ตุลาคม 2569"):
    # Organization Tag
    p_org = doc.add_paragraph()
    p_org.paragraph_format.space_before = Pt(0)
    p_org.paragraph_format.space_after = Pt(4)
    run_org = p_org.add_run("บริษัท วิริยะประกันภัย จำกัด (มหาชน) | ฝ่ายเทคโนโลยีสารสนเทศและฝ่ายฝึกอบรม")
    run_org.font.name = "Cordia New"
    run_org.font.size = Pt(11)
    run_org.font.bold = True
    run_org.font.color.rgb = SECONDARY_RGB

    # Document Type Pill / Badge
    p_badge = doc.add_paragraph()
    p_badge.paragraph_format.space_after = Pt(8)
    run_badge = p_badge.add_run(f"★ {doc_type} ★")
    run_badge.font.name = "Cordia New"
    run_badge.font.size = Pt(11)
    run_badge.font.bold = True
    run_badge.font.color.rgb = RGBColor(5, 150, 105)

    # Main Titles
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(4)
    run_th = p_title.add_run(doc_title_th)
    run_th.font.name = "Cordia New"
    run_th.font.size = Pt(22)
    run_th.font.bold = True
    run_th.font.color.rgb = PRIMARY_RGB

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(14)
    run_en = p_sub.add_run(doc_title_en)
    run_en.font.name = "Cordia New"
    run_en.font.size = Pt(13)
    run_en.font.color.rgb = MUTED_TEXT_RGB

    # Metadata Table
    meta_table = doc.add_table(rows=5, cols=4)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(meta_table, "94A3B8", "6")

    meta_data = [
        [("ชื่อโครงการ", True), ("ระบบลงทะเบียนขอรับและขอต่ออายุใบอนุญาตตัวแทนและนายหน้าประกันวินาศภัย", False),
         ("รหัสโครงการ", True), ("VIRY-REG-2026-ENT", False)],
        [("เวอร์ชันเอกสาร", True), (f"Version {version} (Production Ready)", False),
         ("วันที่จัดทำ", True), (date_str, False)],
        [("Git Repository", True), ("https://github.com/ednakrabgit/register_form", False),
         ("สถานะเอกสาร", True), ("Approved / Official Baseline", False)],
        [("ระบบฐานข้อมูล (RDBMS)", True), ("Microsoft SQL Server (ไม่ใช้ MySQL แล้ว)", False),
         ("ระดับชั้นความลับ", True), ("Internal Confidential (ใช้งานภายในองค์กร)", False)],
        [("องค์กรเจ้าของ", True), ("บมจ. วิริยะประกันภัย (Viriyah Insurance)", False),
         ("กลุ่มเป้าหมาย", True), ("ทีมผู้บริหาร, Product Owners, Developers, DBAs, Auditors", False)]
    ]

    for r_idx, row in enumerate(meta_data):
        for c_idx, (text, is_label) in enumerate(row):
            cell = meta_table.cell(r_idx, c_idx)
            set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            run = p.add_run(text)
            run.font.name = "Cordia New"
            run.font.size = Pt(10.5)
            if is_label:
                set_cell_background(cell, "F1F5F9")
                run.font.bold = True
                run.font.color.rgb = DARK_TEXT_RGB
            else:
                set_cell_background(cell, "FFFFFF")
                run.font.color.rgb = DARK_TEXT_RGB

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(12)
    p_sp.paragraph_format.space_after = Pt(6)

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Cordia New"
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = PRIMARY_RGB
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Cordia New"
    run.font.size = Pt(13.5)
    run.font.bold = True
    run.font.color.rgb = SECONDARY_RGB
    return p

def add_heading_3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Cordia New"
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = DARK_TEXT_RGB
    return p

def add_paragraph(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    run.font.name = "Cordia New"
    run.font.size = Pt(11)
    run.font.color.rgb = DARK_TEXT_RGB
    return p

def add_bullet(doc, bold_prefix, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_b = p.add_run(bold_prefix + ": ")
        r_b.font.name = "Cordia New"
        r_b.font.size = Pt(11)
        r_b.font.bold = True
        r_b.font.color.rgb = DARK_TEXT_RGB
    r_t = p.add_run(text)
    r_t.font.name = "Cordia New"
    r_t.font.size = Pt(11)
    r_t.font.color.rgb = DARK_TEXT_RGB
    return p

def add_callout(doc, title, text, callout_type="info"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    
    bg_color = "EFF6FF" # Blue
    border_color = "2563EB"
    prefix = "📌 หมายเหตุสำคัญ: "
    if callout_type == "warning":
        bg_color = "FFFBEB"
        border_color = "D97706"
        prefix = "⚠️ ข้อควรระวังและเกณฑ์บังคับ: "
    elif callout_type == "success":
        bg_color = "ECFDF5"
        border_color = "059669"
        prefix = "✅ จุดเด่นและข้อได้เปรียบ: "

    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    
    # Custom left thick border
    tcPr = cell._element.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    
    left_b = OxmlElement('w:left')
    left_b.set(qn('w:val'), 'single')
    left_b.set(qn('w:sz'), '24')
    left_b.set(qn('w:space'), '0')
    left_b.set(qn('w:color'), border_color)
    tcBorders.append(left_b)

    for side in ['top', 'bottom', 'right']:
        b = OxmlElement(f'w:{side}')
        b.set(qn('w:val'), 'none')
        tcBorders.append(b)
    tcPr.append(tcBorders)

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    
    r_title = p.add_run(prefix + title + "\n")
    r_title.font.name = "Cordia New"
    r_title.font.size = Pt(11)
    r_title.font.bold = True
    r_title.font.color.rgb = DARK_TEXT_RGB

    r_text = p.add_run(text)
    r_text.font.name = "Cordia New"
    r_text.font.size = Pt(10.5)
    r_text.font.color.rgb = DARK_TEXT_RGB

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(4)
    p_sp.paragraph_format.space_after = Pt(4)

def add_table_data(doc, headers, rows, col_widths=None):
    tbl = doc.add_table(rows=len(rows) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl, COLOR_BORDER_HEX, "4")

    # Header Row
    hdr_cells = tbl.rows[0].cells
    for i, h in enumerate(headers):
        cell = hdr_cells[i]
        set_cell_background(cell, COLOR_PRIMARY_HEX)
        set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(h)
        run.font.name = "Cordia New"
        run.font.size = Pt(10.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)

    # Data Rows
    for r_idx, row_data in enumerate(rows):
        row_cells = tbl.rows[r_idx + 1].cells
        bg = COLOR_LIGHT_BG_HEX if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            cell = row_cells[c_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=70, bottom=70, left=120, right=120)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            run = p.add_run(str(val))
            run.font.name = "Cordia New"
            run.font.size = Pt(10)
            run.font.color.rgb = DARK_TEXT_RGB

    if col_widths:
        for row in tbl.rows:
            for idx, width in enumerate(col_widths):
                row.cells[idx].width = width

    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(4)
    p_after.paragraph_format.space_after = Pt(4)
    return tbl

def add_diagram_picture(doc, img_path, caption="", width_inch=6.2):
    import os
    if os.path.exists(img_path):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run_img = p.add_run()
        run_img.add_picture(img_path, width=Inches(width_inch))
        if caption:
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(2)
            p_cap.paragraph_format.space_after = Pt(8)
            run_cap = p_cap.add_run(caption)
            run_cap.font.name = "Cordia New"
            run_cap.font.size = Pt(9.5)
            run_cap.font.italic = True
            run_cap.font.color.rgb = MUTED_TEXT_RGB
        return p
    return None

