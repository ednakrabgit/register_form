# รายงานการตรวจสอบความปลอดภัยของซอร์สโค้ดและโครงสร้างระบบ (Security Audit Report)

- **โครงการ:** ระบบลงทะเบียนขอรับและขอต่ออายุใบอนุญาตตัวแทนและนายหน้าประกันวินาศภัย (บมจ. วิริยะประกันภัย)
- **ขอบเขตการตรวจสอบ:** ซอร์สโค้ดฝั่ง Backend (`dotnet/backend`), Frontend (`dotnet/frontend`), สคริปต์ฐานข้อมูล/Docker (`export_mssql_to_sqlite.py`, `dotnet/docker-compose.yml`, `dotnet/backend/Dockerfile`), การตั้งค่าบน GCE VM (`free-tier-vm` / Nginx / Firewall) และ Repository บน GitHub (`https://github.com/ednakrabgit/register_form`)
- **วันที่ตรวจสอบ:** 18 พฤศจิกายน 2569 (2026-11-18)
- **สถานะ:** ตรวจสอบเชิงรับ (Static Code Review & Configuration Audit) — **ยังไม่ได้ดำเนินการแก้ไขโค้ด** เพื่อรอการพิจารณาและอนุมัติแนวทางแก้ไข

---

## 1. บทสรุปสำหรับผู้บริหาร (Executive Summary)

จากการตรวจสอบซอร์สโค้ดและสภาพแวดล้อมทั้งหมด พบช่องโหว่ด้านความปลอดภัยจำนวน **24 ประเด็น** แบ่งตามระดับความรุนแรงดังนี้:

| ระดับความรุนแรง | จำนวน | ประเด็นหลักที่ส่งผลกระทบสูงที่สุด |
| :--- | :---: | :--- |
| **Critical (วิกฤต)** | **7** | ขาดระบบยืนยันตัวตนที่ API (19/19 Controllers), อ่าน JWT โดยไม่ตรวจลายเซ็น + Secret Key ฝังในโค้ด, บัญชี Backdoor + ปุ่ม Quick Login บนหน้า Production, รั่วไหล Reset Token ใน API Response, เก็บรหัสผ่านแบบ Plaintext, ฐานข้อมูล PII จริง (`app.db`) อยู่ใน Public GitHub Repo, เอกสารบัตรประชาชนเข้าถึงได้สาธารณะ + Stored XSS จากการอัปโหลดไฟล์ |
| **High (สูง)** | **7** | CORS อนุญาตทุก Origin พร้อม Credentials, Log/Audit Log เปิดสาธารณะ, Mass Assignment, Export/Query ข้อมูล PII แบบไม่ล็อกอิน, ไม่มี Rate Limiting, ไลบรารี `xlsx@0.18.5` มีช่องโหว่ CVE + CSV Formula Injection, เก็บ JWT ใน `localStorage` |
| **Medium (ปานกลาง)** | **6** | ขาด HTTP Security Headers บน Nginx, เปิด Swagger และ System Info บน Production, ส่ง Raw Exception Message กลับให้ Client, Account Enumeration, ความเสี่ยง DoS จากการอัปโหลดไฟล์ Excel / Path handling, การเปิด Port SSH/RDP `0.0.0.0/0` และ Docker รันด้วย root |
| **Low (ต่ำ / ข้อแนะนำ)** | **4** | อายุ JWT นาน 7 วันและไม่มี Revocation, ขาด `UseForwardedHeaders`, แพ็กเกจ/ไฟล์เก่าที่ไม่ได้ใช้ใน Repo, Ephemeral IP และ Certbot ไม่ได้ระบุอีเมลแจ้งเตือน |

> [!CAUTION]
> **ความเสี่ยงเร่งด่วนระดับวิกฤตต่อข้อมูลส่วนบุคคล (PDPA):**
> 1. Repository `https://github.com/ednakrabgit/register_form` ตั้งค่าเป็น **Public** และมีไฟล์ `dotnet/backend/app.db` ซึ่งเก็บข้อมูลส่วนบุคคลจริง (เลขบัตรประชาชน 13 หลัก, ชื่อ-สกุล, ที่อยู่, เบอร์โทร, อีเมล, โรคประจำตัว, ประวัติแพ้อาหาร และรหัสผ่านแบบ Plaintext) พร้อมไฟล์ `LocalData/Archives/*.json` และรหัสผ่านฐานข้อมูลอยู่ภายใน Git
> 2. ระบบ Production API ปัจจุบันไม่ได้เปิดใช้งาน ASP.NET Core Authentication Middleware (`UseAuthentication`) และมีหน้า `/login` ที่มีปุ่ม Quick Login พร้อมรหัสผ่าน `superadmin` / `admin` แสดงสาธารณะ

---

## 2. รายละเอียดช่องโหว่ระดับ Critical (วิกฤต — ควรแก้ไขทันที)

