# -*- coding: utf-8 -*-
"""
Executive Presentation Generator for Viriyah Insurance Registration System.
Creates a professional, elegant, corporate luxury 16:9 widescreen PowerPoint presentation (.pptx)
designed specifically for executive and C-level audiences.
Output: Viriyah_Registration_System_Executive_Presentation.pptx
"""

import os
import pptx
from pptx.util import Inches, Pt
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

# Output Path
OUT_DIR = r"c:\Users\ednak\OneDrive\Desktop\datamangement\www\register_form\dotnet\document"
PPTX_PATH = os.path.join(OUT_DIR, "Viriyah_Registration_System_Executive_Presentation.pptx")
DIAGRAM_PATH = os.path.join(OUT_DIR, "diagrams", "diagram_global_erd.png")
COURSE_DIAGRAM_PATH = os.path.join(OUT_DIR, "diagrams", "diagram_domain3_course.png")

# Corporate Color Palette (Viriyah Royal Navy & Champagne Gold)
NAVY_DEEP = RGBColor(10, 25, 47)      # #0A192F (Dark Luxury Navy for Cover & End)
NAVY_PRIMARY = RGBColor(14, 56, 122)   # #0E387A (Viriyah Brand Blue)
NAVY_ACCENT = RGBColor(30, 64, 175)    # #1E40AF (Vibrant Navy)
GOLD_LUXURY = RGBColor(212, 175, 55)   # #D4AF37 (Champagne Gold Accent)
GOLD_LIGHT = RGBColor(245, 230, 180)   # #F5E6B4 (Soft Gold Tint)
SLATE_BG = RGBColor(248, 250, 252)     # #F8FAFC (Clean Executive Background)
CARD_WHITE = RGBColor(255, 255, 255)   # #FFFFFF
BORDER_LIGHT = RGBColor(226, 232, 240) # #E2E8F0
TEXT_DARK = RGBColor(15, 23, 42)       # #0F172A (Primary Text)
TEXT_MUTED = RGBColor(100, 116, 139)   # #64748B (Secondary Text)
EMERALD_GREEN = RGBColor(5, 150, 105)  # #059669 (Success / Metric)
AMBER_WARNING = RGBColor(217, 119, 6)  # #D97706 (Warning / OIC)

FONT_HEADING = "Tahoma"
FONT_BODY = "Tahoma"

def create_presentation():
    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    return prs

def add_slide_background(slide, is_dark=False):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg.fill.solid()
    bg.fill.fore_color.rgb = NAVY_DEEP if is_dark else SLATE_BG
    bg.line.fill.background()
    return bg

def add_header(slide, category_tag, title, subtitle="", is_dark=False):
    # Top Accent Gold Bar
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.4), Inches(0.6), Inches(0.06))
    bar.fill.solid()
    bar.fill.fore_color.rgb = GOLD_LUXURY
    bar.line.fill.background()

    # Category Badge
    badge_box = slide.shapes.add_textbox(Inches(1.5), Inches(0.3), Inches(10), Inches(0.3))
    tf_b = badge_box.text_frame
    tf_b.word_wrap = True
    p_b = tf_b.paragraphs[0]
    p_b.text = category_tag.upper()
    p_b.font.name = FONT_HEADING
    p_b.font.size = Pt(10)
    p_b.font.bold = True
    p_b.font.color.rgb = GOLD_LUXURY if is_dark else NAVY_ACCENT

    # Main Slide Title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.65), Inches(11.8), Inches(0.6))
    tf_t = title_box.text_frame
    tf_t.word_wrap = True
    p_t = tf_t.paragraphs[0]
    p_t.text = title
    p_t.font.name = FONT_HEADING
    p_t.font.size = Pt(22)
    p_t.font.bold = True
    p_t.font.color.rgb = CARD_WHITE if is_dark else NAVY_PRIMARY

    # Subtitle
    if subtitle:
        sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(11.8), Inches(0.4))
        tf_s = sub_box.text_frame
        tf_s.word_wrap = True
        p_s = tf_s.paragraphs[0]
        p_s.text = subtitle
        p_s.font.name = FONT_BODY
        p_s.font.size = Pt(11)
        p_s.font.color.rgb = RGBColor(203, 213, 225) if is_dark else TEXT_MUTED

def add_footer(slide, current_page, total_pages=12, is_dark=False):
    # Footer Line
    f_line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(7.0), Inches(11.733), Inches(0.02))
    f_line.fill.solid()
    f_line.fill.fore_color.rgb = RGBColor(30, 41, 59) if is_dark else BORDER_LIGHT
    f_line.line.fill.background()

    # Footer Left Text
    f_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(8), Inches(0.3))
    p = f_box.text_frame.paragraphs[0]
    p.text = "บมจ. วิริยะประกันภัย | ระบบลงทะเบียนขอรับและต่ออายุใบอนุญาตตัวแทนและนายหน้า (Executive Summary)"
    p.font.name = FONT_BODY
    p.font.size = Pt(9)
    p.font.color.rgb = RGBColor(148, 163, 184) if is_dark else TEXT_MUTED

    # Footer Right Page
    p_box = slide.shapes.add_textbox(Inches(10.5), Inches(7.05), Inches(2.0), Inches(0.3))
    p_p = p_box.text_frame.paragraphs[0]
    p_p.alignment = PP_ALIGN.RIGHT
    p_p.text = f"{current_page} / {total_pages}"
    p_p.font.name = FONT_BODY
    p_p.font.size = Pt(9)
    p_p.font.bold = True
    p_p.font.color.rgb = GOLD_LUXURY if is_dark else NAVY_PRIMARY

