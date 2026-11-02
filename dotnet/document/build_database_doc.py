# -*- coding: utf-8 -*-
"""
Generate Comprehensive Database Architecture and Data Dictionary Document for Viriyah Insurance Registration System.
Includes 6 High-Resolution Architecture Diagrams and Complete Entity Relationships Specification.
Output: 3_Database_Architecture_and_Data_Dictionary.docx
"""

import os
import json
from docx.shared import Inches, Pt, RGBColor
from doc_helper import (
    create_document, add_cover_header, add_heading_1, add_heading_2, add_heading_3,
    add_paragraph, add_bullet, add_callout, add_table_data, add_diagram_picture
)

DIAGRAMS_DIR = r"c:\Users\ednak\OneDrive\Desktop\datamangement\www\register_form\dotnet\document\diagrams"

DOMAIN_MAPPING = {
    "Domain 1: Core Person & Registration (ระบบผู้สมัครและการลงทะเบียน)": [
        "person", "personregistration", "personaddress", "personaffiliation",
        "personlicense", "personcourse", "persontraining5y", "personother",
        "personothersalesarea", "personothercompanies", "personotherspecialty",
        "persondocument", "registrationhistory"
    ],
    "Domain 2: Master Data & Geographic (ข้อมูลหลักและภูมิศาสตร์)": [
        "mst_provinces", "mst_districts", "mst_sub_districts", "mst_agent_regions",
        "mst_agent_branches", "mst_titles", "mst_gender", "mst_blood",
        "mst_religion", "mst_territories", "mst_companies", "mst_expertises"
    ],
    "Domain 3: Curriculum & Training Results (หลักสูตร รอบการอบรม และผลสอบ)": [
        "mst_renew_pillars", "mst_renew_course", "mst_renew_basic", "mst_renew_dates",
        "mst_renew_other", "mst_course_curriculum", "mst_course_sub_detail", "trn_training_result"
    ],
    "Domain 4: OIC Gateway Integration (การเชื่อมโยงระบบ คปภ.)": [
        "oic_api_request_log", "oic_raw_api_store", "oic_agent_profile_store",
        "oic_field_mapping", "oic_value_mapping"
    ],
    "Domain 5: Security & Administration (ผู้ใช้งาน สิทธิ์ และการตั้งค่าระบบ)": [
        "admin_users", "admin_roles", "admin_menus", "admin_role_permissions", "sys_config"
    ],
    "Domain 6: Legacy & System History (ตารางเดิมและประวัติการย้ายระบบ)": [
        "register", "register_history", "__EFMigrationsHistory"
    ]
}

DOMAIN_DIAGRAM_MAP = {
    "Domain 1: Core Person & Registration (ระบบผู้สมัครและการลงทะเบียน)": (
        os.path.join(DIAGRAMS_DIR, "diagram_domain1_person.png"),
        "รูปที่ 2: แผนผังความสัมพันธ์ข้อมูลบุคคลและรายการลงทะเบียน (Domain 1: Core Person & Registration ERD)"
    ),
    "Domain 2: Master Data & Geographic (ข้อมูลหลักและภูมิศาสตร์)": (
        os.path.join(DIAGRAMS_DIR, "diagram_domain2_master.png"),
        "รูปที่ 3: แผนผังโครงสร้างข้อมูลหลักและภูมิศาสตร์แบบลดหลั่น 4 ระดับ (Domain 2: Master Geographic & Corporate Hierarchy)"
    ),
    "Domain 3: Curriculum & Training Results (หลักสูตร รอบการอบรม และผลสอบ)": (
        os.path.join(DIAGRAMS_DIR, "diagram_domain3_course.png"),
        "รูปที่ 4: แผนผังโครงสร้างหลักสูตร ตารางเมทริกซ์ 4 Pillars และกำหนดการอบรม (Domain 3: Curriculum & 4 Pillars Matrix)"
    ),
    "Domain 4: OIC Gateway Integration (การเชื่อมโยงระบบ คปภ.)": (
        os.path.join(DIAGRAMS_DIR, "diagram_domain4_oic.png"),
        "รูปที่ 5: แผนผังกระบวนการเชื่อมโยงและแปลงข้อมูลระบบ คปภ. (Domain 4: OIC Gateway Data Pipeline & Normalization)"
    ),
    "Domain 5: Security & Administration (ผู้ใช้งาน สิทธิ์ และการตั้งค่าระบบ)": (
        os.path.join(DIAGRAMS_DIR, "diagram_domain5_security.png"),
        "รูปที่ 6: แผนผังโครงสร้างสิทธิ์การใช้งานตามบทบาทและการตั้งค่าระบบ (Domain 5: Security RBAC & System Configuration)"
    )
}