### C-01: ไม่ได้เปิดใช้งาน Authentication Middleware และ API ทั้ง 19 Controllers ไม่มี `[Authorize]`
- **หมวดหมู่:** OWASP A01:2021 (Broken Access Control) / API5:2023 (Broken Function Level Authorization)
- **ตำแหน่งที่พบ:**
  - `dotnet/backend/Program.cs` (บรรทัด 246–265): เรียก `app.UseAuthorization()` โดยไม่ได้ลงทะเบียน `builder.Services.AddAuthentication(...)` และไม่ได้เรียก `app.UseAuthentication()` รวมถึงเปิด Endpoint `POST /api/migrate-db` (บรรทัด 265) โดยไม่มีการตรวจสิทธิ์
  - ทุก Controller (19 จาก 19 ไฟล์, รวม 65 Write Endpoints) ไม่มี `[Authorize]` ที่เปิดใช้งานอยู่ เช่น:
    - `dotnet/backend/Controllers/AdminController.cs` (บรรทัด 15 และ 955 ถูก comment ออกไว้): `GET /api/admin/trainees`, `PUT /api/admin/trainees/{nationId}`, `DELETE /api/admin/trainees/{id}` เปิดให้เรียกได้โดยไม่ต้องล็อกอิน
    - `dotnet/backend/Controllers/UsersController.cs` (บรรทัด 56–129): `GET /api/users` และ `GET /api/users/{id}` ส่งข้อมูลผู้ใช้ทั้งหมดโดยไม่ตรวจสิทธิ์
    - `dotnet/backend/Controllers/ConfigController.cs` (บรรทัด 158–240): `PUT /api/config` และ `POST /api/config/reset-defaults` ให้ใครก็ได้เปลี่ยนค่า `SYSTEM_IS_ONLINE` ปิดระบบได้ทันที
    - `dotnet/backend/Controllers/AdminOicController.cs`, `TrainingStampController.cs`, `ReportsController.cs`, `AuditLogController.cs`, `SystemLogController.cs`, `LocationController.cs`, `MasterDataController.cs`, `AgentMasterController.cs`, `CourseCurriculumController.cs`, `RenewBasicController.cs`, `RenewDataController.cs`, `PersonController.cs`, `RegistrationController.cs`
  - **Fail-Open Logic:**
    - `AdminController.cs` (บรรทัด 579, 767): ตรวจเฉพาะ `if (caller.Role?.ToLower() == "applicant")` ทำให้เมื่อ **ไม่ส่ง Token (`caller.Role == null`)** หรือเป็น `Viewer` จะข้ามเงื่อนไขการจำกัดสิทธิ์และเข้าถึง/แก้ไขข้อมูลผู้สมัครทั้งหมดได้
    - `RolesController.cs` (บรรทัด 165–169): ตรวจ `if (string.Equals(callerRole, "Viewer", ...))` แต่เนื่องจากไม่มี `UseAuthentication()` ค่า `callerRole` จึงเป็น `null` เสมอ ทำให้ผู้ใช้ที่ไม่ล็อกอินสร้าง Role ได้
    - `RegistrationController.cs` (บรรทัด 43): ตรวจ `if (User.Identity?.IsAuthenticated == true)` ซึ่งจะเป็น `false` เสมอ ทำให้ไม่สามารถป้องกันการลงทะเบียนสวมสิทธิ์เลขบัตรประชาชนอื่นได้
- **ผลกระทบ:** ผู้ไม่หวังดีบนอินเทอร์เน็ตสามารถอ่าน แก้ไข ลบข้อมูลผู้สมัครทั้งหมด เปลี่ยนตั้งค่าระบบ หรือนำเข้าข้อมูลการอบรมปลอมได้โดยไม่ต้องเข้าสู่ระบบ
- **แนวทางแก้ไข:**
  1. เพิ่ม `builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(...)` และ `app.UseAuthentication()` ก่อน `app.UseAuthorization()` ใน `Program.cs`
  2. กำหนด Default Authorization Policy (`FallbackPolicy`) ให้ทุก Endpoint ต้องผ่านการยืนยันตัวตนเป็นค่าเริ่มต้น และระบุ `[AllowAnonymous]` เฉพาะ Endpoint สาธารณะที่จำเป็นจริง (เช่น `login`, `register`, `health`, master data ที่จำเป็นหน้าลงทะเบียน)
  3. เปลี่ยนเงื่อนไขสิทธิ์ทั้งหมดเป็น **Fail-Closed** (ต้องตรวจ Role ที่อนุญาตแบบ Allowlist เช่น `[Authorize(Roles = "Superadmin,Admin")]`) และลบหรือปิด `POST /api/migrate-db` บน Production

---

### C-02: อ่านข้อมูล JWT โดยไม่ตรวจลายเซ็น (Signature Bypass) และฝัง JWT Secret Key ไว้ในโค้ด
- **หมวดหมู่:** OWASP A07:2021 (Identification and Authentication Failures) / CWE-347, CWE-798
- **ตำแหน่งที่พบ:**
  - **ไม่ตรวจลายเซ็นและวันหมดอายุของ JWT (`ReadJwtToken` แทน `ValidateToken`):**
    - `dotnet/backend/Common/RoleHierarchy.cs` (บรรทัด 22–36): `GetCallerRole()` ใช้ `handler.ReadJwtToken(tokenStr)` เพื่อดึง `role` โดยไม่ตรวจลายเซ็น ใช้ควบคุมการสร้าง/แก้ไข/ลบผู้ใช้และ Role ใน `UsersController.cs` และ `RolesController.cs`
    - `dotnet/backend/Controllers/AuthController.cs` (บรรทัด 1003–1067): `GetCurrentUserFromToken()` ใช้ `tokenHandler.ReadJwtToken(tokenStr)` ทำให้ `GET /api/auth/profile`, `PUT /api/auth/profile` และ `PUT /api/auth/change-password` เชื่อข้อมูล `sub`/`unique_name` โดยไม่พิสูจน์ความถูกต้องของ Token
    - `dotnet/backend/Controllers/AdminController.cs` (บรรทัด 25–62): `GetCallerInfo()` ใช้ `handler.ReadJwtToken(tokenStr)`
    - `dotnet/backend/Controllers/UploadController.cs` (บรรทัด 126–139): ใช้ `tokenHandler.ReadJwtToken(token)` สำหรับบันทึกประวัติผู้แก้ไข
  - **Hardcoded Fallback JWT Secret Key:**
    - `dotnet/backend/Controllers/AuthController.cs` (บรรทัด 369, 593, 691): ใช้ `_configuration["Jwt:SecretKey"] ?? "default_secret_key_needs_to_be_long_enough_for_hs256"` และไม่มีการตั้งค่า `Jwt:SecretKey` ใน `appsettings.json` หรือ `appsettings.Production.json` ทำให้ระบบจริงใช้คีย์สาธารณะที่อยู่ใน GitHub และปิด `ValidateIssuer = false`, `ValidateAudience = false` (บรรทัด 701–702)
- **ผลกระทบ:** ผู้ไม่หวังดีสามารถปลอมแปลง JWT Claim ด้วยตนเองเพื่อสวมสิทธิ์เป็น `Superadmin` หรือสวมบัญชีผู้ใช้คนใดก็ได้ในระบบ เพื่อสร้าง/ลบ/เปลี่ยนรหัสผ่านบัญชีอื่นและแก้ไขข้อมูลส่วนตัวได้ทั้งหมด
- **แนวทางแก้ไข:**
  1. ยกเลิกการอ่าน Header `Authorization` แบบ Manual ด้วย `ReadJwtToken()` ทั้งหมด และให้ดึง Claims จาก `HttpContext.User` ที่ผ่าน ASP.NET Core `JwtBearer` Middleware แล้วเท่านั้น
  2. ลบ Fallback Secret Key ออกจากซอร์สโค้ด โหลด `Jwt:SecretKey` (สุ่มความยาวอย่างน้อย 256-bit / 32+ bytes) จาก Environment Variable / Secret Manager และให้แอปพลิเคชันปฏิเสธการเริ่มทำงานหากไม่พบคีย์
  3. เปิด `ValidateIssuer = true`, `ValidateAudience = true`, `ValidateLifetime = true` และกำหนด `ValidIssuer`/`ValidAudience` ให้ชัดเจน

