import pyodbc
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import datetime
import os
import sys

SQL_CONN_STR = (
    'DRIVER={ODBC Driver 18 for SQL Server};'
    'SERVER=127.0.0.1,14333;'
    'UID=sa;'
    'PWD=Pass@456981@XKTT;'
    'DATABASE=thaiairp_iptc;'
    'TrustServerCertificate=yes;'
)

OUTPUT_DIR = r"C:\Users\ednak\OneDrive\Desktop\datamangement\www\db"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Thai Header Mappings for Summary Sheet
SUMMARY_HEADERS = {
    'RegistrationId': 'รหัสลงทะเบียน',
    'NationId': 'เลขบัตรประชาชน (13 หลัก)',
    'RegistrationStartTime': 'เวลาเริ่มทำรายการ',
    'RegistrationCompletionTime': 'เวลายืนยันลงทะเบียน',
    'RegistrationStatus': 'สถานะการลงทะเบียน',
    'PdpaConsent': 'ยินยอม PDPA',
    'DeductionPrivilege': 'สิทธิลดหย่อนการอบรม',
    'MasterDegreeStatus': 'สถานะเอกสาร ป.โท',
    'Title': 'คำนำหน้า',
    'FirstName': 'ชื่อ (ไทย)',
    'MiddleName': 'ชื่อกลาง (ไทย)',
    'LastName': 'นามสกุล (ไทย)',
    'FullName': 'ชื่อ - นามสกุล',
    'Gender': 'เพศ',
    'BirthDate': 'วันเกิด',
    'Age': 'อายุ (ปี)',
    'IdCardExpiry': 'วันหมดอายุบัตร ปชช.',
    'Religion': 'ศาสนา',
    'BloodGroup': 'กรุ๊ปเลือด',
    'PhoneNumber': 'เบอร์โทรศัพท์มือถือ',
    'Email': 'อีเมล',
    'LineId': 'Line ID',
    'Facebook': 'Facebook',
    'Instagram': 'Instagram',
    'FoodAllergy': 'อาหารที่แพ้',
    'MedicalCondition': 'โรคประจำตัว',
    'EmergencyContactName': 'ชื่อผู้ติดต่อฉุกเฉิน',
    'EmergencyContactPhone': 'เบอร์ผู้ติดต่อฉุกเฉิน',
    'HouseAddress': 'ที่อยู่ตามทะเบียนบ้าน',
    'HouseProvince': 'จังหวัด (ทะเบียนบ้าน)',
    'HouseDistrict': 'อำเภอ/เขต (ทะเบียนบ้าน)',
    'HouseSubDistrict': 'ตำบล/แขวง (ทะเบียนบ้าน)',
    'HousePostcode': 'รหัสไปรษณีย์ (ทะเบียนบ้าน)',
    'ContactAddress': 'ที่อยู่ติดต่อ/จัดส่งเอกสาร',
    'LicenseCourseType': 'ประเภทใบอนุญาต (ตัวแทน/นายหน้า)',
    'LicenseNo': 'เลขที่ใบอนุญาต',
    'LicenseIssueDate': 'วันที่ออกใบอนุญาต',
    'LicenseExpiryDate': 'วันหมดอายุใบอนุญาต',
    'RegionAffiliation': 'สังกัดภาค (วิริยะ)',
    'BranchName': 'สาขาที่สังกัด (วิริยะ)',
    'BrokerCompany': 'บริษัทนายหน้าที่สังกัด',
    'BrokerBranch': 'สาขานายหน้า/ผู้แนะนำ',
    'ViriyahAgentCode': 'รหัสตัวแทนวิริยะ',
    'BrokerType': 'ระดับ/ประเภทตัวแทนหรือนายหน้า',
    'MainCourseId': 'รหัสหลักสูตร',
    'CourseName': 'หลักสูตรที่ลงทะเบียน',
    'AgentType': 'ประเภทผู้สมัคร',
    'TrainingDateDisplay': 'รอบวันที่อบรม (ข้อความ)',
    'TrainingDate': 'วันที่อบรม (วันที่)',
    'SelectedSubjectsSummary': 'รายวิชาที่เลือกอบรมทั้งหมด (Pillars)',
    'SelectedSubjectsCount': 'จำนวนวิชาที่เลือก',
    'InsuranceExperienceYears': 'ประสบการณ์ประกันภัย (ปี)',
    'OtherBusiness': 'ธุรกิจหลัก/อาชีพอื่น',
    'ExtraTrainingInterest': 'หัวข้ออบรมที่สนใจเพิ่มเติม',
    'SalesAreas': 'พื้นที่เสนอขาย',
    'OtherCompanies': 'บริษัทประกันอื่นที่ส่งงาน',
    'Specialties': 'ความเชี่ยวชาญผลิตภัณฑ์'
}