TABLE_DESCRIPTIONS = {
    "person": "ตารางข้อมูลส่วนบุคคลหลักของผู้สมัคร จัดเก็บข้อมูลชีวประวัติพื้นฐาน เลขบัตรประชาชน ชื่อ-นามสกุล วันเกิด เพศ ศาสนา และกรุ๊ปเลือด",
    "personregistration": "ตารางบันทึกการทำรายการลงทะเบียนในแต่ละครั้ง เก็บสถานะการยินยอม PDPA เวลาเริ่มกรอก เวลาที่กดยืนยัน และสิทธิพิเศษ",
    "personaddress": "ตารางที่อยู่ของผู้สมัคร แยกตามประเภทที่อยู่ (ที่อยู่ตามบัตรประชาชน และที่อยู่ปัจจุบัน) เชื่อมโยงรหัสจังหวัด อำเภอ ตำบล",
    "personaffiliation": "ตารางข้อมูลการสังกัดฝ่ายขายและสาขาของวิริยะประกันภัย ข้อมูลวุฒิการศึกษา สถาบัน สาขาวิชา และรหัสตัวแทน",
    "personlicense": "ตารางข้อมูลใบอนุญาตตัวแทน/นายหน้าประกันวินาศภัย เลขที่ใบอนุญาต วันหมดอายุ ประเภทใบอนุญาต และจำนวนครั้งที่เคยต่ออายุ",
    "personcourse": "ตารางวิชาและหลักสูตรที่ผู้สมัครเลือกลงทะเบียน เชื่อมโยงกับตารางรอบวันจัดอบรม และหมวดวิชา (Pillars)",
    "persontraining5y": "ตารางประวัติการอบรมย้อนหลัง 5 ปี สำหรับผู้สมัครที่ใช้เป็นหลักฐานในการขอยกเว้นการอบรมตามเกณฑ์ คปภ.",
    "personother": "ตารางข้อมูลประสบการณ์การทำงาน อาชีพปัจจุบัน ตำแหน่งงาน ประวัติการเป็นตัวแทน และข้อมูลการขับขี่ยานพาหนะ",
    "personothersalesarea": "ตารางความสัมพันธ์ Many-to-Many เชื่อมโยงผู้สมัครกับพื้นที่/ภูมิภาคการขายที่เลือกดำเนินการ",
    "personothercompanies": "ตารางความสัมพันธ์ Many-to-Many บันทึกรายชื่อบริษัทประกันวินาศภัยอื่นที่ผู้สมัครเคยร่วมงาน",
    "personotherspecialty": "ตารางความสัมพันธ์ Many-to-Many บันทึกสาขาความเชี่ยวชาญพิเศษของตัวแทน (เช่น ประกันภัยรถยนต์, ประกันอัคคีภัย, สินไหม)",
    "persondocument": "ตารางจัดเก็บไฟล์เอกสารและภาพถ่ายหลักฐานในรูปแบบ Binary BLOB ในฟิลด์ FileData ป้องกันการเข้าถึงผ่าน Web Path",
    "registrationhistory": "ตาราง Audit Trail บันทึกประวัติการแก้ไขข้อมูลผู้สมัครแบบ JSON Snapshot ระบุฟิลด์ที่เปลี่ยน ผู้แก้ไข และเวลา",
    "mst_provinces": "ตาราง Master ข้อมูลจังหวัด 77 จังหวัดทั่วประเทศไทย พร้อมชื่อภาษาไทยและภาษาอังกฤษ",
    "mst_districts": "ตาราง Master ข้อมูลอำเภอ/เขต 928 แห่ง เชื่อมโยงกับรหัสจังหวัด",
    "mst_sub_districts": "ตาราง Master ข้อมูลตำบล/แขวง 7,442 แห่ง พร้อมรหัสไปรษณีย์ เชื่อมโยงกับรหัสอำเภอ",
    "mst_agent_regions": "ตาราง Master ข้อมูลภาคการตลาด/ภูมิภาคการดำเนินงานของ บมจ. วิริยะประกันภัย",
    "mst_agent_branches": "ตาราง Master ข้อมูลสาขาและศูนย์ปฏิบัติการสินไหมของวิริยะประกันภัย เชื่อมโยงกับภาคการตลาด",
    "mst_titles": "ตาราง Master คำนำหน้านามภาษาไทย (นาย, นาง, นางสาว ฯลฯ)",
    "mst_gender": "ตาราง Master ข้อมูลเพศ (ชาย, หญิง)",
    "mst_blood": "ตาราง Master ข้อมูลกรุ๊ปเลือด (A, B, AB, O)",
    "mst_religion": "ตาราง Master ข้อมูลศาสนา (พุทธ, คริสต์, อิสลาม, อื่นๆ)",
    "mst_territories": "ตาราง Master ข้อมูลภูมิภาคและพื้นที่การขายในประเทศไทย",
    "mst_companies": "ตาราง Master รายชื่อบริษัทประกันวินาศภัยในประเทศไทย",
    "mst_expertises": "ตาราง Master ความเชี่ยวชาญพิเศษทางด้านการประกันวินาศภัย",
    "mst_renew_pillars": "ตาราง Master 4 หมวดวิชาหลัก (4 Pillars) ตามเกณฑ์หลักสูตรต่ออายุครั้งที่ 4 เป็นต้นไปของ คปภ.",
    "mst_renew_course": "ตาราง Master รายวิชาอบรมในแต่ละหมวด Pillar พร้อมระบุจำนวนชั่วโมงอบรมของแต่ละวิชา",
    "mst_renew_basic": "ตาราง Master หลักสูตรมาตรฐาน สำหรับขอรับใบอนุญาตใหม่ และขอต่ออายุครั้งที่ 1, 2, 3",
    "mst_renew_dates": "ตาราง Master กำหนดการรอบวันและเวลาจัดอบรม ทั้งรอบเช้าและรอบบ่าย",
    "mst_renew_other": "ตาราง Junction เชื่อมโยงวิชาต่ออายุ 4+ (Pillar) เข้ากับรอบวันเวลาจัดอบรมและลำดับการแสดงผล",
    "mst_course_curriculum": "ตาราง Master โครงสร้างหลักสูตรและรหัสหลักสูตรตามประกาศทางการของสำนักงาน คปภ.",
    "mst_course_sub_detail": "ตาราง Master หัวข้อย่อยและรายละเอียดเนื้อหาวิชาในแต่ละหลักสูตร",
    "trn_training_result": "ตารางผลการฝึกอบรมและคะแนนสอบของผู้สมัคร เชื่อมโยงจากระบบ e-Learning / LMS",
    "oic_api_request_log": "ตารางบันทึก Transaction Log การเรียกใช้งาน Web Service กับระบบ คปภ. บันทึก Endpoint, Payload และ Response",
    "oic_raw_api_store": "ตารางจัดเก็บ Raw JSON Response ที่ได้รับจาก คปภ. ก่อนทำการแปลงข้อมูล",
    "oic_agent_profile_store": "ตารางโปรไฟล์ตัวแทนที่แปลงข้อมูลแล้ว (Normalized Store) สำหรับนำไปใช้ในฟังก์ชัน Smart Auto-Fill",
    "oic_field_mapping": "ตารางกำหนดกฎการแปลงชื่อฟิลด์จาก API คปภ. ให้ตรงกับชื่อคอลัมน์ในฐานข้อมูลของวิริยะประกันภัย",
    "oic_value_mapping": "ตารางกำหนดกฎการแปลงค่าข้อมูล (Code Mapping) เช่น ประเภทตัวแทน หรือรหัสสถานะ",
    "admin_users": "ตารางบัญชีผู้ใช้งานระบบหลังบ้านสำหรับเจ้าหน้าที่สาขา ฝ่ายอบรม และผู้ดูแลระบบ พร้อมรหัสผ่านแฮช",
    "admin_roles": "ตารางบทบาทผู้ใช้งานระบบหลังบ้าน (เช่น SuperAdmin, Admin, BranchOfficer, Auditor)",
    "admin_menus": "ตารางโครงสร้างเมนูการทำงานในระบบบริหารจัดการหลังบ้าน",
    "admin_role_permissions": "ตารางสิทธิ์การเข้าถึงเมนูต่างๆ ของแต่ละบทบาทผู้ใช้งาน",
    "sys_config": "ตารางเก็บการตั้งค่าระบบ ช่วงเวลาเปิด-ปิดรับสมัคร (Time Windows) และสถานะระบบ",
    "register": "ตาราง Flat Record ดั้งเดิม (PHP Legacy) จำนวน 109 คอลัมน์ รองรับการทำงานแบบ Backward Compatibility",
    "register_history": "ตารางบันทึกประวัติการแก้ไขข้อมูลของระบบ PHP Legacy",
    "__EFMigrationsHistory": "ตารางระบบของ Entity Framework Core บันทึกประวัติการรัน Database Migration"
}