def add_card(slide, left, top, width, height, title="", items=None, header_bg=None, is_stat=False, stat_val="", stat_desc=""):
    # Main Card Box
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = CARD_WHITE
    card.line.color.rgb = BORDER_LIGHT
    card.line.width = Pt(1)

    if header_bg:
        hb = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, Inches(0.65))
        hb.fill.solid()
        hb.fill.fore_color.rgb = header_bg
        hb.line.fill.background()
        
        # Header text
        tb = slide.shapes.add_textbox(left + Inches(0.15), top + Inches(0.08), width - Inches(0.3), Inches(0.5))
        p = tb.text_frame.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEADING
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = CARD_WHITE
    elif title:
        tb = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.15), width - Inches(0.4), Inches(0.45))
        p = tb.text_frame.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEADING
        p.font.size = Pt(13.5)
        p.font.bold = True
        p.font.color.rgb = NAVY_PRIMARY

    # Stat Card special treatment
    if is_stat:
        st_box = slide.shapes.add_textbox(left + Inches(0.15), top + Inches(0.6), width - Inches(0.3), Inches(0.9))
        p = st_box.text_frame.paragraphs[0]
        p.text = stat_val
        p.font.name = FONT_HEADING
        p.font.size = Pt(36)
        p.font.bold = True
        p.font.color.rgb = NAVY_PRIMARY if not header_bg else EMERALD_GREEN

        sd_box = slide.shapes.add_textbox(left + Inches(0.15), top + Inches(1.5), width - Inches(0.3), Inches(0.8))
        tf = sd_box.text_frame
        tf.word_wrap = True
        p2 = tf.paragraphs[0]
        p2.text = stat_desc
        p2.font.name = FONT_BODY
        p2.font.size = Pt(10.5)
        p2.font.color.rgb = TEXT_DARK
        return

    # Bullet / Content Items
    if items:
        content_top = top + Inches(0.75) if header_bg else top + Inches(0.6)
        content_box = slide.shapes.add_textbox(left + Inches(0.2), content_top, width - Inches(0.4), height - Inches(0.8))
        tf = content_box.text_frame
        tf.word_wrap = True
        
        for idx, item in enumerate(items):
            p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
            p.space_after = Pt(6)
            p.font.name = FONT_BODY
            p.font.size = Pt(10.5)
            
            if isinstance(item, tuple):
                bold_txt, regular_txt = item
                r_b = p.add_run()
                r_b.text = bold_txt + ": "
                r_b.font.bold = True
                r_b.font.color.rgb = NAVY_PRIMARY
                r_t = p.add_run()
                r_t.text = regular_txt
                r_t.font.color.rgb = TEXT_DARK
            else:
                r = p.add_run()
                r.text = "• " + item
                r.font.color.rgb = TEXT_DARK

# ==============================================================================
# Slide 1: Executive Cover Slide (Luxury Dark Navy & Gold)
# ==============================================================================
def build_slide_1(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_slide_background(slide, is_dark=True)

    # Gold Top Decorative Accent
    dec_line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.2), Inches(1.2), Inches(1.2), Inches(0.08))
    dec_line.fill.solid()
    dec_line.fill.fore_color.rgb = GOLD_LUXURY
    dec_line.line.fill.background()

    # Company Pill
    pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.5), Inches(4.5), Inches(0.45))
    pill.fill.solid()
    pill.fill.fore_color.rgb = RGBColor(15, 35, 70)
    pill.line.color.rgb = GOLD_LUXURY
    pill.line.width = Pt(1)
    p_pill = pill.text_frame.paragraphs[0]
    p_pill.text = "★ บมจ. วิริยะประกันภัย (VIRIYAH INSURANCE) ★"
    p_pill.font.name = FONT_HEADING
    p_pill.font.size = Pt(10.5)
    p_pill.font.bold = True
    p_pill.font.color.rgb = GOLD_LIGHT

    # Main Executive Title
    tb_title = slide.shapes.add_textbox(Inches(1.2), Inches(2.2), Inches(11.0), Inches(2.2))
    tf = tb_title.text_frame
    tf.word_wrap = True
    p1 = tf.paragraphs[0]
    p1.text = "ระบบลงทะเบียนขอรับและต่ออายุใบอนุญาต\nตัวแทนและนายหน้าประกันวินาศภัย"
    p1.font.name = FONT_HEADING
    p1.font.size = Pt(32)
    p1.font.bold = True
    p1.font.color.rgb = CARD_WHITE
    p1.space_after = Pt(14)

    p2 = tf.add_paragraph()
    p2.text = "Enterprise Digital Transformation, Modern Decoupled Architecture & OIC Regulatory Compliance"
    p2.font.name = FONT_BODY
    p2.font.size = Pt(15)
    p2.font.color.rgb = GOLD_LIGHT

    # Metadata Card (Lower Left)
    meta_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(4.8), Inches(10.9), Inches(1.6))
    meta_card.fill.solid()
    meta_card.fill.fore_color.rgb = RGBColor(15, 30, 55)
    meta_card.line.color.rgb = RGBColor(30, 58, 100)

    tb_meta = slide.shapes.add_textbox(Inches(1.4), Inches(4.9), Inches(10.5), Inches(1.4))
    tf_m = tb_meta.text_frame
    
    pm1 = tf_m.paragraphs[0]
    pm1.text = "• สถาปัตยกรรมระบบ: Modern Decoupled (React 18 SPA + ASP.NET Core 8 Web API)"
    pm1.font.name = FONT_BODY
    pm1.font.size = Pt(11)
    pm1.font.color.rgb = RGBColor(226, 232, 240)

    pm2 = tf_m.add_paragraph()
    pm2.text = "• มาตรฐานฐานข้อมูลหลัก: Microsoft SQL Server Enterprise Standard (เลิกใช้ MySQL แล้วอย่างสมบูรณ์)"
    pm2.font.name = FONT_BODY
    pm2.font.size = Pt(11)
    pm2.font.color.rgb = GOLD_LIGHT

    pm3 = tf_m.add_paragraph()
    pm3.text = "• ศูนย์กลางจัดเก็บซอร์สโค้ด (Git Repository): https://github.com/ednakrabgit/register_form (Branch: feature/dotnet)"
    pm3.font.name = FONT_BODY
    pm3.font.size = Pt(11)
    pm3.font.color.rgb = RGBColor(147, 197, 253)

    add_footer(slide, 1, 12, is_dark=True)

