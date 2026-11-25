using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EnquiryController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EnquiryController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("{citizenId}")]
        public async Task<IActionResult> GetByPath(string citizenId)
        {
            return await QueryEnquiry(citizenId);
        }

        [HttpGet]
        public async Task<IActionResult> GetByQuery([FromQuery] string? citizen_id, [FromQuery] string? national_id)
        {
            var id = !string.IsNullOrEmpty(citizen_id) ? citizen_id : national_id;
            return await QueryEnquiry(id);
        }

        private async Task<IActionResult> QueryEnquiry(string? citizenId)
        {
            if (string.IsNullOrWhiteSpace(citizenId))
            {
                return BadRequest(new { message = "กรุณากรอกเลขบัตรประชาชน 13 หลัก" });
            }

            var cleanId = new string(citizenId.Where(char.IsDigit).ToArray());
            if (cleanId.Length != 13)
            {
                return BadRequest(new { message = "กรุณากรอกเลขบัตรประชาชน 13 หลัก" });
            }

            // Optional check for Thai ID format
            if (!IsValidThaiId(cleanId))
            {
                // Verify if exists in DB anyway; if not, return checksum error
                var existsInDb = await _context.Registers.AnyAsync(r => r.NationalId == cleanId);
                if (!existsInDb)
                {
                    return BadRequest(new { message = "เลขบัตรประชาชนไม่ถูกต้องตามรูปแบบราชการ" });
                }
            }

            // 1. Fetch latest completed registration record (or latest overall)
            var reg = await _context.Registers
                .Where(r => r.NationalId == cleanId && r.CompletionTime != null)
                .OrderByDescending(r => r.CompletionTime)
                .ThenByDescending(r => r.Id)
                .FirstOrDefaultAsync();

            if (reg == null)
            {
                reg = await _context.Registers
                    .Where(r => r.NationalId == cleanId)
                    .OrderByDescending(r => r.Id)
                    .FirstOrDefaultAsync();
            }

            // 2. Fetch person & stamped results from the new system if available
            var person = await _context.Persons
                .Include(p => p.Licenses)
                .Include(p => p.Affiliations)
                .Include(p => p.TrainingResults)
                .FirstOrDefaultAsync(p => p.NationId == cleanId);

            if (reg == null && person == null)
            {
                return NotFound(new { message = "ไม่พบข้อมูลการอบรมของท่าน" });
            }

            // Build attributes
            var title = reg?.TitleTh ?? person?.TitleTh ?? "";
            var firstN = reg?.FirstNameTh ?? person?.FirstNameTh ?? "";
            var lastN = reg?.LastNameTh ?? person?.LastNameTh ?? "";
            var fullName = $"{title} {firstN} {lastN}".Trim();
            if (string.IsNullOrEmpty(fullName)) fullName = "ไม่มีข้อมูล";

            var email = !string.IsNullOrWhiteSpace(reg?.EmailAlt) ? reg.EmailAlt.Trim() 
                      : (!string.IsNullOrWhiteSpace(person?.EmailAlt) ? person.EmailAlt.Trim() : "ไม่มีข้อมูล");

            var branch = !string.IsNullOrWhiteSpace(reg?.RegionBangkok) ? reg.RegionBangkok.Trim()
                       : (!string.IsNullOrWhiteSpace(reg?.RegionNorth) ? reg.RegionNorth.Trim()
                       : (!string.IsNullOrWhiteSpace(reg?.RegionNortheast) ? reg.RegionNortheast.Trim()
                       : (!string.IsNullOrWhiteSpace(reg?.RegionEast) ? reg.RegionEast.Trim()
                       : (!string.IsNullOrWhiteSpace(reg?.RegionCentralWest) ? reg.RegionCentralWest.Trim()
                       : (!string.IsNullOrWhiteSpace(reg?.RegionSouth) ? reg.RegionSouth.Trim()
                       : (!string.IsNullOrWhiteSpace(reg?.BrokerBranch) ? reg.BrokerBranch.Trim() : "ไม่มีข้อมูล"))))));

            var agentCode = !string.IsNullOrWhiteSpace(reg?.ViriyahAgentCode) ? reg.ViriyahAgentCode.Trim()
                          : (person?.Affiliations.FirstOrDefault()?.ViriyahAgentCode ?? "ไม่มีข้อมูล");

            var licenseNo = !string.IsNullOrWhiteSpace(reg?.LicenseNo) ? reg.LicenseNo.Trim()
                          : (person?.Licenses.FirstOrDefault()?.LicenseNo ?? "ไม่มีข้อมูล");

            var licenseExpiryDate = reg?.LicenseExpiryDate.HasValue == true 
                ? FormatThaiDate(reg.LicenseExpiryDate.Value) 
                : (person?.Licenses.FirstOrDefault()?.LicenseExpiryDate.HasValue == true 
                    ? FormatThaiDate(person.Licenses.FirstOrDefault()!.LicenseExpiryDate!.Value) 
                    : "ไม่มีข้อมูล");

            var courseType = !string.IsNullOrWhiteSpace(reg?.CourseType) ? reg.CourseType.Trim() : "ไม่มีข้อมูล";

            var brokerLevel = !string.IsNullOrWhiteSpace(reg?.BrokerLevel) ? reg.BrokerLevel.Trim() : "";
            var agentLevel = !string.IsNullOrWhiteSpace(reg?.AgentLevel) ? reg.AgentLevel.Trim() : "";
            var renewLevel = !string.IsNullOrEmpty(brokerLevel) ? brokerLevel : (!string.IsNullOrEmpty(agentLevel) ? agentLevel : "ไม่มีข้อมูล");

            var registrationDate = reg?.CompletionTime.HasValue == true
                ? FormatThaiDateShort(reg.CompletionTime.Value)
                : (reg?.CreatedAt.HasValue == true ? FormatThaiDateShort(reg.CreatedAt.Value) : "ไม่ทราบวันที่");

            var pastCourses = FormatPastCourses(reg?.PastTraining5y);

            // Wanted courses: Check override columns first (renew_agent_1..3, renew_broker_1..3)
            var wantCandidates = new List<string>();
            var overrides = new[] { reg?.RenewAgent1, reg?.RenewAgent2, reg?.RenewAgent3, reg?.RenewBroker1, reg?.RenewBroker2, reg?.RenewBroker3 };
            foreach (var ov in overrides)
            {
                if (!string.IsNullOrWhiteSpace(ov)) wantCandidates.Add(ov.Trim());
            }

            string wantCourses;
            if (wantCandidates.Count > 0)
            {
                var rawJoined = string.Join("; ", wantCandidates);
                var formatted = FormatWantCourses(rawJoined);
                if (!string.IsNullOrEmpty(renewLevel) && renewLevel != "ไม่มีข้อมูล")
                {
                    wantCourses = $"หลักสูตรที่ท่านต้องอบรมคือ : {renewLevel}\n{formatted}";
                }
                else
                {
                    wantCourses = formatted;
                }
            }
            else
            {
                wantCourses = FormatWantCourses(reg?.RenewOther);
            }

            var maskedId = MaskCitizenId(cleanId);

            // Stamped results from new system if any
            var stampedResults = person?.TrainingResults
                .OrderByDescending(t => t.StampDate)
                .Select(t => new
                {
                    id = t.Id,
                    courseCode = t.TrainingCourseCode,
                    courseName = t.TrainingCourseName,
                    subjectNames = t.SubjectNames,
                    trainingDate = t.TrainingDateDisplay,
                    status = t.TrainingStatus,
                    scorePercent = t.ScorePercent,
                    progressPercent = t.ProgressPercent,
                    stampDate = t.StampDate.ToString("yyyy-MM-dd HH:mm")
                })
                .ToList();

            return Ok(new
            {
                found = true,
                citizenId = cleanId,
                maskedCitizenId = maskedId,
                fullName,
                title,
                firstName = firstN,
                lastName = lastN,
                email,
                branch,
                agentCode,
                licenseNo,
                licenseExpiryDate,
                courseType,
                renewLevel,
                registrationDate,
                pastCourses,
                wantCourses,
                stampedResults = stampedResults ?? new()
            });
        }

        private static bool IsValidThaiId(string id)
        {
            if (string.IsNullOrWhiteSpace(id) || id.Length != 13 || !id.All(char.IsDigit)) return false;
            int sum = 0;
            for (int i = 0; i < 12; i++)
            {
                sum += (id[i] - '0') * (13 - i);
            }
            int check = (11 - (sum % 11)) % 10;
            return check == (id[12] - '0');
        }

        private static string MaskCitizenId(string id)
        {
            if (string.IsNullOrEmpty(id) || id.Length != 13) return id ?? "";
            return new string('X', 7) + id.Substring(7, 6);
        }

        private static string FormatThaiDate(DateTime dt)
        {
            var months = new[]
            {
                "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
                "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
            };
            var year = dt.Year > 2400 ? dt.Year : dt.Year + 543;
            var month = dt.Month >= 1 && dt.Month <= 12 ? months[dt.Month] : dt.Month.ToString();
            return $"{dt.Day} {month} {year}";
        }

        private static string FormatThaiDateShort(DateTime dt)
        {
            var months = new[]
            {
                "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
                "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
            };
            var year = dt.Year > 2400 ? dt.Year : dt.Year + 543;
            var month = dt.Month >= 1 && dt.Month <= 12 ? months[dt.Month] : dt.Month.ToString();
            return $"{dt.Day} {month} {year}";
        }

        private static string CleanDedupKey(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            var chars = s.Where(c => !char.IsWhiteSpace(c) && c != '.' && c != ':' && c != '-' && c != '_' && c != '(' && c != ')' && c != '[' && c != ']').ToArray();
            return new string(chars);
        }

        private static string FormatPastCourses(string? s)
        {
            if (string.IsNullOrWhiteSpace(s) || s.Trim() == "ไม่มีข้อมูล") return "ไม่มีข้อมูล";

            var parts = Regex.Split(s, @"\s*;\s*|\n+");
            var items = new List<string>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var p in parts)
            {
                var clean = p.Trim();
                if (string.IsNullOrEmpty(clean)) continue;

                // Normalize key for deduplication
                var dedup = Regex.Replace(clean, @"^\s*\d+[\.\)\s]+", "");
                dedup = dedup.Replace("กฏ", "กฎ");
                dedup = CleanDedupKey(dedup);
                if (!string.IsNullOrEmpty(dedup))
                {
                    if (seen.Contains(dedup)) continue;
                    seen.Add(dedup);
                }
                items.Add(clean);
            }

            if (items.Count == 0) return "ไม่มีข้อมูล";

            // Sort by leading number if any
            items.Sort((a, b) =>
            {
                int na = 1000000000, nb = 1000000000;
                var ma = Regex.Match(a, @"^\s*(\d+)");
                if (ma.Success) int.TryParse(ma.Groups[1].Value, out na);
                var mb = Regex.Match(b, @"^\s*(\d+)");
                if (mb.Success) int.TryParse(mb.Groups[1].Value, out nb);
                return na.CompareTo(nb);
            });

            return string.Join("\n", items);
        }

        private static string FormatWantCourses(string? s)
        {
            if (string.IsNullOrWhiteSpace(s) || s.Trim() == "ไม่มีข้อมูล") return "ไม่มีข้อมูล";

            var parts = Regex.Split(s, @"\s*;\s*|\n+");
            var thaiMonths = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                { "มกราคม", 1 }, { "กุมภาพันธ์", 2 }, { "มีนาคม", 3 }, { "เมษายน", 4 },
                { "พฤษภาคม", 5 }, { "มิถุนายน", 6 }, { "กรกฎาคม", 7 }, { "สิงหาคม", 8 },
                { "กันยายน", 9 }, { "ตุลาคม", 10 }, { "พฤศจิกายน", 11 }, { "ธันวาคม", 12 }
            };

            int ExtractDateKey(string item)
            {
                // Pattern: [Pillar X] [DD Month YYYY]
                var m = Regex.Match(item, @"\]\s*\[\s*([0-9]{1,2})\s+([^\s\]]+)\s+([0-9]{4})\s*\]");
                if (m.Success)
                {
                    int.TryParse(m.Groups[1].Value, out int day);
                    var monName = Regex.Replace(m.Groups[2].Value.Trim(), @"[^\u0E00-\u0E7F]", "");
                    int.TryParse(m.Groups[3].Value, out int year);
                    if (year >= 2400) year -= 543;
                    if (thaiMonths.TryGetValue(monName, out int month))
                    {
                        if (month >= 1 && month <= 12 && day >= 1 && day <= 31)
                        {
                            return (year * 10000) + (month * 100) + day;
                        }
                    }
                }
                return 99991231;
            }

            var parsed = new List<(string Item, int DateKey, int Pillar, int Index)>();
            int idx = 0;
            foreach (var p in parts)
            {
                var clean = p.Trim();
                if (string.IsNullOrEmpty(clean)) continue;

                int pillar = 9;
                var pm = Regex.Match(clean, @"\[\s*Pillar\s*([123])\s*\]", RegexOptions.IgnoreCase);
                if (pm.Success) int.TryParse(pm.Groups[1].Value, out pillar);

                parsed.Add((clean, ExtractDateKey(clean), pillar, idx++));
            }

            if (parsed.Count == 0) return "ไม่มีข้อมูล";

            // Sort by Date ASC, Pillar ASC, Index ASC
            parsed.Sort((a, b) =>
            {
                if (a.DateKey != b.DateKey) return a.DateKey.CompareTo(b.DateKey);
                if (a.Pillar != b.Pillar) return a.Pillar.CompareTo(b.Pillar);
                return a.Index.CompareTo(b.Index);
            });

            // Deduplicate courses by name after ':'
            var unique = new List<string>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var entry in parsed)
            {
                var item = entry.Item;
                var title = item;
                var colonPos = item.IndexOf(':');
                if (colonPos >= 0) title = item.Substring(colonPos + 1).Trim();

                var dedup = title.Replace("กฏ", "กฎ").Replace("(ทางไกล)", "");
                dedup = CleanDedupKey(dedup);
                if (!string.IsNullOrEmpty(dedup))
                {
                    if (seen.Contains(dedup)) continue;
                    seen.Add(dedup);
                }
                unique.Add(item);
            }

            // Output format:
            // 1. [Pillar X] [Date]:
            // Course name...
            var outLines = new List<string>();
            int counter = 1;
            foreach (var item in unique)
            {
                var pos = item.IndexOf(':');
                if (pos >= 0)
                {
                    var head = item.Substring(0, pos).Trim();
                    var tail = item.Substring(pos + 1).Trim();
                    outLines.Add($"{counter}. {head}:");
                    if (!string.IsNullOrEmpty(tail))
                    {
                        outLines.Add(tail);
                    }
                }
                else
                {
                    outLines.Add($"{counter}. {item}");
                }
                counter++;
            }

            return string.Join("\n", outLines);
        }
    }
}
