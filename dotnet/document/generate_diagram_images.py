# -*- coding: utf-8 -*-
"""
High-Resolution Diagram Generator for Database Architecture and Entity Relationships.
Generates 6 professional architectural diagrams using Matplotlib at 300 DPI.
"""

import os
import matplotlib
matplotlib.use('Agg')
matplotlib.rcParams['font.sans-serif'] = ['Tahoma', 'Segoe UI', 'Leelawadee UI', 'DejaVu Sans']
matplotlib.rcParams['font.family'] = 'sans-serif'
matplotlib.rcParams['axes.unicode_minus'] = False
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, ArrowStyle

OUT_DIR = r"c:\Users\ednak\OneDrive\Desktop\datamangement\www\register_form\dotnet\document\diagrams"
os.makedirs(OUT_DIR, exist_ok=True)

# Styling Constants
COLOR_NAVY = "#0E387A"
COLOR_BLUE = "#1E40AF"
COLOR_LIGHT_BLUE = "#EFF6FF"
COLOR_EMERALD = "#059669"
COLOR_LIGHT_EMERALD = "#ECFDF5"
COLOR_AMBER = "#D97706"
COLOR_LIGHT_AMBER = "#FFFBEB"
COLOR_PURPLE = "#7C3AED"
COLOR_LIGHT_PURPLE = "#F5F3FF"
COLOR_SLATE_DARK = "#1E293B"
COLOR_SLATE_BORDER = "#94A3B8"

def draw_table_card(ax, x, y, w, h, title, subtitle="", cols=None, header_bg=COLOR_NAVY, body_bg="#FFFFFF", border_color=COLOR_SLATE_BORDER):
    # Main Card Box
    card = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.04,rounding_size=0.15",
                          facecolor=body_bg, edgecolor=border_color, linewidth=1.5, zorder=2)
    ax.add_patch(card)

    # Header Box
    hh = min(0.9, h * 0.35) if (cols and len(cols) > 0) else h
    header = FancyBboxPatch((x, y + h - hh), w, hh, boxstyle="round,pad=0.04,rounding_size=0.15",
                            facecolor=header_bg, edgecolor=header_bg, linewidth=1.5, zorder=3)
    ax.add_patch(header)
    # Square out bottom of header
    sq_h = patches.Rectangle((x, y + h - hh), w, hh * 0.3, facecolor=header_bg, edgecolor=header_bg, zorder=3.5)
    ax.add_patch(sq_h)

    # Header Text
    title_y = y + h - (hh * 0.45) if subtitle else y + h - (hh * 0.5)
    ax.text(x + w / 2, title_y, title, color="white", weight="bold",
            ha="center", va="center", fontsize=10.5, fontfamily="sans-serif", zorder=4)
    if subtitle:
        ax.text(x + w / 2, y + h - (hh * 0.8), subtitle, color="#E2E8F0",
                ha="center", va="center", fontsize=8, fontfamily="sans-serif", zorder=4)

    # Columns Listing
    if cols:
        start_y = y + h - hh - 0.25
        line_spacing = (h - hh - 0.3) / max(len(cols), 1)
        for i, col in enumerate(cols):
            cy = start_y - (i * line_spacing)
            is_pk = "PK" in col
            is_fk = "FK" in col
            
            # Badge text
            badge = ""
            badge_color = COLOR_SLATE_DARK
            col_text = col
            if is_pk and is_fk:
                badge = "[PK,FK] "
                badge_color = "#B45309"
            elif is_pk:
                badge = "[PK] "
                badge_color = "#B45309"
            elif is_fk:
                badge = "[FK] "
                badge_color = "#0369A1"
            
            clean_col = col.replace("[PK,FK] ", "").replace("[PK] ", "").replace("[FK] ", "")
            
            ax.text(x + 0.2, cy, badge, color=badge_color, weight="bold", fontsize=8, fontfamily="monospace", va="center", zorder=4)
            offset = 0.8 if badge else 0.2
            ax.text(x + offset, cy, clean_col, color=COLOR_SLATE_DARK, fontsize=8.5, fontfamily="sans-serif", va="center", zorder=4)

def draw_rel_line(ax, x1, y1, x2, y2, label="", rad=0.0, color="#2563EB", lw=1.5, style="solid"):
    connectionstyle = f"arc3,rad={rad}" if rad != 0 else "arc3,rad=0"
    arrow = patches.FancyArrowPatch(
        (x1, y1), (x2, y2),
        connectionstyle=connectionstyle,
        arrowstyle="-|>",
        mutation_scale=12,
        color=color,
        linewidth=lw,
        linestyle=style,
        zorder=1
    )
    ax.add_patch(arrow)
    if label:
        mx = (x1 + x2) / 2
        my = (y1 + y2) / 2
        if rad != 0:
            my += rad * 0.8
        ax.text(mx, my, f" {label} ", color=color, weight="bold", fontsize=7.5,
                ha="center", va="center", backgroundcolor="white",
                bbox=dict(boxstyle="round,pad=0.15", facecolor="white", edgecolor=color, alpha=0.9, lw=0.8),
                zorder=5)