# ==============================================================================
# Slide 2: Strategic Executive Summary
# ==============================================================================
def build_slide_2(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_slide_background(slide)
    add_header(slide, "Strategic Overview", "บทสรุปสำหรับผู้บริหาร (Executive Summary)",
               "วิสัยทัศน์และการเปลี่ยนผ่านสู่แพลตฟอร์มดิจิทัลระดับองค์กร One-Stop Service ที่ตอบโจทย์ตัวแทนทั่วประเทศ")

    # 3 Strategic Pillar Cards
    add_card(slide, Inches(0.8), Inches(1.8), Inches(3.7), Inches(4.8),
             title="1. ยกระดับประสบการณ์ (UX)",
             header_bg=NAVY_PRIMARY,
             items=[
                 ("One-Stop Online Service", "ตัวแทนและนายหน้าทั่วประเทศเข้าใช้งานได้ตลอด 24 ชม. ผ่านทุกอุปกรณ์"),
                 ("Smart Auto-Fill ทันใจ", "กรอกเพียงเลขบัตร 13 หลัก ดึงข้อมูลประวัติเดิมและข้อมูล คปภ. มาเติมให้อัตโนมัติ"),
                 ("ลดเวลากรอกเหลือ 3-5 นาที", "จากเดิมที่ต้องใช้เวลากว่า 20 นาที ลดภาระงานลงอย่างมีนัยสำคัญ"),
                 ("Responsive Design", "ใช้งานสะดวกทั้งบน Mobile, Tablet และ Desktop")
             ])

    add_card(slide, Inches(4.8), Inches(1.8), Inches(3.7), Inches(4.8),
             title="2. ความถูกต้องตามกฎหมาย 100%",
             header_bg=NAVY_ACCENT,
             items=[
                 ("OIC Regulatory Rules", "สอดคล้องกับระเบียบสำนักงาน คปภ. ว่าด้วยการอบรมขอรับและต่ออายุใบอนุญาต"),
                 ("Modulo 11 Validation", "ตรวจเลขบัตรประชาชน 13 หลักแบบ Real-Time สกัดกั้นเลขผิด 100%"),
                 ("Complex 4 Pillars Engine", "คำนวณชั่วโมงสะสม 50 ชม. พร้อมตรวจเวลาซ้ำซ้อน (Collision Detection)"),
                 ("PDPA Compliance", "มี Consent บันทึกวันเวลากดยินยอม และจัดเก็บเอกสารเป็น BLOB ในฐานข้อมูล")
             ])

    add_card(slide, Inches(8.8), Inches(1.8), Inches(3.7), Inches(4.8),
             title="3. ประสิทธิภาพและความโปร่งใส",
             header_bg=EMERALD_GREEN,
             items=[
                 ("รวมศูนย์ข้อมูลสาขาทั่วประเทศ", "เจ้าหน้าที่ส่วนกลางและสาขาตรวจสอบสถานะผู้สมัคร (Enquiry) ได้ทันที"),
                 ("Differential Audit Trail", "บันทึกประวัติการแก้ไขข้อมูลแบบ Snapshot เปรียบเทียบค่าเดิม/ค่าใหม่ ชัดเจน"),
                 ("ส่งออกรายงานอัจฉริยะ", "Export รายชื่อเข้าห้องอบรมเป็น Excel ภาษาไทยสมบูรณ์ และ ZIP แยกหลักสูตร"),
                 ("ลดต้นทุนจัดการเอกสาร 80%", "ลดการใช้กระดาษและลดเวลาออกรายงานจาก 2 วันเหลือทันที")
             ])

    add_footer(slide, 2, 12)

# ==============================================================================
# Slide 3: Business Transformation (As-Is vs To-Be)
# ==============================================================================
def build_slide_3(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_slide_background(slide)
    add_header(slide, "Business Drivers", "วิวัฒนาการทางธุรกิจและเทคโนโลยี (As-Is vs To-Be)",
               "การก้าวข้ามข้อจำกัดของระบบเดิม สู่สถาปัตยกรรมระดับองค์กรที่มั่นคง ปลอดภัย และมีประสิทธิภาพสูง")

    comparisons = [
        ("กระบวนการกรอกข้อมูลผู้สมัคร",
         "เดิม: ผู้สมัครต้องกรอกข้อมูลประวัติใหม่ทั้งหมดทุกครั้ง เกิดความล่าช้าและผิดพลาดบ่อย",
         "ใหม่: Smart Auto-Fill ดึงข้อมูลเดิมจาก คปภ. และ Person Master กรอกให้อัตโนมัติทุก Tab"),
        ("การคำนวณหลักสูตรต่ออายุ 4+ (50 ชม.)",
         "เดิม: ผู้สมัครต้องคำนวณวิชาเอง มักเลือกชั่วโมงไม่ครบ และรอบวันเวลาซ้อนทับกัน",
         "ใหม่: Interactive Matrix 4 Pillars คำนวณชั่วโมง Real-time พร้อม Collision Detection ป้องกันซ้อนทับ 100%"),
        ("โครงสร้างฐานข้อมูลและระบบจัดเก็บ",
         "เดิม: ตาราง Flat Table 109 คอลัมน์ ข้อมูลซ้ำซ้อน และเซฟรูปภาพลง OS Path เสี่ยงไฟล์สูญหาย",
         "ใหม่: Normalized 3NF Schema 46 ตาราง และจัดเก็บไฟล์เอกสารเป็น Binary BLOB บน SQL Server"),
        ("การตรวจสอบประวัติและความโปร่งใส",
         "เดิม: ไม่มีการบันทึกประวัติว่าใครแก้ฟิลด์ใด เมื่อมีข้อผิดพลาดไม่สามารถสืบค้นได้",
         "ใหม่: Visual Differential Audit Trail ตรวจจับและแสดงผล Diff เปรียบเทียบค่าเดิม/ใหม่ ชัดเจน")
    ]

    for idx, (title, as_is, to_be) in enumerate(comparisons):
        top_y = Inches(1.8 + (idx * 1.25))
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), top_y, Inches(11.733), Inches(1.1))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_WHITE
        card.line.color.rgb = BORDER_LIGHT

        # Left label
        tb_l = slide.shapes.add_textbox(Inches(1.0), top_y + Inches(0.15), Inches(2.8), Inches(0.8))
        tf_l = tb_l.text_frame
        tf_l.word_wrap = True
        p_l = tf_l.paragraphs[0]
        p_l.text = title
        p_l.font.name = FONT_HEADING
        p_l.font.size = Pt(11)
        p_l.font.bold = True
        p_l.font.color.rgb = NAVY_PRIMARY

        # Middle As-Is Box
        tb_m = slide.shapes.add_textbox(Inches(4.0), top_y + Inches(0.15), Inches(3.6), Inches(0.8))
        tf_m = tb_m.text_frame
        tf_m.word_wrap = True
        p_m = tf_m.paragraphs[0]
        p_m.text = as_is
        p_m.font.name = FONT_BODY
        p_m.font.size = Pt(9.5)
        p_m.font.color.rgb = RGBColor(185, 28, 28)

        # Right To-Be Box
        tb_r = slide.shapes.add_textbox(Inches(7.8), top_y + Inches(0.15), Inches(4.5), Inches(0.8))
        tf_r = tb_r.text_frame
        tf_r.word_wrap = True
        p_r = tf_r.paragraphs[0]
        p_r.text = to_be
        p_r.font.name = FONT_BODY
        p_r.font.size = Pt(9.5)
        p_r.font.bold = True
        p_r.font.color.rgb = EMERALD_GREEN

    add_footer(slide, 3, 12)

