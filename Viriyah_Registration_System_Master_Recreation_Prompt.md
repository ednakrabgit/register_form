# Master Reconstruction Prompt: ระบบลงทะเบียนตัวแทน/นายหน้าประกันวินาศภัย
**Prompt แม่แบบฉบับสมบูรณ์สำหรับสั่ง AI สร้างระบบใหม่ทั้งหมดจากศูนย์ (Zero-Base Re-creation)**
*บมจ. วิริยะประกันภัย (Viriyah Insurance)*

---

> [!TIP]
> **วัตถุประสงค์และการใช้งาน:**
> Prompt นี้ถูกออกแบบเป็น **Master Technical Specification** ที่ละเอียด ครบถ้วน และรัดกุมที่สุด ในกรณีที่ Source Code สูญหายทั้งหมด สามารถ Copy ข้อความในหัวข้อด้านล่างนี้ทั้งชุด ไปสั่งให้ AI (เช่น Antigravity, Claude 3.7 / 3.5, ChatGPT, Cursor) สร้างโครงสร้างโปรเจกต์ โค้ด Backend (PHP), Frontend (JS/CSS/HTML), ฐานข้อมูล (MySQL Schema), ระบบคำนวณ Checksum บัตรประชาชน, ระบบควบคุมเปิด-ปิดรับสมัคร และ Script ซิงค์ข้อมูล ได้ทันที 100%

---

```markdown
# System Re-creation Prompt: Viriyah Agent & Broker Registration System

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

Generate complete, runnable, and robust code for all files described above.
```
