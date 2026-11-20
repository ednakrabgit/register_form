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
        public string? PassedSubjectsDisplay { get; set; } // รายการวิชาที่ผ่าน
        public int PassedSubjectCount { get; set; }
        public int TotalSubjectCount { get; set; }
        public List<int> PassedRenewCourseIds { get; set; } = new List<int>();

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

        public static int? MatchRenewCourseId(string? subjectCode, string? subjectName, List<MstRenewCourse> allCourses, List<MstCourseCurriculum> allCurriculums)
        {
            if (string.IsNullOrWhiteSpace(subjectCode) && string.IsNullOrWhiteSpace(subjectName))
                return null;

            var cleanSubName = subjectName?.Trim() ?? "";
            var cleanCode = subjectCode?.Trim() ?? "";

            // 1. Direct Name Match with MstRenewCourse
            if (!string.IsNullOrEmpty(cleanSubName))
            {
                var exact = allCourses.FirstOrDefault(c => string.Equals(c.Name?.Trim(), cleanSubName, StringComparison.OrdinalIgnoreCase));
                if (exact != null) return exact.Id;

                // Normalized (remove whitespace, dashes, punctuation)
                var normalizedSub = Regex.Replace(cleanSubName.ToLower(), @"[\s\-_.\(\)]", "");
                var normMatch = allCourses.FirstOrDefault(c => {
                    var nc = Regex.Replace(c.Name?.ToLower() ?? "", @"[\s\-_.\(\)]", "");
                    return !string.IsNullOrEmpty(nc) && (normalizedSub.Contains(nc) || nc.Contains(normalizedSub));
                });
                if (normMatch != null) return normMatch.Id;
            }

            // 2. Direct Code Match with MstCourseCurriculum (renew course types)
            if (!string.IsNullOrEmpty(cleanCode))
            {
                var curMatch = allCurriculums.FirstOrDefault(c => 
                    string.Equals(c.TrainingCourseCode?.Trim(), cleanCode, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(c.CurriculumCode?.Trim(), cleanCode, StringComparison.OrdinalIgnoreCase));
                if (curMatch != null && curMatch.CourseId > 0) return curMatch.CourseId;
            }

            // 3. Keyword / semantic matching
            var searchTarget = $"{cleanSubName} {cleanCode}".ToLower();
            if (searchTarget.Contains("non-motor") || searchTarget.Contains("nonmotor") || (searchTarget.Contains("สินไหม") && !searchTarget.Contains("ยานยนต์"))) return 2;
            if (searchTarget.Contains("จรรยาบรรณ") || searchTarget.Contains("ศีลธรรม")) return 7;
            if (searchTarget.Contains("คุ้มครองข้อมูลส่วนบุคคล") || searchTarget.Contains("pdpa")) return 9;
            if (searchTarget.Contains("ฟอกเงิน") || searchTarget.Contains("amlo") || searchTarget.Contains("ปปง") || searchTarget.Contains("การก่อการร้าย")) return 11;
            if (searchTarget.Contains("รถยนต์ไฟฟ้า") || searchTarget.Contains("ev") || searchTarget.Contains("ผู้ประสบภัยจากรถ")) return 12;
            if (searchTarget.Contains("ทวงถามหนี้")) return 13;
            if (searchTarget.Contains("จราจร")) return 8;
            if (searchTarget.Contains("กำกับดูแล") || searchTarget.Contains("ระดับความเสี่ยง")) return 1;
            if (searchTarget.Contains("ทรัพย์สิน")) return 3;
            if (searchTarget.Contains("เกษียณ")) return 4;
            if (searchTarget.Contains("ภาษี")) return 5;
            if (searchTarget.Contains("ประกันภัยต่อ")) return 6;
            if (searchTarget.Contains("เสนอขาย")) return 10;
            if (searchTarget.Contains("ความรับผิด")) return 14;
            if (searchTarget.Contains("การตลาด")) return 15;
            if (searchTarget.Contains("สุขภาพ")) return 16;
            if (searchTarget.Contains("รับประกันภัยรถยนต์")) return 17;

            return null;
        }

        public byte[] GenerateTemplateExcel()
        {
            var candidates = new[]
            {
                Path.Combine(AppContext.BaseDirectory, "Templates", "template_training_result_stamp.xlsx"),
                Path.Combine(Directory.GetCurrentDirectory(), "Templates", "template_training_result_stamp.xlsx"),
                Path.Combine(Directory.GetCurrentDirectory(), "dotnet", "backend", "Templates", "template_training_result_stamp.xlsx")
            };

            foreach (var path in candidates)
            {
                if (File.Exists(path))
                {
                    return File.ReadAllBytes(path);
                }
            }

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

            // Pre-fetch persons, registrations, licenses, and 5y trainings
            var nationIds = rows.Where(r => !string.IsNullOrEmpty(r.NationalId)).Select(r => r.NationalId!).Distinct().ToList();
            var persons = await _context.Persons
                .Include(p => p.Registrations)
                .Include(p => p.Licenses)
                .Include(p => p.Trainings)
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
                        if (r.TrainingStatus != null && (r.TrainingStatus.StartsWith("อนุมัติ") || r.TrainingStatus.StartsWith("ผ่าน")))
                        {
                            latestReg.confirmed = true;
                            latestReg.completion_time = DateTime.Now;
                        }

                        // 1. Update Deduction data if flagged as 'Y' in uploaded file
                        if (r.DeductionPrivilege == "Y")
                        {
                            latestReg.DeductionPrivilege = "MasterDegree";
                            if (string.IsNullOrEmpty(latestReg.MasterDegreeStatus))
                            {
                                latestReg.MasterDegreeStatus = !string.IsNullOrEmpty(r.DeductionDocStatus) ? r.DeductionDocStatus : "เคยยื่นเอกสาร";
                            }
                        }
                    }

                    // 2. Record passed 5-year training courses into persontraining5y
                    if (r.PassedRenewCourseIds != null && r.PassedRenewCourseIds.Count > 0)
                    {
                        foreach (var cId in r.PassedRenewCourseIds.Distinct())
                        {
                            if (!person.Trainings.Any(t => t.CourseId == cId))
                            {
                                var newTraining = new PersonTraining5y
                                {
                                    NationId = person.NationId,
                                    CourseId = cId
                                };
                                person.Trainings.Add(newTraining);
                                _context.PersonTrainings5y.Add(newTraining);
                            }
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

            // Prevent duplicate records: remove any previous stamp records for this ImportFileName before inserting
            var existingResultsForFile = await _context.TrainingResults.Where(t => t.ImportFileName == fileName).ToListAsync();
            if (existingResultsForFile.Count > 0)
            {
                _context.TrainingResults.RemoveRange(existingResultsForFile);
            }

            await _context.TrainingResults.AddRangeAsync(resultsToInsert);
            await _context.SaveChangesAsync();

            return summary;
        }

        private List<TrainingImportRowDto> ParseExcelRows(Stream fileStream)
        {
            using (var workbook = new XLWorkbook(fileStream))
            {
                // 1. Check if the workbook contains sheet "นำส่งข้อมูลผู้ผ่านการอบรม" (official ITA Post format)
                var itaSheet = workbook.Worksheets.FirstOrDefault(w => w.Name == "นำส่งข้อมูลผู้ผ่านการอบรม");
                if (itaSheet != null)
                {
                    return ParseItaPostFormat(workbook, itaSheet);
                }

                // 2. Fall back to standard/LMS format
                return ParseLmsFormat(workbook);
            }
        }

        private List<TrainingImportRowDto> ParseItaPostFormat(XLWorkbook workbook, IXLWorksheet ws8)
        {
            var list = new List<TrainingImportRowDto>();

            // 1. Read course and subject metadata from "ข้อมูลหลักสูตรและวิชา" if present
            var subjects = new Dictionary<string, (string CourseCode, string CourseName, string SubjectName, double Hours)>(StringComparer.OrdinalIgnoreCase);
            string defaultCourseCode = "";
            string defaultCourseName = "";

            var ws4 = workbook.Worksheets.FirstOrDefault(w => w.Name == "ข้อมูลหลักสูตรและวิชา");
            if (ws4 != null)
            {
                int maxR4 = ws4.LastRowUsed()?.RowNumber() ?? 0;
                for (int r = 2; r <= maxR4; r++)
                {
                    string cCode = ws4.Cell(r, 3).GetString().Trim(); // Col C: รหัสหลักสูตร
                    string cName = ws4.Cell(r, 4).GetString().Trim(); // Col D: ชื่อหลักสูตร
                    string sCode = ws4.Cell(r, 5).GetString().Trim(); // Col E: รหัสวิชา
                    string sName = ws4.Cell(r, 6).GetString().Trim(); // Col F: ชื่อวิชา
                    string hrsStr = ws4.Cell(r, 9).GetString().Trim(); // Col I: ระยะเวลา (ชม.)
                    double.TryParse(hrsStr, out double hrs);
                    if (hrs <= 0) hrs = 3.0;

                    if (!string.IsNullOrEmpty(sCode))
                    {
                        subjects[sCode] = (cCode, cName, sName, hrs);
                        if (string.IsNullOrEmpty(defaultCourseCode) && !string.IsNullOrEmpty(cCode))
                        {
                            defaultCourseCode = cCode;
                            defaultCourseName = cName;
                        }
                    }
                }
            }

            // 2. Read batch info and training date
            string batchName = ws8.Cell(3, 10).GetString().Trim();
            if (string.IsNullOrEmpty(batchName)) batchName = ws8.Cell(3, 8).GetString().Trim();

            string trainingDate = "";
            var wsLect = workbook.Worksheets.FirstOrDefault(w => w.Name == "นำส่งข้อมูลวิทยากรให้การอบรม");
            if (wsLect != null)
            {
                int maxRL = wsLect.LastRowUsed()?.RowNumber() ?? 0;
                for (int r = 8; r <= maxRL; r++)
                {
                    string d = wsLect.Cell(r, 9).GetString().Trim(); // Col I: LECTURE_DATE
                    if (!string.IsNullOrEmpty(d) && (d.Contains("/") || d.Contains("-")))
                    {
                        trainingDate = d;
                        break;
                    }
                }
            }

            if (string.IsNullOrEmpty(trainingDate) && !string.IsNullOrEmpty(batchName))
            {
                var match = Regex.Match(batchName, @"(\d{2})(\d{2})(\d{2})$");
                if (match.Success)
                {
                    trainingDate = $"{match.Groups[1].Value}/{match.Groups[2].Value}/25{match.Groups[3].Value}";
                }
            }

            // 3. Find subject columns in ws8 header row (Row 8)
            // Col 1=1.H.0.0.0, 2=คำสั่ง, 3=ลำดับที่, 4=เลขที่ใบอนุญาต, 5=หมายเลขบัตรประชาชน, 6=คำนำหน้า, 7=ชื่อ, 8=นามสกุล, 9=สิทธิลดหย่อน, 10=หมายเหตุ
            // Col 11.. are subject codes
            var allRenewCourses = _context.RenewCourses.ToList();
            var allCurriculums = _context.CourseCurriculums.Where(c => c.CourseType == "renew").ToList();

            var subjectCols = new Dictionary<int, (string Code, string Name, double Hours, int? RenewCourseId)>();
            int maxCol = ws8.LastColumnUsed()?.ColumnNumber() ?? 0;
            for (int c = 11; c <= maxCol; c++)
            {
                string headerVal = ws8.Cell(8, c).GetString().Trim();
                if (string.IsNullOrEmpty(headerVal)) continue;

                string subCode = headerVal;
                string subName = headerVal;
                double subHrs = 3.0;

                if (subjects.TryGetValue(headerVal, out var subMeta))
                {
                    subCode = headerVal;
                    subName = subMeta.SubjectName;
                    subHrs = subMeta.Hours;
                }
                else if (headerVal.StartsWith("รหัสวิชา"))
                {
                    continue;
                }

                var matchedRenewId = MatchRenewCourseId(subCode, subName, allRenewCourses, allCurriculums);
                subjectCols[c] = (subCode, subName, subHrs, matchedRenewId);
            }

            int totalSubjects = subjectCols.Count;

            // 4. Read Trainee rows starting from Row 10
            int maxRow = ws8.LastRowUsed()?.RowNumber() ?? 0;
            for (int row = 10; row <= maxRow; row++)
            {
                var r = ws8.Row(row);
                if (r.IsEmpty()) continue;

                string idRaw = r.Cell(5).GetString().Trim(); // Col E: AG_ID_CARD
                string nationalId = Regex.Replace(idRaw, @"\D", "");
                string licenseNo = r.Cell(4).GetString().Trim(); // Col D: AG_LICENSE

                if (string.IsNullOrEmpty(nationalId) && string.IsNullOrEmpty(licenseNo))
                    continue;

                string prefix = r.Cell(6).GetString().Trim(); // Col F: PREFIX_CODE
                string fname = r.Cell(7).GetString().Trim();  // Col G: AG_FNAME_TH
                string lname = r.Cell(8).GetString().Trim();  // Col H: AG_LNAME_TH
                string deduction = r.Cell(9).GetString().Trim().ToUpper(); // Col I: F_DEDUCTION
                if (deduction != "Y") deduction = "N";

                // Check which subjects passed
                var passedSubjects = new List<string>();
                var passedRenewCourseIds = new List<int>();
                double passedHours = 0;
                double totalHours = 0;

                foreach (var kvp in subjectCols)
                {
                    totalHours += kvp.Value.Hours;
                    var cell = r.Cell(kvp.Key);
                    string val = cell.GetString().Trim();
                    bool isPassed = false;

                    if (double.TryParse(val, out double h) && h > 0)
                    {
                        isPassed = true;
                        passedHours += h;
                    }
                    else if (val == "Y" || val == "ผ่าน" || val == "P")
                    {
                        isPassed = true;
                        passedHours += kvp.Value.Hours;
                    }

                    if (isPassed)
                    {
                        passedSubjects.Add($"{kvp.Value.Name} ({kvp.Value.Code})");
                        if (kvp.Value.RenewCourseId.HasValue)
                        {
                            passedRenewCourseIds.Add(kvp.Value.RenewCourseId.Value);
                        }
                    }
                }

                string trainingStatus;
                if (totalSubjects == 0)
                {
                    trainingStatus = "อนุมัติ";
                }
                else if (passedSubjects.Count == totalSubjects)
                {
                    trainingStatus = "ผ่าน (ครบทุกวิชา)";
                }
                else if (passedSubjects.Count > 0)
                {
                    trainingStatus = $"ผ่าน ({passedSubjects.Count}/{totalSubjects} วิชา)";
                }
                else
                {
                    trainingStatus = "ไม่ผ่าน (0 วิชา)";
                }

                string progressPct = totalHours > 0 ? $"{Math.Round(passedHours / totalHours * 100)}%" : "100%";
                string scorePct = totalSubjects > 0 ? $"{passedSubjects.Count}/{totalSubjects} วิชา" : "-";

                string courseCode = !string.IsNullOrEmpty(defaultCourseCode) ? defaultCourseCode : "ตนว4642037";
                string courseName = !string.IsNullOrEmpty(batchName) ? batchName : defaultCourseName;

                var item = new TrainingImportRowDto
                {
                    RowIndex = row,
                    NationalId = nationalId,
                    OriginalLicenseNo = licenseNo,
                    OriginalPrefix = prefix,
                    OriginalFirstName = fname,
                    OriginalLastName = lname,
                    DeductionPrivilege = deduction,
                    TrainingStatus = trainingStatus,
                    TrainingDateDisplay = trainingDate,
                    TrainingCourseCode = courseCode,
                    TrainingCourseName = courseName,
                    VerifiedTitleTh = prefix,
                    VerifiedFirstNameTh = fname,
                    VerifiedLastNameTh = lname,
                    VerifiedLicenseNo = licenseNo,
                    ProgressPercent = progressPct,
                    ScorePercent = scorePct,
                    PassedSubjectsDisplay = passedSubjects.Count > 0 ? string.Join(", ", passedSubjects) : "ไม่มีวิชาที่ผ่าน",
                    PassedSubjectCount = passedSubjects.Count,
                    TotalSubjectCount = totalSubjects,
                    PassedRenewCourseIds = passedRenewCourseIds.Distinct().ToList()
                };

                list.Add(item);
            }

            return list;
        }

        private List<TrainingImportRowDto> ParseLmsFormat(XLWorkbook workbook)
        {
            var list = new List<TrainingImportRowDto>();
            var worksheet = workbook.Worksheets.FirstOrDefault();
            if (worksheet == null) return list;

            var allRenewCourses = _context.RenewCourses.ToList();
            var allCurriculums = _context.CourseCurriculums.Where(c => c.CourseType == "renew").ToList();

            int startRow = 4;
            int maxRow = worksheet.LastRowUsed()?.RowNumber() ?? 0;

            for (int row = startRow; row <= maxRow; row++)
            {
                var r = worksheet.Row(row);
                if (r.IsEmpty()) continue;

                string licenseNo = r.Cell(5).GetString().Trim(); // Col E: AG_LICENSE
                string nationalIdRaw = r.Cell(6).GetString().Trim(); // Col F: AG_ID_CARD
                string nationalId = Regex.Replace(nationalIdRaw, @"\D", "");

                if (string.IsNullOrEmpty(nationalId) && string.IsNullOrEmpty(licenseNo))
                    continue;

                string status = r.Cell(12).GetString().Trim();
                string courseCode = r.Cell(18).GetString().Trim();
                string courseName = r.Cell(19).GetString().Trim();
                var passedIds = new List<int>();

                bool isPassedLms = status.StartsWith("อนุมัติ") || status.StartsWith("ผ่าน");
                if (isPassedLms && (!string.IsNullOrEmpty(courseCode) || !string.IsNullOrEmpty(courseName)))
                {
                    var matchedId = MatchRenewCourseId(courseCode, courseName, allRenewCourses, allCurriculums);
                    if (matchedId.HasValue)
                    {
                        passedIds.Add(matchedId.Value);
                    }
                }

                var item = new TrainingImportRowDto
                {
                    RowIndex = row,
                    OriginalLicenseNo = licenseNo,
                    NationalId = nationalId,
                    OriginalPrefix = r.Cell(7).GetString().Trim(),
                    OriginalFirstName = r.Cell(8).GetString().Trim(),
                    OriginalLastName = r.Cell(9).GetString().Trim(),
                    DeductionPrivilege = r.Cell(10).GetString().Trim().ToUpper(),
                    TrainingStatus = status,
                    DeductionDocStatus = r.Cell(13).GetString().Trim(),
                    TrainingDateDisplay = r.Cell(17).GetString().Trim(),
                    TrainingCourseCode = courseCode,
                    TrainingCourseName = courseName,
                    VerifiedTitleTh = r.Cell(20).GetString().Trim(),
                    VerifiedFirstNameTh = r.Cell(21).GetString().Trim(),
                    VerifiedLastNameTh = r.Cell(22).GetString().Trim(),
                    VerifiedLicenseNo = r.Cell(23).GetString().Trim(),
                    VerifiedLicenseIssueDate = r.Cell(24).GetString().Trim(),
                    VerifiedLicenseExpiryDate = r.Cell(25).GetString().Trim(),
                    VerifiedApplicantType = r.Cell(26).GetString().Trim(),
                    VerifiedLicenseType = r.Cell(27).GetString().Trim(),
                    VerifiedInsuranceType = r.Cell(28).GetString().Trim(),
                    ProgressPercent = r.Cell(29).GetString().Trim(),
                    ScorePercent = r.Cell(30).GetString().Trim(),
                    EnrollmentUrl = r.Cell(31).GetString().Trim(),
                    PassedRenewCourseIds = passedIds,
                    PassedSubjectsDisplay = !string.IsNullOrEmpty(courseName) ? courseName : courseCode,
                    PassedSubjectCount = isPassedLms ? 1 : 0,
                    TotalSubjectCount = 1
                };

                list.Add(item);
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
                .Where(c => courseCodes.Contains(c.TrainingCourseCode!) || courseCodes.Contains(c.CurriculumCode!))
                .ToListAsync();

            var summary = new TrainingImportSummaryDto
            {
                FileName = fileName,
                TotalRows = rows.Count
            };

            foreach (var r in rows)
            {
                // Status counts
                if (r.TrainingStatus != null && (r.TrainingStatus.StartsWith("ผ่าน") || r.TrainingStatus.StartsWith("อนุมัติ")))
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
                var foundCurriculum = curriculums.FirstOrDefault(c => c.TrainingCourseCode == r.TrainingCourseCode || c.CurriculumCode == r.TrainingCourseCode);
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