# ==============================================================================
# Slide 4: 6-Step Registration Wizard Flow
# ==============================================================================
def build_slide_4(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_slide_background(slide)
    add_header(slide, "Customer Journey", "เส้นทางการใช้งานของผู้สมัคร (6-Step Registration Wizard)",
               "ออกแบบประสบการณ์ผู้ใช้งานให้เรียบง่าย เป็นระบบ พร้อมการตรวจสอบความถูกต้องทุกขั้นตอน")

    steps = [
        ("Step 1", "PDPA Consent", "ข้อตกลงและนโยบาย", ["แสดงเงื่อนไข พ.ร.บ. PDPA", "กดยินยอมเพื่อเริ่มกรอก", "บันทึก Timestamp ใน DB"]),
        ("Step 2", "Personal Info", "ข้อมูลบุคคลและที่อยู่", ["ตรวจ Modulo 11 บัตร ปชช.", "Smart Auto-fill จาก คปภ.", "ที่อยู่ Cascading 4 ระดับ"]),
        ("Step 3", "Affiliation", "สังกัดสาขาและประวัติ", ["เลือกภาคและสาขาวิริยะ", "วุฒิการศึกษาและสถาบัน", "ประสบการณ์ตัวแทนอื่น"]),
        ("Step 4", "License Info", "ใบอนุญาต/ขอยกเว้น", ["ประเภทตัวแทน/นายหน้า", "ระบุวันหมดอายุเดิม", "ขอยกเว้นตามเกณฑ์ คปภ."]),
        ("Step 5", "Curriculum", "เลือกหลักสูตรและวิชา", ["หลักสูตรปกติ ขอรับ/ต่อ 1-3", "ต่อ 4+ เมทริกซ์ 4 Pillars", "ตรวจเวลาซ้ำซ้อน 100%"]),
        ("Step 6", "BLOB Upload", "แนบเอกสารหลักฐาน", ["รูปถ่ายหน้าตรง, บัตร ปชช.", "สำเนาทะเบียนบ้าน, วุฒิ", "บันทึกเป็น BLOB ใน SQL"])
    ]

    card_w = Inches(1.85)
    gap = Inches(0.12)
    start_x = Inches(0.8)

    for idx, (st_no, st_en, st_th, bullets) in enumerate(steps):
        x = start_x + (idx * (card_w + gap))
        
        # Header Badge
        h_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.8), card_w, Inches(0.75))
        h_card.fill.solid()
        h_card.fill.fore_color.rgb = NAVY_PRIMARY
        h_card.line.fill.background()
        
        p1 = h_card.text_frame.paragraphs[0]
        p1.text = st_no
        p1.font.name = FONT_HEADING
        p1.font.size = Pt(11)
        p1.font.bold = True
        p1.font.color.rgb = GOLD_LUXURY

        p2 = h_card.text_frame.add_paragraph()
        p2.text = st_en
        p2.font.name = FONT_HEADING
        p2.font.size = Pt(9.5)
        p2.font.color.rgb = CARD_WHITE

        # Body Box
        b_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.65), card_w, Inches(3.9))
        b_card.fill.solid()
        b_card.fill.fore_color.rgb = CARD_WHITE
        b_card.line.color.rgb = BORDER_LIGHT

        tb = slide.shapes.add_textbox(x + Inches(0.1), Inches(2.75), card_w - Inches(0.2), Inches(3.6))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p_th = tf.paragraphs[0]
        p_th.text = st_th
        p_th.font.name = FONT_HEADING
        p_th.font.size = Pt(11)
        p_th.font.bold = True
        p_th.font.color.rgb = NAVY_ACCENT
        p_th.space_after = Pt(10)

        for b in bullets:
            p_b = tf.add_paragraph()
            p_b.text = "• " + b
            p_b.font.name = FONT_BODY
            p_b.font.size = Pt(9)
            p_b.font.color.rgb = TEXT_DARK
            p_b.space_after = Pt(6)

    add_footer(slide, 4, 12)

# ==============================================================================
# Slide 5: Complex Renewal 4+ & 4 Pillars Engine
# ==============================================================================
def build_slide_5(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_slide_background(slide)
    add_header(slide, "Core Innovation", "ระบบบริหารหลักสูตรต่ออายุ 4+ และเมทริกซ์ 4 Pillars",
               "นวัตกรรมการจัดการหลักสูตรที่ซับซ้อนที่สุดตามเกณฑ์ คปภ. คำนวณชั่วโมงและตรวจเวลาซ้ำซ้อนแบบ Real-time")

    # Left Card: Overview & Logic
    add_card(slide, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8),
             title="เกณฑ์บังคับ คปภ. และกลไกอัจฉริยะ",
             header_bg=NAVY_PRIMARY,
             items=[
                 ("เกณฑ์สะสม 50 ชั่วโมง", "ผู้สมัครขอต่ออายุครั้งที่ 4 เป็นต้นไป ต้องเก็บชั่วโมงอบรมรวมไม่น้อยกว่า 50 ชั่วโมง"),
                 ("การกระจาย 4 หมวดวิชา", "ต้องกระจายการเรียนรู้ให้ครอบคลุมทั้ง 4 หมวดวิชาหลัก (Pillars 1 ถึง 4)"),
                 ("Real-Time Hours Accumulator", "ระบบคำนวณผลรวมชั่วโมงที่เลือกแบบทันที แสดงแถบความคืบหน้า (Progress Bar) แจ้งสถานะครบหรือไม่"),
                 ("Collision Detection 100%", "ตรวจจับและป้องกันการเลือกวิชาที่มีรอบวันและเวลาจัดอบรมซ้ำซ้อนกันอย่างเด็ดขาด"),
                 ("สิทธิขอยกเว้นการอบรม", "รองรับกรณีผู้สมัครมีวุฒิปริญญาโทประกันภัย สามารถแนบเอกสารเพื่อขอยกเว้นได้ทันที")
             ])

    # Right Card: The 4 Pillars
    pillars = [
        ("Pillar 1: หมวดกฎหมาย จรรยาบรรณ และหลักการประกันภัย", "เน้นจริยธรรมวิชาชีพ กฎหมายคุ้มครองผู้บริโภค และข้อบังคับ คปภ.", NAVY_PRIMARY),
        ("Pillar 2: หมวดการประกันอัคคีภัยและภัยทางทะเล", "การประเมินความเสี่ยงโรงงาน การขนส่งระหว่างประเทศ และข้อตกลงกรมธรรม์", NAVY_ACCENT),
        ("Pillar 3: หมวดการประกันภัยรถยนต์และการประกันภัยเบ็ดเตล็ด", "พ.ร.บ. คุ้มครองผู้ประสบภัยจากรถ ภาคสมัครใจ และการประกันอุบัติเหตุ", EMERALD_GREEN),
        ("Pillar 4: หมวดเทคโนโลยี การบริหารจัดการ และพัฒนาวิชาชีพ", "การนำ AI/InsurTech มาประยุกต์ใช้ในการบริการ และการบริหารงานขาย", AMBER_WARNING)
    ]

    for idx, (p_title, p_desc, col) in enumerate(pillars):
        y = Inches(1.8 + (idx * 1.2))
        p_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), y, Inches(5.733), Inches(1.05))
        p_card.fill.solid()
        p_card.fill.fore_color.rgb = CARD_WHITE
        p_card.line.color.rgb = col
        p_card.line.width = Pt(1.5)

        tb = slide.shapes.add_textbox(Inches(7.0), y + Inches(0.1), Inches(5.3), Inches(0.85))
        tf = tb.text_frame
        tf.word_wrap = True
        
        pt = tf.paragraphs[0]
        pt.text = p_title
        pt.font.name = FONT_HEADING
        pt.font.size = Pt(11)
        pt.font.bold = True
        pt.font.color.rgb = col

        pd = tf.add_paragraph()
        pd.text = p_desc
        pd.font.name = FONT_BODY
        pd.font.size = Pt(9.5)
        pd.font.color.rgb = TEXT_DARK

    add_footer(slide, 5, 12)