# Thai Header Mappings for Detail Sheet
DETAIL_HEADERS = {
    'RegistrationId': 'รหัสลงทะเบียน',
    'NationId': 'เลขบัตรประชาชน',
    'FullName': 'ชื่อ - นามสกุล',
    'PhoneNumber': 'เบอร์โทรศัพท์',
    'Email': 'อีเมล',
    'LicenseNo': 'เลขที่ใบอนุญาต',
    'LicenseCourseType': 'ประเภทใบอนุญาต',
    'RegionAffiliation': 'สังกัดภาค',
    'BranchName': 'สาขาวิริยะ',
    'BrokerCompany': 'บริษัทนายหน้า',
    'ViriyahAgentCode': 'รหัสตัวแทน',
    'PersonCourseId': 'รหัสคอร์สบุคคล',
    'CourseId': 'รหัสหลักสูตร',
    'MainCourseName': 'ชื่อหลักสูตรหลัก',
    'CourseAgentType': 'ประเภท (agent/broker)',
    'TrainingDateDisplay': 'รอบวันที่อบรม',
    'TrainingDate': 'วันที่อบรม',
    'PillarId': 'รหัส Pillar',
    'PillarName': 'หมวดวิชา (Pillar)',
    'SubjectId': 'รหัสวิชา',
    'SubjectName': 'ชื่อวิชาที่เข้าอบรม',
    'RegistrationStartTime': 'เวลาเริ่มลงทะเบียน',
    'RegistrationCompletionTime': 'เวลายืนยันลงทะเบียน',
    'RegistrationStatus': 'สถานะการลงทะเบียน'
}

print("1. Connecting to SQL Server...", flush=True)
conn = pyodbc.connect(SQL_CONN_STR)
cursor = conn.cursor()

wb = openpyxl.Workbook()

# Style configurations
header_fill = PatternFill(start_color="0E387A", end_color="0E387A", fill_type="solid")
header_font = Font(name="TH Sarabun New", size=14, bold=True, color="FFFFFF")
cell_font = Font(name="TH Sarabun New", size=13)
bold_font = Font(name="TH Sarabun New", size=13, bold=True)
alt_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
thin_border = Border(
    left=Side(style='thin', color='CBD5E1'),
    right=Side(style='thin', color='CBD5E1'),
    top=Side(style='thin', color='CBD5E1'),
    bottom=Side(style='thin', color='CBD5E1')
)

# -------------------------------------------------------------
# Sheet 1: ข้อมูลการลงทะเบียน (Summary)
# -------------------------------------------------------------
print("2. Fetching Summary Data from sp_ExportTraineeFullDetails...", flush=True)
ws1 = wb.active
ws1.title = "ข้อมูลการลงทะเบียน (Summary)"

cursor.execute("EXEC dbo.sp_ExportTraineeFullDetails @ReportType = 'Summary'")
raw_cols = [c[0] for c in cursor.description]
rows = cursor.fetchall()

# Write Headers
ws1.append([SUMMARY_HEADERS.get(col, col) for col in raw_cols])
for col_idx in range(1, len(raw_cols) + 1):
    cell = ws1.cell(row=1, column=col_idx)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = thin_border
ws1.row_dimensions[1].height = 28