---

### C-03: บัญชี Backdoor ที่ฝังไว้ในโค้ด Backend และปุ่ม Quick Login บนหน้า Login ของ Production
- **หมวดหมู่:** OWASP A07:2021 / CWE-798 (Use of Hard-coded Credentials)
- **ตำแหน่งที่พบ:**
  - `dotnet/backend/Controllers/AuthController.cs` (บรรทัด 287–319): มีเงื่อนไข Fallback Hardcoded Accounts สำหรับ `admin` (`editor` / `password123`), `karnindy@gmail.com` (`password123`), `viewer` (`viewer` / `password123`) และ `superadmin` (`password123`) โดยสร้าง User จำลอง `Id = 999` แม้ว่าจะเปลี่ยนรหัสผ่านหรือลบผู้ใช้ในฐานข้อมูลแล้วก็ตาม
  - `dotnet/frontend/src/pages/auth/Login.jsx` (บรรทัด 155–206): แสดงกล่อง "บัญชีทดสอบทุก Role (Quick Test Switcher)" บนหน้า `/login` ของ Production พร้อมรหัสผ่าน `admin / password123`, `superadmin / password123`, `viewer / password123` และ**เปิดเผยเลขบัตรประชาชนจริง (`1100200314511`) พร้อมรหัสผ่าน (`14511`)** ของผู้สมัครในหน้าเว็บสาธารณะ
- **ผลกระทบ:** บุคคลภายนอกทุกคนที่เปิดหน้า `/login` สามารถคลิกปุ่มเดียวเพื่อเข้าสู่ระบบในฐานะ `Superadmin` หรือเข้าบัญชีผู้สมัครจริงได้ทันที
- **แนวทางแก้ไข:**
  1. ลบโค้ด Fallback Hardcoded Credentials ใน `AuthController.cs` (บรรทัด 287–319) และ `GetCurrentUser()` fallback `Id = 999` (บรรทัด 765–799) ออกทั้งหมด
  2. ลบกล่อง Quick Test Switcher ออกจาก `Login.jsx` (หรือจำกัดด้วย `import.meta.env.DEV` เฉพาะเครื่องพัฒนาและใช้ข้อมูลสมมติเท่านั้น)
  3. เปลี่ยนรหัสผ่านของบัญชีผู้ดูแลระบบ (`superadmin`, `admin`, `viewer`) ในฐานข้อมูลทั้งหมดทันที

---

### C-04: ช่องโหว่ยึดบัญชีผู้ใช้ (Account Takeover) จากการส่ง `mockResetToken` กลับใน API ลืมรหัสผ่าน
- **หมวดหมู่:** OWASP A07:2021 / CWE-640 (Weak Password Recovery Mechanism)
- **ตำแหน่งที่พบ:**
  - `dotnet/backend/Controllers/AuthController.cs` (บรรทัด 897–945): `POST /api/auth/forgot-password` สร้าง Token 8 ตัวอักษร (`Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper()`, บรรทัด 927) และส่งค่า **`mockResetToken = user.PasswordResetToken`** กลับไปใน JSON Response (บรรทัด 941) โดยตรง
- **ผลกระทบ:** ใครก็ตามที่ทราบอีเมลของผู้ใช้หรือผู้ดูแลระบบ สามารถเรียกขอ Reset Password และรับ Token จาก Response เพื่อนำไปเปลี่ยนรหัสผ่านและยึดบัญชีนั้นผ่าน `POST /api/auth/reset-password` ได้ทันทีโดยไม่ต้องเข้าถึงอีเมลของเหยื่อ
- **แนวทางแก้ไข:**
  1. ลบ `mockResetToken` ออกจาก HTTP Response ทันที
  2. ใช้ `RandomNumberGenerator.GetBytes(32)` สร้าง Token ที่มี Entropy สูง เก็บเฉพาะค่า Hash (SHA-256) ของ Reset Token ลงฐานข้อมูล ลดอายุเหลือ 15–30 นาที และส่งลิงก์/รหัสยืนยันผ่านระบบ Email/SMTP จริงเท่านั้น

---

### C-05: การจัดเก็บรหัสผ่านแบบ Plaintext และรหัสผ่านเริ่มต้นที่คาดเดาได้ง่าย
- **หมวดหมู่:** OWASP A02:2021 (Cryptographic Failures) / CWE-256, CWE-521
- **ตำแหน่งที่พบ:**
  - `dotnet/backend/Controllers/AuthController.cs` (บรรทัด 183, 245, 283, 563, 985, 1827, 1837) และ `dotnet/backend/Controllers/UsersController.cs` (บรรทัด 193, 359): บันทึกและเปรียบเทียบรหัสผ่านแบบข้อความธรรมดา (Plaintext) ลงคอลัมน์ `PasswordHash` โดยตรง (มีคอมเมนต์ `// Can use BCrypt in production`)
  - `AuthController.cs` (บรรทัด 223–245): รหัสผ่านเริ่มต้นของผู้สมัครคือ **เลขท้าย 5 หลักของเลขบัตรประชาชน** (มีค่าที่เป็นไปได้เพียง 100,000 รูปแบบ และคาดเดาได้ทันทีเมื่อรู้เลขบัตรประชาชน)
  - `AuthController.cs` (บรรทัด 1817) และ `UsersController.cs` (บรรทัด 354): กำหนดความยาวรหัสผ่านขั้นต่ำเพียง 4 ตัวอักษร