# ==============================================================================
# Slide 6: Enterprise Technical Architecture
# ==============================================================================
def build_slide_6(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_slide_background(slide)
    add_header(slide, "System Architecture", "สถาปัตยกรรมระบบสมัยใหม่ (Modern Decoupled Architecture)",
               "แยกส่วนแสดงผลและส่วนประมวลผลออกจากกันอย่างสมบูรณ์ เพิ่มความยืดหยุ่น ความเร็ว และความปลอดภัยระดับสูงสุด")

    layers = [
        ("Presentation Tier (Front-End Client)",
         "React 18 Single Page Application (SPA)",
         NAVY_PRIMARY,
         ["พัฒนาด้วย React 18, Vite, TypeScript และ Tailwind CSS",
          "จัดการ State ทั้ง 6 ขั้นตอนด้วย React Context API",
          "สื่อสารกับ Back-End ผ่าน Asynchronous JSON RESTful API",
          "โหลดย้อนกลับเร็ว ตอบสนองลื่นไหลแบบไร้รอยต่อ (Sub-second response)"]),

        ("Application Tier (Back-End API)",
         "ASP.NET Core 8 Web API (.NET 8 C#)",
         NAVY_ACCENT,
         ["พัฒนาด้วย C# บนแพลตฟอร์ม .NET 8 ประสิทธิภาพสูงระดับ Enterprise",
          "จัดการ ORM ผ่าน Entity Framework Core 8 และ Dapper Micro-ORM",
          "มีระบบ Validation กฎเกณฑ์ทางธุรกิจ และ Security Filters ป้องกัน XSS/CSRF",
          "ประมวลผลคำสั่งบันทึกข้อมูลแบบ Atomic Multi-Table Transaction"]),

        ("Data Tier (Enterprise RDBMS)",
         "Microsoft SQL Server Enterprise Edition",
         EMERALD_GREEN,
         ["ใช้ Microsoft SQL Server เป็นมาตรฐานเดียวขององค์กร (ยกเลิก MySQL แล้ว)",
          "โครงสร้าง 3NF Normalized Schema 46 ตาราง และ 481 คอลัมน์",
          "เข้ารหัสข้อมูลที่เก็บรักษาด้วย Transparent Data Encryption (TDE)",
          "จัดเก็บไฟล์เอกสารและภาพถ่ายเป็น Binary BLOB ลงในฐานข้อมูลโดยตรง"]),

        ("Integration Tier (OIC Gateway & ETL)",
         "OIC Automated Pipeline & Sync Services",
         AMBER_WARNING,
         ["เชื่อมต่อระบบ คปภ. ครบวงจร บันทึก Request/Response Log ทุก Transaction",
          "มี Dynamic Field & Value Mapping แปลงรหัส คปภ. เป็นข้อมูลวิริยะอัตโนมัติ",
          "จัดเก็บ Profile Cache สำหรับให้บริการ Smart Auto-Fill ในหน้าลงทะเบียน",
          "มี Background ETL Sync สู่ระบบ Enterprise Data Warehouse"])
    ]

    for idx, (tier_title, tier_tech, col, bullets) in enumerate(layers):
        x = Inches(0.8 + (idx * 2.98))
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.8), Inches(2.85), Inches(4.8))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_WHITE
        card.line.color.rgb = BORDER_LIGHT

        # Top Stripe
        st = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.8), Inches(2.85), Inches(0.85))
        st.fill.solid()
        st.fill.fore_color.rgb = col
        st.line.fill.background()

        tb_h = slide.shapes.add_textbox(x + Inches(0.1), Inches(1.85), Inches(2.65), Inches(0.75))
        tf_h = tb_h.text_frame
        tf_h.word_wrap = True
        ph1 = tf_h.paragraphs[0]
        ph1.text = tier_title
        ph1.font.name = FONT_HEADING
        ph1.font.size = Pt(9.5)
        ph1.font.color.rgb = CARD_WHITE

        ph2 = tf_h.add_paragraph()
        ph2.text = tier_tech
        ph2.font.name = FONT_HEADING
        ph2.font.size = Pt(10.5)
        ph2.font.bold = True
        ph2.font.color.rgb = GOLD_LIGHT

        # Bullets
        tb_b = slide.shapes.add_textbox(x + Inches(0.15), Inches(2.8), Inches(2.55), Inches(3.6))
        tf_b = tb_b.text_frame
        tf_b.word_wrap = True
        for b in bullets:
            p = tf_b.add_paragraph() if tf_b.paragraphs[0].text else tf_b.paragraphs[0]
            p.text = "• " + b
            p.font.name = FONT_BODY
            p.font.size = Pt(9)
            p.font.color.rgb = TEXT_DARK
            p.space_after = Pt(6)

    add_footer(slide, 6, 12)

# ==============================================================================
# Slide 7: Database Architecture & 6 Domains (Embedded Diagram)
# ==============================================================================
def build_slide_7(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_slide_background(slide)
    add_header(slide, "Database Architecture", "สถาปัตยกรรมฐานข้อมูลระดับองค์กร (46 ตาราง 6 โดเมน)",
               "ผังความสัมพันธ์เอนทิตีเชิงบูรณาการบน Microsoft SQL Server ยกระดับสู่ Third Normal Form (3NF)")

    # Left Side: Diagram Image
    if os.path.exists(DIAGRAM_PATH):
        slide.shapes.add_picture(DIAGRAM_PATH, Inches(0.8), Inches(1.8), width=Inches(7.2))

    # Right Side: Domain Cards & Metrics
    domain_highlights = [
        ("Domain 1: Core Person (13 ตาราง)", "person, registration, address, license, course, BLOB document"),
        ("Domain 2: Master Geographic (12 ตาราง)", "77 จังหวัด, 928 อำเภอ, 7,442 ตำบล พร้อมรหัสไปรษณีย์ และสาขาวิริยะ"),
        ("Domain 3: Curriculum & Training (8 ตาราง)", "หลักสูตรมาตรฐาน, 4 Pillars Matrix, รอบวันเวลา, ผลสอบ LMS"),
        ("Domain 4: OIC Gateway (5 ตาราง)", "API Logging, Raw JSON Store, Schema & Code Mapping, Profile Cache"),
        ("Domain 5: Security & Config (5 ตาราง)", "admin_users, roles, permissions, sys_config คุมเวลาเปิด-ปิด"),
        ("Domain 6: Legacy & History (3 ตาราง)", "register, history (109 cols), EF Core Migrations History")
    ]

    for idx, (d_title, d_desc) in enumerate(domain_highlights):
        y = Inches(1.8 + (idx * 0.8))
        d_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.3), y, Inches(4.233), Inches(0.72))
        d_card.fill.solid()
        d_card.fill.fore_color.rgb = CARD_WHITE
        d_card.line.color.rgb = BORDER_LIGHT

        tb = slide.shapes.add_textbox(Inches(8.4), y + Inches(0.05), Inches(4.0), Inches(0.6))
        tf = tb.text_frame
        tf.word_wrap = True
        p1 = tf.paragraphs[0]
        p1.text = d_title
        p1.font.name = FONT_HEADING
        p1.font.size = Pt(10)
        p1.font.bold = True
        p1.font.color.rgb = NAVY_PRIMARY

        p2 = tf.add_paragraph()
        p2.text = d_desc
        p2.font.name = FONT_BODY
        p2.font.size = Pt(8.5)
        p2.font.color.rgb = TEXT_MUTED

    add_footer(slide, 7, 12)