COLUMN_DESCRIPTIONS = {
    "Id": "รหัส Primary Key ประจำตาราง (Auto Identity)",
    "id": "รหัส Primary Key ประจำตาราง (Auto Identity)",
    "NationId": "เลขประจำตัวประชาชน 13 หลัก (Unique / Foreign Key)",
    "nation_id": "เลขประจำตัวประชาชน 13 หลัก (Unique / Foreign Key)",
    "TitleTh": "คำนำหน้านามภาษาไทย",
    "FirstNameTh": "ชื่อจริงภาษาไทย",
    "LastNameTh": "นามสกุลภาษาไทย",
    "BirthDate": "วันเดือนปีเกิด",
    "GenderId": "รหัสเพศ (เชื่อมโยง mst_gender)",
    "BloodGroupId": "รหัสกรุ๊ปเลือด (เชื่อมโยง mst_blood)",
    "ReligionId": "รหัสศาสนา (เชื่อมโยง mst_religion)",
    "PhoneOtp": "หมายเลขโทรศัพท์มือถือสำหรับรับ OTP และติดต่อ",
    "EmailAlt": "ที่อยู่อีเมลสำรองสำหรับรับการแจ้งเตือน",
    "CreatedAt": "วันและเวลาที่บันทึกข้อมูล",
    "UpdatedAt": "วันและเวลาที่แก้ไขข้อมูลล่าสุด",
    "AddressType": "ประเภทที่อยู่ (id_card = ตามบัตรประชาชน, current = ปัจจุบัน)",
    "HouseNo": "บ้านเลขที่",
    "Moo": "หมู่ที่",
    "Soi": "ตรอก/ซอย",
    "Road": "ถนน",
    "ProvinceId": "รหัสจังหวัด (เชื่อมโยง mst_provinces)",
    "DistrictId": "รหัสอำเภอ (เชื่อมโยง mst_districts)",
    "SubDistrictId": "รหัสตำบล (เชื่อมโยง mst_sub_districts)",
    "Postcode": "รหัสไปรษณีย์ 5 หลัก",
    "BranchId": "รหัสสาขาของวิริยะประกันภัย (เชื่อมโยง mst_agent_branches)",
    "RegionId": "รหัสภาคการตลาดของวิริยะประกันภัย (เชื่อมโยง mst_agent_regions)",
    "EducationLevel": "ระดับการศึกษาสูงสุด",
    "InstitutionName": "ชื่อสถาบันการศึกษา",
    "Major": "สาขาวิชาที่สำเร็จการศึกษา",
    "ViriyahCode": "รหัสตัวแทนหรือรหัสพนักงานวิริยะประกันภัย",
    "LicenseNo": "เลขที่ใบอนุญาตตัวแทน/นายหน้าประกันวินาศภัย",
    "LicenseExpiry": "วันหมดอายุของใบอนุญาต",
    "LicenseType": "ประเภทใบอนุญาต (agent = ตัวแทน, broker = นายหน้า)",
    "CourseId": "รหัสหลักสูตรการอบรม (เชื่อมโยง mst_renew_course หรือ mst_renew_basic)",
    "CourseName": "ชื่อหลักสูตรการอบรม",
    "TrainingDate": "วันและเวลาที่จัดอบรม",
    "FileData": "ข้อมูลไฟล์เอกสารไบนารี (Binary BLOB Data)",
    "FileName": "ชื่อไฟล์เอกสารพร้อมนามสกุล",
    "ContentType": "ประเภทเนื้อหาไฟล์ (MIME Type เช่น image/jpeg, application/pdf)",
    "FileSize": "ขนาดของไฟล์ (Bytes)",
    "DocType": "ประเภทของเอกสาร (photo, id_card, house_reg, education, license, exempt)",
    "ConfigKey": "คีย์ชื่อการตั้งค่าระบบ",
    "ConfigValue": "ค่าของการตั้งค่าระบบ (เช่น JSON Time Windows)",
    "Action": "การกระทำที่ดำเนินการ (Create, Update, Delete)",
    "ChangedFields": "ข้อมูลฟิลด์ที่มีการเปลี่ยนแปลงในรูปแบบ JSON",
    "ChangedBy": "ชื่อหรือรหัสผู้ใช้งานที่ทำการแก้ไขข้อมูล",
    "IpAddress": "หมายเลข IP Address ของผู้แก้ไขข้อมูล"
}