# ==============================================================================
# Diagram 1: Global Unified ERD Overview
# ==============================================================================
def generate_diagram_1():
    fig, ax = plt.subplots(figsize=(16, 11), dpi=300)
    ax.set_xlim(0, 20)
    ax.set_ylim(0, 14)
    ax.axis("off")

    # Title Banner
    banner = FancyBboxPatch((0.5, 12.8), 19, 1.0, boxstyle="round,pad=0.05,rounding_size=0.1",
                            facecolor=COLOR_NAVY, edgecolor=COLOR_BLUE, linewidth=1.5, zorder=2)
    ax.add_patch(banner)
    ax.text(10, 13.3, "Global Unified Entity Relationship Architecture (46 Tables)",
            color="white", weight="bold", ha="center", va="center", fontsize=15)
    ax.text(10, 12.95, "บมจ. วิริยะประกันภัย | สถาปัตยกรรมความสัมพันธ์ฐานข้อมูลเชิงบูรณาการ 6 โดเมนหลัก (Microsoft SQL Server)",
            color="#93C5FD", ha="center", va="center", fontsize=9.5)

    # Domain Group Boxes (Subgraphs)
    # Core Domain
    ax.add_patch(FancyBboxPatch((0.5, 4.0), 9.2, 8.4, boxstyle="round,pad=0.1", facecolor="#F8FAFC", edgecolor="#94A3B8", linestyle="--", lw=1.2, zorder=0))
    ax.text(0.8, 12.1, "DOMAIN 1: CORE PERSON & REGISTRATION", color=COLOR_NAVY, weight="bold", fontsize=9, zorder=1)

    # Master Geographic & Corporate
    ax.add_patch(FancyBboxPatch((10.3, 7.6), 9.2, 4.8, boxstyle="round,pad=0.1", facecolor=COLOR_LIGHT_EMERALD, edgecolor="#6EE7B7", linestyle="--", lw=1.2, zorder=0))
    ax.text(10.6, 12.1, "DOMAIN 2: GEOGRAPHIC & CORPORATE MASTER DATA", color=COLOR_EMERALD, weight="bold", fontsize=9, zorder=1)

    # Curriculum & Training
    ax.add_patch(FancyBboxPatch((10.3, 0.4), 9.2, 6.8, boxstyle="round,pad=0.1", facecolor=COLOR_LIGHT_BLUE, edgecolor="#93C5FD", linestyle="--", lw=1.2, zorder=0))
    ax.text(10.6, 6.9, "DOMAIN 3: CURRICULUM, 4 PILLARS & RESULTS", color=COLOR_BLUE, weight="bold", fontsize=9, zorder=1)

    # OIC & Security
    ax.add_patch(FancyBboxPatch((0.5, 0.4), 9.2, 3.2, boxstyle="round,pad=0.1", facecolor=COLOR_LIGHT_AMBER, edgecolor="#FCD34D", linestyle="--", lw=1.2, zorder=0))
    ax.text(0.8, 3.3, "DOMAIN 4 & 5: OIC GATEWAY & SYSTEM SECURITY", color=COLOR_AMBER, weight="bold", fontsize=9, zorder=1)

    # Core Tables
    draw_table_card(ax, 3.5, 8.4, 3.2, 3.0, "person", "ข้อมูลบุคคลหลัก",
                    ["[PK] NationId (13)", "TitleTh, FirstNameTh", "LastNameTh, BirthDate", "GenderId, ReligionId", "PhoneOtp, EmailAlt"],
                    header_bg=COLOR_NAVY)

    draw_table_card(ax, 0.8, 8.7, 2.2, 1.8, "personaddress", "ที่อยู่บัตร/ปัจจุบัน", ["[PK] Id", "[FK] NationId", "ProvinceId, DistrictId"], header_bg=COLOR_BLUE)
    draw_table_card(ax, 0.8, 6.5, 2.2, 1.8, "personlicense", "ข้อมูลใบอนุญาต", ["[PK] Id", "[FK] NationId", "LicenseNo, Expiry"], header_bg=COLOR_BLUE)
    draw_table_card(ax, 0.8, 4.3, 2.2, 1.8, "personother", "ประสบการณ์", ["[PK] Id", "[FK] NationId", "Occupation, Company"], header_bg=COLOR_BLUE)

    draw_table_card(ax, 7.2, 8.7, 2.2, 1.8, "personregistration", "การลงทะเบียน", ["[PK] Id", "[FK] NationId", "PdpaConsent, confirmed"], header_bg=COLOR_BLUE)
    draw_table_card(ax, 7.2, 6.5, 2.2, 1.8, "personcourse", "วิชาที่ลงทะเบียน", ["[PK] Id", "[FK] NationId", "CourseId, PillarId"], header_bg=COLOR_BLUE)
    draw_table_card(ax, 7.2, 4.3, 2.2, 1.8, "persondocument", "เอกสาร BLOB", ["[PK] Id", "[FK] NationId", "FileData (BLOB), DocType"], header_bg=COLOR_BLUE)

    # Relations in Core
    draw_rel_line(ax, 3.5, 9.6, 3.0, 9.6, "1:N", rad=0)
    draw_rel_line(ax, 3.5, 7.4, 3.0, 7.4, "1:1", rad=0)
    draw_rel_line(ax, 3.5, 5.2, 3.0, 5.2, "1:1", rad=0)

    draw_rel_line(ax, 6.7, 9.6, 7.2, 9.6, "1:N", rad=0)
    draw_rel_line(ax, 6.7, 7.4, 7.2, 7.4, "1:N", rad=0)
    draw_rel_line(ax, 6.7, 5.2, 7.2, 5.2, "1:N", rad=0)

    # Master Tables
    draw_table_card(ax, 10.7, 9.8, 2.4, 1.8, "mst_provinces", "จังหวัด 77 จว.", ["[PK] id, province_id", "province_thai", "province_english"], header_bg=COLOR_EMERALD)
    draw_table_card(ax, 13.7, 9.8, 2.4, 1.8, "mst_districts", "อำเภอ 928 แห่ง", ["[PK] id, district_id", "[FK] province_id", "district_thai"], header_bg=COLOR_EMERALD)
    draw_table_card(ax, 16.7, 9.8, 2.5, 1.8, "mst_sub_districts", "ตำบล 7,442 แห่ง", ["[PK] id, sub_district_id", "[FK] district_id", "zip_code"], header_bg=COLOR_EMERALD)

    draw_rel_line(ax, 13.1, 10.7, 13.7, 10.7, "1:N")
    draw_rel_line(ax, 16.1, 10.7, 16.7, 10.7, "1:N")

    draw_table_card(ax, 10.7, 7.8, 3.9, 1.6, "mst_agent_regions", "ภาคการตลาดวิริยะ", ["[PK] id", "name (ภาค 1 - ภาค 6)"], header_bg=COLOR_EMERALD)
    draw_table_card(ax, 15.2, 7.8, 4.0, 1.6, "mst_agent_branches", "สาขา/ศูนย์ปฏิบัติการ", ["[PK] id", "[FK] region_id", "name (สาขา)"], header_bg=COLOR_EMERALD)
    draw_rel_line(ax, 14.6, 8.6, 15.2, 8.6, "1:N")

    # Curriculum Tables
    draw_table_card(ax, 10.7, 4.6, 3.8, 1.9, "mst_renew_pillars", "4 หมวดวิชาหลัก (คปภ.)", ["[PK] id", "name (Pillar 1 - 4)", "code, status"], header_bg=COLOR_BLUE)
    draw_table_card(ax, 15.2, 4.6, 4.0, 1.9, "mst_renew_course", "รายวิชาอบรม 50 ชม.", ["[PK] id", "[FK] pillar_id", "name, hours, status"], header_bg=COLOR_BLUE)
    draw_rel_line(ax, 14.5, 5.5, 15.2, 5.5, "1:N")

    draw_table_card(ax, 10.7, 2.4, 3.8, 1.9, "mst_renew_dates", "ตารางรอบวันอบรม", ["[PK] id", "course_date, start_time", "course_date_display"], header_bg=COLOR_BLUE)
    draw_table_card(ax, 15.2, 2.4, 4.0, 1.9, "mst_renew_other", "Junction วิชา x รอบวัน", ["[PK] id", "[FK] pillar_id, course_id", "[FK] date_id, status"], header_bg=COLOR_BLUE)
    draw_rel_line(ax, 14.5, 3.3, 15.2, 3.3, "1:N")
    draw_rel_line(ax, 17.2, 4.6, 17.2, 4.3, "1:N")

    draw_table_card(ax, 10.7, 0.6, 8.5, 1.5, "trn_training_result", "ผลการอบรมและคะแนนสอบ LMS",
                    ["[PK] id", "[FK] nation_id", "[FK] person_registration_id", "training_status, score_percent"], header_bg=COLOR_BLUE)

    # OIC & Security Tables
    draw_table_card(ax, 0.8, 1.8, 4.0, 1.3, "oic_api_request_log", "Log การเรียก Web API คปภ.", ["[PK] id, Endpoint, HttpCode"], header_bg=COLOR_AMBER)
    draw_table_card(ax, 5.2, 1.8, 4.2, 1.3, "oic_agent_profile_store", "Profile Cache สำรองสำหรับ Auto-fill", ["[PK] id, nation_id, raw_json"], header_bg=COLOR_AMBER)
    draw_rel_line(ax, 4.8, 2.4, 5.2, 2.4, "Parses To")

    draw_table_card(ax, 0.8, 0.6, 4.0, 1.0, "admin_users", "ผู้ใช้ระบบหลังบ้าน (Admin/Officer)", ["[PK] Id, Username, RoleId"], header_bg=COLOR_PURPLE)
    draw_table_card(ax, 5.2, 0.6, 4.2, 1.0, "admin_roles", "บทบาทและสิทธิ์เข้าถึงเมนู", ["[PK] Id, Name, Permissions"], header_bg=COLOR_PURPLE)
    draw_rel_line(ax, 5.2, 1.1, 4.8, 1.1, "Assigned")

    out_file = os.path.join(OUT_DIR, "diagram_global_erd.png")
    plt.savefig(out_file, bbox_inches="tight", dpi=300)
    plt.close()
    print(f"Diagram 1 generated: {out_file}")

