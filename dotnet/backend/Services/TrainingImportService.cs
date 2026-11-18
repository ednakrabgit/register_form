using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Services
{
    public class TrainingImportRowDto
    {
        public int RowIndex { get; set; }
        public string? NationalId { get; set; }
        public string? OriginalLicenseNo { get; set; }
        public string? OriginalPrefix { get; set; }
        public string? OriginalFirstName { get; set; }
        public string? OriginalLastName { get; set; }
        public string? DeductionPrivilege { get; set; } // Col J (Y/N)
        public string? TrainingStatus { get; set; } // Col L (อนุมัติ, ไม่ผ่าน)
        public string? DeductionDocStatus { get; set; } // Col M
        public string? TrainingDateDisplay { get; set; } // Col Q
        public string? TrainingCourseCode { get; set; } // Col R (e.g. A4P1_04, B0N0O00)
        public string? TrainingCourseName { get; set; } // Col S
        public string? VerifiedTitleTh { get; set; } // Col T
        public string? VerifiedFirstNameTh { get; set; } // Col U
        public string? VerifiedLastNameTh { get; set; } // Col V
        public string? VerifiedLicenseNo { get; set; } // Col W
        public string? VerifiedLicenseIssueDate { get; set; } // Col X
        public string? VerifiedLicenseExpiryDate { get; set; } // Col Y
        public string? VerifiedApplicantType { get; set; } // Col Z
        public string? VerifiedLicenseType { get; set; } // Col AA
        public string? VerifiedInsuranceType { get; set; } // Col AB
        public string? ProgressPercent { get; set; } // Col AC
        public string? ScorePercent { get; set; } // Col AD
        public string? EnrollmentUrl { get; set; } // Col AE

        // Matching & Audit status
        public bool IsPersonMatched { get; set; }
        public bool IsCourseMatched { get; set; }
        public bool IsDataMismatch { get; set; }
        public string? MismatchDetails { get; set; }
        public string? SystemPersonName { get; set; }
        public string? SystemLicenseNo { get; set; }
        public string? CourseTypeName { get; set; } // Basic or Renew
    }

    public class TrainingImportSummaryDto
    {
        public string FileName { get; set; } = string.Empty;
        public int TotalRows { get; set; }
        public int PassedCount { get; set; }
        public int FailedCount { get; set; }
        public int DeductionCount { get; set; }
        public int MatchedPersonsCount { get; set; }
        public int UnmatchedPersonsCount { get; set; }
        public int MismatchedDataCount { get; set; }
        public List<TrainingImportRowDto> Rows { get; set; } = new List<TrainingImportRowDto>();
    }

    public class TrainingImportService
    {
        private readonly AppDbContext _context;

        public TrainingImportService(AppDbContext context)
        {
            _context = context;
        }

        public byte[] GenerateTemplateExcel()
        {
            using var workbook = new XLWorkbook();

            // Sheet 1: Exact structure expected by ParseExcelRows (Headers on Row 1 & Row 3, Data starts at Row 4)
            var ws = workbook.Worksheets.Add("Sheet1");

            // Row 1: Technical field codes (Col C..K)
            ws.Cell(1, 3).Value = "F_CMD";
            ws.Cell(1, 4).Value = "ITEM";
            ws.Cell(1, 5).Value = "AG_LICENSE";
            ws.Cell(1, 6).Value = "AG_ID_CARD";
            ws.Cell(1, 7).Value = "PREFIX_CODE";
            ws.Cell(1, 8).Value = "AG_FNAME_TH";
            ws.Cell(1, 9).Value = "AG_LNAME_TH";
            ws.Cell(1, 10).Value = "F_DEDUCTION";
            ws.Cell(1, 11).Value = "REMARK";

            var row1Range = ws.Range(1, 1, 1, 31);
            row1Range.Style.Font.FontSize = 9;
            row1Range.Style.Font.FontColor = XLColor.FromHtml("#475569");
            row1Range.Style.Fill.BackgroundColor = XLColor.FromHtml("#F1F5F9");

            // Row 2: Blank spacer row (matches Viriyah Online Learning export format)

            // Row 3: Thai column headers (Col A..AE)
            string[] headers =
            {
                "1.H.0.0.0",                           // A (1)
                "EID",                                 // B (2)
                "คำสั่ง",                               // C (3)
                "ลำดับ",                                // D (4)
                "เลขที่ใบอนุญาต",                        // E (5)
                "หมายเลขบัตรประชาชน",                    // F (6)
                "คำนำหน้า",                             // G (7)
                "ชื่อ",                                 // H (8)
                "นามสกุล",                              // I (9)
                "สิทธิลดหย่อนเฉพาะต่อ 4 ขึ้นไป",           // J (10)
                "หมายเหตุ",                             // K (11)
                "สถานะการลงทะเบียน",                    // L (12)
                "สถานะเอกสารลดหย่อน",                   // M (13)
                "สถานะเอกสารเพิ่มเติม",                   // N (14)
                "อีเมล",                                // O (15)
                "เบอร์โทร",                             // P (16)
                "รอบการเรียน",                          // Q (17)
                "รหัสหลักสูตร",                          // R (18)
                "ชื่อหลักสูตร",                          // S (19)
                "คำนำหน้า (จากระบบ)",                   // T (20)
                "ชื่อ (จากระบบ)",                       // U (21)
                "นามสกุล (จากระบบ)",                    // V (22)
                "เลขที่ใบอนุญาตประกันวินาศภัย",            // W (23)
                "วันที่ออกใบอนุญาตประกันวินาศภัย",         // X (24)
                "วันที่ใบอนุญาตประกันวินาศภัยหมดอายุ",      // Y (25)
                "ประเภทผู้สมัคร",                        // Z (26)
                "ประเภทใบอนุญาต",                       // AA (27)
                "ประเภทการประกัน",                      // AB (28)
                "% ความคืบหน้าการเรียน",                 // AC (29)
                "% คะแนนแบบทดสอบหลังเรียน",             // AD (30)
                "ลิงก์"                                 // AE (31)
            };

            for (int col = 1; col <= headers.Length; col++)
            {
                ws.Cell(3, col).Value = headers[col - 1];
            }

            var headerRange = ws.Range(3, 1, 3, headers.Length);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Font.FontColor = XLColor.White;
            headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A8A");
            headerRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            headerRange.Style.Alignment.WrapText = true;
            ws.Row(3).Height = 28;

            // Format ID / License / Phone columns as text so Excel preserves leading zeros & 13-digit IDs
            int[] textCols = { 5, 6, 16, 23, 24, 25 };
            foreach (int col in textCols)
            {
                ws.Column(col).Style.NumberFormat.Format = "@";
            }

            // Sample Data Row 4 (Passed / Approved)
            string[] sampleRow1 =
            {
                "1.1.N.0.0",
                "EID0000001",
                "[1.1.N.0.0]-ADD",
                "1",
                "6504000001",
                "1100100000001",
                "นาย",
                "สมชาย",
                "ใจดี",
                "N",
                "P",
                "อนุมัติ",
                "",
                "",
                "somchai@example.com",
                "0810000001",
                "19/08/2569",
                "A4P1_04",
                "การวางแผนเพื่อวัยเกษียณ",
                "นาย",
                "สมชาย",
                "ใจดี",
                "6504000001",
                "2024-01-15",
                "2029-01-14",
                "ตัวแทน",
                "ต่ออายุครั้งที่ 4 เป็นต้นไป",
                "ประกันวินาศภัย",
                "100%",
                "85%",
                "https://vonlinelearning.viriyah.co.th/"
            };

            // Sample Data Row 5 (Failed + Deduction Privilege Y)
            string[] sampleRow2 =
            {
                "1.1.N.0.0",
                "EID0000002",
                "[1.1.N.0.0]-ADD",
                "2",
                "6502000002",
                "1100100000002",
                "นางสาว",
                "สมหญิง",
                "รักเรียน",
                "Y",
                "",
                "ไม่ผ่าน",
                "ผ่านการตรวจสอบ",
                "",
                "somying@example.com",
                "0810000002",
                "19/08/2569",
                "B0N0O00",
                "ขอรับใบอนุญาตตัวแทนประกันวินาศภัย",
                "นางสาว",
                "สมหญิง",
                "รักเรียน",
                "6502000002",
                "2025-03-01",
                "2026-02-28",
                "นายหน้า",
                "ขอรับใบอนุญาต",
                "ประกันวินาศภัย",
                "60%",
                "50%",
                "https://vonlinelearning.viriyah.co.th/"
            };

            for (int col = 1; col <= sampleRow1.Length; col++)
            {
                ws.Cell(4, col).Value = sampleRow1[col - 1];
                ws.Cell(5, col).Value = sampleRow2[col - 1];
            }

            var dataRange = ws.Range(4, 1, 5, headers.Length);
            dataRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            dataRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
            dataRange.Style.Border.OutsideBorderColor = XLColor.FromHtml("#CBD5E1");
            dataRange.Style.Border.InsideBorderColor = XLColor.FromHtml("#CBD5E1");

            ws.SheetView.FreezeRows(3);
            ws.Columns(1, headers.Length).AdjustToContents();

            // Sheet 2: Instructions & Column Guide (ignored by ParseExcelRows which reads only Worksheets.FirstOrDefault())
            var guide = workbook.Worksheets.Add("คำอธิบายคอลัมน์");
            guide.Cell(1, 1).Value = "คู่มือรูปแบบไฟล์นำเข้าผลการอบรม (Training Result Stamp)";
            guide.Cell(1, 1).Style.Font.Bold = true;
            guide.Cell(1, 1).Style.Font.FontSize = 14;
            guide.Cell(1, 1).Style.Font.FontColor = XLColor.FromHtml("#1E3A8A");

            guide.Cell(2, 1).Value = "หมายเหตุสำคัญ: ระบบจะอ่านข้อมูลจาก Sheet แรก (Sheet1) โดยเริ่มอ่านข้อมูลตั้งแต่แถวที่ 4 เป็นต้นไป (แถวที่ 1-3 เป็นหัวตาราง ห้ามลบออก)";
            guide.Cell(2, 1).Style.Font.Bold = true;
            guide.Cell(2, 1).Style.Font.FontColor = XLColor.FromHtml("#B91C1C");

            string[] guideHeaders = { "คอลัมน์", "ชื่อหัวคอลัมน์ (แถว 3)", "ความจำเป็น", "รูปแบบ / ค่าที่รองรับ", "คำอธิบายการใช้งานในระบบ" };
            for (int c = 1; c <= guideHeaders.Length; c++)
            {
                guide.Cell(4, c).Value = guideHeaders[c - 1];
            }
            var gHead = guide.Range(4, 1, 4, guideHeaders.Length);
            gHead.Style.Font.Bold = true;
            gHead.Style.Font.FontColor = XLColor.White;
            gHead.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A8A");

            string[][] guideRows =
            {
                new[] { "E", "เลขที่ใบอนุญาต", "แนะนำ", "ตัวเลข 10 หลัก (Text)", "เลขที่ใบอนุญาตเดิมของผู้เข้าอบรม" },
                new[] { "F", "หมายเลขบัตรประชาชน", "จำเป็น *", "ตัวเลข 13 หลัก (Text)", "ใช้จับคู่กับผู้สมัครในระบบ (Person)" },
                new[] { "G - I", "คำนำหน้า / ชื่อ / นามสกุล", "แนะนำ", "ข้อความภาษาไทย", "ชื่อ-สกุลเดิมจากใบสมัคร" },
                new[] { "J", "สิทธิลดหย่อนเฉพาะต่อ 4 ขึ้นไป", "ไม่บังคับ", "Y หรือ N", "หากเป็น Y ระบบจะบันทึกสิทธิลดหย่อนให้" },
                new[] { "L", "สถานะการลงทะเบียน", "จำเป็น *", "อนุมัติ / ผ่าน / ไม่ผ่าน", "หากเป็น 'อนุมัติ' หรือ 'ผ่าน' จะ Stamp confirmed = true" },
                new[] { "M", "สถานะเอกสารลดหย่อน", "ไม่บังคับ", "ข้อความ", "สถานะตรวจเอกสารลดหย่อน" },
                new[] { "Q", "รอบการเรียน", "แนะนำ", "เช่น 19/08/2569", "วันที่/รอบการอบรมที่แสดงในรายงาน" },
                new[] { "R", "รหัสหลักสูตร", "จำเป็น *", "เช่น A4P1_04, B0N0O00", "ใช้จับคู่หลักสูตรในระบบ (mst_course_curriculum)" },
                new[] { "S", "ชื่อหลักสูตร", "แนะนำ", "ข้อความ", "ชื่อหลักสูตรที่เข้าอบรม" },
                new[] { "T - V", "คำนำหน้า / ชื่อ / นามสกุล (จากระบบ)", "แนะนำ", "ข้อความภาษาไทย", "ข้อมูลที่ผ่านการตรวจสอบแล้ว (ใช้ตรวจ Mismatch และซิงค์เข้า Person)" },
                new[] { "W", "เลขที่ใบอนุญาตประกันวินาศภัย", "แนะนำ", "ตัวเลข 10 หลัก (Text)", "เลขที่ใบอนุญาตที่ผ่านการตรวจสอบแล้ว (ใช้ซิงค์เข้า PersonLicense)" },
                new[] { "X - Y", "วันที่ออก / วันหมดอายุใบอนุญาต", "ไม่บังคับ", "yyyy-MM-dd หรือ dd/MM/yyyy", "วันออกและวันหมดอายุใบอนุญาต (ใช้ซิงค์เมื่อเปิด syncVerifiedData)" },
                new[] { "Z - AB", "ประเภทผู้สมัคร / ใบอนุญาต / การประกัน", "ไม่บังคับ", "ข้อความ", "ข้อมูลจำแนกจากระบบอบรม" },
                new[] { "AC - AE", "% ความคืบหน้า / % คะแนน / ลิงก์", "ไม่บังคับ", "เช่น 100%, 85%, URL", "ผลความคืบหน้า คะแนนสอบ และลิงก์หลักสูตร" }
            };

            for (int i = 0; i < guideRows.Length; i++)
            {
                int r = 5 + i;
                for (int c = 0; c < guideRows[i].Length; c++)
                {
                    guide.Cell(r, c + 1).Value = guideRows[i][c];
                }
            }

            var gBody = guide.Range(4, 1, 4 + guideRows.Length, guideHeaders.Length);
            gBody.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            gBody.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
            gBody.Style.Border.OutsideBorderColor = XLColor.FromHtml("#CBD5E1");
            gBody.Style.Border.InsideBorderColor = XLColor.FromHtml("#CBD5E1");
            guide.Columns(1, guideHeaders.Length).AdjustToContents();

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            return ms.ToArray();
        }

        public async Task<TrainingImportSummaryDto> ParseAndPreviewExcelAsync(Stream fileStream, string fileName)
        {
            var rows = ParseExcelRows(fileStream);
            var summary = await EvaluateRowsAsync(rows, fileName);
            return summary;
        }

        public async Task<TrainingImportSummaryDto> ExecuteStampAsync(Stream fileStream, string fileName, bool syncVerifiedDataToPerson = false)
        {
            var rows = ParseExcelRows(fileStream);
            var summary = await EvaluateRowsAsync(rows, fileName);

            // Pre-fetch persons and licenses
            var nationIds = rows.Where(r => !string.IsNullOrEmpty(r.NationalId)).Select(r => r.NationalId!).Distinct().ToList();
            var persons = await _context.Persons
                .Include(p => p.Registrations)
                .Include(p => p.Licenses)
                .Where(p => nationIds.Contains(p.NationId!))
                .ToDictionaryAsync(p => p.NationId!, p => p);

            var resultsToInsert = new List<TrnTrainingResult>();

            foreach (var r in summary.Rows)
            {
                var result = new TrnTrainingResult
                {
                    NationId = r.NationalId,
                    OriginalLicenseNo = r.OriginalLicenseNo,
                    TrainingCourseCode = r.TrainingCourseCode,
                    TrainingCourseName = r.TrainingCourseName,
                    TrainingDateDisplay = r.TrainingDateDisplay,
                    TrainingStatus = r.TrainingStatus,
                    DeductionPrivilege = r.DeductionPrivilege,
                    DeductionDocStatus = r.DeductionDocStatus,
                    ProgressPercent = r.ProgressPercent,
                    ScorePercent = r.ScorePercent,
                    EnrollmentUrl = r.EnrollmentUrl,
                    VerifiedTitleTh = r.VerifiedTitleTh,
                    VerifiedFirstNameTh = r.VerifiedFirstNameTh,
                    VerifiedLastNameTh = r.VerifiedLastNameTh,
                    VerifiedLicenseNo = r.VerifiedLicenseNo,
                    VerifiedLicenseIssueDate = r.VerifiedLicenseIssueDate,
                    VerifiedLicenseExpiryDate = r.VerifiedLicenseExpiryDate,
                    VerifiedApplicantType = r.VerifiedApplicantType,
                    VerifiedLicenseType = r.VerifiedLicenseType,
                    VerifiedInsuranceType = r.VerifiedInsuranceType,
                    StampDate = DateTime.Now,
                    ImportFileName = fileName,
                    IsDataMismatch = r.IsDataMismatch ? "Y" : "N"
                };

                if (!string.IsNullOrEmpty(r.NationalId) && persons.TryGetValue(r.NationalId, out var person))
                {
                    var latestReg = person.Registrations.OrderByDescending(reg => reg.Id).FirstOrDefault();
                    if (latestReg != null)
                    {
                        result.PersonRegistrationId = latestReg.Id;

                        // If passed in training system ("อนุมัติ" or "ผ่าน"), stamp confirmed status
                        if (r.TrainingStatus == "อนุมัติ" || r.TrainingStatus == "ผ่าน")
                        {
                            latestReg.confirmed = true;
                            latestReg.completion_time = DateTime.Now;
                        }

                        if (r.DeductionPrivilege == "Y")
                        {
                            latestReg.DeductionPrivilege = "Y";
                        }
                    }

                    // Optional sync of verified data to person master & license
                    if (syncVerifiedDataToPerson)
                    {
                        if (!string.IsNullOrWhiteSpace(r.VerifiedTitleTh)) person.TitleTh = r.VerifiedTitleTh.Trim();
                        if (!string.IsNullOrWhiteSpace(r.VerifiedFirstNameTh)) person.FirstNameTh = r.VerifiedFirstNameTh.Trim();
                        if (!string.IsNullOrWhiteSpace(r.VerifiedLastNameTh)) person.LastNameTh = r.VerifiedLastNameTh.Trim();

                        if (!string.IsNullOrWhiteSpace(r.VerifiedLicenseNo))
                        {
                            var cleanLic = r.VerifiedLicenseNo.Trim();
                            var license = person.Licenses.FirstOrDefault();
                            if (license == null)
                            {
                                license = new PersonLicense
                                {
                                    NationId = person.NationId,
                                    LicenseNo = cleanLic
                                };
                                person.Licenses.Add(license);
                            }
                            else
                            {
                                license.LicenseNo = cleanLic;
                            }

                            if (DateTime.TryParse(r.VerifiedLicenseIssueDate, out var issueDate))
                            {
                                license.LicenseIssueDate = issueDate;
                            }
                            if (DateTime.TryParse(r.VerifiedLicenseExpiryDate, out var expiryDate))
                            {
                                license.LicenseExpiryDate = expiryDate;
                            }
                        }
                    }
                }

                resultsToInsert.Add(result);
            }

            await _context.TrainingResults.AddRangeAsync(resultsToInsert);
            await _context.SaveChangesAsync();

            return summary;
        }

        private List<TrainingImportRowDto> ParseExcelRows(Stream fileStream)
        {
            var list = new List<TrainingImportRowDto>();

            using (var workbook = new XLWorkbook(fileStream))
            {
                var worksheet = workbook.Worksheets.FirstOrDefault();
                if (worksheet == null) return list;

                // Find the header row (typically row 3 has headers like 'คำสั่ง', 'เลขที่ใบอนุญาต', 'หมายเลขบัตรประชาชน', etc.)
                int startRow = 4;
                int maxRow = worksheet.LastRowUsed()?.RowNumber() ?? 0;

                for (int row = startRow; row <= maxRow; row++)
                {
                    var r = worksheet.Row(row);
                    if (r.IsEmpty()) continue;

                    string cmd = r.Cell(3).GetString().Trim(); // Col C: [1.1.N.0.0]-ADD
                    string licenseNo = r.Cell(5).GetString().Trim(); // Col E: AG_LICENSE
                    string nationalIdRaw = r.Cell(6).GetString().Trim(); // Col F: AG_ID_CARD
                    string nationalId = Regex.Replace(nationalIdRaw, @"\D", ""); // clean 13 digits

                    // Skip empty rows without national ID or license
                    if (string.IsNullOrEmpty(nationalId) && string.IsNullOrEmpty(licenseNo))
                        continue;

                    var item = new TrainingImportRowDto
                    {
                        RowIndex = row,
                        OriginalLicenseNo = licenseNo,
                        NationalId = nationalId,
                        OriginalPrefix = r.Cell(7).GetString().Trim(),
                        OriginalFirstName = r.Cell(8).GetString().Trim(),
                        OriginalLastName = r.Cell(9).GetString().Trim(),
                        DeductionPrivilege = r.Cell(10).GetString().Trim().ToUpper(), // Col J
                        TrainingStatus = r.Cell(12).GetString().Trim(), // Col L
                        DeductionDocStatus = r.Cell(13).GetString().Trim(), // Col M
                        TrainingDateDisplay = r.Cell(17).GetString().Trim(), // Col Q
                        TrainingCourseCode = r.Cell(18).GetString().Trim(), // Col R
                        TrainingCourseName = r.Cell(19).GetString().Trim(), // Col S
                        VerifiedTitleTh = r.Cell(20).GetString().Trim(), // Col T
                        VerifiedFirstNameTh = r.Cell(21).GetString().Trim(), // Col U
                        VerifiedLastNameTh = r.Cell(22).GetString().Trim(), // Col V
                        VerifiedLicenseNo = r.Cell(23).GetString().Trim(), // Col W
                        VerifiedLicenseIssueDate = r.Cell(24).GetString().Trim(), // Col X
                        VerifiedLicenseExpiryDate = r.Cell(25).GetString().Trim(), // Col Y
                        VerifiedApplicantType = r.Cell(26).GetString().Trim(), // Col Z
                        VerifiedLicenseType = r.Cell(27).GetString().Trim(), // Col AA
                        VerifiedInsuranceType = r.Cell(28).GetString().Trim(), // Col AB
                        ProgressPercent = r.Cell(29).GetString().Trim(), // Col AC
                        ScorePercent = r.Cell(30).GetString().Trim(), // Col AD
                        EnrollmentUrl = r.Cell(31).GetString().Trim() // Col AE
                    };

                    list.Add(item);
                }
            }

            return list;
        }

        private async Task<TrainingImportSummaryDto> EvaluateRowsAsync(List<TrainingImportRowDto> rows, string fileName)
        {
            var nationIds = rows.Where(r => !string.IsNullOrEmpty(r.NationalId)).Select(r => r.NationalId!).Distinct().ToList();
            var courseCodes = rows.Where(r => !string.IsNullOrEmpty(r.TrainingCourseCode)).Select(r => r.TrainingCourseCode!).Distinct().ToList();

            var persons = await _context.Persons
                .Include(p => p.Licenses)
                .Where(p => nationIds.Contains(p.NationId!))
                .ToDictionaryAsync(p => p.NationId!, p => p);

            var curriculums = await _context.CourseCurriculums
                .Where(c => courseCodes.Contains(c.TrainingCourseCode!))
                .ToListAsync();

            var summary = new TrainingImportSummaryDto
            {
                FileName = fileName,
                TotalRows = rows.Count
            };

            foreach (var r in rows)
            {
                // Status counts
                if (r.TrainingStatus == "อนุมัติ" || r.TrainingStatus == "ผ่าน")
                    summary.PassedCount++;
                else
                    summary.FailedCount++;

                if (r.DeductionPrivilege == "Y")
                    summary.DeductionCount++;

                // Person matching
                if (!string.IsNullOrEmpty(r.NationalId) && persons.TryGetValue(r.NationalId, out var person))
                {
                    r.IsPersonMatched = true;
                    r.SystemPersonName = $"{person.TitleTh}{person.FirstNameTh} {person.LastNameTh}".Trim();
                    r.SystemLicenseNo = person.Licenses.FirstOrDefault()?.LicenseNo;

                    // Audit check for discrepancies
                    var mismatches = new List<string>();
                    if (!string.IsNullOrEmpty(r.VerifiedFirstNameTh) && !string.Equals(r.VerifiedFirstNameTh.Trim(), person.FirstNameTh?.Trim(), StringComparison.OrdinalIgnoreCase))
                    {
                        mismatches.Add($"ชื่อไม่ตรง: ในระบบ '{person.FirstNameTh}' vs ตรวจสอบแล้ว '{r.VerifiedFirstNameTh}'");
                    }
                    if (!string.IsNullOrEmpty(r.VerifiedLastNameTh) && !string.Equals(r.VerifiedLastNameTh.Trim(), person.LastNameTh?.Trim(), StringComparison.OrdinalIgnoreCase))
                    {
                        mismatches.Add($"นามสกุลไม่ตรง: ในระบบ '{person.LastNameTh}' vs ตรวจสอบแล้ว '{r.VerifiedLastNameTh}'");
                    }
                    if (!string.IsNullOrEmpty(r.VerifiedLicenseNo) && !string.IsNullOrEmpty(r.SystemLicenseNo) && !string.Equals(r.VerifiedLicenseNo.Trim(), r.SystemLicenseNo.Trim(), StringComparison.OrdinalIgnoreCase))
                    {
                        mismatches.Add($"เลขใบอนุญาตไม่ตรง: ในระบบ '{r.SystemLicenseNo}' vs ตรวจสอบแล้ว '{r.VerifiedLicenseNo}'");
                    }

                    if (mismatches.Count > 0)
                    {
                        r.IsDataMismatch = true;
                        r.MismatchDetails = string.Join("; ", mismatches);
                        summary.MismatchedDataCount++;
                    }
                }
                else
                {
                    r.IsPersonMatched = false;
                }

                // Course matching
                var foundCurriculum = curriculums.FirstOrDefault(c => c.TrainingCourseCode == r.TrainingCourseCode);
                if (foundCurriculum != null)
                {
                    r.IsCourseMatched = true;
                    r.CourseTypeName = foundCurriculum.CourseType == "basic" ? "ขอรับ/ต่อ 1-3 (Basic)" : "ต่อ 4 (Renew 4)";
                }

                summary.Rows.Add(r);
            }

            summary.MatchedPersonsCount = summary.Rows.Count(r => r.IsPersonMatched);
            summary.UnmatchedPersonsCount = summary.Rows.Count(r => !r.IsPersonMatched);

            return summary;
        }
    }
}