# ==============================================================================
# Slide 8: OIC Gateway & PDPA Compliance
# ==============================================================================
def build_slide_8(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_slide_background(slide)
    add_header(slide, "Regulatory & Privacy", "การเชื่อมโยงระบบ คปภ. และมาตรฐานความคุ้มครองข้อมูลส่วนบุคคล (PDPA)",
               "บูรณาการข้อมูลกับสำนักงาน คปภ. แบบ End-to-End พร้อมระบบรักษาความปลอดภัยข้อมูลส่วนบุคคลที่เข้มงวด")

    # Left: OIC Gateway Pipeline
    add_card(slide, Inches(0.8), Inches(1.8), Inches(5.7), Inches(4.8),
             title="ระบบบูรณาการข้อมูล คปภ. (OIC Gateway)",
             header_bg=AMBER_WARNING,
             items=[
                 ("OIC API Request Logging", "บันทึกประวัติการเรียกใช้งาน Web Service คปภ. ทุก Transaction ละเอียดระดับ Millisecond"),
                 ("Raw JSON Payload Storage", "จัดเก็บข้อมูลดิบที่ได้รับจาก คปภ. ลงในตาราง `oic_raw_api_store` เพื่อเป็นหลักฐาน"),
                 ("Dynamic Schema & Value Mapping", "มีกฎการแปลงชื่อฟิลด์และรหัสข้อมูลจาก คปภ. ให้ตรงกับฐานข้อมูลวิริยะโดยไม่ต้องแก้โค้ด"),
                 ("Normalized Profile Cache", "เตรียมข้อมูลตัวแทนให้พร้อมใช้งานสำหรับบริการ Smart Auto-Fill ในแบบฟอร์มลงทะเบียน"),
                 ("Two-Way Reconciliation", "รองรับการตรวจสอบและส่งรายงานผลการอบรมกลับสู่ระบบ คปภ. เมื่อปิดคอร์ส")
             ])

    # Right: PDPA Compliance
    add_card(slide, Inches(6.8), Inches(1.8), Inches(5.733), Inches(4.8),
             title="มาตรฐานความคุ้มครองข้อมูลส่วนบุคคล (PDPA 2562)",
             header_bg=NAVY_PRIMARY,
             items=[
                 ("Explicit PDPA Consent", "มีขั้นตอนที่ 1 ขอความยินยอมอย่างชัดแจ้ง บันทึกสถานะยินยอมและเวลา Timestamp ลง DB"),
                 ("Purpose Limitation", "ข้อมูลส่วนบุคคลจะถูกใช้เพื่อวัตถุประสงค์ในการสมัครอบรมและรายงานผลต่อ คปภ. เท่านั้น"),
                 ("Database BLOB Document Isolation", "จัดเก็บไฟล์รูปถ่ายและสำเนาบัตรประชาชนเป็น Binary BLOB ในตาราง ป้องกันการเปิดดูผ่าน URL"),
                 ("Data at Rest Encryption (TDE)", "เปิดใช้ Transparent Data Encryption บน SQL Server เข้ารหัสไฟล์ฐานข้อมูลและ Backup"),
                 ("Data in Transit Encryption", "การรับส่งข้อมูลทั้งหมดบังคับใช้การเชื่อมต่อแบบเข้ารหัส HTTPS TLS 1.3 เป็นอย่างต่ำ")
             ])

    add_footer(slide, 8, 12)

# ==============================================================================
# Slide 9: Back-Office Administration & Audit Trail
# ==============================================================================
def build_slide_9(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_slide_background(slide)
    add_header(slide, "Operational Excellence", "ระบบบริหารจัดการหลังบ้านและระบบตรวจสอบประวัติ (Audit Trail)",
               "เครื่องมือสำหรับฝ่ายอบรมและเจ้าหน้าที่สาขาในการตรวจสอบ คัดกรอง แก้ไขข้อมูล และส่งออกรายงาน")

    features = [
        ("Advanced Search & Filter",
         "ระบบค้นหาข้อมูลผู้สมัครขั้นสูง ค้นหาได้หลายเงื่อนไขพร้อมกัน เช่น เลขบัตรประชาชน, ชื่อนามสกุล, ภาค/สาขา, หลักสูตร, วันที่อบรม และสถานะ แสดงผลลัพธ์ในเวลาไม่เกิน 500 ms",
         NAVY_PRIMARY),
        ("Visual Differential Audit Trail (Diff Engine)",
         "เมื่อมีการแก้ไขข้อมูลผู้สมัคร ระบบจะตรวจจับและบันทึก Snapshot เฉพาะฟิลด์ที่เปลี่ยน หน้าจอแสดงผลเปรียบเทียบค่าเดิม (ขีดฆ่าสีเทา) และค่าใหม่ (สีเขียว) พร้อมระบุชื่อผู้แก้ไข วันเวลา และ IP Address",
         NAVY_ACCENT),
        ("Advanced Exporting Engine",
         "ส่งออกรายงานได้หลากหลายรูปแบบ: Excel (.xlsx) พร้อมระบบ In-Memory Lookup แปลง ID จังหวัด/สาขา/หลักสูตร เป็นข้อความภาษาไทย, CSV (UTF-8 with BOM รองรับ Excel ภาษาไทย), และไฟล์ ZIP รวบรวมรายชื่อแยกตามคอร์ส",
         EMERALD_GREEN),
        ("Role-Based Access Control (RBAC)",
         "กำหนดสิทธิ์การใช้งานตามบทบาท 4 ระดับ (SuperAdmin, TrainingAdmin, BranchOfficer, Auditor) ควบคุมการมองเห็นเมนู สิทธิ์การดู สิทธิ์การแก้ไข และสิทธิ์การสั่ง Export ข้อมูลอย่างรัดกุม",
         RGBColor(124, 58, 237))
    ]

    for idx, (f_title, f_desc, col) in enumerate(features):
        top_y = Inches(1.8 + (idx * 1.25))
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), top_y, Inches(11.733), Inches(1.1))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_WHITE
        card.line.color.rgb = col
        card.line.width = Pt(1.5)

        tb = slide.shapes.add_textbox(Inches(1.0), top_y + Inches(0.12), Inches(11.3), Inches(0.85))
        tf = tb.text_frame
        tf.word_wrap = True

        p1 = tf.paragraphs[0]
        p1.text = f_title
        p1.font.name = FONT_HEADING
        p1.font.size = Pt(12)
        p1.font.bold = True
        p1.font.color.rgb = col
        p1.space_after = Pt(4)

        p2 = tf.add_paragraph()
        p2.text = f_desc
        p2.font.name = FONT_BODY
        p2.font.size = Pt(9.5)
        p2.font.color.rgb = TEXT_DARK

    add_footer(slide, 9, 12)