# ==============================================================================
# Diagram 2: Domain 1 - Core Person & Registration
# ==============================================================================
def generate_diagram_2():
    fig, ax = plt.subplots(figsize=(15, 10), dpi=300)
    ax.set_xlim(0, 18)
    ax.set_ylim(0, 12)
    ax.axis("off")

    # Header
    banner = FancyBboxPatch((0.5, 10.8), 17, 0.9, boxstyle="round,pad=0.05,rounding_size=0.1",
                            facecolor=COLOR_NAVY, edgecolor=COLOR_BLUE, linewidth=1.5, zorder=2)
    ax.add_patch(banner)
    ax.text(9, 11.25, "Domain 1: Core Person & Registration Architecture", color="white", weight="bold", ha="center", va="center", fontsize=14)

    # Root Table
    draw_table_card(ax, 7.0, 5.2, 4.0, 4.5, "person", "ศูนย์กลางข้อมูลบุคคลผู้สมัคร (Master)",
                    ["[PK] NationId (nvarchar 13)", "TitleTh (คำนำหน้าชื่อ)", "FirstNameTh (ชื่อภาษาไทย)", "LastNameTh (นามสกุลภาษาไทย)",
                     "BirthDate (วันเกิด)", "GenderId [FK]", "BloodGroupId [FK]", "ReligionId [FK]",
                     "PhoneOtp (เบอร์มือถือ OTP)", "EmailAlt (อีเมลแจ้งเตือน)", "CreatedAt, UpdatedAt"], header_bg=COLOR_NAVY)

    # Left Side Child Tables
    draw_table_card(ax, 0.8, 8.0, 4.8, 2.2, "personaddress", "ที่อยู่บัตรประชาชน และที่อยู่ปัจจุบัน",
                    ["[PK] Id (Identity)", "[FK] NationId (nvarchar 13)", "AddressType ('id_card' / 'current')",
                     "HouseNo, Moo, Soi, Road", "ProvinceId, DistrictId, SubDistrictId, Postcode"], header_bg=COLOR_BLUE)

    draw_table_card(ax, 0.8, 5.2, 4.8, 2.2, "personaffiliation", "สังกัดภาค สาขา และวุฒิการศึกษา",
                    ["[PK] Id (Identity)", "[FK] NationId (nvarchar 13)", "RegionId (ภาค), BranchId (สาขา)",
                     "EducationLevel, InstitutionName, Major", "ViriyahCode (รหัสตัวแทนวิริยะ)"], header_bg=COLOR_BLUE)

    draw_table_card(ax, 0.8, 2.4, 4.8, 2.2, "personlicense", "ข้อมูลใบอนุญาตตัวแทน/นายหน้าเดิม",
                    ["[PK] Id (Identity)", "[FK] NationId (nvarchar 13)", "LicenseNo (เลขที่ใบอนุญาต)",
                     "LicenseExpiry (วันหมดอายุ)", "LicenseType ('agent' / 'broker')", "RenewTimes (ครั้งที่ต่ออายุ)"], header_bg=COLOR_BLUE)

    # Right Side Child Tables
    draw_table_card(ax, 12.4, 8.0, 4.8, 2.2, "personregistration", "ประวัติการทำรายการลงทะเบียนแต่ละรอบ",
                    ["[PK] Id (Identity)", "[FK] NationId (nvarchar 13)", "PdpaConsent (bit: 1=รับทราบ)",
                     "start_time, completion_time", "confirmed (bit: สถานะสำเร็จ)", "DeductionPrivilege, MasterDegreeStatus"], header_bg=COLOR_BLUE)

    draw_table_card(ax, 12.4, 5.2, 4.8, 2.2, "personcourse", "วิชาและหลักสูตรที่เลือกอบรม",
                    ["[PK] Id (Identity)", "[FK] NationId (nvarchar 13)", "CourseId [FK] (รหัสหลักสูตร/วิชา)",
                     "PillarId [FK] (หมวดวิชา 1-4)", "TrainingDate (รอบวันเวลาจัดอบรม)"], header_bg=COLOR_BLUE)

    draw_table_card(ax, 12.4, 2.4, 4.8, 2.2, "persondocument", "คลังจัดเก็บไฟล์เอกสาร (Binary BLOB)",
                    ["[PK] Id (Identity)", "[FK] NationId (nvarchar 13)", "FileData (varbinary max BLOB)",
                     "FileName, ContentType (MIME)", "FileSize, DocType (photo/id/house/degree)"], header_bg=COLOR_BLUE)

    # Bottom Tables
    draw_table_card(ax, 0.8, 0.4, 4.8, 1.6, "registrationhistory", "Audit Trail Diff Log บันทึกการแก้ไข",
                    ["[PK] Id (Identity)", "[FK] NationId (nvarchar 13)", "ChangedFields (JSON Snapshot)", "ChangedBy, IpAddress, CreatedAt"], header_bg="#475569")

    draw_table_card(ax, 6.2, 0.4, 5.6, 1.6, "personother", "ข้อมูลประสบการณ์และการทำงานอื่น",
                    ["[PK] Id (Identity)", "[FK] NationId (nvarchar 13)", "Occupation, CompanyName, WorkStatus"], header_bg=COLOR_BLUE)

    draw_table_card(ax, 12.4, 0.4, 4.8, 1.6, "persontraining5y", "ประวัติการอบรมย้อนหลัง 5 ปี (ขอยกเว้น)",
                    ["[PK] Id (Identity)", "[FK] NationId (nvarchar 13)", "CourseName, TrainingDate, Hours"], header_bg=COLOR_BLUE)

    # Connecting Arrows
    draw_rel_line(ax, 7.0, 8.8, 5.6, 8.8, "1 : N")
    draw_rel_line(ax, 7.0, 6.3, 5.6, 6.3, "1 : 1")
    draw_rel_line(ax, 7.0, 5.5, 5.6, 3.8, "1 : 1")

    draw_rel_line(ax, 11.0, 8.8, 12.4, 8.8, "1 : N")
    draw_rel_line(ax, 11.0, 6.3, 12.4, 6.3, "1 : N")
    draw_rel_line(ax, 11.0, 5.5, 12.4, 3.8, "1 : N")

    draw_rel_line(ax, 7.5, 5.2, 5.6, 1.5, "1 : N", rad=0.2)
    draw_rel_line(ax, 9.0, 5.2, 9.0, 2.0, "1 : 1")
    draw_rel_line(ax, 10.5, 5.2, 12.4, 1.5, "1 : N", rad=-0.2)

    out_file = os.path.join(OUT_DIR, "diagram_domain1_person.png")
    plt.savefig(out_file, bbox_inches="tight", dpi=300)
    plt.close()
    print(f"Diagram 2 generated: {out_file}")