- **ผลกระทบ:** หากฐานข้อมูลรั่วไหล (ซึ่งปัจจุบัน `app.db` อยู่ใน Public GitHub) รหัสผ่านของผู้ใช้ทั้งหมดกว่า 3,900 บัญชีจะถูกเปิดเผยทันที และบัญชีผู้สมัครสามารถถูกเข้าถึงได้ง่ายหากทราบเลขบัตรประชาชน
- **แนวทางแก้ไข:**
  1. ใช้ `BCrypt.Net-Next` หรือ `ASP.NET Core Identity PasswordHasher<User>` (PBKDF2-HMAC-SHA512 / Argon2id) สำหรับ Hash และ Verify รหัสผ่านทั้งหมด พร้อมสคริปต์ Migrate ข้อมูลเดิม
  2. กำหนดนโยบายรหัสผ่านขั้นต่ำ 8–12 ตัวอักษรขึ้นไป และบังคับให้ผู้สมัครตั้งรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งแรก (Force Password Change) หรือใช้การยืนยันตัวตนผ่าน OTP

---

### C-06: ฐานข้อมูล Production (`app.db`), ไฟล์ OIC Archives และรหัสผ่าน DB อยู่ใน Public GitHub Repository
- **หมวดหมู่:** OWASP A02:2021 / การรั่วไหลของข้อมูลส่วนบุคคล (PDPA Data Breach)
- **ตำแหน่งที่พบ:**
  - Repository `https://github.com/ednakrabgit/register_form` ตรวจสอบผ่าน GitHub API พบว่ามีสถานะเป็น **`public` (`private: False`)**
  - ไฟล์ข้อมูลส่วนบุคคลและไฟล์ลับที่ถูก Track อยู่ใน Git:
    - `dotnet/backend/app.db` (~21 MB): ข้อมูลผู้สมัครกว่า 3,935 ราย (เลขบัตรประชาชน 13 หลัก, ชื่อ-สกุล, วันเกิด, ที่อยู่, เบอร์โทร, อีเมล, ประวัติสุขภาพ/แพ้อาหาร, ผู้ติดต่อฉุกเฉิน และตาราง `admin_users` ที่มีรหัสผ่านแบบ Plaintext)
    - `dotnet/backend/LocalData/Archives/*.json`: ไฟล์ข้อมูลโปรไฟล์ตัวแทนจาก OIC
    - `dotnet/backend/logs/log-20260722.txt`: ไฟล์ Log ของระบบ
    - รหัสผ่านฐานข้อมูลในโค้ด: `dotnet/backend/appsettings.json` (บรรทัด 10), `dotnet/docker-compose.yml` (บรรทัด 9, 25, 26), `export_mssql_to_sqlite.py` (บรรทัด 8)
- **ผลกระทบ:** บุคคลใดก็ได้ทั่วโลกสามารถดาวน์โหลดฐานข้อมูลทั้งหมดและรหัสผ่านฐานข้อมูลไปจาก GitHub ได้ทันที ถือเป็นความเสี่ยงร้ายแรงด้านกฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
- **แนวทางแก้ไข:**
  1. **เปลี่ยน GitHub Repository เป็น `Private` ทันที** เป็นอันดับแรก
  2. นำ `dotnet/backend/app.db`, `dotnet/backend/LocalData/Archives/*`, `dotnet/backend/logs/*`, `*.json` ที่มีข้อมูลจริงออกจากการ Track ใน Git เพิ่มลงใน `.gitignore` และล้างออกจาก Git History (`git filter-repo` หรือ BFG Repo-Cleaner)
  3. เปลี่ยนรหัสผ่าน SQL Server (`sa`, `thaiairp_iptc`) และย้าย Connection String ไปเก็บใน Environment Variables / User Secrets

---

### C-07: เอกสารบัตรประชาชนเข้าถึงได้โดยไม่ต้องล็อกอิน และช่องโหว่ Stored XSS จากการอัปโหลดไฟล์ไม่จำกัดชนิด
- **หมวดหมู่:** OWASP A01:2021 & A03:2021 (Injection / Unrestricted File Upload)
- **ตำแหน่งที่พบ:**
  - `dotnet/backend/Controllers/UploadController.cs` (บรรทัด 26–111):
    - `POST /api/upload` ไม่มีการยืนยันตัวตน ทำให้ใครก็ได้อัปโหลดทับเอกสารของเลขบัตรประชาชนใดก็ได้ และเปลี่ยนสถานะ `registration.confirmed = true`
    - ไม่มีการตรวจนามสกุลไฟล์, ไม่ตรวจ Magic Bytes, ไม่จำกัดขนาดต่อไฟล์ และบันทึกค่า `file.ContentType` ที่ส่งมาจาก Client ลงฐานข้อมูลโดยตรง (บรรทัด 75, 82, 95)
  - `dotnet/backend/Controllers/AdminController.cs` (บรรทัด 963–1014):
    - `GET /api/admin/documents/{id}/file` ใส่ **`[AllowAnonymous]`** (บรรทัด 982) ทำให้ใครก็ได้ไล่ดึงเอกสารรูปถ่ายบัตรประชาชนและรูปถ่ายคู่บัตรประชาชนของผู้สมัครทุกคนด้วยเลขลำดับ `id` (`1, 2, 3, ...`)
    - ส่งไฟล์กลับด้วย `return File(doc.FileData, contentType)` (บรรทัด 992) โดยใช้ `doc.ContentType` ที่ Client อัปโหลดมาโดยไม่มี Header `Content-Disposition: attachment` หรือ `X-Content-Type-Options: nosniff` — หากมีผู้อัปโหลดไฟล์ชนิด `text/html` หรือ `image/svg+xml` เบราว์เซอร์จะรัน JavaScript ภายใต้ Origin เดียวกับระบบ (Stored XSS) ซึ่งสามารถเข้าถึง `localStorage.getItem('authToken')` ของผู้ดูแลระบบได้
  - `dotnet/backend/Program.cs` (บรรทัด 250–256): `app.UseStaticFiles` เปิดโฟลเดอร์ `/LocalData` (ซึ่งมี `LocalData/Archives` และ `LocalData/uploads`) ให้เข้าถึงผ่าน HTTP ได้โดยตรงโดยไม่ตรวจสิทธิ์