# Exhaustive Relationships Specifications
MASTER_RELATIONS = [
    # Core Person Relations
    ["REL-01", "person (NationId)", "personregistration (NationId)", "1 : N", "CASCADE / NO ACTION",
     "ผู้สมัคร 1 คน สามารถมีประวัติการลงทะเบียนได้หลายรอบการอบรม",
     "SELECT * FROM person p JOIN personregistration pr ON p.NationId = pr.NationId"],
    ["REL-02", "person (NationId)", "personaddress (NationId)", "1 : N", "CASCADE / CASCADE",
     "ผู้สมัคร 1 คน มีที่อยู่ 2 ประเภท ('id_card' และ 'current')",
     "SELECT * FROM person p JOIN personaddress pa ON p.NationId = pa.NationId WHERE pa.AddressType = 'id_card'"],
    ["REL-03", "person (NationId)", "personaffiliation (NationId)", "1 : 1", "CASCADE / CASCADE",
     "ผู้สมัคร 1 คน มีข้อมูลสังกัดสาขาและวุฒิการศึกษา 1 ชุด",
     "SELECT * FROM person p JOIN personaffiliation paf ON p.NationId = paf.NationId"],
    ["REL-04", "person (NationId)", "personlicense (NationId)", "1 : 1", "CASCADE / CASCADE",
     "ผู้สมัคร 1 คน มีข้อมูลใบอนุญาตเดิมและการขอยกเว้น 1 ชุด",
     "SELECT * FROM person p JOIN personlicense pl ON p.NationId = pl.NationId"],
    ["REL-05", "person (NationId)", "personcourse (NationId)", "1 : N", "CASCADE / CASCADE",
     "ผู้สมัคร 1 คน เลือกลงทะเบียนได้หลายวิชาในหลักสูตรต่ออายุ 4+",
     "SELECT * FROM person p JOIN personcourse pc ON p.NationId = pc.NationId"],
    ["REL-06", "person (NationId)", "persontraining5y (NationId)", "1 : N", "CASCADE / CASCADE",
     "ผู้สมัคร 1 คน บันทึกประวัติการอบรมย้อนหลัง 5 ปีสำหรับขอยกเว้น",
     "SELECT * FROM person p JOIN persontraining5y pt ON p.NationId = pt.NationId"],
    ["REL-07", "person (NationId)", "personother (NationId)", "1 : 1", "CASCADE / CASCADE",
     "ผู้สมัคร 1 คน มีข้อมูลประสบการณ์และการทำงานอื่น 1 ชุด",
     "SELECT * FROM person p JOIN personother po ON p.NationId = po.NationId"],
    ["REL-08", "person (NationId)", "persondocument (NationId)", "1 : N", "CASCADE / CASCADE",
     "ผู้สมัคร 1 คน อัปโหลดไฟล์เอกสารหลักฐานลงฐานข้อมูล BLOB ได้หลายไฟล์",
     "SELECT * FROM person p JOIN persondocument pd ON p.NationId = pd.NationId WHERE pd.DocType = 'photo'"],
    ["REL-09", "person (NationId)", "registrationhistory (NationId)", "1 : N", "NO ACTION / CASCADE",
     "บันทึกประวัติการแก้ไขข้อมูล (Audit Trail Diff) ของผู้สมัครแต่ละคน",
     "SELECT * FROM registrationhistory rh WHERE rh.NationId = @NationId ORDER BY rh.CreatedAt DESC"],
    ["REL-10", "person (NationId)", "trn_training_result (nation_id)", "1 : N", "NO ACTION / CASCADE",
     "ผู้สมัคร 1 คน มีผลการอบรมและคะแนนสอบจากระบบ LMS ได้หลายหลักสูตร",
     "SELECT * FROM person p JOIN trn_training_result tr ON p.NationId = tr.nation_id"],

    # Experience Junction Relations
    ["REL-11", "personother (Id)", "personothersalesarea (PersonOtherId)", "1 : N", "CASCADE / CASCADE",
     "ประสบการณ์ผู้สมัคร 1 คน สามารถเลือกพื้นที่การขายที่ต้องการได้หลายแห่ง",
     "SELECT * FROM personothersalesarea pos JOIN mst_territories t ON pos.TerritoryId = t.id"],
    ["REL-12", "personother (Id)", "personothercompanies (PersonOtherId)", "1 : N", "CASCADE / CASCADE",
     "ประสบการณ์ผู้สมัคร 1 คน สามารถระบุบริษัทประกันอื่นที่เคยร่วมงานได้หลายบริษัท",
     "SELECT * FROM personothercompanies poc JOIN mst_companies c ON poc.CompanyId = c.id"],
    ["REL-13", "personother (Id)", "personotherspecialty (PersonOtherId)", "1 : N", "CASCADE / CASCADE",
     "ประสบการณ์ผู้สมัคร 1 คน สามารถระบุความเชี่ยวชาญพิเศษได้หลายด้าน",
     "SELECT * FROM personotherspecialty pos JOIN mst_expertises e ON pos.ExpertiseId = e.id"],

    # Master Geographic & Corporate Relations
    ["REL-14", "mst_provinces (province_id)", "mst_districts (province_id)", "1 : N", "RESTRICT / CASCADE",
     "จังหวัด 1 จังหวัด ประกอบด้วยอำเภอหลายอำเภอ (Cascading 1 -> 2)",
     "SELECT * FROM mst_provinces p JOIN mst_districts d ON p.province_id = d.province_id"],
    ["REL-15", "mst_districts (district_id)", "mst_sub_districts (district_id)", "1 : N", "RESTRICT / CASCADE",
     "อำเภอ 1 อำเภอ ประกอบด้วยตำบลหลายตำบล พร้อมรหัสไปรษณีย์ (Cascading 2 -> 3)",
     "SELECT * FROM mst_districts d JOIN mst_sub_districts sd ON d.district_id = sd.district_id"],
    ["REL-16", "mst_provinces (province_id)", "personaddress (ProvinceId)", "1 : N", "NO ACTION / CASCADE",
     "เชื่อมโยงรหัสจังหวัดในที่อยู่ผู้สมัคร เข้ากับชื่อจังหวัดทางการในตาราง Master",
     "SELECT pa.*, p.province_thai FROM personaddress pa JOIN mst_provinces p ON pa.ProvinceId = p.province_id"],
    ["REL-17", "mst_districts (district_id)", "personaddress (DistrictId)", "1 : N", "NO ACTION / CASCADE",
     "เชื่อมโยงรหัสอำเภอในที่อยู่ผู้สมัคร เข้ากับชื่ออำเภอทางการในตาราง Master",
     "SELECT pa.*, d.district_thai FROM personaddress pa JOIN mst_districts d ON pa.DistrictId = d.district_id"],
    ["REL-18", "mst_sub_districts (sub_district_id)", "personaddress (SubDistrictId)", "1 : N", "NO ACTION / CASCADE",
     "เชื่อมโยงรหัสตำบลในที่อยู่ผู้สมัคร เข้ากับชื่อตำบลและรหัสไปรษณีย์",
     "SELECT pa.*, sd.sub_district_thai, sd.zip_code FROM personaddress pa JOIN mst_sub_districts sd ON pa.SubDistrictId = sd.sub_district_id"],
    ["REL-19", "mst_agent_regions (id)", "mst_agent_branches (region_id)", "1 : N", "RESTRICT / CASCADE",
     "ภาคการตลาด 1 ภาค ประกอบด้วยสาขาและศูนย์ปฏิบัติการสินไหมหลายแห่ง",
     "SELECT * FROM mst_agent_regions r JOIN mst_agent_branches b ON r.id = b.region_id"],
    ["REL-20", "mst_agent_branches (id)", "personaffiliation (BranchId)", "1 : N", "NO ACTION / CASCADE",
     "เชื่อมโยงสังกัดสาขาของผู้สมัคร เข้ากับรายชื่อสาขาทางการของ บมจ. วิริยะประกันภัย",
     "SELECT paf.*, b.name AS BranchName FROM personaffiliation paf JOIN mst_agent_branches b ON paf.BranchId = b.id"],

    # Demographic Master Lookups
    ["REL-21", "mst_titles (id)", "person (TitleId / TitleTh)", "1 : N", "NO ACTION / CASCADE",
     "คำนำหน้านามมาตรฐาน (นาย, นาง, นางสาว ฯลฯ) กำหนดให้แก่ผู้สมัคร",
     "SELECT p.*, t.title_th FROM person p JOIN mst_titles t ON p.TitleId = t.id"],
    ["REL-22", "mst_gender (id)", "person (GenderId)", "1 : N", "NO ACTION / CASCADE",
     "รหัสเพศมาตรฐาน (ชาย, หญิง) กำหนดให้แก่ผู้สมัคร",
     "SELECT p.*, g.name AS GenderName FROM person p JOIN mst_gender g ON p.GenderId = g.id"],
    ["REL-23", "mst_blood (id)", "person (BloodGroupId)", "1 : N", "NO ACTION / CASCADE",
     "รหัสกรุ๊ปเลือดมาตรฐาน (A, B, AB, O) กำหนดให้แก่ผู้สมัคร",
     "SELECT p.*, b.name AS BloodName FROM person p JOIN mst_blood b ON p.BloodGroupId = b.id"],
    ["REL-24", "mst_religion (id)", "person (ReligionId)", "1 : N", "NO ACTION / CASCADE",
     "รหัสศาสนามาตรฐาน กำหนดให้แก่ผู้สมัคร",
     "SELECT p.*, r.name AS ReligionName FROM person p JOIN mst_religion r ON p.ReligionId = r.id"],

    # Curriculum & 4 Pillars Matrix Relations
    ["REL-25", "mst_renew_pillars (id)", "mst_renew_course (pillar_id)", "1 : N", "RESTRICT / CASCADE",
     "หมวดวิชาหลัก 4 Pillars แต่ละหมวดประกอบด้วยรายวิชาอบรมย่อยหลายวิชา",
     "SELECT * FROM mst_renew_pillars p JOIN mst_renew_course c ON p.id = c.pillar_id"],
    ["REL-26", "mst_renew_pillars (id)", "mst_renew_basic (pillar_id)", "1 : N", "NO ACTION / CASCADE",
     "หมวดวิชาเชื่อมโยงกับหลักสูตรมาตรฐาน (ขอรับใหม่ / ต่อ 1-3)",
     "SELECT * FROM mst_renew_pillars p JOIN mst_renew_basic b ON p.id = b.pillar_id"],
    ["REL-27", "mst_renew_course (id)", "mst_renew_other (course_id)", "1 : N", "CASCADE / CASCADE",
     "รายวิชาอบรม 1 วิชา สามารถเปิดจัดอบรมได้หลายรอบวันเวลา (Junction Table)",
     "SELECT * FROM mst_renew_course c JOIN mst_renew_other ro ON c.id = ro.course_id"],
    ["REL-28", "mst_renew_dates (id)", "mst_renew_other (date_id)", "1 : N", "CASCADE / CASCADE",
     "รอบวันเวลาจัดอบรม 1 รอบ สามารถจัดการเรียนการสอนได้หลายวิชาพร้อมกัน",
     "SELECT * FROM mst_renew_dates d JOIN mst_renew_other ro ON d.id = ro.date_id"],
    ["REL-29", "mst_renew_course (id)", "personcourse (CourseId)", "1 : N", "NO ACTION / CASCADE",
     "เชื่อมโยงวิชาที่ผู้สมัครเลือกลงทะเบียน เข้ากับข้อมูลวิชาและจำนวนชั่วโมงใน Master",
     "SELECT pc.*, c.name, c.hours FROM personcourse pc JOIN mst_renew_course c ON pc.CourseId = c.id"],
    ["REL-30", "mst_renew_dates (id)", "personcourse (TrainingDate / date_id)", "1 : N", "NO ACTION / CASCADE",
     "เชื่อมโยงรอบวันเวลาจัดอบรม เข้ากับวิชาที่ผู้สมัครเลือกลงทะเบียน",
     "SELECT pc.*, d.course_date, d.start_time, d.end_time FROM personcourse pc JOIN mst_renew_dates d ON pc.TrainingDate = d.course_date"],
    ["REL-31", "mst_course_curriculum (id)", "mst_course_sub_detail (curriculum_id)", "1 : N", "CASCADE / CASCADE",
     "รหัสหลักสูตรประกาศ คปภ. 1 หลักสูตร ประกอบด้วยหัวข้อย่อยหลายหัวข้อ",
     "SELECT * FROM mst_course_curriculum cc JOIN mst_course_sub_detail csd ON cc.id = csd.curriculum_id"],
    ["REL-32", "personregistration (Id)", "trn_training_result (person_registration_id)", "1 : N", "NO ACTION / CASCADE",
     "รายการลงทะเบียนแต่ละรอบ เชื่อมโยงกับผลสอบและคะแนนสะสม LMS",
     "SELECT pr.*, tr.training_status, tr.score_percent FROM personregistration pr JOIN trn_training_result tr ON pr.Id = tr.person_registration_id"],

    # OIC Gateway Integration Relations
    ["REL-33", "oic_api_request_log (id)", "oic_raw_api_store (request_log_id)", "1 : 1", "CASCADE / CASCADE",
     "Log การยิง Web Service คปภ. เชื่อมโยงกับ Raw JSON Payload ที่บันทึก",
     "SELECT * FROM oic_api_request_log l JOIN oic_raw_api_store r ON l.id = r.request_log_id"],
    ["REL-34", "oic_raw_api_store (id)", "oic_agent_profile_store (raw_store_id)", "1 : 1", "CASCADE / CASCADE",
     "ข้อมูล Raw JSON 1 ชุด ทำการแปลง (Parse) สู่ตาราง Agent Profile 1 ระเบียน",
     "SELECT * FROM oic_raw_api_store r JOIN oic_agent_profile_store p ON r.id = p.raw_store_id"],

    # Security & Administration Relations
    ["REL-35", "admin_roles (Id)", "admin_role_permissions (RoleId)", "1 : N", "CASCADE / CASCADE",
     "บทบาทผู้ใช้งาน 1 บทบาท ประกอบด้วยสิทธิ์การเข้าถึงเมนูหลายเมนู",
     "SELECT * FROM admin_roles r JOIN admin_role_permissions rp ON r.Id = rp.RoleId"],
    ["REL-36", "admin_menus (Id)", "admin_role_permissions (MenuId)", "1 : N", "CASCADE / CASCADE",
     "เมนูระบบ 1 เมนู สามารถกำหนดสิทธิ์ให้หลายบทบาทเข้าถึงได้ (CanView, CanEdit, CanExport)",
     "SELECT * FROM admin_menus m JOIN admin_role_permissions rp ON m.Id = rp.MenuId"],
    ["REL-37", "admin_roles (Id)", "admin_users (RoleId)", "1 : N", "NO ACTION / CASCADE",
     "บทบาท 1 บทบาท สามารถกำหนดให้กับเจ้าหน้าที่ผู้ใช้งานได้หลายคน",
     "SELECT u.*, r.Name AS RoleName FROM admin_users u JOIN admin_roles r ON u.RoleId = r.Id"]
]