# ==============================================================================
# Diagram 3: Domain 2 - Geographic & Corporate Master Data
# ==============================================================================
def generate_diagram_3():
    fig, ax = plt.subplots(figsize=(15, 9), dpi=300)
    ax.set_xlim(0, 18)
    ax.set_ylim(0, 11)
    ax.axis("off")

    # Header
    banner = FancyBboxPatch((0.5, 9.8), 17, 0.9, boxstyle="round,pad=0.05,rounding_size=0.1",
                            facecolor=COLOR_EMERALD, edgecolor="#047857", linewidth=1.5, zorder=2)
    ax.add_patch(banner)
    ax.text(9, 10.25, "Domain 2: Geographic & Corporate Master Data Architecture", color="white", weight="bold", ha="center", va="center", fontsize=14)

    # Geographic Hierarchy
    draw_table_card(ax, 0.8, 6.4, 4.6, 2.6, "mst_provinces", "จังหวัด (77 จังหวัด)",
                    ["[PK] id (Identity)", "province_id (int รหัสกรมการปกครอง)", "province_thai (ชื่อภาษาไทย)", "province_english (ชื่อภาษาอังกฤษ)", "is_active_frontend, is_active_backend"], header_bg=COLOR_EMERALD)

    draw_table_card(ax, 6.7, 6.4, 4.6, 2.6, "mst_districts", "อำเภอ / เขต (928 แห่ง)",
                    ["[PK] id (Identity)", "district_id (int รหัสอำเภอ)", "district_thai (ชื่ออำเภอภาษาไทย)", "district_english (ชื่อภาษาอังกฤษ)", "[FK] province_id (เชื่อมโยงจังหวัด)"], header_bg=COLOR_EMERALD)

    draw_table_card(ax, 12.6, 6.4, 4.6, 2.6, "mst_sub_districts", "ตำบล / แขวง (7,442 แห่ง)",
                    ["[PK] id (Identity)", "sub_district_id (int รหัสตำบล)", "sub_district_thai (ชื่อตำบล)", "zip_code (รหัสไปรษณีย์ 5 หลัก)", "[FK] district_id (เชื่อมโยงอำเภอ)"], header_bg=COLOR_EMERALD)

    draw_rel_line(ax, 5.4, 7.7, 6.7, 7.7, "1 : N (จังหวัดมีหลายอำเภอ)")
    draw_rel_line(ax, 11.3, 7.7, 12.6, 7.7, "1 : N (อำเภอมีหลายตำบล)")

    # Corporate Sales Hierarchy
    draw_table_card(ax, 0.8, 3.2, 5.0, 2.4, "mst_agent_regions", "ภาคการตลาดวิริยะ (Regions)",
                    ["[PK] id (Identity)", "name (ชื่อภาค เช่น ภาค 1 - ภาค 6)", "status (active/inactive)", "display_order (ลำดับการแสดง)"], header_bg=COLOR_NAVY)

    draw_table_card(ax, 6.7, 3.2, 5.0, 2.4, "mst_agent_branches", "สาขาและศูนย์ปฏิบัติการ (Branches)",
                    ["[PK] id (Identity)", "name (ชื่อสาขา เช่น สาขาลุมพินี)", "[FK] region_id (เชื่อมโยงภาคการตลาด)", "status, display_order"], header_bg=COLOR_NAVY)

    draw_rel_line(ax, 5.8, 4.4, 6.7, 4.4, "1 : N (ภาคมีหลายสาขา)")

    # Target Table linking both
    draw_table_card(ax, 12.6, 3.2, 4.6, 2.4, "personaddress & affiliation", "การนำไปใช้งานในฟอร์มผู้สมัคร",
                    ["[FK] ProvinceId, DistrictId, SubDistrictId", "[FK] RegionId, BranchId", "ระบบเติมรหัสไปรษณีย์ให้อัตโนมัติ", "ระบบคัดกรองสาขาตามภาคที่เลือก"], header_bg=COLOR_BLUE)

    draw_rel_line(ax, 14.9, 6.4, 14.9, 5.6, "Cascading", style="dashed")
    draw_rel_line(ax, 11.7, 4.4, 12.6, 4.4, "Filtered", style="dashed")

    # Demographic Lookups
    draw_table_card(ax, 0.8, 0.6, 3.8, 2.0, "mst_titles", "คำนำหน้านาม", ["[PK] id", "title_th (นาย/นาง/น.ส.)", "status, display_order"], header_bg="#047857")
    draw_table_card(ax, 5.1, 0.6, 3.8, 2.0, "mst_gender", "เพศ", ["[PK] id", "name (ชาย / หญิง)", "status, display_order"], header_bg="#047857")
    draw_table_card(ax, 9.4, 0.6, 3.8, 2.0, "mst_blood", "กรุ๊ปเลือด", ["[PK] id", "name (A, B, AB, O)", "status, display_order"], header_bg="#047857")
    draw_table_card(ax, 13.6, 0.6, 3.6, 2.0, "mst_religion", "ศาสนา", ["[PK] id", "name (พุทธ/คริสต์/อิสลาม)", "status, display_order"], header_bg="#047857")

    out_file = os.path.join(OUT_DIR, "diagram_domain2_master.png")
    plt.savefig(out_file, bbox_inches="tight", dpi=300)
    plt.close()
    print(f"Diagram 3 generated: {out_file}")