- **ผลกระทบ:** เอกสารสำคัญทางกฎหมาย (รูปถ่ายบัตรประชาชน/รูปคู่บัตร) รั่วไหลสาธารณะ และสามารถเกิด Stored XSS เพื่อยึดสิทธิ์ผู้ดูแลระบบ
- **แนวทางแก้ไข:**
  1. บังคับ Authentication และตรวจ Ownership (`NationId` ตรงกับผู้ล็อกอิน หรือเป็น `Admin`/`Superadmin`) ทั้งใน `POST /api/upload`, `GET /api/admin/trainees/{nationId}/documents` และ `GET /api/admin/documents/{id}/file` (ลบ `[AllowAnonymous]`)
  2. ตรวจ Allowlist เฉพาะชนิดไฟล์ที่อนุญาต (`image/jpeg`, `image/png`, `application/pdf`), ตรวจสอบ **Magic Bytes** จากเนื้อไฟล์จริง (ไม่เชื่อ `file.ContentType`), จำกัดขนาดไฟล์ (เช่น <= 5 MB) และใส่ Header `X-Content-Type-Options: nosniff` กับ `Content-Security-Policy: sandbox` หรือ `Content-Disposition: attachment`
  3. ปิดการ Serve โฟลเดอร์ `LocalData/Archives` และ `LocalData/uploads` ผ่าน `UseStaticFiles` สาธารณะ โดยให้บริการผ่าน Authorized Controller เท่านั้น

---

## 3. รายละเอียดช่องโหว่ระดับ High (สูง)

### H-01: การตั้งค่า CORS เปิดรับทุก Origin พร้อม `AllowCredentials()`
- **ตำแหน่งที่พบ:** `dotnet/backend/Program.cs` (บรรทัด 91–100): `policy.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod().AllowCredentials()`
- **ผลกระทบ:** เว็บไซต์ภายนอกใด ๆ สามารถส่งคำขอข้ามโดเมนพร้อม Credentials มายัง API และอ่านผลลัพธ์ได้ (หากเปลี่ยนไปใช้ Cookie Auth ในอนาคตจะทำให้เกิด Cross-Origin Data Theft ทันที)
- **แนวทางแก้ไข:** เปลี่ยนไปใช้ `WithOrigins(...)` แบบระบุ Allowlist เฉพาะโดเมนที่ใช้งานจริง (`https://agentportal.xn--z3cbl2brb.com`, `https://register-frontend-779142529105.us-central1.run.app`, และ `http://localhost:5173` เฉพาะ Development)

### H-02: เปิดเผย Application Log และ Audit History ที่มีข้อมูลส่วนบุคคลโดยไม่ตรวจสิทธิ์
- **ตำแหน่งที่พบ:**
  - `dotnet/backend/Controllers/SystemLogController.cs` (บรรทัด 12–49): `GET /api/systemlog/files` และ `GET /api/systemlog/files/{filename}` ไม่มี `[Authorize]` เปิดให้คนนอกอ่านไฟล์ Log ทั้งหมด
  - `dotnet/backend/Controllers/AuditLogController.cs` (บรรทัด 9–31): comment `// [Authorize]` ทิ้งไว้ ทำให้ `GET /api/auditlog` ส่ง Snapshot `OldData`/`NewData` ที่มีเลขบัตรประชาชน เบอร์โทร ที่อยู่ และข้อมูลสุขภาพของผู้สมัครทั้งหมด
- **แนวทางแก้ไข:** กำหนด `[Authorize(Roles = "Superadmin,Admin")]` ให้ทั้งสอง Controller และหลีกเลี่ยงการบันทึกข้อมูลอ่อนไหวลง Log

### H-03: ช่องโหว่ Mass Assignment (Over-Posting) ในการอัปเดต Entity
- **ตำแหน่งที่พบ:**
  - `dotnet/backend/Controllers/AdminController.cs` (บรรทัด 762, 810–822): รับ EF Core Entity `Person` เข้ามาตรง ๆ แล้วเรียก `context.Entry(p).CurrentValues.SetValues(updatedPerson)` รวมถึงอัปเดต `PersonRegistration` และ `PersonLicense` โดยไม่จำกัดฟิลด์
  - `dotnet/backend/Controllers/RegistrationController.cs` (บรรทัด 40, 77–82): รับ Entity `Register` โดยตรงใน `POST`/`PUT` โดยไม่มี DTO Allowlist หรือการตรวจสิทธิ์ความเป็นเจ้าของ
- **ผลกระทบ:** ผู้สมัครอาจแก้ไขฟิลด์ที่ควรจำกัดเฉพาะผู้ดูแลระบบ (เช่น สถานะยืนยัน `confirmed`, เวลาดำเนินการ, ข้อมูลสิทธิ์ลดหย่อน หรือแก้ไข Record ของผู้อื่นผ่าน `PUT /api/registration/{id}`)
- **แนวทางแก้ไข:** สร้าง Request DTO แยกเฉพาะฟิลด์ที่อนุญาตให้แก้ไขตามบทบาท (Applicant vs Admin) และตรวจความเป็นเจ้าของ Record ทุกครั้งก่อนบันทึก

### H-04: Endpoint ดึงและส่งออกข้อมูล PII จำนวนมากโดยไม่ต้องยืนยันตัวตน
- **ตำแหน่งที่พบ:**
  - `dotnet/backend/Controllers/ReportsController.cs` (บรรทัด 20–39, 58–397): `GET /api/reports/Remarks` และ `POST /api/reports/export` ไม่มี Authentication สามารถดึงข้อมูลผู้สมัครทั้งหมดในระบบออกมาในครั้งเดียว (รวมถึงข้อมูลอ่อนไหวตาม PDPA เช่น `MedicalCondition`, `FoodAllergy`, `Religion`, `BloodGroup`)
  - `dotnet/backend/Controllers/PersonController.cs` (บรรทัด 26–150): `GET /api/person/{nationId}` และ `POST /api/person/refresh-oic/{nationId}` ไม่มี Authentication ใครก็ได้ใส่เลขบัตร 13 หลักเพื่อดึงข้อมูลส่วนตัวและโปรไฟล์ OIC
- **แนวทางแก้ไข:** บังคับ `[Authorize(Roles = "Superadmin,Admin,Viewer")]` ที่ `ReportsController` และบังคับ Authentication + ตรวจว่า `nationId` ตรงกับ Token (หรือเป็น Admin) ใน `PersonController`

### H-05: ไม่มีระบบ Rate Limiting และ Brute-Force Protection
- **ตำแหน่งที่พบ:**
  - `dotnet/backend/Program.cs`: ไม่ได้ตั้งค่า `AddRateLimiter` / `UseRateLimiter`
  - Nginx บน VM (`/etc/nginx/sites-available/viriyah-register`): ไม่ได้กำหนด `limit_req_zone` / `limit_req`