def build_database_doc():
    doc = create_document()

    # Load Schema Dump
    schema_dump_path = r"c:\Users\ednak\OneDrive\Desktop\datamangement\www\register_form\dotnet\document\schema_dump.json"
    with open(schema_dump_path, encoding='utf-8') as f:
        schema_data = json.load(f)

    # 1. Header & Metadata
    add_cover_header(
        doc,
        doc_title_th="สรุปโครงสร้างฐานข้อมูล แผนผังความสัมพันธ์ และพจนานุกรมข้อมูลฉบับสมบูรณ์\n(Database Architecture, Detailed ER Diagrams & Data Dictionary)",
        doc_title_en="Viriyah Insurance Agent & Broker License Registration System — 3NF Normalized Schema, 6 Functional Domains, High-Resolution Architectural Diagrams, 37 Entity Relations & 46 Tables Data Dictionary",
        doc_type="DATABASE ARCHITECTURE & RELATIONSHIP SPECIFICATION",
        version="3.5",
        date_str="30 ตุลาคม 2569"
    )

    # Section 1: Overview
    add_heading_1(doc, "1. ภาพรวมสถาปัตยกรรมฐานข้อมูล (Database Architecture Overview)")
    add_paragraph(doc, 
        "เอกสารฉบับนี้สรุปโครงสร้างสถาปัตยกรรมฐานข้อมูลเชิงสัมพันธ์ระดับองค์รวม (Comprehensive Entity Relationship Architecture) "
        "ของระบบลงทะเบียนขอรับและขอต่ออายุใบอนุญาตตัวแทนและนายหน้าประกันวินาศภัย บมจ. วิริยะประกันภัย "
        "ซึ่งได้รับการปฏิรูปและยกระดับจากระบบฐานข้อมูลเดิมที่เป็นแบบ Flat Table (ตารางแบนขนาดใหญ่ 109 คอลัมน์) "
        "สู่โครงสร้างฐานข้อมูลแบบนอร์มัลไลซ์สมบูรณ์ (Third Normal Form - 3NF) เพื่อความถูกต้อง รวดเร็วในการค้นหา "
        "ป้องกันความซ้ำซ้อนของข้อมูล และรองรับการเชื่อมโยงข้อมูลกับระบบภายนอก เช่น สำนักงาน คปภ. ได้อย่างมีเสถียรภาพสูงสุด"
    )

    add_callout(doc, "นโยบายการเลือกใช้ฐานข้อมูลและแหล่งจัดเก็บซอร์สโค้ด (Database & Git Repository Policy)",
        "1. ระบบจัดการฐานข้อมูลหลัก: กำหนดใช้ Microsoft SQL Server Enterprise Edition เป็นมาตรฐานเดียวของระบบ โดยยกเลิกการใช้งาน MySQL แล้วอย่างสมบูรณ์\n"
        "2. แหล่งจัดเก็บและควบคุมเวอร์ชัน (Git Repository): https://github.com/ednakrabgit/register_form รวบรวมสคริปต์ DDL/DML, EF Core Migrations, และซอร์สโค้ดทั้งหมดของโครงการ",
        "info")

    add_heading_2(doc, "1.1 การเปรียบเทียบสถาปัตยกรรม (Legacy Flat vs Modern Normalized Schema)")
    arch_comp_headers = ["เกณฑ์การเปรียบเทียบ", "สถาปัตยกรรมเดิม (Legacy Flat Schema)", "สถาปัตยกรรมใหม่ (Modern 3NF Schema)"]
    arch_comp_rows = [
        ["โครงสร้างตาราง (Table Structure)", 
         "ใช้ตารางเดี่ยว `register` รวมทุกฟิลด์เข้าด้วยกันถึง 109 คอลัมน์ ทั้งข้อมูลส่วนตัว ที่อยู่ 2 ชุด ใบอนุญาต และวิชา", 
         "แยกตามหน้าที่ทางธุรกิจ 46 ตาราง (Domain-Driven) เช่น person, personaddress, personlicense, personcourse อย่างชัดเจน"],
        ["ความซ้ำซ้อนของข้อมูล (Data Redundancy)", 
         "ผู้สมัครคนเดิมที่ลงทะเบียนซ้ำหรือต่ออายุ จะเกิดระเบียนใหม่ที่ซ้ำซ้อนกับข้อมูลเดิมทุกประการ ทำให้ฐานข้อมูลบวม", 
         "ข้อมูลบุคคลจะถูกผูกกับ `NationId` ในตาราง person เพียง 1 ระเบียน ส่วนการลงทะเบียนแต่ละครั้งจะบันทึกใน personregistration"],
        ["การจัดเก็บที่อยู่ (Address Handling)", 
         "ฟิลด์ที่อยู่กระจัดกระจาย 16 คอลัมน์ (id_address_... และ current_address_...) ปรับปรุงโครงสร้างยาก", 
         "จัดเก็บในตาราง `personaddress` รองรับความสัมพันธ์ 1:N และแยกประเภทที่อยู่ได้ไม่จำกัด"],
        ["การเลือกวิชาต่ออายุ 4+ (Pillars)", 
         "จัดเก็บเป็น Text / Comma Separated ในฟิลด์เดียว ค้นหาและตรวจสอบเวลาซ้อนทับได้ยากมาก", 
         "จัดเก็บในตาราง `personcourse` และ `mst_renew_other` มีความสัมพันธ์ระดับรายวิชา ตรวจสอบ Collision ได้ 100%"],
        ["การจัดเก็บไฟล์เอกสาร (Document Storage)", 
         "บันทึกเป็น Path บน File System มีความเสี่ยงต่อ Path Traversal และไฟล์สูญหายเมื่อย้ายเซิร์ฟเวอร์", 
         "บันทึกเป็น Binary BLOB ลงในตาราง `persondocument` ในฐานข้อมูลโดยตรง มีความปลอดภัยสูงและสำรองข้อมูลง่าย"]
    ]
    add_table_data(doc, arch_comp_headers, arch_comp_rows)

    add_heading_2(doc, "1.2 สถิติภาพรวมฐานข้อมูล (Enterprise Database Metrics)")
    add_bullet(doc, "จำนวนตารางทั้งหมดในระบบ (Total Tables)", "46 ตาราง (ครอบคลุมทั้งตารางหลัก, Master Data, OIC Gateway, และ Audit)")
    add_bullet(doc, "จำนวนคอลัมน์ข้อมูลทั้งหมด (Total Columns)", "481 คอลัมน์")
    add_bullet(doc, "จำนวนโดเมนหน้าที่การทำงาน (Functional Domains)", "6 กลุ่มโดเมนหลัก")
    add_bullet(doc, "ฐานข้อมูลที่อยู่ประเทศไทย (Geographic Master)", "77 จังหวัด, 928 อำเภอ, และ 7,442 ตำบล/แขวง พร้อมรหัสไปรษณีย์ครบถ้วนทั่วประเทศ")
    add_bullet(doc, "ระบบจัดการฐานข้อมูลมาตรฐานหลัก (Primary Enterprise RDBMS)", "Microsoft SQL Server 2022/2025 Enterprise Edition เป็นระบบฐานข้อมูลมาตรฐานหลักระดับองค์กร โดยยกเลิกการใช้งาน MySQL แล้วอย่างสมบูรณ์ เพื่อรองรับ Enterprise Security (TDE), High Concurrency, และความเข้ากันได้ 100% กับ .NET 8 / EF Core")
    add_bullet(doc, "แหล่งจัดเก็บซอร์สโค้ดและสคริปต์ฐานข้อมูล (Git Repository)", "รวมศูนย์การจัดการโค้ดและสคริปต์ DDL/DML ทั้งหมดไว้ที่ https://github.com/ednakrabgit/register_form")

    # Section 2: 6 Functional Domains
    add_heading_1(doc, "2. การแบ่งกลุ่มตารางตาม 6 โดเมนหน้าที่ (6 Functional Domains Architecture)")
    add_paragraph(doc, "โครงสร้างฐานข้อมูลของระบบแบ่งออกเป็น 6 กลุ่มโดเมนหลักตามภาระหน้าที่และความรับผิดชอบทางธุรกิจ:")

    domain_summary_headers = ["โดเมนหน้าที่ (Domain)", "จำนวนตาราง", "หน้าที่หลักทางธุรกิจ", "ตารางสำคัญในกลุ่ม"]
    domain_summary_rows = [
        ["Domain 1: Core Person & Registration", "13 ตาราง", "จัดเก็บข้อมูลผู้สมัคร, ที่อยู่, ใบอนุญาต, วิชาที่เลือก, เอกสาร BLOB และ Audit Log", "person, personregistration, personaddress, persondocument"],
        ["Domain 2: Master Data & Geographic", "12 ตาราง", "คลังข้อมูลหลักระดับประเทศ (จังหวัด, อำเภอ, ตำบล) และ Master องค์กร (สาขา, ภาค, กรุ๊ปเลือด)", "mst_provinces, mst_districts, mst_sub_districts, mst_agent_branches"],
        ["Domain 3: Curriculum & Training", "8 ตาราง", "โครงสร้างหลักสูตร, รอบวันเวลาจัดอบรม, ตารางวิชา 4 Pillars, และผลสอบ LMS", "mst_renew_pillars, mst_renew_course, mst_renew_dates, trn_training_result"],
        ["Domain 4: OIC Gateway Integration", "5 ตาราง", "บันทึก Log การเรียก API, จัดเก็บ Raw JSON, แมปฟิลด์ และสร้าง Profile Cache สำหรับ Auto-Fill", "oic_api_request_log, oic_raw_api_store, oic_agent_profile_store"],
        ["Domain 5: Security & Administration", "5 ตาราง", "บัญชีผู้ใช้ระบบหลังบ้าน, บทบาท, สิทธิ์การเข้าถึงเมนู และการตั้งค่าช่วงเวลาเปิดรับสมัคร", "admin_users, admin_roles, admin_menus, sys_config"],
        ["Domain 6: Legacy & System History", "3 ตาราง", "ตาราง Flat Record ดั้งเดิม (109 คอลัมน์) และประวัติ Database Migration", "register, register_history, __EFMigrationsHistory"]
    ]
    add_table_data(doc, domain_summary_headers, domain_summary_rows)

    # Section 3: ER Diagrams & Unified Relational Architecture
    add_heading_1(doc, "3. แผนผังความสัมพันธ์เอนทิตีระดับองค์รวม (Comprehensive Entity Relationship Architecture)")
    add_paragraph(doc, 
        "แผนผังความสัมพันธ์แสดงจุดเชื่อมโยงระหว่างตารางข้อมูลผู้สมัครหลัก (Core Person) กับตารางสนับสนุนในโดเมนต่างๆ "
        "โดยมี `person` (คีย์หลัก `NationId`) เป็นศูนย์กลางของข้อมูลบุคคล เชื่อมโยงกับตารางรายการลงทะเบียน `personregistration` "
        "และตารางความสัมพันธ์แบบ 1:1, 1:N และ M:N ทั่วทั้งระบบ ดังแสดงในรูปที่ 1 ด้านล่างนี้:"
    )

    # Embed Diagram 1: Global ERD
    global_img = os.path.join(DIAGRAMS_DIR, "diagram_global_erd.png")
    add_diagram_picture(doc, global_img, "รูปที่ 1: แผนผังความสัมพันธ์ฐานข้อมูลระดับองค์รวม (Global Unified Entity Relationship Diagram - 46 Tables)", width_inch=6.2)

    add_heading_2(doc, "3.1 สรุปจุดเชื่อมโยงสำคัญระดับองค์รวม (Key Structural Junctions)")
    add_bullet(doc, "แกนกลางข้อมูลบุคคล (Single Source of Truth - Person Hub)", 
        "ตาราง `person` ทำหน้าที่เป็น Master Entity หลัก โดยใช้เลขประจำตัวประชาชน 13 หลัก (`NationId`) เป็น Primary Key เพื่อป้องกันความซ้ำซ้อนของบุคคล โดยทุกตารางในโดเมนผู้สมัครจะอ้างอิง `NationId` เป็น Foreign Key ทั้งหมด")
    add_bullet(doc, "ความสัมพันธ์แบบ 1:1 (Person Sub-Entities)", 
        "ข้อมูลบุคคลถูกแยกเก็บในตารางลูกแบบ 1:1 ได้แก่ `personaffiliation` (สังกัดสาขา/การศึกษา), `personlicense` (ใบอนุญาตเดิม/การยกเว้น), และ `personother` (ประสบการณ์การทำงาน) ช่วยให้สามารถปรับปรุงข้อมูลเฉพาะด้านได้โดยไม่ต้อง Lock ตารางใหญ่")
    add_bullet(doc, "ความสัมพันธ์แบบ 1:N (Transactional & Supporting Entities)", 
        "ผู้สมัคร 1 คน สามารถมีประวัติการลงทะเบียนได้หลายรอบ (`personregistration`), มีที่อยู่ได้ 2 ประเภท (`personaddress`), เลือกลงทะเบียนได้หลายวิชา (`personcourse`), อัปโหลดเอกสารได้หลายไฟล์ (`persondocument`), และมีประวัติ Audit Log หลายรายการ (`registrationhistory`)")
    add_bullet(doc, "สถาปัตยกรรมตารางเชื่อมโยง (Junction Tables for Many-to-Many)", 
        "ระบบใช้ Junction Tables เพื่อจัดการความสัมพันธ์แบบกลุ่มต่อกลุ่ม เช่น `mst_renew_other` (เชื่อมวิชากับรอบวันเวลาจัดอบรม) และตารางประสบการณ์ `personothersalesarea`, `personothercompanies`, `personotherspecialty`")

    # Section 3.2: Detailed Relations Specification Table
    add_heading_2(doc, "3.2 ตารางแจกแจงความสัมพันธ์ระหว่างเอนทิตีอย่างละเอียด (Detailed Entity Relations Specification)")
    add_paragraph(doc, 
        "ตารางต่อไปนี้แสดงรายการความสัมพันธ์ระหว่างตารางทั้งหมดในฐานข้อมูลอย่างละเอียด "
        "ระบุคีย์ต้นทาง (Primary Key), คีย์ปลายทาง (Foreign Key), อัตราส่วนความสัมพันธ์ (Cardinality), "
        "กฎเกณฑ์ความสมบูรณ์เชิงอ้างอิง (Referential Actions: ON DELETE / ON UPDATE), ตรรกะทางธุรกิจ และตัวอย่างคำสั่ง SQL JOIN:"
    )

    rel_headers = ["รหัส", "ตารางต้นทาง (PK)", "ตารางปลายทาง (FK)", "อัตราส่วน", "Integrity", "คำอธิบายทางธุรกิจ & Business Rules", "ตัวอย่าง SQL JOIN"]
    rel_rows = []
    for r in MASTER_RELATIONS:
        rel_rows.append([r[0], r[1], r[2], r[3], r[4], r[5], r[6]])
    
    # Custom widths for relations table
    rel_widths = [Inches(0.6), Inches(1.1), Inches(1.2), Inches(0.6), Inches(0.8), Inches(1.8), Inches(1.4)]
    add_table_data(doc, rel_headers, rel_rows, col_widths=rel_widths)

    # Section 4: Complete Data Dictionary with Domain Diagrams
    add_heading_1(doc, "4. พจนานุกรมข้อมูลรายตารางฉบับสมบูรณ์ (Complete 46 Tables Data Dictionary)")
    add_paragraph(doc, "รายละเอียดโครงสร้างตารางทุกตารางในฐานข้อมูล แบ่งตาม 6 โดเมนหน้าที่ พร้อมแผนผังความสัมพันธ์ประจำแต่ละโดเมน รายชื่อคอลัมน์ ชนิดข้อมูล ข้อจำกัด คีย์ และคำอธิบายภาษาไทย:")

    for domain_title, table_list in DOMAIN_MAPPING.items():
        add_heading_2(doc, domain_title)

        # Check if domain has a specific diagram
        if domain_title in DOMAIN_DIAGRAM_MAP:
            img_path, caption = DOMAIN_DIAGRAM_MAP[domain_title]
            add_diagram_picture(doc, img_path, caption, width_inch=6.2)
        
        for tbl_name in table_list:
            if tbl_name not in schema_data:
                continue
            
            tbl_info = schema_data[tbl_name]
            cols = tbl_info["columns"]
            row_cnt = tbl_info["row_count"]
            tbl_desc = TABLE_DESCRIPTIONS.get(tbl_name, "ตารางจัดเก็บข้อมูลในระบบ")

            add_heading_3(doc, f"ตาราง: {tbl_name} (จำนวน {len(cols)} คอลัมน์, ข้อมูลปัจจุบัน {row_cnt:,} แถว)")
            add_paragraph(doc, f"คำอธิบายหน้าที่: {tbl_desc}")

            # Column table
            dict_headers = ["ชื่อคอลัมน์ (Column Name)", "ชนิดข้อมูล (Data Type)", "คุณสมบัติ (Key / Null)", "คำอธิบายทางธุรกิจ (Description)"]
            dict_rows = []

            for col in cols:
                c_name = col["name"]
                c_type = col["type"] if col["type"] else "TEXT"
                is_pk = col["pk"] > 0
                not_null = col["notnull"] == 1
                
                key_desc = []
                if is_pk:
                    key_desc.append("PK")
                if not not_null:
                    key_desc.append("NULL")
                else:
                    key_desc.append("NOT NULL")
                
                # Check FK
                for fk in tbl_info.get("fks", []):
                    if fk["from"] == c_name:
                        key_desc.append(f"FK -> {fk['table']}.{fk['to']}")

                desc = COLUMN_DESCRIPTIONS.get(c_name, "")
                if not desc:
                    if "id" in c_name.lower() and c_name.lower() != "id":
                        desc = f"รหัสอ้างอิง ({c_name})"
                    elif "name" in c_name.lower():
                        desc = f"ชื่อระบุ ({c_name})"
                    elif "status" in c_name.lower():
                        desc = "สถานะการเปิดใช้งาน (active/inactive)"
                    elif "order" in c_name.lower():
                        desc = "ลำดับการแสดงผล"
                    elif "date" in c_name.lower() or "time" in c_name.lower():
                        desc = "วันและเวลาที่บันทึกหรือเกิดเหตุการณ์"
                    elif "is_" in c_name.lower():
                        desc = "สถานะการเปิด/ปิด (Flag 1=ใช่, 0=ไม่ใช่)"
                    else:
                        desc = f"ฟิลด์ข้อมูล {c_name}"

                dict_rows.append([c_name, c_type, " | ".join(key_desc), desc])

            add_table_data(doc, dict_headers, dict_rows)

    # Section 5: Indexing & Performance Tuning
    add_heading_1(doc, "5. แผนการจัดทำดัชนีและการปรับแต่งประสิทธิภาพ (Indexing Strategy & Optimization)")
    add_paragraph(doc, "เพื่อรองรับการค้นหาที่รวดเร็ว (Sub-second response) และรองรับการลงทะเบียนพร้อมกันของผู้สมัครกว่า 1,000 คน ระบบได้กำหนดกลยุทธ์การทำดัชนี (Indexing Strategy) บน Microsoft SQL Server ดังนี้:")

    idx_headers = ["ตารางฐานข้อมูล", "ชื่อดัชนี (Index Name)", "คอลัมน์ที่ทำดัชนี (Indexed Columns)", "ประเภทดัชนี", "วัตถุประสงค์ในการเพิ่มประสิทธิภาพ"]
    idx_rows = [
        ["person", "IX_person_NationId", "NationId", "Unique Clustered Index", "ค้นหาข้อมูลบุคคลและ Smart Auto-fill ด้วยเลขบัตรประชาชนได้ในระดับ O(1)"],
        ["personregistration", "IX_personreg_NationId_Status", "NationId, confirmed", "Non-Clustered Index", "ตรวจสอบการสมัครซ้ำซ้อน และดึงสถานะการลงทะเบียนล่าสุด"],
        ["personaddress", "IX_personaddr_NationId_Type", "NationId, AddressType", "Non-Clustered Index", "ดึงที่อยู่ตามบัตรประชาชนและที่อยู่ปัจจุบันของผู้สมัคร"],
        ["personcourse", "IX_personcourse_NationId_Course", "NationId, CourseId", "Non-Clustered Index", "ตรวจสอบรายวิชาที่เลือกลงทะเบียน และป้องกันการเลือกวิชาซ้ำ"],
        ["mst_sub_districts", "IX_subdistricts_district_id", "district_id, zip_code", "Non-Clustered Covering", "ดึงรายชื่อตำบลและรหัสไปรษณีย์ตามอำเภอได้อย่างรวดเร็ว"],
        ["mst_districts", "IX_districts_province_id", "province_id", "Non-Clustered Index", "ดึงรายชื่ออำเภอตามจังหวัดในระบบ Cascading Address"],
        ["admin_users", "IX_adminusers_Username", "Username", "Unique Non-Clustered", "ตรวจสอบการเข้าสู่ระบบของเจ้าหน้าที่หลังบ้าน"],
        ["registrationhistory", "IX_reghistory_NationId_CreatedAt", "NationId, CreatedAt DESC", "Non-Clustered Index", "ค้นหาประวัติการแก้ไขข้อมูล (Audit Trail) เรียงตามเวลาล่าสุด"]
    ]
    add_table_data(doc, idx_headers, idx_rows)

    add_heading_2(doc, "5.1 กลยุทธ์การจัดเก็บเอกสาร BLOB ในฐานข้อมูล (BLOB Storage Optimization)")
    add_paragraph(doc, 
        "ตาราง `persondocument` จัดเก็บไฟล์เอกสารเป็น Binary BLOB ในคอลัมน์ `FileData` (VARBINARY(MAX)) "
        "ซึ่งข้อดีคือไฟล์จะไม่สูญหายเมื่อมีการย้าย Server และมีการควบคุมสิทธิ์ผ่าน SQL Security "
        "อย่างไรก็ตาม เพื่อไม่ให้ขนาดฐานข้อมูลบวมจนกระทบต่อการ Query ข้อมูลปกติ ระบบได้แยกตารางเอกสารออกจากตาราง person "
        "และเมื่อทำคำสั่ง Query ข้อมูลรายชื่อผู้สมัคร จะไม่ทำการ SELECT คอลัมน์ `FileData` ขึ้นมาโดยไม่จำเป็น"
    )

    # Section 6: Security, Backup & Disaster Recovery
    add_heading_1(doc, "6. ความมั่นคงปลอดภัย การสำรองข้อมูล และการกู้คืนระบบ (Security & Disaster Recovery)")
    add_bullet(doc, "การเข้ารหัสข้อมูลที่เก็บรักษา (Encryption at Rest - TDE)", 
        "เปิดใช้งาน Transparent Data Encryption (TDE) บน Microsoft SQL Server เพื่อเข้ารหัสไฟล์ฐานข้อมูล (.mdf, .ldf) และไฟล์ Backup ทั้งหมด ป้องกันการขโมยไฟล์ข้อมูลไปเปิดนอกเซิร์ฟเวอร์")
    add_bullet(doc, "การเข้ารหัสขณะรับส่งข้อมูล (Encryption in Transit)", 
        "การเชื่อมต่อระหว่าง Web API กับ Database Server ต้องบังคับใช้การเชื่อมต่อแบบเข้ารหัสผ่าน SSL/TLS (Encrypt=True; TrustServerCertificate=False)")
    add_bullet(doc, "นโยบายการสำรองข้อมูล (Automated Backup Policy)", 
        "\n• Full Backup: สำรองข้อมูลเต็มรูปแบบทุกวันอาทิตย์ เวลา 02:00 น. จัดเก็บย้อนหลัง 30 วัน"
        "\n• Differential Backup: สำรองข้อมูลเฉพาะส่วนที่เปลี่ยนแปลงทุกวันจันทร์ - เสาร์ เวลา 02:00 น."
        "\n• Transaction Log Backup: สำรองข้อมูล Transaction Log ทุก 15 นาที เพื่อให้สามารถกู้คืนข้อมูลแบบ Point-in-Time ได้")
    add_bullet(doc, "เป้าหมายการกู้คืนระบบ (RPO & RTO Targets)", 
        "กำหนด Recovery Point Objective (RPO) ไม่เกิน 15 นาที (ข้อมูลสูญหายไม่เกิน 15 นาทีล่าสุด) "
        "และ Recovery Time Objective (RTO) ไม่เกิน 60 นาที ในกรณีที่เกิดเหตุภัยพิบัติบนเซิร์ฟเวอร์หลัก")

    # Save Document
    out_path = r"c:\Users\ednak\OneDrive\Desktop\datamangement\www\register_form\dotnet\document\3_Database_Architecture_and_Data_Dictionary.docx"
    doc.save(out_path)
    print(f"Database specification generated successfully at: {out_path}")

if __name__ == "__main__":
    build_database_doc()