# ==============================================================================
# Diagram 4: Domain 3 - Curriculum & 4 Pillars Matrix
# ==============================================================================
def generate_diagram_4():
    fig, ax = plt.subplots(figsize=(15, 9.5), dpi=300)
    ax.set_xlim(0, 18)
    ax.set_ylim(0, 11)
    ax.axis("off")

    # Header
    banner = FancyBboxPatch((0.5, 9.8), 17, 0.9, boxstyle="round,pad=0.05,rounding_size=0.1",
                            facecolor=COLOR_BLUE, edgecolor=COLOR_NAVY, linewidth=1.5, zorder=2)
    ax.add_patch(banner)
    ax.text(9, 10.25, "Domain 3: Curriculum, 4 Pillars Matrix & Training Schedule", color="white", weight="bold", ha="center", va="center", fontsize=14)

    # 4 Pillars Root
    draw_table_card(ax, 0.8, 5.6, 5.0, 3.6, "mst_renew_pillars", "4 หมวดวิชาหลัก (Pillars ต่ออายุ 4+)",
                    ["[PK] id (int Identity)", "name (ชื่อหมวดวิชา 1 ถึง 4)", "code (รหัสหมวดวิชา P1, P2, P3, P4)",
                     "status (active/inactive)", "• Pillar 1: จรรยาบรรณและกฎหมาย", "• Pillar 2: อัคคีภัยและทางทะเล",
                     "• Pillar 3: รถยนต์และเบ็ดเตล็ด", "• Pillar 4: เทคโนโลยีและการบริหาร"], header_bg=COLOR_BLUE)

    draw_table_card(ax, 6.6, 5.6, 5.0, 3.6, "mst_renew_course", "วิชาอบรมในแต่ละหมวด (50 ชั่วโมง)",
                    ["[PK] id (int Identity)", "[FK] pillar_id (หมวดวิชา 1-4)", "name (ชื่อรายวิชาตาม คปภ.)",
                     "hours (จำนวนชั่วโมงอบรม เช่น 3, 6 ชม.)", "status (active/inactive)", "display_order (ลำดับการแสดงผล)"], header_bg=COLOR_BLUE)

    draw_rel_line(ax, 5.8, 7.4, 6.6, 7.4, "1 : N (หมวดมีหลายวิชา)")

    draw_table_card(ax, 12.4, 5.6, 4.8, 3.6, "mst_renew_other", "Junction Matrix: วิชา x รอบจัดอบรม",
                    ["[PK] id (int Identity)", "[FK] pillar_id (หมวดวิชา)", "[FK] subject_id / course_id (รายวิชา)",
                     "[FK] date_id (รอบวันเวลาจัดอบรม)", "display_order (ลำดับในตาราง)", "status (active/inactive)"], header_bg="#2563EB")

    draw_rel_line(ax, 11.6, 7.4, 12.4, 7.4, "1 : N")

    # Dates Table
    draw_table_card(ax, 12.4, 1.2, 4.8, 3.6, "mst_renew_dates", "ตารางรอบวันและเวลาจัดอบรม",
                    ["[PK] id (int Identity)", "course_date (วันที่จัดอบรม YYYY-MM-DD)", "course_date_display (เช่น 15 ส.ค. 2569)",
                     "start_time (เช่น 09:00:00)", "end_time (เช่น 16:30:00)", "status (active/inactive)"], header_bg="#0284C7")

    draw_rel_line(ax, 14.8, 4.8, 14.8, 5.6, "1 : N (รอบวันใช้กับหลายวิชา)")

    # Personcourse
    draw_table_card(ax, 6.6, 1.2, 5.0, 3.6, "personcourse", "วิชาที่ผู้สมัครเลือกลงทะเบียนสำเร็จ",
                    ["[PK] Id (Identity)", "[FK] NationId (nvarchar 13)", "[FK] CourseId (รหัสวิชาที่เลือก)",
                     "[FK] PillarId (หมวดวิชา)", "TrainingDate (วันเวลาที่เลือก)", "• ตรวจสอบเวลาซ้อนทับ (Collision Detection)",
                     "• คำนวณชั่วโมงสะสมรวมต้องครบ 50 ชม."], header_bg=COLOR_NAVY)

    draw_rel_line(ax, 12.4, 2.8, 11.6, 2.8, "Maps Schedule")
    draw_rel_line(ax, 9.1, 5.6, 9.1, 4.8, "Enrolls")

    # Standard renewal
    draw_table_card(ax, 0.8, 1.2, 5.0, 3.6, "mst_renew_basic", "หลักสูตรมาตรฐาน (ขอรับใหม่ / ต่อ 1-3)",
                    ["[PK] id (Identity)", "course_name (ชื่อหลักสูตร)", "agent_type ('agent' / 'broker')",
                     "date_id [FK] (รอบวันเวลา)", "status (active/inactive)"], header_bg="#047857")

    out_file = os.path.join(OUT_DIR, "diagram_domain3_course.png")
    plt.savefig(out_file, bbox_inches="tight", dpi=300)
    plt.close()
    print(f"Diagram 4 generated: {out_file}")