- **ผลกระทบ:** สามารถยิงคำขอสุ่มรหัสผ่านที่ `POST /api/auth/login` (โดยเฉพาะรหัสผ่าน 5 หลักของผู้สมัคร), ยิงคำขอ `forgot-password` หรือดึงข้อมูลจำนวนมากเพื่อทำให้ VM `e2-micro` เกิดภาวะทรัพยากรเต็ม (DoS) ได้ง่าย
- **แนวทางแก้ไข:** เพิ่ม ASP.NET Core Rate Limiting (เช่น 5–10 ครั้ง/นาทีต่อ IP สำหรับ `/api/auth/*`) ร่วมกับ Nginx `limit_req_zone` และระบบ Account Lockout ชั่วคราวเมื่อกรอกรหัสผ่านผิดติดต่อกัน

### H-06: ไลบรารี Frontend `xlsx@^0.18.5` มีช่องโหว่ CVE และความเสี่ยง Spreadsheet Formula Injection
- **ตำแหน่งที่พบ:**
  - `dotnet/frontend/package.json` (บรรทัด 20): ใช้แพ็กเกจ `xlsx` เวอร์ชัน `^0.18.5` บน npm Registry ซึ่งหยุดอัปเดตและมีช่องโหว่ระดับ High ที่ทราบแล้ว (CVE-2023-30533 Prototype Pollution และ CVE-2024-22363 ReDoS)
  - `dotnet/frontend/src/pages/admin/ExportDataReport.jsx` (บรรทัด 269–297): นำข้อมูลที่ผู้ใช้กรอก (เช่น ชื่อ, ที่อยู่, หมายเหตุ, ข้อมูลแพ้อาหาร) ส่งออกเป็น `.csv`/`.xlsx` โดยไม่ Escape อักขระขึ้นต้นสูตร (`=`, `+`, `-`, `@`, `\t`, `\r`)
- **ผลกระทบ:** หากผู้สมัครกรอกข้อความขึ้นต้นด้วยอักขระสูตรแล้วผู้ดูแลระบบเปิดไฟล์ที่ Export ด้วย Excel อาจเกิดการรันสูตรอันตรายหรือดึงข้อมูลออกจากเครื่องผู้ดูแลระบบ (CSV/Formula Injection) และหากใช้ `xlsx@0.18.5` อ่านไฟล์ภายนอกจะเสี่ยง Prototype Pollution/ReDoS
- **แนวทางแก้ไข:**
  1. เปลี่ยนจาก `xlsx` (`0.18.5`) ไปใช้ `exceljs` หรืออัปเดตผ่าน SheetJS CDN Official Tarball ที่แพตช์แล้ว หรือย้ายการสร้างไฟล์ Excel ไปใช้ `ClosedXML` ฝั่ง Backend ที่อัปเดตเวอร์ชันล่าสุด
  2. ทำ Formula Sanitization (เติมเครื่องหมาย `'` นำหน้าข้อความที่ขึ้นต้นด้วย `=`, `+`, `-`, `@`, `\t`, `\r`) ก่อนสร้างไฟล์ CSV/Excel

### H-07: จัดเก็บ JWT Token ใน `localStorage` และพึ่งพา Route Guard ฝั่ง Client เป็นหลัก
- **ตำแหน่งที่พบ:** `dotnet/frontend/src/context/AuthContext.jsx` (บรรทัด 8, 16, 62–63, 86–87, 108–128) และ `dotnet/frontend/src/App.jsx` (บรรทัด 54–103)
- **ผลกระทบ:** Token ที่เก็บใน `localStorage` สามารถถูกอ่านได้ทันทีหากเกิด XSS ในโดเมนเดียวกัน (เช่น ช่องโหว่ C-07) และการซ่อนเมนู/Guard บน React เป็นเพียง UX ไม่สามารถป้องกันการยิง API โดยตรงได้
- **แนวทางแก้ไข:** พิจารณาเปลี่ยนไปเก็บ Session/Access Token ใน Cookie แบบ `HttpOnly`, `Secure`, `SameSite=Lax/Strict` (ร่วมกับ CSRF Protection) และบังคับตรวจสิทธิ์ทุกการกระทำฝั่ง Backend เป็นหลัก

---

## 4. รายละเอียดช่องโหว่ระดับ Medium (ปานกลาง)

### M-01: ขาด HTTP Security Headers และเปิดเผยเวอร์ชัน Nginx บน Production
- **ตำแหน่งที่พบ:** VM `/etc/nginx/sites-available/viriyah-register` และ `/etc/nginx/snippets/viriyah-*.conf` (Header ตอบกลับปัจจุบันมี `Server: nginx/1.22.1` และไม่มี Security Headers)
- **แนวทางแก้ไข:** เพิ่ม `server_tokens off;` และเพิ่ม Security Headers ใน Nginx:
  - `Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`
  - `X-Frame-Options "SAMEORIGIN" always;`
  - `X-Content-Type-Options "nosniff" always;`
  - `Referrer-Policy "strict-origin-when-cross-origin" always;`
  - `Permissions-Policy "geolocation=(), microphone=(), camera=()" always;`
  - `Content-Security-Policy` ที่เหมาะสมกับ React SPA

### M-02: เปิด Swagger UI และ System Information Endpoint บน Production
- **ตำแหน่งที่พบ:**
  - `dotnet/backend/Program.cs` (บรรทัด 239–244): เปิด `UseSwagger()` และ `UseSwaggerUI()` ในทุก Environment รวมถึง Production ทำให้บุคคลภายนอกเห็นโครงสร้าง API ทั้งหมด (รวม `/api/migrate-db`)
  - `dotnet/backend/Controllers/ConfigController.cs` (บรรทัด 141–155): `GET /api/config/system-info` เปิดเผยเวอร์ชัน `.NET`, `OSDescription`, Architecture, Environment Name และ Database Provider ให้บุคคลทั่วไป
- **แนวทางแก้ไข:** เปิด Swagger เฉพาะ `if (app.Environment.IsDevelopment())` (หรือบังคับสิทธิ์ Admin) และแยกข้อมูลสาธารณะ (`isRegistrationOpen`, `statusMessage`) ออกจากข้อมูลระบบภายในใน `system-info`

