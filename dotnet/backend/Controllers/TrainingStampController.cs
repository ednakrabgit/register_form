using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.Services;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TrainingStampController : ControllerBase
    {
        private readonly TrainingImportService _importService;
        private readonly AppDbContext _context;

        public TrainingStampController(TrainingImportService importService, AppDbContext context)
        {
            _importService = importService;
            _context = context;
        }

        /// <summary>
        /// ดาวน์โหลดไฟล์ต้นแบบ Excel (.xlsx) สำหรับนำเข้าผลการอบรม
        /// </summary>
        [HttpGet("template")]
        public IActionResult DownloadTemplate()
        {
            var fileBytes = _importService.GenerateTemplateExcel();
            const string fileName = "template_training_result_stamp.xlsx";
            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName
            );
        }

        /// <summary>
        /// อัปโหลดไฟล์ Excel จากระบบอบรมเพื่อดูตัวอย่าง (Preview) ก่อนทำการบันทึก/Stamp
        /// </summary>
        [HttpPost("preview")]
        public async Task<IActionResult> Preview([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "กรุณาแนบไฟล์ Excel (.xlsx)" });

            if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "รองรับเฉพาะไฟล์นามสกุล .xlsx เท่านั้น" });

            try
            {
                using var stream = new MemoryStream();
                await file.CopyToAsync(stream);
                stream.Position = 0;

                var preview = await _importService.ParseAndPreviewExcelAsync(stream, file.FileName);
                return Ok(preview);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: " + ex.Message });
            }
        }

        /// <summary>
        /// ดำเนินการ Stamp ผลการอบรมและบันทึกประวัติลงฐานข้อมูล
        /// </summary>
        [HttpPost("execute")]
        public async Task<IActionResult> Execute([FromForm] IFormFile file, [FromQuery] bool syncVerifiedData = false)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "กรุณาแนบไฟล์ Excel (.xlsx)" });

            try
            {
                using var stream = new MemoryStream();
                await file.CopyToAsync(stream);
                stream.Position = 0;

                var result = await _importService.ExecuteStampAsync(stream, file.FileName, syncVerifiedData);
                return Ok(new
                {
                    message = "Stamp ผลการอบรมสำเร็จ",
                    summary = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "เกิดข้อผิดพลาดในการ Stamp ผลการอบรม: " + ex.Message });
            }
        }

        /// <summary>
        /// ดูประวัติการ Stamp ผลการอบรมทั้งหมด
        /// </summary>
        [HttpGet("results")]
        public async Task<IActionResult> GetResults([FromQuery] string? nationId, [FromQuery] string? trainingCourseCode, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var query = _context.TrainingResults.AsNoTracking().AsQueryable();

            if (!string.IsNullOrEmpty(nationId))
            {
                query = query.Where(r => r.NationId == nationId);
            }

            if (!string.IsNullOrEmpty(trainingCourseCode))
            {
                query = query.Where(r => r.TrainingCourseCode == trainingCourseCode);
            }

            var total = await query.CountAsync();
            var list = await query
                .OrderByDescending(r => r.StampDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                data = list
            });
        }

        /// <summary>
        /// ซิงค์ข้อมูล Verified (ชื่อ, สกุล, เลขใบอนุญาตที่ตรวจแล้ว) ไปยัง Person/PersonLicense ของผู้สมัครรายบุคคล
        /// </summary>
        [HttpPost("sync-verified/{resultId}")]
        public async Task<IActionResult> SyncVerifiedToPerson(int resultId)
        {
            var result = await _context.TrainingResults.FindAsync(resultId);
            if (result == null) return NotFound(new { message = "ไม่พบรายการผลการอบรม" });

            if (string.IsNullOrEmpty(result.NationId))
                return BadRequest(new { message = "รายการนี้ไม่มีเลขบัตรประชาชน" });

            var person = await _context.Persons
                .Include(p => p.Licenses)
                .FirstOrDefaultAsync(p => p.NationId == result.NationId);

            if (person == null)
                return NotFound(new { message = "ไม่พบข้อมูลผู้สมัครในระบบ" });

            if (!string.IsNullOrWhiteSpace(result.VerifiedTitleTh)) person.TitleTh = result.VerifiedTitleTh.Trim();
            if (!string.IsNullOrWhiteSpace(result.VerifiedFirstNameTh)) person.FirstNameTh = result.VerifiedFirstNameTh.Trim();
            if (!string.IsNullOrWhiteSpace(result.VerifiedLastNameTh)) person.LastNameTh = result.VerifiedLastNameTh.Trim();

            if (!string.IsNullOrWhiteSpace(result.VerifiedLicenseNo))
            {
                var cleanLic = result.VerifiedLicenseNo.Trim();
                var license = person.Licenses.FirstOrDefault();
                if (license == null)
                {
                    license = new PersonLicense { NationId = person.NationId, LicenseNo = cleanLic };
                    person.Licenses.Add(license);
                }
                else
                {
                    license.LicenseNo = cleanLic;
                }

                if (DateTime.TryParse(result.VerifiedLicenseIssueDate, out var issueDate))
                {
                    license.LicenseIssueDate = issueDate;
                }
                if (DateTime.TryParse(result.VerifiedLicenseExpiryDate, out var expiryDate))
                {
                    license.LicenseExpiryDate = expiryDate;
                }
            }

            result.IsDataMismatch = "N";
            await _context.SaveChangesAsync();

            return Ok(new { message = "ซิงค์ข้อมูลเรียบร้อยแล้ว", person });
        }
    }
}
