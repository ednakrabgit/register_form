# -*- coding: utf-8 -*-
"""
Generate System Requirements Specification (SRS / SRC) for Viriyah Insurance Registration System.
Output: 2_System_Requirements_Specification_SRS.docx
"""

import os
from docx.shared import Inches, Pt
from doc_helper import (
    create_document, add_cover_header, add_heading_1, add_heading_2, add_heading_3,
    add_paragraph, add_bullet, add_callout, add_table_data
)

def build_srs():
    doc = create_document()

    # 1. Header & Metadata
    add_cover_header(
        doc,
        doc_title_th="เอกสารกำหนดข้อกำหนดทางระบบและซอฟต์แวร์\n(System Requirements Specification - SRS / SRC)",
        doc_title_en="Viriyah Insurance Agent & Broker License Registration System — Technical Architecture, Functional Requirements, API Contracts & Security Specifications",
        doc_type="SYSTEM REQUIREMENTS SPECIFICATION (SRS / SRC)",
        version="3.0",
        date_str="30 ตุลาคม 2569"
    )

    # Section 1: Introduction & Technical Overview
    add_heading_1(doc, "1. บทนำและภาพรวมเชิงเทคนิค (Introduction & Technical Architecture)")
    add_paragraph(doc, 
        "เอกสารกำหนดข้อกำหนดทางระบบและซอฟต์แวร์ (System Requirements Specification - SRS / SRC) ฉบับนี้ "
        "จัดทำขึ้นเพื่อเป็นเอกสารอ้างอิงทางเทคนิคระดับแม่แบบ (Master Technical Baseline) สำหรับระบบลงทะเบียนขอรับและขอต่ออายุใบอนุญาตตัวแทนและนายหน้าประกันวินาศภัย "
        "ของ บริษัท วิริยะประกันภัย จำกัด (มหาชน) โดยครอบคลุมทั้งสถาปัตยกรรมระบบแบบ Modern Decoupled Architecture, "
        "ข้อกำหนดเชิงหน้าที่ (Functional Requirements), ข้อกำหนดด้านประสิทธิภาพและความมั่นคงปลอดภัย (Non-Functional Requirements), "
        "โครงสร้าง RESTful API Contracts และแนวทางการติดตั้งใช้งานบนระบบคลาวด์/เซิร์ฟเวอร์องค์กร"
    )

    add_heading_2(doc, "1.1 นิยาม คำย่อ และคำศัพท์เทคนิค (Definitions & Acronyms)")
    acronyms_headers = ["คำย่อ / ศัพท์เทคนิค", "ความหมายภาษาอังกฤษ", "คำอธิบายเชิงปฏิบัติการในระบบ"]
    acronyms_rows = [
        ["SPA", "Single Page Application", "เว็บแอปพลิเคชันหน้าเดียว พัฒนาด้วย React 18 มีความรวดเร็ว โหลดข้อมูลแบบ Asynchronous โดยไม่ต้อง Refresh ทั้งหน้าจอ"],
        ["RESTful API", "Representational State Transfer", "สถาปัตยกรรมบริการเว็บ สื่อสารด้วยรูปแบบ JSON ผ่านโพรโทคอล HTTP/HTTPS (GET, POST, PUT, DELETE)"],
        ["EF Core", "Entity Framework Core 8", "ORM (Object-Relational Mapper) สมัยใหม่สำหรับ .NET 8 ทำหน้าที่จัดการ Object Model และเชื่อมต่อฐานข้อมูลแบบ Strongly-Typed"],
        ["Dapper", "Micro-ORM for .NET", "เครื่องมือประมวลผลคำสั่ง SQL ความเร็วสูง สำหรับคำสั่ง Query และ Search ข้อมูลปริมาณมากในระบบหลังบ้าน"],
        ["BLOB", "Binary Large Object", "ฟิลด์จัดเก็บข้อมูลไบนารีในฐานข้อมูล ใช้สำหรับจัดเก็บไฟล์ภาพถ่ายและเอกสารหลักฐานลงในตารางโดยตรง ป้องกัน Path Traversal"],
        ["OIC", "Office of Insurance Commission", "สำนักงานคณะกรรมการกำกับและส่งเสริมการประกอบธุรกิจประกันภัย (คปภ.)"],
        ["RBAC", "Role-Based Access Control", "ระบบควบคุมการเข้าถึงและสิทธิ์การใช้งานตามบทบาทของผู้ใช้งาน (SuperAdmin, Admin, BranchOfficer, Auditor)"],
        ["Modulo 11", "Modulus 11 Checksum Algorithm", "อัลกอริทึมการคำนวณเลขตรวจสอบความถูกต้องของเลขประจำตัวประชาชน 13 หลักของกรมการปกครอง"],
        ["Diff Engine", "Differential Audit Engine", "กลไกตรวจจับความแตกต่างของข้อมูลและบันทึกประวัติเฉพาะฟิลด์ที่มีการเปลี่ยนแปลง แสดงผลเปรียบเทียบในรูปแบบ Visual Diff"]
    ]
    add_table_data(doc, acronyms_headers, acronyms_rows)

    add_heading_2(doc, "1.2 สถาปัตยกรรมระบบโดยรวม (Modern Decoupled Architecture)")
    add_paragraph(doc, 
        "ระบบได้รับการยกระดับโครงสร้างสถาปัตยกรรมจากเดิมที่เป็น PHP Monolith สู่ Enterprise Modern Decoupled Web Architecture "
        "ซึ่งแยกส่วนการแสดงผล (Front-End) และส่วนการประมวลผลทางธุรกิจ (Back-End) ออกจากกันอย่างสมบูรณ์ เพื่อรองรับการขยายตัว (Scalability) "
        "และการดูแลรักษาที่ง่ายขึ้นในระยะยาว:"
    )
    add_bullet(doc, "Presentation Tier (Front-End Client)", 
        "พัฒนาด้วย React 18, TypeScript, Tailwind CSS, Lucide Icons, และ SweetAlert2 มีระบบ State Management ผ่าน Context API จัดการ Flow การลงทะเบียน 6 ขั้นตอนอย่างลื่นไหล รองรับ Responsive ทุกขนาดหน้าจอ")
    add_bullet(doc, "Application Tier (Back-End Web API)", 
        "พัฒนาด้วย ASP.NET Core 8 Web API (.NET 8 C#) ประมวลผล Business Logic, Data Validation, Security Filters, และ Authentication ผ่าน JWT / Session Cookie")
    add_bullet(doc, "Data Tier (Database Management System)", 
        "ใช้ฐานข้อมูลเชิงสัมพันธ์ระดับองค์กร Microsoft SQL Server 2022 / 2025 Enterprise Edition เป็นฐานข้อมูลหลักของระบบอย่างเป็นทางการ โดยยกเลิกการใช้งาน MySQL แล้วอย่างสมบูรณ์เพื่อยกระดับความมั่นคงปลอดภัยและประสิทธิภาพในการประมวลผล ACID Transactions")
    add_bullet(doc, "Source Code Control & Repository",
        "จัดเก็บและควบคุมเวอร์ชันซอร์สโค้ดของระบบทั้งหมดผ่าน Git Repository ทางการ: https://github.com/ednakrabgit/register_form")
    add_bullet(doc, "Integration Tier (OIC Gateway & ETL Adapter)", 
        "ระบบเชื่อมต่อข้อมูลกับ คปภ. แบบบูรณาการ มี Logging, Raw Store, Mapping Engine และ Profile Normalization Store อัตโนมัติ")

    add_callout(doc, "จุดเด่นของสถาปัตยกรรม Modern Decoupled", 
        "การแยกชั้น Front-End และ Back-End ช่วยให้สามารถ Deploy หน้าจอเว็บได้โดยไม่ต้องหยุดการทำงานของ API "
        "และช่วยให้การปรับปรุง UI หรือ Business Rules ในอนาคตสามารถทำได้อย่างรวดเร็วและปลอดภัย โดยไม่กระทบต่อฐานข้อมูลหลัก", "info")

    # Section 2: Detailed Functional Requirements
    add_heading_1(doc, "2. ข้อกำหนดเชิงหน้าที่อย่างละเอียด (Detailed Functional Requirements - FR)")
    add_paragraph(doc, "ข้อกำหนดเชิงหน้าที่แบ่งออกเป็น 4 โมดูลหลัก ครอบคลุมการทำงานทุกขั้นตอนของระบบ:")

    add_heading_2(doc, "2.1 โมดูลควบคุมระบบและตารางเวลา (Module 1: System Schedule & Access Control)")
    add_bullet(doc, "FR-CFG-01: การตั้งเวลาเปิด-ปิดรับสมัคร (Time Windows Engine)", 
        "ระบบต้องรองรับการกำหนดช่วงเวลาเปิดและปิดรับสมัครล่วงหน้าได้หลายช่วงเวลา ผ่านโครงสร้าง JSON Array ในฐานข้อมูล (ตาราง `sys_config`) เช่น "
        "[{'open': '2026-07-01 00:00:00', 'close': '2026-07-02 08:37:00'}, {'open': '2026-07-02 08:46:00'}] โดยระบบจะตรวจสอบเวลาเซิร์ฟเวอร์แบบ Real-Time")
    add_bullet(doc, "FR-CFG-02: หน้านับถอยหลังและแจ้งเตือนระบบปิด (Countdown & Closed View)", 
        "หากเวลาปัจจุบันอยู่นอกช่วงเวลาเปิดรับสมัคร ระบบต้อง Redirect ผู้สมัครไปยังหน้า Closed View ทันที พร้อมแสดงนาฬิกานับถอยหลัง (Countdown Timer) ไปยังรอบเปิดถัดไป และแสดงข้อความประกาศของบริษัท")
    add_bullet(doc, "FR-CFG-03: การแยกสภาพแวดล้อมระบบ (Environment Isolation: PRD vs UAT)", 
        "ระบบต้องสามารถสลับการทำงานระหว่างโหมด 'prd' และ 'uat' ผ่านตัวแปร Configuration ได้ โดยโหมด UAT จะทำงานบนตารางข้อมูลทดสอบแยกต่างหาก ไม่กระทบต่อข้อมูลจริง")

    add_heading_2(doc, "2.2 โมดูลลงทะเบียนผู้สมัครแบบหลายขั้นตอน (Module 2: Multi-Step Registration Wizard)")
    add_paragraph(doc, "ฟังก์ชันการลงทะเบียนฝั่งหน้าบ้านถูกออกแบบเป็น 6 ขั้นตอนหลัก พร้อมขั้นตอนสรุปผล (Wizard Step 1 ถึง Step 7):")

    reg_fr_headers = ["รหัส FR", "ขั้นตอน / Tab", "ข้อกำหนดทางเทคนิคและการทำงาน (Technical Specification)"]
    reg_fr_rows = [
        ["FR-REG-01", "Step 1: PDPA Consent", 
         "แสดงข้อกำหนด นโยบายคุ้มครองข้อมูลส่วนบุคคล และ Checkbox 'รับทราบและยินยอม' บันทึกสถานะ PdpaConsent=1 และ Timestamp วันเวลาที่กดยินยอม"],
        ["FR-REG-02", "Step 2: ID Card Modulo 11", 
         "รับค่าเลขประจำตัวประชาชน 13 หลัก ตรวจสอบความถูกต้องทางคณิตศาสตร์ด้วยสูตร Modulo 11 ทันทีที่ผู้ใช้กรอกครบ ป้องกันการกรอกเลขสุ่มหรือเลขผิด"],
        ["FR-REG-03", "Step 2: Smart Auto-Fill", 
         "เมื่อเลขบัตรถูกต้อง ให้ส่งคำขอ GET /api/person/{nationId} ไปค้นหาในตาราง person และ OIC Profile Cache หากพบข้อมูล ให้นำมากรอกลงในฟิลด์ทุก Tab อัตโนมัติ"],
        ["FR-REG-04", "Step 2: Cascading Address", 
         "ระบบเลือกที่อยู่แบบลดหลั่น 4 ระดับ (จังหวัด -> อำเภอ -> ตำบล -> รหัสไปรษณีย์) ดึงข้อมูลผ่าน Master API โดยเมื่อเลือกตำบล ระบบต้องเติมรหัสไปรษณีย์ให้อัตโนมัติ"],
        ["FR-REG-05", "Step 2: Sync Same Address", 
         "มี Checkbox 'ใช้ที่อยู่ปัจจุบันตามบัตรประชาชน' เมื่อคลิกเลือก ระบบจะคัดลอกค่าที่อยู่บัตรประชาชนไปใส่ในที่อยู่ปัจจุบันและ Disable ช่องกรอกเพื่อป้องกันความสับสน"],
        ["FR-REG-06", "Step 3: Affiliation & Branch", 
         "ให้เลือกสังกัดภาคและสาขาของวิริยะประกันภัย โดยสาขาจะกรองตามภาคที่เลือก (Region -> Branch) พร้อมบันทึกข้อมูลการศึกษาและรหัสตัวแทน"],
        ["FR-REG-07", "Step 3: Multi-Select Experience", 
         "รองรับการเลือกบริษัทประกันอื่นที่เคยร่วมงาน, พื้นที่การขาย (Sales Territories), และความเชี่ยวชาญพิเศษ (Expertises) บันทึกลงตารางความสัมพันธ์ Many-to-Many"],
        ["FR-REG-08", "Step 4: License & Exemption", 
         "เลือกประเภทใบอนุญาต (agent/broker), เลขที่ใบอนุญาต, วันหมดอายุ และ Checkbox 'ขอยกเว้นการอบรมตามเกณฑ์ คปภ.' หากเลือกขอยกเว้น ระบบจะอนุญาตให้ข้าม Step 5 ได้"],
        ["FR-REG-09", "Step 5: Standard Course", 
         "สำหรับขอรับใหม่ และต่ออายุ 1-3: แสดงรายชื่อหลักสูตรที่เปิดรับตามประเภทตัวแทน ผู้สมัครเลือก 1 หลักสูตร และเลือก 1 รอบวันเวลาอบรม"],
        ["FR-REG-10", "Step 5: Complex Renewal 4+", 
         "สำหรับต่ออายุ 4+: แสดงตาราง Matrix 4 หมวดวิชา (Pillars 1-4) ผู้สมัครเลือกวิชาอิสระ ระบบคำนวณชั่วโมงสะสม Real-Time ต้องครบ 50 ชั่วโมง และมีระบบตรวจเวลาซ้อนทับ"],
        ["FR-REG-11", "Step 6: BLOB Document Upload", 
         "อัปโหลดไฟล์ภาพถ่ายหน้าตรง, สำเนาบัตรประชาชน, สำเนาทะเบียนบ้าน, วุฒิการศึกษา ตรวจสอบประเภทไฟล์ (JPG, PNG, PDF ขนาดไม่เกิน 5MB) แปลงเป็น Binary BLOB บันทึกลงตาราง persondocument"],
        ["FR-REG-12", "Step 7: Transaction Submit", 
         "แสดงสรุปข้อมูลทั้งหมด ตรวจสอบการสมัครซ้ำซ้อน บันทึกข้อมูลลงตาราง person, personregistration, personaddress, personlicense, personcourse พร้อมกันแบบ Atomic Transaction"]
    ]
    add_table_data(doc, reg_fr_headers, reg_fr_rows)

    add_heading_2(doc, "2.3 โมดูลบริหารจัดการหลังบ้านและงานธุรการ (Module 3: Back-Office Administration)")
    add_bullet(doc, "FR-ADM-01: ระบบค้นหาและคัดกรองข้อมูลขั้นสูง (Advanced Search Engine)", 
        "ระบบต้องสามารถค้นหาข้อมูลผู้สมัครด้วยเงื่อนไขผสมผสาน (Multiple Filters) ได้แก่ เลขบัตรประชาชน, ชื่อนามสกุล, สังกัดสาขา, หลักสูตร, วันที่อบรม, และสถานะการสมัคร โดยให้ผลลัพธ์ภายในเวลาไม่เกิน 500 มิลลิวินาที")
    add_bullet(doc, "FR-ADM-02: ระบบตรวจสอบประวัติการแก้ไขข้อมูลแบบ Visual Diff (Differential Audit Trail)", 
        "เมื่อเจ้าหน้าที่มีการแก้ไขข้อมูลผู้สมัคร ระบบต้องคำนวณความแตกต่าง (Diff) ระหว่างค่าเดิมและค่าใหม่ จัดเก็บเป็น JSON Snapshot ลงในตาราง `registrationhistory` "
        "และมีหน้าจอแสดงผลเปรียบเทียบ โดยแสดงค่าเดิมเป็นสีเทาขีดฆ่า และแสดงค่าใหม่เป็นสีเขียว พร้อมระบุชื่อผู้แก้ไข วันเวลา และ IP Address")
    add_bullet(doc, "FR-ADM-03: เครื่องมือส่งออกข้อมูลอัจฉริยะ (Advanced Export Engine)", 
        "ระบบต้องสามารถส่งออกข้อมูลผู้สมัครในรูปแบบ: "
        "\n• Excel (.xlsx): ทำการ In-Memory Lookup แปลง ID จังหวัด, สาขา, หลักสูตร เป็นข้อความภาษาไทยอัตโนมัติ"
        "\n• CSV: บันทึกด้วยรหัส UTF-8 with BOM เพื่อให้เปิดใน Microsoft Excel ภาษาไทยได้ทันทีโดยไม่เพี้ยน"
        "\n• ZIP Archive: บีบอัดไฟล์รายชื่อและไฟล์เอกสารแยกโฟลเดอร์ตามแต่ละหลักสูตรเพื่อความสะดวกในการจัดการ")
    add_bullet(doc, "FR-ADM-04: ระบบยืนยันตัวตนและการควบคุมสิทธิ์ (Authentication & RBAC)", 
        "ระบบจัดการผู้ใช้งานหลังบ้าน (Admin Users) รองรับการเข้ารหัสรหัสผ่านด้วย BCrypt / PBKDF2 พร้อมระบบบทบาทและสิทธิ์การเข้าถึงเมนูต่างๆ ตามตาราง `admin_roles` และ `admin_role_permissions`")

    add_heading_2(doc, "2.4 โมดูลเชื่อมต่อและบูรณาการข้อมูล คปภ. (Module 4: OIC Gateway Integration)")
    add_bullet(doc, "FR-OIC-01: OIC API Request/Response Logging", 
        "บันทึกประวัติการเรียกใช้งาน Web Service ของ คปภ. ทุกครั้งลงในตาราง `oic_api_request_log` บันทึก Endpoint, Payload ที่ส่งไป, Response ที่ได้รับกลับมา, HTTP Status, และเวลาที่ใช้ในการประมวลผล")
    add_bullet(doc, "FR-OIC-02: Raw Payload Storage & JSON Normalization", 
        "จัดเก็บข้อมูลดิบ (Raw JSON Response) ลงในตาราง `oic_raw_api_store` และทำการแปลงข้อมูล (Parse) ลงในตาราง `oic_agent_profile_store` เพื่อเตรียมพร้อมสำหรับการทำ Smart Auto-Fill")
    add_bullet(doc, "FR-OIC-03: Dynamic Field & Value Mapping Transformation", 
        "ระบบมีตาราง `oic_field_mapping` และ `oic_value_mapping` สำหรับแปลงชื่อฟิลด์และค่าข้อมูลจากระบบ คปภ. ให้เข้ากับโครงสร้างฐานข้อมูลของวิริยะประกันภัยได้อย่างยืดหยุ่น โดยไม่ต้องแก้ไขซอร์สโค้ด")

    # Section 3: Non-Functional Requirements
    add_heading_1(doc, "3. ข้อกำหนดด้านประสิทธิภาพและคุณลักษณะระบบ (Non-Functional Requirements - NFR)")
    add_paragraph(doc, "ข้อกำหนดด้านมาตรฐานเชิงคุณภาพ ความปลอดภัย และประสิทธิภาพในการให้บริการระดับองค์กร:")

    nfr_headers = ["หมวดหมู่ NFR", "รหัสข้อกำหนด", "เกณฑ์มาตรฐานทางเทคนิค (Specification & Target Metrics)"]
    nfr_rows = [
        ["Performance", "NFR-PERF-01", "เวลาตอบสนองของ RESTful API ต้องไม่เกิน 200 มิลลิวินาทีสำหรับคำขอปกติ (Under normal load)"],
        ["Performance", "NFR-PERF-02", "การค้นหาข้อมูลผู้สมัคร (Search Query) ในฐานข้อมูลขนาด 100,000 ระเบียน ต้องแสดงผลภายใน 500 มิลลิวินาที"],
        ["Scalability", "NFR-SCAL-01", "ระบบต้องรองรับผู้สมัครใช้งานพร้อมกัน (Concurrent Users) ไม่น้อยกว่า 1,000 คน โดยมีอัตราความสำเร็จของการส่งคำขอไม่ต่ำกว่า 99.9%"],
        ["Security", "NFR-SEC-01", "การรับส่งข้อมูลทั้งหมดต้องผ่านโพรโทคอล HTTPS ที่เข้ารหัสด้วยมาตรฐาน TLS 1.3 เป็นอย่างต่ำ"],
        ["Security", "NFR-SEC-02", "การเข้าถึงฐานข้อมูลต้องใช้ Parameterized Queries หรือ Prepared Statements ทั้งหมด เพื่อป้องกัน SQL Injection 100%"],
        ["Security", "NFR-SEC-03", "ข้อมูลนำเข้าที่เป็นข้อความต้องผ่านการ Sanitize และ Output Encoding เพื่อป้องกันช่องโหว่ Cross-Site Scripting (XSS)"],
        ["Security", "NFR-SEC-04", "ไฟล์เอกสารและภาพถ่ายถูกจัดเก็บบน Database BLOB ป้องกันปัญหา Path Traversal และไม่อนุญาตให้เข้าถึงไฟล์โดยตรงผ่าน URL"],
        ["Availability", "NFR-AVAL-01", "ระบบต้องมีความพร้อมในการให้บริการ (System Uptime) ไม่น้อยกว่า 99.9% ในช่วงเวลาที่เปิดรับสมัคร"],
        ["Reliability", "NFR-RELI-01", "การบันทึกข้อมูลการลงทะเบียนต้องเป็นแบบ ACID Transaction หากขั้นตอนใดล้มเหลว ระบบจะทำการ Rollback ข้อมูลทั้งหมด"],
        ["Usability", "NFR-USAB-01", "หน้าจอระบบต้องรองรับการแสดงผลแบบ Responsive Design บนอุปกรณ์ Desktop, Tablet และ Smart Phone (iOS / Android)"]
    ]
    add_table_data(doc, nfr_headers, nfr_rows)

    # Section 4: API Specifications
    add_heading_1(doc, "4. รายละเอียดส่วนต่อประสานโปรแกรม (Interface Requirements & API Specifications)")
    add_paragraph(doc, "ระบบ Back-End ให้บริการ RESTful API สำหรับการทำงานของ Front-End และระบบภายนอก โดยมี Endpoint สำคัญดังนี้:")

    api_headers = ["HTTP Method", "API Route", "คำอธิบายการทำงาน", "รูปแบบ Request / Response"]
    api_rows = [
        ["GET", "/api/config/system-status", "ตรวจสอบสถานะเปิด-ปิดรับสมัคร และเวลาที่กำหนด", "Res: { isOnline: bool, openPeriods: [...], serverTime: string }"],
        ["GET", "/api/person/{nationId}", "ค้นหาข้อมูลผู้สมัครและประวัติเดิมตามเลขบัตรประชาชน", "Res: ข้อมูล person, address, license, affiliation ครบชุด"],
        ["GET", "/api/locations/provinces", "ดึงรายชื่อจังหวัดทั้งหมดที่เปิดใช้งาน", "Res: [{ id: 1, name: 'กรุงเทพมหานคร' }, ...]"],
        ["GET", "/api/locations/districts/{provinceId}", "ดึงรายชื่ออำเภอตามรหัสจังหวัด", "Res: [{ id: 101, name: 'พระนคร', provinceId: 1 }, ...]"],
        ["GET", "/api/locations/sub-districts/{districtId}", "ดึงรายชื่อตำบลและรหัสไปรษณีย์ตามรหัสอำเภอ", "Res: [{ id: 1001, name: 'พระบรมมหาราชวัง', zipcode: '10200' }, ...]"],
        ["GET", "/api/courses/list?agent_type={type}", "ดึงรายชื่อหลักสูตรที่เปิดรับตามประเภทตัวแทน", "Res: รายการคอร์ส พร้อมรอบวันเวลาอบรมที่ยังว่าง"],
        ["GET", "/api/courses/pillars-matrix", "ดึงโครงสร้างตารางวิชา 4 Pillars สำหรับต่อ 4+", "Res: ข้อมูลวิชาในแต่ละ Pillar พร้อมจำนวนชั่วโมงและรอบวัน"],
        ["POST", "/api/register/submit", "บันทึกข้อมูลการลงทะเบียนแบบ Multi-Table Transaction", "Req: JSON Payload ข้อมูลผู้สมัครทั้ง 6 Tab + ไฟล์เอกสาร Base64"],
        ["GET", "/api/admin/enquiry", "ค้นหาและคัดกรองข้อมูลผู้สมัครสำหรับเจ้าหน้าที่", "Req Query: search, courseId, branchId, status, date / Res: Paginated List"],
        ["GET", "/api/admin/audit-diff/{historyId}", "ดึงข้อมูลเปรียบเทียบประวัติการแก้ไขข้อมูล", "Res: { changedFields: [{ field: string, oldVal: string, newVal: string }] }"],
        ["GET", "/api/admin/export/excel", "ส่งออกไฟล์รายงานผู้สมัครเป็น Excel (.xlsx)", "Res: Binary File Content-Disposition: attachment; filename=...xlsx"],
        ["GET", "/api/admin/export/zip", "ส่งออกไฟล์บีบอัด ZIP แยกโฟลเดอร์ตามหลักสูตร", "Res: Binary ZIP Archive"]
    ]
    add_table_data(doc, api_headers, api_rows)

    # Section 5: Deployment & Infrastructure
    add_heading_1(doc, "5. โครงสร้างพื้นฐานและการติดตั้งใช้งาน (Deployment & Infrastructure)")
    add_paragraph(doc, "ข้อกำหนดด้านสถาปัตยกรรมโครงสร้างพื้นฐานสำหรับรองรับการติดตั้งใช้งานระบบในสภาพแวดล้อมจริง (Production Environment):")

    add_heading_2(doc, "5.1 คุณลักษณะฮาร์ดแวร์และซอฟต์แวร์เซิร์ฟเวอร์ (Server Specifications)")
    add_bullet(doc, "Application Server", "CPU: 4 Cores ขึ้นไป, RAM: 16 GB, OS: Windows Server 2022 หรือ Ubuntu Linux 22.04 LTS, รันผ่าน .NET 8 Runtime / Kestrel")
    add_bullet(doc, "Database Server", "CPU: 8 Cores ขึ้นไป, RAM: 32 GB, Storage: SSD NVMe 500 GB (RAID 10), RDBMS: Microsoft SQL Server 2022 / 2025 Enterprise Edition")
    add_bullet(doc, "Web Server / Reverse Proxy", "Apache HTTP Server 2.4 หรือ Microsoft IIS 10 พร้อมเปิดใช้งาน mod_proxy / Application Request Routing (ARR) และเปิดใช้งาน HTTP/2 และ TLS 1.3")

    add_heading_2(doc, "5.2 การติดตั้งแบบ Containerization (Docker Compose Architecture)")
    add_paragraph(doc, "ระบบรองรับการรันผ่าน Docker Container เพื่อความสะดวกในการเคลื่อนย้ายและทดสอบระบบ โดยมีไฟล์ `docker-compose.yml` ควบคุม Service ดังนี้:")
    add_bullet(doc, "frontend-app", "Service สำหรับ Serve React Static Build ผ่าน Nginx หรือ Apache ทำหน้าที่รับคำขอจากผู้ใช้งาน")
    add_bullet(doc, "backend-api", "Service สำหรับรัน ASP.NET Core 8 Web API เชื่อมต่อฐานข้อมูลและประมวลผลคำขอทั้งหมด")
    add_bullet(doc, "database-node", "Service ฐานข้อมูลสำหรับการทดสอบ หรือเชื่อมต่อต่อไปยัง SQL Server คลัสเตอร์หลักขององค์กร")

    # Save Document
    out_path = r"c:\Users\ednak\OneDrive\Desktop\datamangement\www\register_form\dotnet\document\2_System_Requirements_Specification_SRS.docx"
    doc.save(out_path)
    print(f"SRS generated successfully at: {out_path}")

if __name__ == "__main__":
    build_srs()