### M-03: ส่งข้อความ Exception ภายใน (`ex.Message`) กลับไปยัง Client โดยตรง
- **ตำแหน่งที่พบ:** `AuthController.cs` (บรรทัด 889), `AdminController.cs` (บรรทัด 451), `TrainingStampController.cs` (บรรทัด 51, 79), `ConfigController.cs` (บรรทัด 177)
- **ผลกระทบ:** อาจเปิดเผยรายละเอียดโครงสร้างฐานข้อมูล ชื่อคอลัมน์ พาธไฟล์ หรือไลบรารีภายในแก่ผู้โจมตี
- **แนวทางแก้ไข:** บันทึกรายละเอียดข้อผิดพลาดลง Serilog ฝั่ง Server เท่านั้น และส่งข้อความแสดงข้อผิดพลาดแบบทั่วไปพร้อม Trace/Correlation ID กลับให้ Client

### M-04: Account Enumeration ในขั้นตอนสมัครสมาชิก
- **ตำแหน่งที่พบ:** `dotnet/backend/Controllers/AuthController.cs` (บรรทัด 535, 549): แยกข้อความตอบกลับชัดเจนว่า "อีเมลนี้ถูกใช้งานในระบบแล้ว" หรือ "เลขประจำตัวประชาชนนี้มีบัญชีผู้ใช้งานในระบบแล้ว"
- **ผลกระทบ:** ผู้ไม่หวังดีสามารถตรวจสอบได้ว่าเลขบัตรประชาชนหรืออีเมลใดเป็นตัวแทน/ผู้สมัครของวิริยะประกันภัยหรือไม่
- **แนวทางแก้ไข:** จำกัดอัตราการเรียก (Rate Limit / CAPTCHA) บนหน้าสมัครสมาชิก และพิจารณาปรับข้อความตอบกลับให้ไม่เปิดเผยข้อมูลเกินจำเป็น

### M-05: การจัดการไฟล์อัปโหลด Excel (`TrainingStampController`) และ Path Handling ที่ไม่เข้มงวด
- **ตำแหน่งที่พบ:**
  - `dotnet/backend/Controllers/TrainingStampController.cs` (บรรทัด 32–81): `POST /api/trainingstamp/execute` ไม่ได้ตรวจนามสกุล `.xlsx` (บรรทัด 59–62) และทั้ง `preview` และ `execute` โหลดไฟล์ทั้งหมดลง `MemoryStream` โดยไม่จำกัดขนาดไฟล์ (ขณะที่ Nginx ยอมรับได้ถึง `50M` ซึ่งอาจทำให้ VM `e2-micro` RAM เต็มจาก Zip/XML Bomb ในไฟล์ `.xlsx`)
  - `dotnet/backend/Controllers/UploadController.cs` (บรรทัด 31, 40–44): ทำเพียง `nationalId.Replace("-", "")` โดยไม่ตรวจรูปแบบตัวเลข 13 หลักก่อนนำไปใช้สร้างโฟลเดอร์ด้วย `Path.Combine` (แม้จะเช็ค `Persons` ก่อน แต่ควร Validate Pattern ชัดเจน) และสร้างโฟลเดอร์เปล่าทิ้งไว้บนดิสก์แม้จะเก็บไฟล์ลง DB
  - `dotnet/backend/Controllers/AdminController.cs` (บรรทัด 997): `Path.Combine(env.ContentRootPath, doc.FilePath)` ไม่ได้ตรวจสอบว่า `Path.GetFullPath(fullPath)` ยังอยู่ภายใต้โฟลเดอร์ที่อนุญาต (Canonical Path Check)
- **แนวทางแก้ไข:** จำกัดขนาดไฟล์ด้วย `[RequestSizeLimit]`, ตรวจ Signature ของไฟล์ `.xlsx` และจำนวนแถวสูงสุดก่อนประมวลผล, ลบการสร้างโฟลเดอร์ที่ไม่ได้ใช้ใน `UploadController`, และตรวจสอบ `Path.GetFullPath()` ให้อยู่ภายใต้ Base Directory ที่กำหนดเสมอ

### M-06: การตั้งค่า GCP Firewall และ Container Security
- **ตำแหน่งที่พบ:**
  - **GCP Firewall (`project-86010b3e-ea84-4c5a-8ec`):** กฎ `default-allow-ssh` (`tcp:22`) และ `default-allow-rdp` (`tcp:3389`) เปิดรับจาก `0.0.0.0/0` สำหรับทุก VM Instance
  - **`dotnet/docker-compose.yml`:** รัน `mssql` ด้วย `user: "0:0"` (บรรทัด 10), เปิดพอร์ต `14333:1433` บนทุก Interface และตั้ง `ASPNETCORE_ENVIRONMENT=Development` (บรรทัด 22)
  - **`dotnet/backend/Dockerfile`:** รันแอปด้วย `root` User ตามค่าเริ่มต้นของ Base Image และ `COPY . ./` คัดลอกไฟล์ทั้งหมดเข้า Image โดยควรมี `.dockerignore` และกำหนด `USER app` (non-root)
- **แนวทางแก้ไข:** ปิดกฎ `default-allow-rdp` หากไม่มี Windows VM, จำกัด SSH (`tcp:22`) เฉพาะ IP สำนักงานหรือผ่าน GCP IAP (`35.235.240.0/20`), ผูกพอร์ต Docker Local กับ `127.0.0.1:14333:1433`, และกำหนด `USER app` ใน `Dockerfile`

---

## 5. ข้อสังเกตระดับ Low และข้อเสนอแนะเชิงปรับปรุง