# ==============================================================================
# Diagram 5: Domain 4 - OIC Gateway Integration Data Pipeline
# ==============================================================================
def generate_diagram_5():
    fig, ax = plt.subplots(figsize=(15, 8.5), dpi=300)
    ax.set_xlim(0, 18)
    ax.set_ylim(0, 10)
    ax.axis("off")

    banner = FancyBboxPatch((0.5, 8.8), 17, 0.9, boxstyle="round,pad=0.05,rounding_size=0.1",
                            facecolor=COLOR_AMBER, edgecolor="#B45309", linewidth=1.5, zorder=2)
    ax.add_patch(banner)
    ax.text(9, 9.25, "Domain 4: OIC Gateway Integration & Data Pipeline", color="white", weight="bold", ha="center", va="center", fontsize=14)

    # Step 1: External OIC
    draw_table_card(ax, 0.8, 4.6, 3.4, 3.4, "External OIC API", "ระบบบริการภายนอก คปภ.",
                    ["สำนักงานคณะกรรมการกำกับและส่งเสริม", "การประกอบธุรกิจประกันภัย (คปภ.)", "", "• Agent License API", "• Training Result Sync", "• Status Verification"],
                    header_bg="#78350F", body_bg=COLOR_LIGHT_AMBER)

    # Step 2: Request Log
    draw_table_card(ax, 4.8, 4.6, 3.8, 3.4, "oic_api_request_log", "ประวัติการเรียก API ทุก Transaction",
                    ["[PK] id (int Identity)", "endpoint (URL คปภ. ที่เรียก)", "http_method (GET / POST)",
                     "request_payload (JSON ที่ส่ง)", "response_payload (JSON ที่ตอบ)", "http_status (200, 400, 500)", "execution_ms (เวลาประมวลผล)"], header_bg=COLOR_AMBER)

    draw_rel_line(ax, 4.2, 6.3, 4.8, 6.3, "HTTPS Request")

    # Step 3: Raw Store
    draw_table_card(ax, 9.3, 4.6, 3.8, 3.4, "oic_raw_api_store", "คลังจัดเก็บ Raw JSON Response",
                    ["[PK] id (int Identity)", "[FK] request_log_id (อ้างอิง Log)", "id_card (เลขบัตรประชาชน 13 หลัก)",
                     "raw_json (ข้อมูลต้นฉบับจาก คปภ.)", "is_parsed (สถานะการแปลงข้อมูล)", "created_at (วันเวลาที่จัดเก็บ)"], header_bg=COLOR_AMBER)

    draw_rel_line(ax, 8.6, 6.3, 9.3, 6.3, "1 : 1 Archive")

    # Step 4: Normalized Store
    draw_table_card(ax, 13.8, 4.6, 3.6, 3.4, "oic_agent_profile_store", "โปรไฟล์ตัวแทนพร้อมใช้งาน Auto-fill",
                    ["[PK] id (int Identity)", "[FK] raw_store_id (อ้างอิง Raw)", "id_card (เลขบัตรประชาชน 13 หลัก)",
                     "agent_name, agent_surname", "license_no, license_expire", "agent_type, company_code"], header_bg="#B45309")

    draw_rel_line(ax, 13.1, 6.3, 13.8, 6.3, "Parse & Normalize")

    # Bottom Mapping Rules
    draw_table_card(ax, 4.8, 1.0, 6.0, 2.6, "oic_field_mapping", "ตารางจับคู่ชื่อฟิลด์ (Schema Mapping Engine)",
                    ["[PK] id (Identity)", "source_field (ชื่อฟิลด์จาก API คปภ. เช่น AGENT_FNAME)",
                     "target_table (ตารางปลายทาง เช่น person)", "target_field (คอลัมน์ปลายทาง เช่น FirstNameTh)",
                     "is_active (สถานะเปิดใช้งานกฎการแปลง)"], header_bg="#92400E")

    draw_table_card(ax, 11.4, 1.0, 6.0, 2.6, "oic_value_mapping", "ตารางแปลงค่ารหัสข้อมูล (Value Transform Engine)",
                    ["[PK] id (Identity)", "field_name (ชื่อฟิลด์ที่ต้องแปลงค่า เช่น LICENSE_TYPE)",
                     "source_value (ค่ารหัสเดิม เช่น '01')", "target_value (ค่ารหัสระบบใหม่ เช่น 'agent')",
                     "description (คำอธิบายการแปลงค่า)"], header_bg="#92400E")

    draw_rel_line(ax, 14.8, 3.6, 14.8, 4.6, "Applies Rules", style="dashed")

    out_file = os.path.join(OUT_DIR, "diagram_domain4_oic.png")
    plt.savefig(out_file, bbox_inches="tight", dpi=300)
    plt.close()
    print(f"Diagram 5 generated: {out_file}")