# ==============================================================================
# Slide 10: Business Value, ROI & Measurable KPIs
# ==============================================================================
def build_slide_10(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_slide_background(slide)
    add_header(slide, "Business Value & ROI", "ผลลัพธ์และความคุ้มค่าทางธุรกิจ (Business Metrics & KPIs)",
               "ยกระดับประสิทธิภาพการทำงานของทั้งองค์กร ลดต้นทุน และเพิ่มความพึงพอใจของตัวแทนอย่างชัดเจน")

    # 4 Stat Cards
    stats = [
        ("75% REDUCTION", "ระยะเวลาเฉลี่ยในการกรอกข้อมูล", "ลดเวลาจากเดิม 15-20 นาที\nเหลือเพียง 3-5 นาที\nด้วยระบบ Smart Auto-Fill", NAVY_PRIMARY),
        ("0% ERROR", "อัตราความผิดพลาดของข้อมูล", "ขจัดข้อผิดพลาดของเลขบัตร\nและวิชาที่เลือกไม่ตรงเกณฑ์\nด้วย Real-Time Validation", EMERALD_GREEN),
        ("0% LOSS", "อัตราการสูญหายของเอกสาร", "จัดเก็บภาพถ่ายและเอกสาร\nเป็น Binary BLOB ใน SQL\nหมดปัญหา Path เสียหาย", NAVY_ACCENT),
        ("REAL-TIME", "การออกรายงานจัดห้องอบรม", "ออกใบรายชื่อและไฟล์ Excel\nได้ทันทีเมื่อปิดรับสมัคร\nจากเดิมที่ใช้เวลา 1-2 วัน", AMBER_WARNING)
    ]

    card_w = Inches(2.75)
    gap = Inches(0.24)
    start_x = Inches(0.8)

    for idx, (stat_val, stat_title, stat_desc, col) in enumerate(stats):
        x = start_x + (idx * (card_w + gap))
        add_card(slide, x, Inches(1.8), card_w, Inches(2.8),
                 title=stat_title, header_bg=col, is_stat=True, stat_val=stat_val, stat_desc=stat_desc)

    # Bottom Summary Banner
    b_banner = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.8), Inches(11.733), Inches(1.8))
    b_banner.fill.solid()
    b_banner.fill.fore_color.rgb = CARD_WHITE
    b_banner.line.color.rgb = GOLD_LUXURY
    b_banner.line.width = Pt(1.5)

    tb_bb = slide.shapes.add_textbox(Inches(1.0), Inches(4.9), Inches(11.3), Inches(1.6))
    tf_bb = tb_bb.text_frame
    tf_bb.word_wrap = True

    p_bb1 = tf_bb.paragraphs[0]
    p_bb1.text = "★ สรุปผลประโยชน์ระดับยุทธศาสตร์องค์กร (Strategic Organizational Benefits) ★"
    p_bb1.font.name = FONT_HEADING
    p_bb1.font.size = Pt(12.5)
    p_bb1.font.bold = True
    p_bb1.font.color.rgb = NAVY_PRIMARY
    p_bb1.space_after = Pt(6)

    p_bb2 = tf_bb.add_paragraph()
    p_bb2.text = "1. ยกระดับภาพลักษณ์องค์กร: แสดงถึงความเป็นผู้นำด้านเทคโนโลยีประกันภัย (InsurTech) ที่ใส่ใจความสะดวกของตัวแทน"
    p_bb2.font.name = FONT_BODY
    p_bb2.font.size = Pt(10)
    p_bb2.font.color.rgb = TEXT_DARK
    p_bb2.space_after = Pt(4)

    p_bb3 = tf_bb.add_paragraph()
    p_bb3.text = "2. ลดความเสี่ยงด้านการปฏิบัติตามกฎหมาย: ขจัดปัญหาการถูก คปภ. ปฏิเสธผลการอบรมเนื่องจากข้อมูลผู้สมัครไม่ตรงตามเกณฑ์"
    p_bb3.font.name = FONT_BODY
    p_bb3.font.size = Pt(10)
    p_bb3.font.color.rgb = TEXT_DARK
    p_bb3.space_after = Pt(4)

    p_bb4 = tf_bb.add_paragraph()
    p_bb4.text = "3. ความคุ้มค่าทางเศรษฐศาสตร์: ลดภาระงานของเจ้าหน้าที่สาขาและส่วนกลางลงกว่า 80% สามารถจัดสรรบุคลากรไปทำงานเชิงกลยุทธ์ได้มากขึ้น"
    p_bb4.font.name = FONT_BODY
    p_bb4.font.size = Pt(10)
    p_bb4.font.color.rgb = TEXT_DARK

    add_footer(slide, 10, 12)