# Write Rows
for row_idx, r in enumerate(rows, start=2):
    row_values = []
    for val in r:
        if isinstance(val, datetime.datetime):
            row_values.append(val.strftime('%Y-%m-%d %H:%M:%S'))
        elif isinstance(val, datetime.date):
            row_values.append(val.strftime('%Y-%m-%d'))
        elif val is None:
            row_values.append('')
        else:
            row_values.append(val)
    ws1.append(row_values)
    
    use_alt = (row_idx % 2 == 0)
    for col_idx in range(1, len(row_values) + 1):
        cell = ws1.cell(row=row_idx, column=col_idx)
        cell.font = cell_font
        cell.border = thin_border
        if use_alt:
            cell.fill = alt_fill
        # Align numbers / IDs center
        if raw_cols[col_idx-1] in ('RegistrationId', 'NationId', 'BirthDate', 'IdCardExpiry', 'PhoneNumber', 'RegistrationStatus', 'Age', 'Gender'):
            cell.alignment = Alignment(horizontal="center", vertical="center")
    ws1.row_dimensions[row_idx].height = 20

# -------------------------------------------------------------
# Sheet 2: รายละเอียดรายวิชาที่อบรม (Detail)
# -------------------------------------------------------------
print("3. Fetching Detail Data from sp_ExportTraineeFullDetails...", flush=True)
ws2 = wb.create_sheet(title="รายละเอียดรายวิชา (Detail)")

cursor.execute("EXEC dbo.sp_ExportTraineeFullDetails @ReportType = 'Detail'")
raw_detail_cols = [c[0] for c in cursor.description]
detail_rows = cursor.fetchall()

# Write Headers
ws2.append([DETAIL_HEADERS.get(col, col) for col in raw_detail_cols])
for col_idx in range(1, len(raw_detail_cols) + 1):
    cell = ws2.cell(row=1, column=col_idx)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = thin_border
ws2.row_dimensions[1].height = 28

# Write Rows
for row_idx, r in enumerate(detail_rows, start=2):
    row_values = []
    for val in r:
        if isinstance(val, datetime.datetime):
            row_values.append(val.strftime('%Y-%m-%d %H:%M:%S'))
        elif isinstance(val, datetime.date):
            row_values.append(val.strftime('%Y-%m-%d'))
        elif val is None:
            row_values.append('')
        else:
            row_values.append(val)
    ws2.append(row_values)
    
    use_alt = (row_idx % 2 == 0)
    for col_idx in range(1, len(row_values) + 1):
        cell = ws2.cell(row=row_idx, column=col_idx)
        cell.font = cell_font
        cell.border = thin_border
        if use_alt:
            cell.fill = alt_fill
        if raw_detail_cols[col_idx-1] in ('RegistrationId', 'NationId', 'PhoneNumber', 'RegistrationStatus', 'TrainingDate', 'TrainingDateDisplay'):
            cell.alignment = Alignment(horizontal="center", vertical="center")
    ws2.row_dimensions[row_idx].height = 20

# Auto-adjust column widths
print("4. Adjusting column widths...", flush=True)
for ws in [ws1, ws2]:
    ws.freeze_panes = 'C2'
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        # Check first 50 rows for width estimate
        for cell in col[:50]:
            val_str = str(cell.value or '')
            max_len = max(max_len, len(val_str.encode('utf-8')))
        # Set width bounded between 12 and 55
        ws.column_dimensions[col_letter].width = max(14, min(int(max_len * 0.9) + 4, 60))

timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
filename = f"Trainee_Full_Export_{timestamp}.xlsx"
output_path = os.path.join(OUTPUT_DIR, filename)

print(f"5. Saving Excel file to {output_path}...", flush=True)
wb.save(output_path)
conn.close()

print(f"\n=======================================================")
print(f"   SUCCESSFULLY EXPORTED TO EXCEL!")
print(f"   File: {output_path}")
print(f"   Summary Sheet: {len(rows):,} rows")
print(f"   Detail Sheet: {len(detail_rows):,} rows")
print(f"=======================================================")
