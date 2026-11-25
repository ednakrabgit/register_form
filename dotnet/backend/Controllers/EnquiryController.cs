using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.Services;

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

        [HttpGet("encode/{citizenId}")]
        public IActionResult EncodeCitizenId(string citizenId)
        {
            var clean = new string((citizenId ?? "").Where(char.IsDigit).ToArray());
            if (clean.Length != 13) return BadRequest(new { message = "Citizen ID must be 13 digits" });
            var code = CitizenIdSecurity.Encrypt(clean);
            return Ok(new
            {
                code = code,
                maskedCitizenId = CitizenIdSecurity.Mask(clean),
                shareUrl = $"/enquiry/?code={code}"
            });
        }

        [HttpGet("{citizenIdOrCode}")]
        public async Task<IActionResult> GetByPath(string citizenIdOrCode)
        {
            return await QueryEnquiry(citizenIdOrCode);
        }

        [HttpGet]
        public async Task<IActionResult> GetByQuery(
            [FromQuery] string? code,
            [FromQuery] string? token,
            [FromQuery] string? citizen_id,
            [FromQuery] string? national_id)
        {
            var idOrCode = !string.IsNullOrEmpty(code) ? code
                         : (!string.IsNullOrEmpty(token) ? token
                         : (!string.IsNullOrEmpty(citizen_id) ? citizen_id : national_id));
            return await QueryEnquiry(idOrCode);
        }

        private async Task<IActionResult> QueryEnquiry(string? idOrCode)
        {
            if (string.IsNullOrWhiteSpace(idOrCode))
            {
                return BadRequest(new { message = "กรุณากรอกเลขบัตรประชาชน 13 หลัก หรือรหัสที่ปลอดภัย" });
            }

            var trimmed = idOrCode.Trim();
            string cleanId;

            // 1. Try to decrypt if it looks like a secure code/token (not raw 13 digits)
            if (trimmed.Length != 13 || !trimmed.All(char.IsDigit))
            {
                var decrypted = CitizenIdSecurity.Decrypt(trimmed);
                if (!string.IsNullOrEmpty(decrypted))
                {
                    cleanId = decrypted;
                }
                else
                {
                    cleanId = new string(trimmed.Where(char.IsDigit).ToArray());
                }
            }
            else
            {
                cleanId = trimmed;
            }

            if (cleanId.Length != 13)
            {
                return BadRequest(new { message = "กรุณากรอกเลขบัตรประชาชน 13 หลัก หรือรหัสอ้างอิงที่ถูกต้อง" });
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
                .Include(p => p.Trainings)
                .FirstOrDefaultAsync(p => p.NationId == cleanId);

            if (reg == null && person == null)
            {
                return NotFound(new { message = "ไม่พบข้อมูลการอบรมของท่าน" });
            }

            var allRenewCourses = await _context.RenewCourses.ToListAsync();

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

            // Stamped passed results from new system
            var passedStamps = person?.TrainingResults?
                .Where(t => t.TrainingStatus != null && (t.TrainingStatus.Contains("ผ่าน") || t.TrainingStatus.Contains("อนุมัติ")))
                .ToList() ?? new List<TrnTrainingResult>();

            var pastCourses = FormatPastCourses(reg?.PastTraining5y, passedStamps, person?.Trainings?.ToList(), allRenewCourses);

            // Wanted courses: Check override columns first (renew_agent_1..3, renew_broker_1..3)
            var wantCandidates = new List<string>();
            var overrides = new[] { reg?.RenewAgent1, reg?.RenewAgent2, reg?.RenewAgent3, reg?.RenewBroker1, reg?.RenewBroker2, reg?.RenewBroker3 };
            foreach (var ov in overrides)
            {
                if (!string.IsNullOrWhiteSpace(ov)) wantCandidates.Add(ov.Trim());
            }

            string wantCourses;
            List<WantCourseItemDto> wantCoursesList;

            if (wantCandidates.Count > 0)
            {
                var rawJoined = string.Join("; ", wantCandidates);
                var formatted = FormatWantCourses(rawJoined, renewLevel, passedStamps);
                wantCourses = formatted.Text;
                wantCoursesList = formatted.Items;

                if (!string.IsNullOrEmpty(renewLevel) && renewLevel != "ไม่มีข้อมูล")
                {
                    wantCourses = $"หลักสูตรที่ท่านต้องอบรมคือ : {renewLevel}\n{wantCourses}";
                }
            }
            else
            {
                var formatted = FormatWantCourses(reg?.RenewOther, renewLevel, passedStamps);
                wantCourses = formatted.Text;
                wantCoursesList = formatted.Items;
            }

            var maskedId = MaskCitizenId(cleanId);

            // Stamped results from new system if any (for API reference)
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

            var secureCode = CitizenIdSecurity.Encrypt(cleanId);
            var reqHost = Request.Host.Value;
            var reqScheme = Request.Scheme;
            var shareUrl = $"{reqScheme}://{reqHost}/enquiry/?code={secureCode}";

            return Ok(new
            {
                found = true,
                code = secureCode,
                secureCode = secureCode,
                shareUrl = shareUrl,
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
                wantCoursesList,
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

        private static string FormatPastCourses(
            string? rawPastTraining,
            List<TrnTrainingResult>? passedStamps,
            List<PersonTraining5y>? personTrainings,
            List<MstRenewCourse>? allRenewCourses)
        {
            var renewDict = allRenewCourses?.ToDictionary(c => c.Id, c => c.Name) ?? new Dictionary<int, string>();
            var collected = new List<string>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            void AddItem(string? name)
            {
                if (string.IsNullOrWhiteSpace(name)) return;
                var trimmed = name.Trim();
                if (trimmed == "ไม่มีข้อมูล" || trimmed == "ไม่เคยผ่านการอบรมมาก่อน" || trimmed == "-" || trimmed == "null") return;

                // Strip leading numbering e.g. "1. ", "1) "
                var cleanName = Regex.Replace(trimmed, @"^\s*\d+[\.\)\s]+", "").Trim();
                var dedupKey = CleanSubjectKey(cleanName);
                if (!string.IsNullOrEmpty(dedupKey) && !seen.Contains(dedupKey))
                {
                    seen.Add(dedupKey);
                    collected.Add(cleanName);
                }
            }

            // 1. From raw past_training_5y in register table
            if (!string.IsNullOrWhiteSpace(rawPastTraining))
            {
                var parts = Regex.Split(rawPastTraining, @"\s*;\s*|\n+");
                foreach (var p in parts)
                {
                    if (int.TryParse(p.Trim(), out int cid) && renewDict.TryGetValue(cid, out var cName))
                    {
                        AddItem(cName);
                    }
                    else
                    {
                        AddItem(p);
                    }
                }
            }

            // 2. From personTrainings (persontraining5y)
            if (personTrainings != null)
            {
                foreach (var pt in personTrainings)
                {
                    if (pt.CourseId.HasValue && renewDict.TryGetValue(pt.CourseId.Value, out var cName))
                    {
                        AddItem(cName);
                    }
                }
            }

            // 3. From passed stamped results (trn_training_result)
            if (passedStamps != null)
            {
                foreach (var st in passedStamps)
                {
                    if (!string.IsNullOrWhiteSpace(st.SubjectNames) && st.SubjectNames.Trim() != "-")
                    {
                        var subs = Regex.Split(st.SubjectNames, @"[,;\n]+");
                        foreach (var sub in subs) AddItem(sub);
                    }
                    else if (!string.IsNullOrWhiteSpace(st.TrainingCourseName) && st.TrainingCourseName.Trim() != "-")
                    {
                        AddItem(st.TrainingCourseName);
                    }
                }
            }

            if (collected.Count == 0) return "ไม่มีข้อมูล";

            // Return numbered list
            var outList = new List<string>();
            for (int i = 0; i < collected.Count; i++)
            {
                outList.Add($"{i + 1}. {collected[i]}");
            }
            return string.Join("\n", outList);
        }

        private static (string Text, List<WantCourseItemDto> Items) FormatWantCourses(
            string? s,
            string? renewLevel,
            List<TrnTrainingResult> passedStamps)
        {
            if (string.IsNullOrWhiteSpace(s) || s.Trim() == "ไม่มีข้อมูล")
            {
                return ("ไม่มีข้อมูล", new List<WantCourseItemDto>());
            }

            var parts = Regex.Split(s, @"\s*;\s*|\n+");
            var thaiMonths = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                { "มกราคม", 1 }, { "กุมภาพันธ์", 2 }, { "มีนาคม", 3 }, { "เมษายน", 4 },
                { "พฤษภาคม", 5 }, { "มิถุนายน", 6 }, { "กรกฎาคม", 7 }, { "สิงหาคม", 8 },
                { "กันยายน", 9 }, { "ตุลาคม", 10 }, { "พฤศจิกายน", 11 }, { "ธันวาคม", 12 }
            };

            int ExtractDateKey(string item)
            {
                // Pattern: [Pillar X] [DD Month YYYY] or [DD Month YYYY]
                var m = Regex.Match(item, @"\[\s*([0-9]{1,2})\s+([^\s\]]+)\s+([0-9]{4})\s*\]");
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

            if (parsed.Count == 0) return ("ไม่มีข้อมูล", new List<WantCourseItemDto>());

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
            var itemsList = new List<WantCourseItemDto>();
            int counter = 1;

            foreach (var item in unique)
            {
                string head = "";
                string tail = "";
                var bracketColonPos = item.IndexOf("]:");
                if (bracketColonPos >= 0)
                {
                    head = item.Substring(0, bracketColonPos + 1).Trim();
                    tail = item.Substring(bracketColonPos + 2).Trim();
                }
                else
                {
                    // Check if item is a date string e.g. "2569-12-15 00:00:00"
                    var mDate = Regex.Match(item, @"^(\d{4})-(\d{2})-(\d{2})");
                    if (mDate.Success)
                    {
                        int.TryParse(mDate.Groups[1].Value, out int yr);
                        int.TryParse(mDate.Groups[2].Value, out int mo);
                        int.TryParse(mDate.Groups[3].Value, out int dy);
                        if (yr > 2400) yr -= 543;
                        try
                        {
                            var dtParsed = new DateTime(yr, mo, dy);
                            head = $"[{FormatThaiDate(dtParsed)}]";
                        }
                        catch
                        {
                            head = $"[{mDate.Groups[0].Value}]";
                        }
                        tail = !string.IsNullOrEmpty(renewLevel) && renewLevel != "ไม่มีข้อมูล" ? renewLevel : item.Trim();
                    }
                    else
                    {
                        var colonPos = item.IndexOf(':');
                        if (colonPos >= 0)
                        {
                            head = item.Substring(0, colonPos).Trim();
                            tail = item.Substring(colonPos + 1).Trim();
                        }
                        else
                        {
                            tail = item.Trim();
                        }
                    }
                }

                if (string.IsNullOrEmpty(tail) && !string.IsNullOrEmpty(renewLevel) && renewLevel != "ไม่มีข้อมูล")
                {
                    tail = renewLevel;
                }

                bool isPassed = IsCoursePassed(tail, head, renewLevel, passedStamps);
                var displayCourseName = isPassed ? $"{tail} (ผ่านการอบรมแล้ว)" : tail;

                if (!string.IsNullOrEmpty(head))
                {
                    outLines.Add($"{counter}. {head}:");
                    if (!string.IsNullOrEmpty(displayCourseName))
                    {
                        outLines.Add(displayCourseName);
                    }
                }
                else
                {
                    outLines.Add($"{counter}. {displayCourseName}");
                }

                itemsList.Add(new WantCourseItemDto
                {
                    Index = counter,
                    Header = head,
                    CourseName = tail,
                    IsPassed = isPassed
                });

                counter++;
            }

            return (string.Join("\n", outLines), itemsList);
        }

        private static bool IsCoursePassed(
            string courseTitle,
            string? courseHeader,
            string? renewLevel,
            List<TrnTrainingResult> passedStamps)
        {
            if (passedStamps == null || passedStamps.Count == 0) return false;

            var cleanTitle = CleanSubjectKey(courseTitle);
            var cleanHeader = CleanSubjectKey(courseHeader ?? "");
            var cleanLevel = CleanSubjectKey(renewLevel ?? "");

            foreach (var st in passedStamps)
            {
                var cleanSub = CleanSubjectKey(st.SubjectNames ?? "");
                var cleanCourse = CleanSubjectKey(st.TrainingCourseName ?? "");
                var cleanCode = CleanSubjectKey(st.TrainingCourseCode ?? "");

                // 1. Direct or substring match on subject name
                if (!string.IsNullOrEmpty(cleanTitle) && !string.IsNullOrEmpty(cleanSub))
                {
                    if (cleanTitle.Contains(cleanSub) || cleanSub.Contains(cleanTitle))
                        return true;
                }

                // 2. Keyword matching for known subject variations (Renew 4+)
                if (IsRenew4SubjectMatch(cleanTitle, cleanSub, cleanCourse))
                    return true;

                // 3. Basic course matching (ขอรับ / ต่อ 1-3)
                if (IsBasicCourseMatch(cleanTitle, cleanLevel, cleanCourse, cleanCode))
                    return true;
            }

            return false;
        }

        private static string CleanSubjectKey(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            var chars = s.Where(c => !char.IsWhiteSpace(c) && c != '.' && c != ':' && c != '-' && c != '_' && c != '(' && c != ')' && c != '[' && c != ']' && c != ',' && c != '/').ToArray();
            var cleaned = new string(chars).ToLower();
            cleaned = cleaned.Replace("กฏ", "กฎ");
            cleaned = cleaned.Replace("วินาศภัย", "ภัย");
            cleaned = cleaned.Replace("พระราชบัญญัติ", "พรบ");
            cleaned = cleaned.Replace("พศ2522", "").Replace("พศ2526", "").Replace("แก้ไขเพิ่มเติม2562", "");
            return cleaned;
        }

        private static bool IsRenew4SubjectMatch(string t, string sub, string crs)
        {
            // จราจรทางบก
            if (t.Contains("จราจร") && (sub.Contains("จราจร") || crs.Contains("จราจร"))) return true;
            // ข้อมูลส่วนบุคคล / PDPA
            if ((t.Contains("ข้อมูลส่วนบุคคล") || t.Contains("pdpa")) && (sub.Contains("ข้อมูลส่วนบุคคล") || sub.Contains("pdpa"))) return true;
            // ฟอกเงิน
            if (t.Contains("ฟอกเงิน") && sub.Contains("ฟอกเงิน")) return true;
            // ทวงถามหนี้
            if (t.Contains("ทวงถามหนี้") && sub.Contains("ทวงถามหนี้")) return true;
            // จรรยาบรรณ
            if (t.Contains("จรรยาบรรณ") && sub.Contains("จรรยาบรรณ")) return true;
            // ไฟฟ้า / รถยนต์ไฟฟ้า
            if (t.Contains("ไฟฟ้า") && sub.Contains("ไฟฟ้า")) return true;
            // เสนอขายถูกหลัก
            if (t.Contains("เสนอขายถูกหลัก") && sub.Contains("เสนอขายถูกหลัก")) return true;
            // ตลาดยุคใหม่
            if (t.Contains("ตลาดยุคใหม่") && sub.Contains("ตลาดยุคใหม่")) return true;
            // พิจารณารับประกัน
            if (t.Contains("พิจารณารับประกัน") && sub.Contains("พิจารณารับประกัน")) return true;
            // สุขภาพ
            if (t.Contains("สุขภาพ") && sub.Contains("สุขภาพ")) return true;
            // ความเสี่ยงต่อความรับผิด
            if (t.Contains("ความเสี่ยงต่อความรับผิด") && sub.Contains("ความเสี่ยงต่อความรับผิด")) return true;
            // Non-Motor
            if ((t.Contains("nonmotor") || t.Contains("สินไหม")) && (sub.Contains("nonmotor") || sub.Contains("สินไหม"))) return true;
            // ความเสี่ยงภัยทรัพย์สิน
            if (t.Contains("ทรัพย์สิน") && sub.Contains("ทรัพย์สิน")) return true;
            // วัยเกษียณ
            if (t.Contains("เกษียณ") && sub.Contains("เกษียณ")) return true;
            // วางแผนภาษี
            if (t.Contains("ภาษี") && sub.Contains("ภาษี")) return true;
            // ประกันภัยต่อ
            if (t.Contains("ประกันภัยต่อ") && (sub.Contains("ประกันภัยต่อ") || sub.Contains("ประกันต่อ"))) return true;
            // ระดับความเสี่ยง
            if (t.Contains("ระดับความเสี่ยง") && sub.Contains("ระดับความเสี่ยง")) return true;

            return false;
        }

        private static bool IsBasicCourseMatch(string title, string level, string courseName, string courseCode)
        {
            var text = $"{title} {level}";
            var target = $"{courseName} {courseCode}";

            // ขอรับนายหน้า (นว.0)
            if (text.Contains("ขอรับ") && text.Contains("นายหน้า") && (target.Contains("นว0") || target.Contains("นว.0") || target.Contains("ขอรับ"))) return true;
            // ขอรับตัวแทน (ตว.0)
            if (text.Contains("ขอรับ") && text.Contains("ตัวแทน") && (target.Contains("ตว0") || target.Contains("ตว.0") || target.Contains("ขอรับ"))) return true;
            // ต่อ 1 นายหน้า (นว.1)
            if (text.Contains("1") && text.Contains("นายหน้า") && (target.Contains("นว1") || target.Contains("นว.1"))) return true;
            // ต่อ 1 ตัวแทน (ตว.1)
            if (text.Contains("1") && text.Contains("ตัวแทน") && (target.Contains("ตว1") || target.Contains("ตว.1"))) return true;
            // ต่อ 2 นายหน้า (นว.2)
            if (text.Contains("2") && text.Contains("นายหน้า") && (target.Contains("นว2") || target.Contains("นว.2"))) return true;
            // ต่อ 2 ตัวแทน (ตว.2)
            if (text.Contains("2") && text.Contains("ตัวแทน") && (target.Contains("ตว2") || target.Contains("ตว.2"))) return true;
            // ต่อ 3 นายหน้า (นว.3)
            if (text.Contains("3") && text.Contains("นายหน้า") && (target.Contains("นว3") || target.Contains("นว.3"))) return true;
            // ต่อ 3 ตัวแทน (ตว.3)
            if (text.Contains("3") && text.Contains("ตัวแทน") && (target.Contains("ตว3") || target.Contains("ตว.3"))) return true;

            return false;
        }
    }

    public class WantCourseItemDto
    {
        public int Index { get; set; }
        public string Header { get; set; } = "";
        public string CourseName { get; set; } = "";
        public bool IsPassed { get; set; }
    }
}