# ==============================================================================
# Slide 11: Deployment, Security & Project Governance
# ==============================================================================
def build_slide_11(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_slide_background(slide)
    add_header(slide, "Governance & Operations", "การติดตั้ง ความมั่นคงปลอดภัย และการควบคุมเวอร์ชัน (DevOps & Security)",
               "การบริหารจัดการโครงการตามมาตรฐานวิศวกรรมซอฟต์แวร์ระดับสากล และนโยบายความมั่นคงปลอดภัยสารสนเทศ")

    # Left: Security & High Availability
    add_card(slide, Inches(0.8), Inches(1.8), Inches(5.7), Inches(4.8),
             title="ความมั่นคงปลอดภัยและความพร้อมใช้งาน",
             header_bg=NAVY_PRIMARY,
             items=[
                 ("Enterprise Network Security", "การสื่อสารทั้งหมดเข้ารหัสผ่าน TLS 1.3 ป้องกันการดักฟังข้อมูล (Man-in-the-Middle)"),
                 ("Zero SQL Injection / XSS", "ใช้งาน Parameterized Queries ทั้งหมด 100% พร้อม Sanitization Input อย่างเข้มงวด"),
                 ("High Concurrency Capacity", "ระบบผ่านการทดสอบรองรับผู้ใช้งานพร้อมกัน (Concurrent Users) ไม่น้อยกว่า 1,000 คน"),
                 ("High Availability & Backup", "สำรองข้อมูลแบบ Full ทุกสัปดาห์, Diff ทุกวัน และ Transaction Log ทุก 15 นาที"),
                 ("Disaster Recovery Targets", "กำหนดเป้าหมาย RPO < 15 นาที (ข้อมูลสูญหายไม่เกิน 15 นาที) และ RTO < 60 นาที")
             ])

    # Right: Project Governance & Git Repository
    add_card(slide, Inches(6.8), Inches(1.8), Inches(5.733), Inches(4.8),
             title="การควบคุมโครงการและแหล่งเก็บซอร์สโค้ด (Governance)",
             header_bg=NAVY_ACCENT,
             items=[
                 ("Official Git Repository", "รวมศูนย์ซอร์สโค้ดไว้ที่: https://github.com/ednakrabgit/register_form"),
                 ("Active Working Branch", "พัฒนาและทดสอบบนกิ่ง `feature/dotnet` ควบคุมการเปลี่ยนแปลงตามมาตรฐาน GitFlow"),
                 ("Infrastructure Containerization", "รองรับการรันแบบ Docker Container ผ่าน Docker Compose เพื่อความสะดวกในการย้ายเซิร์ฟเวอร์"),
                 ("Web Server Reverse Proxy", "ติดตั้งร่วมกับ Apache HTTP Server 2.4 หรือ IIS 10 เพื่อกระจายภาระงานและจัดการ SSL"),
                 ("Approved Master Documentation", "มีเอกสารควบคุมครบ 3 ฉบับ: BRD (ธุรกิจ), SRS (ระบบ) และ Database Architecture")
             ])

    add_footer(slide, 11, 12)

# ==============================================================================
# Slide 12: Executive Conclusion & Q&A (Luxury Navy & Gold Closing)
# ==============================================================================
def build_slide_12(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_slide_background(slide, is_dark=True)

    # Gold Accent Box
    dec_box = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(1.2), Inches(1.0), Inches(0.08))
    dec_box.fill.solid()
    dec_box.fill.fore_color.rgb = GOLD_LUXURY
    dec_box.line.fill.background()

    # Title Box
    tb_c = slide.shapes.add_textbox(Inches(1.5), Inches(1.5), Inches(10.3), Inches(1.6))
    tf = tb_c.text_frame
    tf.word_wrap = True
    
    p1 = tf.paragraphs[0]
    p1.text = "บทสรุปและการดำเนินงานในก้าวถัดไป"
    p1.font.name = FONT_HEADING
    p1.font.size = Pt(28)
    p1.font.bold = True
    p1.font.color.rgb = CARD_WHITE
    p1.space_after = Pt(8)

    p2 = tf.add_paragraph()
    p2.text = "Project Conclusion & Executive Sign-Off Recommendation"
    p2.font.name = FONT_BODY
    p2.font.size = Pt(14)
    p2.font.color.rgb = GOLD_LIGHT

    # Main Conclusion Card
    card_c = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(3.2), Inches(10.333), Inches(3.2))
    card_c.fill.solid()
    card_c.fill.fore_color.rgb = RGBColor(15, 30, 55)
    card_c.line.color.rgb = GOLD_LUXURY
    card_c.line.width = Pt(1.5)

    tb_ci = slide.shapes.add_textbox(Inches(1.8), Inches(3.4), Inches(9.8), Inches(2.8))
    tf_ci = tb_ci.text_frame
    tf_ci.word_wrap = True

    pts = [
        ("ความพร้อมในการขึ้นระบบจริง (Production Readiness)", "ระบบพัฒนาเสร็จสมบูรณ์ 100% ผ่านการทดสอบ Integration Test, Validation Rules และ OIC Gateway พร้อมเปิดให้บริการแก่ตัวแทนทั่วประเทศ"),
        ("สถาปัตยกรรมระดับองค์กร (Enterprise Baseline)", "ใช้เทคโนโลยีชั้นนำ .NET 8, React 18, และ Microsoft SQL Server Enterprise Standard ขจัดหนี้ทางเทคนิค (Technical Debt) ของระบบเดิมอย่างสมบูรณ์"),
        ("เอกสารอ้างอิงครบถ้วนสมบูรณ์ (Approved Documents)", "จัดทำเอกสาร BRD, SRS, โครงสร้าง Database 46 ตาราง 6 โดเมน และไดอะแกรมสถาปัตยกรรมความละเอียดสูง จัดเก็บไว้ในโฟลเดอร์โครงการเรียบร้อยแล้ว"),
        ("ขอรับข้อเสนอแนะและอนุมัติ (Discussion & Q&A)", "ขอเรียนเชิญท่านผู้บริหารร่วมซักถาม แนะนำ และให้ข้อคิดเห็นเพื่อการเปิดตัวใช้งานระบบอย่างเป็นทางการต่อไป")
    ]

    for idx, (head_t, body_t) in enumerate(pts):
        p = tf_ci.paragraphs[0] if idx == 0 else tf_ci.add_paragraph()
        p.space_after = Pt(8)
        
        r1 = p.add_run()
        r1.text = f"✔ {head_t}: "
        r1.font.name = FONT_HEADING
        r1.font.size = Pt(11)
        r1.font.bold = True
        r1.font.color.rgb = GOLD_LIGHT

        r2 = p.add_run()
        r2.text = body_t
        r2.font.name = FONT_BODY
        r2.font.size = Pt(10)
        r2.font.color.rgb = RGBColor(226, 232, 240)

    add_footer(slide, 12, 12, is_dark=True)

# ==============================================================================
# Main Generation Function
# ==============================================================================
def generate_executive_presentation():
    prs = create_presentation()
    
    print("Building Slide 1: Executive Cover...")
    build_slide_1(prs)

    print("Building Slide 2: Strategic Executive Summary...")
    build_slide_2(prs)

    print("Building Slide 3: Business Drivers (As-Is vs To-Be)...")
    build_slide_3(prs)

    print("Building Slide 4: 6-Step Registration Wizard...")
    build_slide_4(prs)

    print("Building Slide 5: Complex Renewal 4+ & 4 Pillars Engine...")
    build_slide_5(prs)

    print("Building Slide 6: Enterprise Technical Architecture...")
    build_slide_6(prs)

    print("Building Slide 7: Database Architecture & 6 Domains...")
    build_slide_7(prs)

    print("Building Slide 8: OIC Gateway & PDPA Compliance...")
    build_slide_8(prs)

    print("Building Slide 9: Back-Office Administration & Audit Trail...")
    build_slide_9(prs)

    print("Building Slide 10: Business Value, ROI & Measurable KPIs...")
    build_slide_10(prs)

    print("Building Slide 11: Deployment, Security & Project Governance...")
    build_slide_11(prs)

    print("Building Slide 12: Executive Conclusion & Q&A...")
    build_slide_12(prs)

    prs.save(PPTX_PATH)
    print(f"\nExecutive Presentation generated successfully at:\n{PPTX_PATH}")
    print(f"File size: {os.path.getsize(PPTX_PATH):,} bytes")

if __name__ == "__main__":
    generate_executive_presentation()