- **L-01 อายุ JWT นาน 7 วันและไม่มีกลไก Revocation:** `AuthController.cs` (บรรทัด 401, 621) กำหนด `Expires = DateTime.UtcNow.AddDays(7)` และไม่ได้เชื่อมโยงกับค่า `SESSION_TIMEOUT` (`3600` วินาที) ใน `ConfigController.cs` รวมถึงเมื่อ Admin สั่งระงับบัญชี (`IsActive = false`) หรือผู้ใช้เปลี่ยนรหัสผ่าน Token เดิมยังคงใช้งานต่อได้จนหมดอายุ — *แนะนำลดอายุ Access Token เหลือ 15–60 นาที ใช้ Refresh Token และตรวจ `IsActive`/Token Version*
- **L-02 ขาด `UseForwardedHeaders()` ใน ASP.NET Core:** เนื่องจาก Backend รันหลัง Nginx Reverse Proxy (`127.0.0.1:8085`) ที่ส่ง `X-Forwarded-For` และ `X-Forwarded-Proto` การไม่เปิด `app.UseForwardedHeaders(...)` ทำให้ Serilog และ Rate Limiter มองเห็น IP ผู้ใช้เป็น `127.0.0.1` ทั้งหมด
- **L-03 แพ็กเกจและไฟล์ Legacy ที่ยังตกค้าง:**
  - `Program.cs` (บรรทัด 57–59) และ `backend.csproj` ยังลงทะเบียน `MySqlDbContext` และ `Pomelo.EntityFrameworkCore.MySql` แม้จะยกเลิก MySQL ไปแล้ว
  - ควรอัปเดตแพ็กเกจ .NET 8 (`Microsoft.AspNetCore.Authentication.JwtBearer`, `Microsoft.EntityFrameworkCore.*`, `Swashbuckle.AspNetCore 6.4.0`, `ClosedXML 0.102.3`) เป็นเวอร์ชันแพตช์ล่าสุด
  - ใน Root Directory ยังมีไฟล์เก่าจำนวนมาก (`*.php`, `*.sql`, `temp_*.php`, `dump.ps1`) ที่ควรย้ายออกหรือลบหากไม่ได้ใช้งานแล้ว
- **L-04 การดูแล Ephemeral IP และแจ้งเตือน SSL:** VM ใช้ Ephemeral IP `34.29.162.204` และลงทะเบียน Certbot ด้วย `--register-unsafely-without-email` — *แนะนำบันทึกอีเมลผู้ดูแลระบบใน Certbot account (`certbot update_account --email ...`) เพื่อรับแจ้งเตือนล่วงหน้าหากการต่ออายุอัตโนมัติล้มเหลว*

---

## 6. จุดแข็งด้านความปลอดภัยที่ระบบทำไว้ดีแล้ว (Positive Findings)

1. **ป้องกัน SQL Injection ได้ดีในฝั่ง .NET Backend:** การ Query ข้อมูลทั้งหมดใช้ EF Core LINQ แบบ Parameterized Query ไม่พบการต่อ String ของ User Input เข้ากับ `ExecuteSqlRaw` หรือ `FromSqlRaw` (`ExecuteSqlRaw` ใน `Program.cs` ใช้เฉพาะคำสั่ง Migration คงที่)
2. **ป้องกัน XSS ฝั่ง React Rendering:** ไม่พบการใช้ `dangerouslySetInnerHTML`, `innerHTML`, หรือ `eval()` ในโค้ด Frontend (`dotnet/frontend/src`)
3. **การเข้ารหัสการสื่อสาร (HTTPS / TLS):** เปิดใช้งาน HTTPS บน `https://agentportal.วิริยะ.com` และ `https://34.29.162.204` ด้วยใบรับรอง ECDSA ของ Let's Encrypt, TLS 1.2/1.3, HTTP → HTTPS `301` Redirect และระบบต่ออายุอัตโนมัติ
4. **การแยกสิทธิ์ Process บน VM:** บริการ `viriyah-backend.service` รันด้วยสิทธิ์ผู้ใช้ `www-data` (non-root) และรับฟังเฉพาะ `127.0.0.1:8085` ผ่าน Nginx Reverse Proxy ไม่ได้เปิดพอร์ต Kestrel ออกสู่อินเทอร์เน็ตโดยตรง
5. **การตรวจความถูกต้องของข้อมูลบางส่วน:** มีการตรวจ Checksum เลขบัตรประชาชนไทย (Modulo 11) ใน `AuthController.cs` (บรรทัด 1875–1895), ตรวจรูปแบบเลขที่ใบอนุญาตด้วย Regex และมี Path Traversal check เบื้องต้นใน `SystemLogController.cs` (บรรทัด 32)

---

## 7. แผนลำดับความสำคัญในการแก้ไขที่แนะนำ (Remediation Roadmap)

### ระยะที่ 1: เร่งด่วนทันที (ภายใน 24 ชั่วโมง)
1. เปลี่ยน GitHub Repo `https://github.com/ednakrabgit/register_form` เป็น **Private**, ลบ `app.db`/Archives/Logs ออกจาก Git + History และหมุนเวียนรหัสผ่าน DB (`C-06`)
2. ลบปุ่ม Quick Login ออกจาก `Login.jsx` และลบ Backdoor Credentials ออกจาก `AuthController.cs` (`C-03`)
3. ลบ `mockResetToken` ออกจาก `POST /api/auth/forgot-password` (`C-04`)
4. เปิด `AddAuthentication(JwtBearer)` + `UseAuthentication()` ใน `Program.cs`, ย้าย `Jwt:SecretKey` ไปเป็น Secret Environment Variable, ยกเลิก `ReadJwtToken()` ทั้งหมด และติด `[Authorize]` + Fail-Closed Role Checks ทุก Controller รวมถึงลบ `[AllowAnonymous]` ที่การดึงไฟล์เอกสาร (`C-01`, `C-02`, `C-07`)

### ระยะที่ 2: ระยะสั้น (ภายใน 1 สัปดาห์)
5. เปลี่ยนการเก็บรหัสผ่านเป็น **BCrypt / Argon2id** และปรับปรุงรหัสผ่านเริ่มต้นของผู้สมัคร (`C-05`)
6. จำกัดชนิดไฟล์อัปโหลดด้วย Allowlist + Magic Bytes + `Content-Disposition`/`nosniff` และปิด `UseStaticFiles` บน `/LocalData` ที่เป็นข้อมูลส่วนบุคคล (`C-07`, `M-05`)
7. จำกัด CORS Allowlist, เพิ่ม Rate Limiting, แยก DTO เพื่อแก้ Mass Assignment, เปลี่ยน `xlsx@0.18.5` + ป้องกัน CSV Formula Injection (`H-01` – `H-06`)

### ระยะที่ 3: เสริมความแข็งแกร่ง (Hardening)
8. เพิ่ม HTTP Security Headers และ `server_tokens off` บน Nginx, ปิด Swagger บน Production, ซ่อน Raw Exception, เปิด `UseForwardedHeaders()`, จำกัด GCP Firewall SSH/RDP และอัปเดตแพ็กเกจ + Non-root Dockerfile (`H-07`, `M-01` – `M-06`, `L-01` – `L-04`)