# ==============================================================================
# Diagram 6: Domain 5 - Security, RBAC & Configuration
# ==============================================================================
def generate_diagram_6():
    fig, ax = plt.subplots(figsize=(15, 8.5), dpi=300)
    ax.set_xlim(0, 18)
    ax.set_ylim(0, 10)
    ax.axis("off")

    banner = FancyBboxPatch((0.5, 8.8), 17, 0.9, boxstyle="round,pad=0.05,rounding_size=0.1",
                            facecolor=COLOR_PURPLE, edgecolor="#5B21B6", linewidth=1.5, zorder=2)
    ax.add_patch(banner)
    ax.text(9, 9.25, "Domain 5: Security, RBAC Permissions & System Configuration", color="white", weight="bold", ha="center", va="center", fontsize=14)

    # Roles
    draw_table_card(ax, 0.8, 4.4, 4.8, 3.6, "admin_roles", "บทบาทผู้ใช้งานระบบหลังบ้าน",
                    ["[PK] Id (Identity)", "Name (เช่น SuperAdmin, TrainingAdmin, BranchOfficer, Auditor)",
                     "Description (คำอธิบายหน้าที่ความรับผิดชอบ)", "IsActive (สถานะเปิดใช้งาน)", "CreatedAt, UpdatedAt"], header_bg=COLOR_PURPLE)

    # Permissions
    draw_table_card(ax, 6.6, 4.4, 4.8, 3.6, "admin_role_permissions", "สิทธิ์การเข้าถึงเมนูและการดำเนินการ",
                    ["[PK] Id (Identity)", "[FK] RoleId (เชื่อมโยงบทบาท)", "[FK] MenuId (เชื่อมโยงเมนูระบบ)",
                     "CanView (สิทธิ์เข้าดูข้อมูล)", "CanEdit (สิทธิ์แก้ไขข้อมูล)", "CanExport (สิทธิ์ส่งออก Excel/ZIP)", "CanDelete (สิทธิ์ลบข้อมูล)"], header_bg=COLOR_PURPLE)

    draw_rel_line(ax, 5.6, 6.2, 6.6, 6.2, "1 : N (บทบาทมีหลายสิทธิ์)")

    # Menus
    draw_table_card(ax, 12.4, 4.4, 4.8, 3.6, "admin_menus", "โครงสร้างเมนูระบบหลังบ้าน",
                    ["[PK] Id (Identity)", "Name (ชื่อเมนู เช่น รายชื่อผู้สมัคร, Audit Trail)",
                     "Route (URL Path เช่น /admin/enquiry)", "ParentId (เมนูหลัก/ย่อย)", "Icon, DisplayOrder"], header_bg=COLOR_PURPLE)

    draw_rel_line(ax, 12.4, 6.2, 11.4, 6.2, "1 : N (เมนูมีหลายสิทธิ์)")

    # Users
    draw_table_card(ax, 0.8, 0.8, 4.8, 3.0, "admin_users", "บัญชีเจ้าหน้าที่ผู้ใช้งานระบบ",
                    ["[PK] Id (Identity)", "Username (ชื่อบัญชีผู้ใช้)", "PasswordHash (รหัสผ่านเข้ารหัส BCrypt)",
                     "FullName, Email, BranchId", "[FK] RoleId (บทบาทของผู้ใช้)", "IsActive (สถานะการใช้งาน)"], header_bg="#5B21B6")

    draw_rel_line(ax, 3.2, 4.4, 3.2, 3.8, "1 : N (บทบาทมีหลายผู้ใช้)")

    # System Config
    draw_table_card(ax, 6.6, 0.8, 10.6, 3.0, "sys_config", "การตั้งค่าระบบและช่วงเวลาเปิด-ปิดรับสมัคร (Time Windows Engine)",
                    ["[PK] Id (Identity)", "ConfigKey (เช่น 'SYSTEM_OPEN_PERIODS', 'SYSTEM_IS_ONLINE', 'APP_ENV')",
                     "ConfigValue (ค่าการตั้งค่า เช่น JSON Array ช่วงเวลาเปิด-ปิด)", "Description (คำอธิบายการตั้งค่า)",
                     "• ควบคุมนาฬิกานับถอยหลัง (Countdown Timer) เมื่อระบบปิด", "• กำหนดจำนวนวันเปิดรับสมัครล่วงหน้าตามหลักสูตร"], header_bg="#334155")

    out_file = os.path.join(OUT_DIR, "diagram_domain5_security.png")
    plt.savefig(out_file, bbox_inches="tight", dpi=300)
    plt.close()
    print(f"Diagram 6 generated: {out_file}")

if __name__ == "__main__":
    generate_diagram_1()
    generate_diagram_2()
    generate_diagram_3()
    generate_diagram_4()
    generate_diagram_5()
    generate_diagram_6()
    print("All 6 diagrams generated successfully!")
