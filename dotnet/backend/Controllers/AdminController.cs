using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Repositories;
using backend.Models;
using backend.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // [Authorize(Roles = "Admin,Viewer")] // Uncomment when JWT is fully set up in Program.cs
    public class AdminController : ControllerBase
    {
        private readonly IRegisterRepository _repository;

        public AdminController(IRegisterRepository repository)
        {
            _repository = repository;
        }

        private (string? Role, string? Username, string? NationId, string? Email) GetCallerInfo(AppDbContext context)
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                return (null, null, null, null);
            }

            var tokenStr = authHeader.Substring("Bearer ".Length).Trim();
            try
            {
                var handler = new JwtSecurityTokenHandler();
                if (handler.CanReadToken(tokenStr))
                {
                    var jwt = handler.ReadJwtToken(tokenStr);
                    var role = jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "role")?.Value;
                    var username = jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name || c.Type == "unique_name")?.Value;
                    var nationId = jwt.Claims.FirstOrDefault(c => c.Type == "NationId" || c.Type == "nationId")?.Value;
                    var email = jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email || c.Type == "email")?.Value;

                    if (string.IsNullOrEmpty(nationId) && !string.IsNullOrEmpty(username))
                    {
                        var user = context.Users.FirstOrDefault(u => u.Username == username);
                        if (user != null)
                        {
                            nationId = user.NationId;
                            email = user.Email ?? email;
                            role = user.Role ?? role;
                        }
                    }

                    return (role, username, nationId, email);
                }
            }
            catch { }

            return (null, null, null, null);
        }

        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats(
            [FromServices] AppDbContext context,
            [FromQuery] string? trendStartDate = null,
            [FromQuery] string? trendEndDate = null,
            [FromQuery] string? courseStartDate = null,
            [FromQuery] string? courseEndDate = null)
        {
            try
            {
                var totalApplicants = await context.Persons.CountAsync();
                
                var today = DateTime.UtcNow.Date;
                var tomorrow = today.AddDays(1);
                var startOfMonth = new DateTime(today.Year, today.Month, 1);

                // Today registrations
                var todayApplicants = await context.PersonRegistrations
                    .Where(r => r.start_time != null && r.start_time.Value >= today && r.start_time.Value < tomorrow)
                    .Select(r => r.NationId)
                    .Distinct()
                    .CountAsync();

                var thisMonthApplicants = await context.PersonRegistrations
                    .Where(r => r.start_time != null && r.start_time.Value >= startOfMonth)
                    .Select(r => r.NationId)
                    .Distinct()
                    .CountAsync();

                var confirmedCount = await context.PersonRegistrations
                    .Where(r => r.confirmed == true)
                    .Select(r => r.NationId)
                    .Distinct()
                    .CountAsync();

                var pendingCount = totalApplicants - confirmedCount;
                if (pendingCount < 0) pendingCount = 0;

                // License Type Breakdown
                var agentCount = await context.PersonLicenses
                    .Where(l => l.CourseType != null && (l.CourseType.ToLower().Contains("agent") || l.CourseType.Contains("ตัวแทน")))
                    .Select(l => l.NationId)
                    .Distinct()
                    .CountAsync();

                var brokerCount = await context.PersonLicenses
                    .Where(l => l.CourseType != null && (l.CourseType.ToLower().Contains("broker") || l.CourseType.Contains("นายหน้า")))
                    .Select(l => l.NationId)
                    .Distinct()
                    .CountAsync();

                // Course & Subject Distribution (สัดส่วนแยกตามวิชา / หลักสูตร พร้อม Filter ช่วงวันที่)
                var renewBasics = await context.RenewBasics.ToListAsync();
                var basicDict = renewBasics.ToDictionary(b => b.Id, b => b.CourseName ?? $"หลักสูตร {b.Id}");

                var renewOthers = await context.RenewOthers.ToListAsync();
                var renewCourses = await context.RenewCourses.ToListAsync();
                var renewPillars = await context.RenewPillars.ToListAsync();
                var renewDates = await context.RenewDates.ToListAsync();

                var allPersonCourses = await context.PersonCourses.ToListAsync();
                
                // Filter by Course Date Range if specified
                int baseApplicantsForPercentage = totalApplicants;
                if (DateTime.TryParse(courseStartDate, out var cStart) && DateTime.TryParse(courseEndDate, out var cEnd))
                {
                    cStart = cStart.Date;
                    var cEndNext = cEnd.Date.AddDays(1);
                    var filteredNations = await context.PersonRegistrations
                        .Where(r => r.start_time != null && r.start_time.Value >= cStart && r.start_time.Value < cEndNext)
                        .Select(r => r.NationId)
                        .Distinct()
                        .ToListAsync();

                    allPersonCourses = allPersonCourses.Where(pc => filteredNations.Contains(pc.NationId)).ToList();
                    baseApplicantsForPercentage = filteredNations.Count;
                }

                var subjectGroups = new Dictionary<string, (string Name, HashSet<string> Nations)>();

                foreach (var pc in allPersonCourses)
                {
                    if (string.IsNullOrEmpty(pc.NationId)) continue;
                    string? sKey = null;
                    string? sName = null;

                    if (pc.RenewOtherId.HasValue)
                    {
                        sKey = $"subj_{pc.RenewOtherId.Value}";
                        var ro = renewOthers.FirstOrDefault(x => x.Id == pc.RenewOtherId.Value);
                        if (ro != null)
                        {
                            var sObj = renewCourses.FirstOrDefault(c => c.Id == ro.SubjectId);
                            var pObj = renewPillars.FirstOrDefault(p => p.Id == ro.PillarId);
                            sName = !string.IsNullOrEmpty(pObj?.Name) ? $"[{pObj.Name}] {sObj?.Name ?? $"วิชา {ro.SubjectId}"}" : (sObj?.Name ?? $"วิชา {ro.SubjectId}");
                        }
                        else
                        {
                            var sObj = renewCourses.FirstOrDefault(c => c.Id == pc.RenewOtherId.Value);
                            sName = sObj?.Name ?? $"วิชาที่ {pc.RenewOtherId.Value}";
                        }
                    }
                    else if (pc.CourseId.HasValue)
                    {
                        sKey = $"course_{pc.CourseId.Value}";
                        if (basicDict.ContainsKey(pc.CourseId.Value))
                        {
                            sName = basicDict[pc.CourseId.Value];
                        }
                        else
                        {
                            var sObj = renewCourses.FirstOrDefault(c => c.Id == pc.CourseId.Value);
                            sName = sObj?.Name ?? $"หลักสูตรที่ {pc.CourseId.Value}";
                        }
                    }
                    else if (pc.CourseDateId.HasValue)
                    {
                        sKey = $"date_{pc.CourseDateId.Value}";
                        sName = renewDates.FirstOrDefault(d => d.Id == pc.CourseDateId.Value)?.CourseDateDisplay ?? $"รอบอบรม {pc.CourseDateId.Value}";
                    }

                    if (!string.IsNullOrEmpty(sKey) && !string.IsNullOrEmpty(sName))
                    {
                        if (!subjectGroups.ContainsKey(sKey))
                        {
                            subjectGroups[sKey] = (sName, new HashSet<string>());
                        }
                        subjectGroups[sKey].Nations.Add(pc.NationId);
                    }
                }

                var courseDistribution = subjectGroups.Select(sg => new
                {
                    courseId = sg.Key,
                    courseName = sg.Value.Name,
                    count = sg.Value.Nations.Count,
                    percentage = baseApplicantsForPercentage > 0 ? Math.Round((double)sg.Value.Nations.Count * 100 / baseApplicantsForPercentage, 1) : 0
                }).OrderByDescending(x => x.count).ToList();

                // Daily Trend (รองรับการเลือกช่วงวันที่ และ Scroll เลื่อนดู)
                DateTime tStart = today.AddDays(-29);
                DateTime tEnd = today;

                if (DateTime.TryParse(trendStartDate, out var parsedTStart)) tStart = parsedTStart.Date;
                if (DateTime.TryParse(trendEndDate, out var parsedTEnd)) tEnd = parsedTEnd.Date;

                if (tEnd < tStart)
                {
                    var temp = tStart;
                    tStart = tEnd;
                    tEnd = temp;
                }

                // Max 180 days range
                if ((tEnd - tStart).TotalDays > 180)
                {
                    tStart = tEnd.AddDays(-180);
                }

                var daysCount = (int)(tEnd - tStart).TotalDays + 1;
                var daysList = Enumerable.Range(0, daysCount)
                    .Select(i => tStart.AddDays(i))
                    .ToList();

                var tEndNext = tEnd.AddDays(1);
                var regDatesRaw = await context.PersonRegistrations
                    .Where(r => r.start_time != null && r.start_time.Value >= tStart && r.start_time.Value < tEndNext)
                    .Select(r => new { r.NationId, Date = r.start_time!.Value.Date })
                    .ToListAsync();

                var thaiMonths = new[] { "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." };

                var dailyTrend = daysList.Select(d => {
                    var count = regDatesRaw.Where(r => r.Date == d).Select(r => r.NationId).Distinct().Count();
                    var label = $"{d.Day} {thaiMonths[d.Month]}";
                    return new {
                        Date = d.ToString("yyyy-MM-dd"),
                        Label = label,
                        Count = count
                    };
                }).ToList();

                // Recent Registrations (latest 7)
                var recentRegs = await context.PersonRegistrations
                    .Where(r => r.start_time != null)
                    .OrderByDescending(r => r.start_time)
                    .Take(20)
                    .ToListAsync();

                var recentNationIds = recentRegs.Select(r => r.NationId).Where(n => !string.IsNullOrEmpty(n)).Distinct().Take(7).ToList();

                var recentPersons = await context.Persons
                    .Where(p => recentNationIds.Contains(p.NationId))
                    .ToListAsync();

                var recentCourses = await context.PersonCourses
                    .Where(c => recentNationIds.Contains(c.NationId))
                    .ToListAsync();

                var recentRegistrations = recentNationIds.Select(nid => {
                    var p = recentPersons.FirstOrDefault(x => x.NationId == nid);
                    var reg = recentRegs.FirstOrDefault(r => r.NationId == nid);
                    var crs = recentCourses.Where(c => c.NationId == nid).OrderByDescending(c => c.PersonCourseId).FirstOrDefault();
                    string? cName = null;
                    if (crs?.RenewOtherId.HasValue == true)
                    {
                        var ro = renewOthers.FirstOrDefault(x => x.Id == crs.RenewOtherId.Value);
                        if (ro != null)
                        {
                            var sObj = renewCourses.FirstOrDefault(c => c.Id == ro.SubjectId);
                            var pObj = renewPillars.FirstOrDefault(p => p.Id == ro.PillarId);
                            cName = !string.IsNullOrEmpty(pObj?.Name) ? $"[{pObj.Name}] {sObj?.Name ?? $"วิชา {ro.SubjectId}"}" : (sObj?.Name ?? $"วิชา {ro.SubjectId}");
                        }
                        else
                        {
                            var sObj = renewCourses.FirstOrDefault(c => c.Id == crs.RenewOtherId.Value);
                            cName = sObj?.Name ?? $"วิชาที่ {crs.RenewOtherId.Value}";
                        }
                    }
                    else if (crs?.CourseId.HasValue == true && basicDict.ContainsKey(crs.CourseId.Value))
                    {
                        cName = basicDict[crs.CourseId.Value];
                    }

                    return new {
                        NationId = nid,
                        Name = p != null ? $"{p.FirstNameTh} {p.LastNameTh}".Trim() : "-",
                        CourseName = cName ?? "ไม่ระบุหลักสูตร/วิชา",
                        Date = reg?.start_time?.ToString("yyyy-MM-dd HH:mm") ?? "-",
                        Confirmed = reg?.confirmed ?? false,
                        Phone = p?.PhoneOtp ?? "-"
                    };
                }).ToList();

            // Training Results Analytics from trn_training_result
            var trainingResults = await context.TrainingResults.ToListAsync();
            var totalTrainingRecords = trainingResults.Count;
            var passedResults = trainingResults.Where(r => IsTrainingPassed(r.TrainingStatus)).ToList();
            var failedResults = trainingResults.Where(r => !IsTrainingPassed(r.TrainingStatus)).ToList();
            var totalPassedCount = passedResults.Count;
            var totalFailedCount = failedResults.Count;
            var overallPassRate = totalTrainingRecords > 0 ? Math.Round((double)totalPassedCount * 100 / totalTrainingRecords, 1) : 0;
            var totalUniquePassedTrainees = passedResults.Select(r => r.NationId).Where(n => !string.IsNullOrEmpty(n)).Distinct().Count();
            var totalUniqueTrainingTrainees = trainingResults.Select(r => r.NationId).Where(n => !string.IsNullOrEmpty(n)).Distinct().Count();
            var mismatchCount = trainingResults.Count(r => r.IsDataMismatch == "Y");

            // Group by Course Code + Course Name + Training Date Display (วิชาไหนที่ลงวันไหนผ่าน)
            var courseDateCompletion = trainingResults
                .GroupBy(r => new {
                    CourseCode = r.TrainingCourseCode ?? "UNKNOWN",
                    CourseName = r.TrainingCourseName ?? "-",
                    DateDisplay = r.TrainingDateDisplay ?? "-"
                })
                .Select(g => {
                    var total = g.Count();
                    var passed = g.Count(r => IsTrainingPassed(r.TrainingStatus));
                    var failed = g.Count(r => !IsTrainingPassed(r.TrainingStatus));
                    var rate = total > 0 ? Math.Round((double)passed * 100 / total, 1) : 0;
                    return new {
                        courseCode = g.Key.CourseCode,
                        courseName = g.Key.CourseName,
                        trainingDate = g.Key.DateDisplay,
                        totalEnrolled = total,
                        passedCount = passed,
                        failedCount = failed,
                        passRatePercent = rate,
                        mismatchCount = g.Count(r => r.IsDataMismatch == "Y"),
                        lastStampDate = g.Max(r => r.StampDate).ToString("yyyy-MM-dd HH:mm")
                    };
                })
                .OrderByDescending(x => x.trainingDate)
                .ThenBy(x => x.courseCode)
                .ToList();

            // Recent 15 Training Results with Trainee Details
            var recentTrainingStamps = trainingResults
                .OrderByDescending(r => r.StampDate)
                .Take(15)
                .Select(r => new {
                    id = r.Id,
                    nationId = r.NationId,
                    traineeName = !string.IsNullOrEmpty(r.VerifiedFirstNameTh) 
                        ? $"{r.VerifiedTitleTh}{r.VerifiedFirstNameTh} {r.VerifiedLastNameTh}".Trim()
                        : "-",
                    licenseNo = r.VerifiedLicenseNo ?? r.OriginalLicenseNo ?? "-",
                    courseCode = r.TrainingCourseCode ?? "-",
                    courseName = r.TrainingCourseName ?? "-",
                    trainingDate = r.TrainingDateDisplay ?? "-",
                    trainingStatus = r.TrainingStatus ?? "-",
                    isPassed = IsTrainingPassed(r.TrainingStatus),
                    progressPercent = r.ProgressPercent ?? "-",
                    scorePercent = r.ScorePercent ?? "-",
                    stampDate = r.StampDate.ToString("yyyy-MM-dd HH:mm"),
                    isMismatch = r.IsDataMismatch == "Y"
                })
                .ToList();

            // 2-Perspective Course & Multi-Round Analytics (สรุปรายวิชา และ เจาะลึกรายรอบ)
            var courseHierarchyAnalytics = trainingResults
                .GroupBy(r => {
                    var name = !string.IsNullOrWhiteSpace(r.TrainingCourseName) ? r.TrainingCourseName.Trim() : (r.TrainingCourseCode ?? "ไม่ระบุวิชา");
                    return name;
                })
                .Select(cg => {
                    var courseName = cg.Key;
                    var courseCodes = cg.Select(r => r.TrainingCourseCode).Where(c => !string.IsNullOrEmpty(c)).Distinct().ToList();
                    var courseCodeDisplay = string.Join(", ", courseCodes);
                    
                    var totalEnrolled = cg.Count();
                    var totalPassed = cg.Count(r => IsTrainingPassed(r.TrainingStatus));
                    var totalFailed = cg.Count(r => !IsTrainingPassed(r.TrainingStatus));
                    var overallPassRate = totalEnrolled > 0 ? Math.Round((double)totalPassed * 100 / totalEnrolled, 1) : 0;

                    // Group by Training Date (Rounds)
                    var rounds = cg
                        .GroupBy(r => r.TrainingDateDisplay ?? "-")
                        .Select((rg, rIdx) => {
                            var rEnrolled = rg.Count();
                            var rPassed = rg.Count(r => IsTrainingPassed(r.TrainingStatus));
                            var rFailed = rg.Count(r => !IsTrainingPassed(r.TrainingStatus));
                            var rPassRate = rEnrolled > 0 ? Math.Round((double)rPassed * 100 / rEnrolled, 1) : 0;
                            var rCodes = string.Join(", ", rg.Select(r => r.TrainingCourseCode).Where(c => !string.IsNullOrEmpty(c)).Distinct());

                            return new {
                                roundDate = rg.Key,
                                courseCodes = rCodes,
                                enrolledCount = rEnrolled,
                                passedCount = rPassed,
                                failedCount = rFailed,
                                passRatePercent = rPassRate,
                                lastStampDate = rg.Max(r => r.StampDate).ToString("yyyy-MM-dd HH:mm"),
                                mismatchCount = rg.Count(r => r.IsDataMismatch == "Y")
                            };
                        })
                        .OrderBy(r => r.roundDate)
                        .ToList();

                    return new {
                        courseName,
                        courseCode = courseCodeDisplay,
                        courseCodes,
                        totalRounds = rounds.Count,
                        totalEnrolled,
                        totalPassed,
                        totalFailed,
                        overallPassRate,
                        rounds
                    };
                })
                .OrderByDescending(c => c.totalEnrolled)
                .ThenByDescending(c => c.totalPassed)
                .ToList();

            var trainingOverview = new
            {
                totalTrainingRecords,
                totalPassedCount,
                totalFailedCount,
                overallPassRate,
                totalUniquePassedTrainees,
                totalUniqueTrainingTrainees,
                mismatchCount,
                totalCourseDateRounds = courseDateCompletion.Count,
                totalCoursesCount = courseHierarchyAnalytics.Count
            };

                return Ok(new
                {
                    totalApplicants,
                    todayApplicants,
                    thisMonthApplicants,
                    confirmedCount,
                    pendingCount,
                    agentCount,
                    brokerCount,
                    courseDistribution,
                    dailyTrend,
                    recentRegistrations,
                    trainingOverview,
                    courseDateCompletion,
                    courseHierarchyAnalytics,
                    recentTrainingStamps
                });
            }
            catch (Exception ex)
            {
                Serilog.Log.Error(ex, "Error in GetDashboardStats: {Message}", ex.Message);
                return StatusCode(500, new { message = "Error loading dashboard stats: " + ex.Message });
            }
        }

        [HttpGet("trainee-training-status")]
        public async Task<IActionResult> GetTraineeTrainingStatus(
            [FromServices] AppDbContext context,
            [FromQuery] string? search = null)
        {
            if (string.IsNullOrWhiteSpace(search))
            {
                return Ok(new List<object>());
            }

            var cleanSearch = search.Trim();
            var query = context.Persons
                .Include(p => p.Registrations)
                .Include(p => p.Licenses)
                .Include(p => p.Courses)
                .Include(p => p.TrainingResults)
                .AsQueryable();

            query = query.Where(p => 
                p.NationId.Contains(cleanSearch) || 
                (p.FirstNameTh != null && p.FirstNameTh.Contains(cleanSearch)) || 
                (p.LastNameTh != null && p.LastNameTh.Contains(cleanSearch)) || 
                p.Licenses.Any(l => l.LicenseNo != null && l.LicenseNo.Contains(cleanSearch)) ||
                p.TrainingResults.Any(t => (t.VerifiedLicenseNo != null && t.VerifiedLicenseNo.Contains(cleanSearch)) || (t.OriginalLicenseNo != null && t.OriginalLicenseNo.Contains(cleanSearch)))
            );

            var renewBasics = await context.RenewBasics.ToListAsync();
            var basicDict = renewBasics.ToDictionary(b => b.Id, b => b.CourseName ?? $"หลักสูตร {b.Id}");
            var renewCourses = await context.RenewCourses.ToListAsync();
            var renewOthers = await context.RenewOthers.ToListAsync();
            var renewPillars = await context.RenewPillars.ToListAsync();
            var renewDates = await context.RenewDates.ToListAsync();

            var persons = await query.Take(20).ToListAsync();

            var result = persons.Select(p => {
                var reg = p.Registrations.OrderByDescending(r => r.Id).FirstOrDefault();
                var lic = p.Licenses.FirstOrDefault();
                
                var coursesList = p.Courses.Select(pc => {
                    string? cName = null;
                    string? cDate = null;
                    if (pc.CourseDateId.HasValue)
                    {
                        cDate = renewDates.FirstOrDefault(d => d.Id == pc.CourseDateId.Value)?.CourseDateDisplay;
                    }

                    if (pc.RenewOtherId.HasValue)
                    {
                        var ro = renewOthers.FirstOrDefault(x => x.Id == pc.RenewOtherId.Value);
                        if (ro != null)
                        {
                            var sObj = renewCourses.FirstOrDefault(c => c.Id == ro.SubjectId);
                            var pObj = renewPillars.FirstOrDefault(pl => pl.Id == ro.PillarId);
                            cName = !string.IsNullOrEmpty(pObj?.Name) ? $"[{pObj.Name}] {sObj?.Name ?? $"วิชา {ro.SubjectId}"}" : (sObj?.Name ?? $"วิชา {ro.SubjectId}");
                        }
                    }
                    else if (pc.CourseId.HasValue && basicDict.ContainsKey(pc.CourseId.Value))
                    {
                        cName = basicDict[pc.CourseId.Value];
                    }

                    return new {
                        courseId = pc.CourseId,
                        renewOtherId = pc.RenewOtherId,
                        courseDateId = pc.CourseDateId,
                        courseName = cName ?? "วิชาที่ลงทะเบียน",
                        courseDateDisplay = cDate ?? "-"
                    };
                }).ToList();

                var trainingResultsList = p.TrainingResults.Select(tr => new {
                    id = tr.Id,
                    courseCode = tr.TrainingCourseCode ?? "-",
                    courseName = tr.TrainingCourseName ?? "-",
                    trainingDate = tr.TrainingDateDisplay ?? "-",
                    status = tr.TrainingStatus ?? "-",
                    isPassed = IsTrainingPassed(tr.TrainingStatus),
                    progressPercent = tr.ProgressPercent,
                    scorePercent = tr.ScorePercent,
                    stampDate = tr.StampDate.ToString("yyyy-MM-dd HH:mm"),
                    verifiedName = $"{tr.VerifiedTitleTh}{tr.VerifiedFirstNameTh} {tr.VerifiedLastNameTh}".Trim(),
                    verifiedLicenseNo = tr.VerifiedLicenseNo
                }).OrderByDescending(tr => tr.id).ToList();

                return new {
                    nationId = p.NationId,
                    fullName = $"{p.TitleTh}{p.FirstNameTh} {p.LastNameTh}".Trim(),
                    licenseNo = lic?.LicenseNo ?? "-",
                    phone = p.PhoneOtp ?? "-",
                    registeredDate = reg?.start_time?.ToString("yyyy-MM-dd HH:mm") ?? "-",
                    confirmed = reg?.confirmed ?? false,
                    registeredCourses = coursesList,
                    trainingResults = trainingResultsList,
                    totalPassed = trainingResultsList.Count(tr => tr.isPassed),
                    totalResults = trainingResultsList.Count
                };
            }).ToList();

            return Ok(result);
        }

        [HttpGet("trainees")]
        public async Task<IActionResult> GetTrainees(
            [FromServices] AppDbContext context,
            [FromQuery] string? search,
            [FromQuery] string? idRanges,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string sortBy = "date",
            [FromQuery] string sortDir = "desc")
        {
            var caller = GetCallerInfo(context);

            var query = context.Persons
                .Include(p => p.Registrations)
                .Include(p => p.Licenses)
                .Include(p => p.Addresses)
                .Include(p => p.Affiliations)
                .Include(p => p.Courses)
                .Include(p => p.RegistrationHistories)
                .AsQueryable();

            // Strict Scope: If caller is Applicant, force filter to ONLY their own record!
            if (caller.Role?.ToLower() == "applicant")
            {
                var cleanNationId = caller.NationId?.Replace("-", "");
                if (!string.IsNullOrEmpty(cleanNationId))
                {
                    query = query.Where(p => p.NationId == cleanNationId);
                }
                else if (!string.IsNullOrEmpty(caller.Email))
                {
                    var email = caller.Email.ToLower();
                    query = query.Where(p => p.EmailAlt != null && p.EmailAlt.ToLower() == email);
                }
            }

            if (!string.IsNullOrEmpty(search))
            {
                var s = search.ToLower().Trim().Replace("สาขา ", "สาขา").Replace("ภาค ", "ภาค");
                var sNoSpace = s.Replace(" ", "");
                
                int? minAge = null;
                int? maxAge = null;
                var parts = s.Split('-');
                if (parts.Length == 2 && int.TryParse(parts[0].Trim(), out int min) && int.TryParse(parts[1].Trim(), out int max))
                {
                    minAge = min;
                    maxAge = max;
                }

                query = query.Where(p => 
                    (p.FirstNameTh != null && p.FirstNameTh.ToLower().Contains(s)) ||
                    (p.LastNameTh != null && p.LastNameTh.ToLower().Contains(s)) ||
                    (p.NationId != null && p.NationId.Contains(s)) ||
                    (p.PhoneOtp != null && p.PhoneOtp.Contains(s)) ||
                    (p.EmailAlt != null && p.EmailAlt.ToLower().Contains(s)) ||
                    (p.LineId != null && p.LineId.ToLower().Contains(s)) ||
                    
                    (s == "ชาย" && p.GenderId == 1) ||
                    (s == "หญิง" && p.GenderId == 2) ||

                    (minAge.HasValue && maxAge.HasValue && p.BirthDate.HasValue && 
                     (DateTime.Now.Year - p.BirthDate.Value.Year) >= minAge.Value && 
                     (DateTime.Now.Year - p.BirthDate.Value.Year) <= maxAge.Value) ||

                    p.Licenses.Any(l => (l.LicenseNo != null && l.LicenseNo.ToLower().Contains(s)) || (l.CourseType != null && l.CourseType.ToLower().Contains(s))) ||
                    
                    p.Affiliations.Any(a => 
                        (a.BrokerBranch != null && a.BrokerBranch.ToLower().Contains(s)) || 
                        (a.BrokerType != null && a.BrokerType.ToLower().Contains(s))
                    ) ||
                    
                    context.Provinces.Any(pv => p.Addresses.Any(a => a.AddressType == "A" && a.ProvinceId == pv.Id) && pv.ProvinceThai != null && pv.ProvinceThai.ToLower().Contains(s)) ||
                    
                    context.AgentRegions.Any(r => p.Affiliations.Any(a => a.RegionId == r.Id) && r.Name != null && r.Name.ToLower().Replace(" ", "").Contains(sNoSpace)) ||
                    
                    context.AgentBranches.Any(ab => p.Affiliations.Any(a => a.BranchId == ab.Id) && ab.Name != null && ("สาขา" + ab.Name.ToLower()).Contains(s)) ||

                    context.RenewBasics.Any(rb => p.Courses.Any(c => c.CourseId == rb.Id) && rb.CourseName != null && rb.CourseName.ToLower().Contains(s)) ||
                    
                    context.RenewDates.Any(rd => p.Courses.Any(c => c.CourseDateId == rd.Id) && rd.CourseDateDisplay != null && rd.CourseDateDisplay.ToLower().Contains(s))
                );
            }

            var personsList = await query.ToListAsync();

            if (!string.IsNullOrEmpty(idRanges))
            {
                var ranges = idRanges.Split(',', StringSplitOptions.RemoveEmptyEntries);
                var validRecords = new List<Person>();
                foreach (var person in personsList)
                {
                    bool match = false;
                    foreach (var rangeStr in ranges)
                    {
                        var cleanStr = rangeStr.Replace("{", "").Replace("}", "").Trim();
                        var subParts = cleanStr.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                        
                        foreach (var subPart in subParts)
                        {
                            var parts = subPart.Split('-');
                            if (parts.Length == 2 && int.TryParse(parts[0], out int min) && int.TryParse(parts[1], out int max))
                            {
                                if (person.Registrations.Any(r => r.Id >= min && r.Id <= max)) { match = true; break; }
                            }
                            else if (parts.Length == 1 && int.TryParse(parts[0], out int eq))
                            {
                                if (person.Registrations.Any(r => r.Id == eq)) { match = true; break; }
                            }
                        }
                        if (match) break;
                    }
                    if (match) validRecords.Add(person);
                }
                personsList = validRecords;
            }

            var total = personsList.Count;

            var renewBasicsDict = await context.RenewBasics.ToDictionaryAsync(rb => rb.Id, rb => rb.CourseName);
            var renewDatesDict = await context.RenewDates.ToDictionaryAsync(rd => rd.Id, rd => rd.CourseDateDisplay);

            var projectedList = personsList.Select(p => {
                var latestRegistration = p.Registrations.OrderByDescending(r => r.Id).FirstOrDefault();
                var latestLicense = p.Licenses.OrderByDescending(l => l.Id).FirstOrDefault();
                var latestCourse = p.Courses.OrderByDescending(c => c.PersonCourseId).FirstOrDefault();
                
                var renewCourseName = latestCourse?.CourseId != null && renewBasicsDict.ContainsKey(latestCourse.CourseId.Value) ? renewBasicsDict[latestCourse.CourseId.Value] : null;
                var renewDateDisplay = latestCourse?.CourseDateId != null && renewDatesDict.ContainsKey(latestCourse.CourseDateId.Value) ? renewDatesDict[latestCourse.CourseDateId.Value] : null;

                return new
                {
                    RegistrationId = latestRegistration?.Id,
                    NationId = p.NationId,
                    Name = $"{p.FirstNameTh} {p.LastNameTh}",
                    IdCard = p.NationId,
                    Course = renewCourseName ?? latestLicense?.CourseType ?? "ไม่ระบุ",
                    Date = renewDateDisplay ?? latestRegistration?.start_time?.ToString("yyyy-MM-dd") ?? "",
                    Status = (latestRegistration?.confirmed ?? false) ? "ยืนยันแล้ว" : "รอยืนยัน",
                    
                    HistoryRegistrations = p.Registrations.OrderByDescending(r => r.Id).Select(r => new { r.Id, r.start_time, r.confirmed }).ToList(),
                    HistoryCourses = p.Courses.OrderByDescending(c => c.PersonCourseId).Select(c => {
                        var rcName = c.CourseId != null && renewBasicsDict.ContainsKey(c.CourseId.Value) ? renewBasicsDict[c.CourseId.Value] : null;
                        var rdDisplay = c.CourseDateId != null && renewDatesDict.ContainsKey(c.CourseDateId.Value) ? renewDatesDict[c.CourseDateId.Value] : null;
                        return new { c.PersonCourseId, CourseName = rcName, DateDisplay = rdDisplay };
                    }).ToList(),
                    Transactions = p.RegistrationHistories.OrderByDescending(h => h.Id).Select(h => new {
                        Id = h.Id,
                        CreatedAt = h.CreatedAt?.ToString("yyyy-MM-dd HH:mm:ss"),
                        NewData = h.NewData
                    }).ToList()
                };
            });

            if (sortDir.ToLower() == "desc") {
                projectedList = sortBy.ToLower() switch {
                    "registrationid" => projectedList.OrderByDescending(x => x.RegistrationId),
                    "name" => projectedList.OrderByDescending(x => x.Name),
                    "idcard" => projectedList.OrderByDescending(x => x.IdCard),
                    "course" => projectedList.OrderByDescending(x => x.Course),
                    "date" => projectedList.OrderByDescending(x => x.Date),
                    "status" => projectedList.OrderByDescending(x => x.Status),
                    _ => projectedList.OrderByDescending(x => x.Date)
                };
            } else {
                projectedList = sortBy.ToLower() switch {
                    "registrationid" => projectedList.OrderBy(x => x.RegistrationId),
                    "name" => projectedList.OrderBy(x => x.Name),
                    "idcard" => projectedList.OrderBy(x => x.IdCard),
                    "course" => projectedList.OrderBy(x => x.Course),
                    "date" => projectedList.OrderBy(x => x.Date),
                    "status" => projectedList.OrderBy(x => x.Status),
                    _ => projectedList.OrderBy(x => x.Date)
                };
            }

            var pagedData = projectedList
                .Skip(pageSize > 0 ? (page - 1) * pageSize : 0)
                .Take(pageSize > 0 ? pageSize : Math.Max(1, total))
                .ToList();

            return Ok(new { data = pagedData, total, page, pageSize = pageSize > 0 ? pageSize : total });
        }

        [HttpGet("trainees/{nationId}/full")]
        public async Task<IActionResult> GetTraineeFull(string nationId, [FromServices] AppDbContext context)
        {
            var p = await context.Persons
                .Include(x => x.Registrations)
                .Include(x => x.Licenses)
                .Include(x => x.Addresses)
                .Include(x => x.Affiliations)
                .Include(x => x.Courses)
                .Include(x => x.Trainings)
                .Include(x => x.Others).ThenInclude(o => o.SalesAreas)
                .Include(x => x.Others).ThenInclude(o => o.OtherCompanies)
                .Include(x => x.Others).ThenInclude(o => o.Specialties)
                .FirstOrDefaultAsync(x => x.NationId == nationId);
                
            if (p == null) return NotFound();
            
            return Ok(p);
        }

        [HttpPut("trainees/{nationId}")]
        public async Task<IActionResult> UpdateTraineeFull(string nationId, [FromBody] Person updatedPerson, [FromServices] AppDbContext context)
        {
            var caller = GetCallerInfo(context);

            // If caller is Applicant, ensure they can ONLY edit their own nationId
            if (caller.Role?.ToLower() == "applicant")
            {
                var cleanCallerNationId = caller.NationId?.Replace("-", "");
                var cleanTargetNationId = nationId.Replace("-", "");
                if (cleanCallerNationId != cleanTargetNationId)
                {
                    return StatusCode(403, new { message = "ผู้สมัครสามารถแก้ไขได้เฉพาะข้อมูลของตนเองเท่านั้น" });
                }
            }

            var p = await context.Persons
                .Include(x => x.Registrations)
                .Include(x => x.Licenses)
                .Include(x => x.Addresses)
                .Include(x => x.Affiliations)
                .Include(x => x.Courses)
                .Include(x => x.Trainings)
                .Include(x => x.Others).ThenInclude(o => o.SalesAreas)
                .Include(x => x.Others).ThenInclude(o => o.OtherCompanies)
                .Include(x => x.Others).ThenInclude(o => o.Specialties)
                .FirstOrDefaultAsync(x => x.NationId == nationId);
                
            if (p == null) return NotFound();

            if (updatedPerson.Licenses != null)
            {
                foreach (var lItem in updatedPerson.Licenses)
                {
                    if (!string.IsNullOrWhiteSpace(lItem.LicenseNo))
                    {
                        var cleanLic = lItem.LicenseNo.Trim();
                        if (!System.Text.RegularExpressions.Regex.IsMatch(cleanLic, @"^\d{2}(02|04|06)\d{6}$"))
                        {
                            return BadRequest(new { message = "เลขที่ใบอนุญาตต้องเป็นตัวเลข 10 หลัก และหลักที่ 3 และ 4 ต้องเป็น 02, 04 หรือ 06 เท่านั้น" });
                        }
                    }
                }
            }

            // 1. Snapshot OLD Data for History
            var oldSnapshotDict = BuildPersonSnapshotDict(p, "ก่อนแก้ไขข้อมูลผู้สมัคร/ผู้อบรม");

            // 2. Update scalar fields of Person
            context.Entry(p).CurrentValues.SetValues(updatedPerson);
            
            // Registrations
            foreach(var r in updatedPerson.Registrations) {
                var existing = p.Registrations.FirstOrDefault(e => e.Id == r.Id);
                if (existing != null) context.Entry(existing).CurrentValues.SetValues(r);
            }
            
            // Licenses
            foreach(var l in updatedPerson.Licenses) {
                var existing = p.Licenses.FirstOrDefault(e => e.Id == l.Id);
                if (existing != null) context.Entry(existing).CurrentValues.SetValues(l);
            }

            // Addresses
            context.PersonAddresses.RemoveRange(p.Addresses);
            if (updatedPerson.Addresses != null) {
                foreach(var a in updatedPerson.Addresses) {
                    a.Id = 0;
                    a.NationId = nationId;
                    p.Addresses.Add(a);
                }
            }
            
            // Affiliations
            context.PersonAffiliations.RemoveRange(p.Affiliations);
            if (updatedPerson.Affiliations != null) {
                foreach(var a in updatedPerson.Affiliations) {
                    a.Id = 0;
                    a.NationId = nationId;
                    p.Affiliations.Add(a);
                }
            }

            // Registrations
            if (updatedPerson.Registrations != null && updatedPerson.Registrations.Any()) {
                var firstReg = updatedPerson.Registrations.First();
                var existing = p.Registrations?.FirstOrDefault();
                if (existing != null) {
                    existing.DeductionPrivilege = firstReg.DeductionPrivilege;
                    existing.MasterDegreeStatus = firstReg.MasterDegreeStatus;
                } else {
                    firstReg.Id = 0;
                    firstReg.NationId = nationId;
                    p.Registrations.Add(firstReg);
                }
            }
            
            // Courses
            context.PersonCourses.RemoveRange(p.Courses);
            if (updatedPerson.Courses != null) {
                foreach(var c in updatedPerson.Courses) {
                    c.PersonCourseId = 0; // Ensure EF treats as new
                    c.NationId = nationId;
                    p.Courses.Add(c);
                }
            }

            // Trainings (5y)
            context.PersonTrainings5y.RemoveRange(p.Trainings);
            if (updatedPerson.Trainings != null) {
                foreach(var t in updatedPerson.Trainings) {
                    t.Id = 0;
                    t.NationId = nationId;
                    p.Trainings.Add(t);
                }
            }

            // Others
            foreach(var other in p.Others) {
                context.PersonOtherSalesAreas.RemoveRange(other.SalesAreas);
                context.PersonOtherCompanies.RemoveRange(other.OtherCompanies);
                context.PersonOtherSpecialties.RemoveRange(other.Specialties);
            }
            context.PersonOthers.RemoveRange(p.Others);

            if (updatedPerson.Others != null) {
                foreach(var other in updatedPerson.Others) {
                    other.id = 0;
                    other.NationId = nationId;
                    
                    if (other.SalesAreas != null) {
                        foreach(var sa in other.SalesAreas) { sa.Id = 0; }
                    }
                    if (other.OtherCompanies != null) {
                        foreach(var oc in other.OtherCompanies) { oc.Id = 0; }
                    }
                    if (other.Specialties != null) {
                        foreach(var sp in other.Specialties) { sp.Id = 0; }
                    }
                    
                    p.Others.Add(other);
                }
            }

            // 3. Record RegisterHistory & RegistrationHistoryModel
            var newSnapshotDict = BuildPersonSnapshotDict(p, "แก้ไขข้อมูลผู้สมัคร/ผู้อบรม");

            var jsonOptions = new System.Text.Json.JsonSerializerOptions
            {
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                WriteIndented = false
            };

            var oldHistoryJson = JsonSerializer.Serialize(oldSnapshotDict, jsonOptions);
            var newHistoryJson = JsonSerializer.Serialize(newSnapshotDict, jsonOptions);

            var regId = p.Registrations.FirstOrDefault()?.Id ?? 0;
            var historyRecord = new RegisterHistory
            {
                RegisterId = regId,
                EditedByType = caller.Role?.ToLower() ?? "applicant",
                CreatedBy = caller.Username ?? "user",
                OldData = oldHistoryJson,
                NewData = newHistoryJson,
                CreatedAt = DateTime.UtcNow
            };
            context.RegisterHistories.Add(historyRecord);

            var historyRecordNew = new RegistrationHistoryModel
            {
                RegisterId = regId,
                NationId = nationId,
                EditedByType = caller.Role?.ToLower() ?? "applicant",
                CreatedBy = caller.Username ?? "user",
                OldData = oldHistoryJson,
                NewData = newHistoryJson,
                CreatedAt = DateTime.UtcNow
            };
            context.RegistrationHistoriesNew.Add(historyRecordNew);

            // 5. Sync with admin_users if corresponding user exists
            var matchedUser = await context.Users.FirstOrDefaultAsync(u => u.NationId == nationId || (u.Email != null && u.Email.ToLower() == p.EmailAlt.ToLower()));
            if (matchedUser != null)
            {
                if (!string.IsNullOrEmpty(p.FirstNameTh)) matchedUser.FullName = $"{p.FirstNameTh} {p.LastNameTh}".Trim();
                if (!string.IsNullOrEmpty(p.PhoneOtp)) matchedUser.Phone = p.PhoneOtp;
                if (!string.IsNullOrEmpty(p.EmailAlt)) matchedUser.Email = p.EmailAlt;
                matchedUser.UpdatedAt = DateTime.UtcNow;
            }

            await context.SaveChangesAsync();
            return Ok(p);
        }

        // [Authorize(Roles = "Admin")] // Only full admins can delete
        [HttpDelete("trainees/{id}")]
        public async Task<IActionResult> DeleteTrainee(int id)
        {
            await _repository.DeleteAsync(id);
            return NoContent();
        }

        [HttpGet("trainees/{nationId}/documents")]
        public async Task<IActionResult> GetTraineeDocuments(string nationId, [FromServices] AppDbContext context)
        {
            var cleanNationId = nationId.Replace("-", "");
            var documents = await context.PersonDocuments
                .Where(d => d.NationId == cleanNationId)
                .Select(d => new
                {
                    d.Id,
                    d.DocumentType,
                    FilePath = $"/api/admin/documents/{d.Id}/file",
                    d.UploadedAt
                })
                .ToListAsync();

            return Ok(documents);
        }

        [HttpGet("documents/{id}/file")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDocumentFile(int id, [FromServices] AppDbContext context, [FromServices] IWebHostEnvironment env)
        {
            var doc = await context.PersonDocuments.FindAsync(id);
            if (doc == null)
                return NotFound("Document file not found");

            if (doc.FileData != null && doc.FileData.Length > 0)
            {
                var contentType = string.IsNullOrEmpty(doc.ContentType) ? "image/jpeg" : doc.ContentType;
                return File(doc.FileData, contentType);
            }

            if (!string.IsNullOrEmpty(doc.FilePath))
            {
                var fullPath = Path.Combine(env.ContentRootPath, doc.FilePath);
                if (System.IO.File.Exists(fullPath))
                {
                    var ext = Path.GetExtension(doc.FilePath).ToLower();
                    var contentType = ext switch
                    {
                        ".png" => "image/png",
                        ".jpg" or ".jpeg" => "image/jpeg",
                        ".gif" => "image/gif",
                        ".pdf" => "application/pdf",
                        _ => "application/octet-stream"
                    };
                    return PhysicalFile(fullPath, contentType);
                }
            }

            return NotFound("Document file not found");
        }

        private static Dictionary<string, object?> BuildPersonSnapshotDict(Person? p, string actionName = "แก้ไขข้อมูลผู้สมัคร/ผู้อบรม")
        {
            if (p == null) return new Dictionary<string, object?>();

            var addrA = p.Addresses?.FirstOrDefault(a => a.AddressType != null && a.AddressType.ToUpper() == "A") 
                        ?? p.Addresses?.FirstOrDefault();
            var addrC = p.Addresses?.FirstOrDefault(a => a.AddressType != null && (a.AddressType.ToUpper() == "C" || a.AddressType.ToUpper() == "M")) 
                        ?? p.Addresses?.LastOrDefault(a => a.AddressType != null && (a.AddressType.ToUpper() == "C" || a.AddressType.ToUpper() == "M"));
            var affil = p.Affiliations?.FirstOrDefault() ?? p.Affiliations?.LastOrDefault();
            var lic = p.Licenses?.FirstOrDefault() ?? p.Licenses?.LastOrDefault();
            var course = p.Courses?.FirstOrDefault() ?? p.Courses?.LastOrDefault();
            var otherObj = p.Others?.FirstOrDefault() ?? p.Others?.LastOrDefault();
            var salesAreas = otherObj?.SalesAreas?.Select(s => s.TerritoriesId?.ToString()).Where(s => !string.IsNullOrEmpty(s)).Select(s => s!).Distinct().OrderBy(x => x).ToList() ?? new List<string>();
            var companies = otherObj?.OtherCompanies?.Select(c => c.CompanyId?.ToString()).Where(s => !string.IsNullOrEmpty(s)).Select(s => s!).Distinct().OrderBy(x => x).ToList() ?? new List<string>();
            var specialties = otherObj?.Specialties?.Select(s => s.ExpertiseId?.ToString()).Where(s => !string.IsNullOrEmpty(s)).Select(s => s!).Distinct().OrderBy(x => x).ToList() ?? new List<string>();
            var prevTrainings = p.Trainings?.Select(t => t.CourseId?.ToString()).Where(s => !string.IsNullOrEmpty(s)).Select(s => s!).Distinct().OrderBy(x => x).ToList() ?? new List<string>();
            var selectedSubjs = p.Courses?.Select(c => c.RenewOtherId?.ToString()).Where(s => !string.IsNullOrEmpty(s)).Select(s => s!).Distinct().OrderBy(x => x).ToList() ?? new List<string>();
            var regObj = p.Registrations?.FirstOrDefault();

            return new Dictionary<string, object?>
            {
                ["NationId"] = p.NationId,
                ["TitleTh"] = p.TitleTh,
                ["FirstNameTh"] = p.FirstNameTh,
                ["MiddleNameTh"] = p.MiddleNameTh,
                ["LastNameTh"] = p.LastNameTh,
                ["TitleOldTh"] = p.TitleOldTh,
                ["FirstNameOldTh"] = p.FirstNameOldTh,
                ["MiddleNameOldTh"] = p.MiddleNameOldTh,
                ["LastNameOldTh"] = p.LastNameOldTh,
                ["BirthDate"] = p.BirthDate?.ToString("yyyy-MM-dd"),
                ["IdCardExpiry"] = p.IdCardExpiry?.ToString("yyyy-MM-dd"),
                ["GenderId"] = p.GenderId,
                ["ReligionId"] = p.ReligionId,
                ["BloodGroupId"] = p.BloodGroupId,
                ["FoodAllergy"] = p.FoodAllergy,
                ["MedicalCondition"] = p.MedicalCondition,
                ["PhoneOtp"] = p.PhoneOtp,
                ["EmailAlt"] = p.EmailAlt,
                ["LineId"] = p.LineId,
                ["Facebook"] = p.Facebook,
                ["Instagram"] = p.Instagram,
                ["EmergencyContactName"] = p.EmergencyContactName,
                ["EmergencyContactPhone"] = p.EmergencyContactPhone,
                ["HouseNo"] = addrA?.HouseNo,
                ["Moo"] = addrA?.Moo,
                ["Village"] = addrA?.Village,
                ["Soi"] = addrA?.Soi,
                ["Road"] = addrA?.Road,
                ["ProvinceId"] = addrA?.ProvinceId,
                ["DistrictId"] = addrA?.DistrictId,
                ["SubDistrictId"] = addrA?.SubDistrictId,
                ["Postcode"] = addrA?.Postcode,
                ["ContactHouseNo"] = addrC?.HouseNo,
                ["ContactMoo"] = addrC?.Moo,
                ["ContactVillage"] = addrC?.Village,
                ["ContactSoi"] = addrC?.Soi,
                ["ContactRoad"] = addrC?.Road,
                ["ContactProvinceId"] = addrC?.ProvinceId,
                ["ContactDistrictId"] = addrC?.DistrictId,
                ["ContactSubDistrictId"] = addrC?.SubDistrictId,
                ["ContactPostcode"] = addrC?.Postcode,
                ["AgentBranch"] = affil?.BranchId,
                ["BrokerType"] = affil?.BrokerType,
                ["BrokerCompany"] = affil?.BrokerCompany,
                ["BrokerBranch"] = affil?.BrokerBranch,
                ["viriyahAgentCode"] = affil?.ViriyahAgentCode,
                ["AgentType"] = lic?.CourseType ?? "agent",
                ["LicenseNo"] = lic?.LicenseNo,
                ["LicenseIssueDate"] = lic?.LicenseIssueDate?.ToString("yyyy-MM-dd"),
                ["LicenseExpiryDate"] = lic?.LicenseExpiryDate?.ToString("yyyy-MM-dd"),
                ["CourseType"] = course?.CourseId?.ToString(),
                ["CourseId"] = course?.CourseId,
                ["CourseDateId"] = course?.CourseDateId,
                ["PreviousCourses"] = string.Join(",", prevTrainings),
                ["SelectedSubjects"] = string.Join(",", selectedSubjs),
                ["SalesArea"] = string.Join(",", salesAreas),
                ["InsuranceSpecialty"] = string.Join(",", specialties),
                ["OtherInsuranceCompanies"] = string.Join(",", companies),
                ["MainBusiness"] = otherObj?.OtherBusiness,
                ["InsuranceExperienceYears"] = otherObj?.InsuranceExperienceYears?.ToString(),
                ["DeductionPrivilege"] = regObj?.DeductionPrivilege,
                ["MasterDegreeStatus"] = regObj?.MasterDegreeStatus,
                ["Action"] = actionName
            };
        }

        private static bool IsTrainingPassed(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;
            var s = status.Trim().ToLowerInvariant();
            return s == "อนุมัติ" || s == "ผ่าน" || s == "passed" || s == "pass" || s == "approved" || s == "สำเร็จ";
        }
    }
}
