using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using System.Text.Json;
using backend.Models;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("Remarks")]
        public async Task<IActionResult> GetRemarksReport()
        {
            // Fetch trainees where Remark is not null or empty
            var trainees = await _context.Registers
                .Where(r => !string.IsNullOrEmpty(r.Remark))
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new {
                    r.Id,
                    r.FirstNameTh,
                    r.LastNameTh,
                    IdCard = r.NationalId,
                    Mobile = r.PhoneOtp, // assuming PhoneOtp was mapped from mobile
                    RegDate = r.CreatedAt,
                    r.Remark
                })
                .ToListAsync();

            return Ok(trainees);
        }

        public class CourseSelection
        {
            public int? CourseId { get; set; }
            public List<int>? DateIds { get; set; }
        }

        public class ExportRequest
        {
            public string? SearchTerm { get; set; }
            public string? IdRanges { get; set; }
            public List<string>? SelectedNationalIds { get; set; }
            public List<CourseSelection>? SelectedCourses { get; set; }
            public bool AllColumns { get; set; }
            public bool MainInfoOnly { get; set; }
            public bool CustomColumns { get; set; }
        }

                [HttpPost("export")]
        public async Task<IActionResult> ExportData([FromBody] ExportRequest request)
        {
            var query = _context.Persons
                .Include(p => p.Registrations)
                .Include(p => p.Licenses)
                .Include(p => p.Addresses)
                .Include(p => p.Affiliations)
                .Include(p => p.Courses)
                .Include(p => p.Trainings)
                .Include(p => p.Others)
                    .ThenInclude(o => o.SalesAreas)
                .Include(p => p.Others)
                    .ThenInclude(o => o.OtherCompanies)
                .Include(p => p.Others)
                    .ThenInclude(o => o.Specialties)
                .AsQueryable();

            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                var s = request.SearchTerm.ToLower().Trim().Replace("สาขา ", "สาขา").Replace("ภาค ", "ภาค");
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
                    
                    _context.Provinces.Any(pv => p.Addresses.Any(a => a.AddressType == "A" && a.ProvinceId == pv.Id) && pv.ProvinceThai != null && pv.ProvinceThai.ToLower().Contains(s)) ||
                    
                    _context.AgentRegions.Any(r => p.Affiliations.Any(a => a.RegionId == r.Id) && r.Name != null && r.Name.ToLower().Replace(" ", "").Contains(sNoSpace)) ||
                    
                    _context.AgentBranches.Any(ab => p.Affiliations.Any(a => a.BranchId == ab.Id) && ab.Name != null && ("สาขา" + ab.Name.ToLower()).Contains(s)) ||

                    _context.RenewBasics.Any(rb => p.Courses.Any(c => c.CourseId == rb.Id) && rb.CourseName != null && rb.CourseName.ToLower().Contains(s)) ||
                    
                    _context.RenewDates.Any(rd => p.Courses.Any(c => c.CourseDateId == rd.Id) && rd.CourseDateDisplay != null && rd.CourseDateDisplay.ToLower().Contains(s))
                );
            }

            if (request.SelectedNationalIds != null && request.SelectedNationalIds.Count > 0)
            {
                query = query.Where(p => request.SelectedNationalIds.Contains(p.NationId));
            }

            bool hasPersonFilter = !string.IsNullOrEmpty(request.SearchTerm) ||
                                   !string.IsNullOrEmpty(request.IdRanges) ||
                                   (request.SelectedNationalIds != null && request.SelectedNationalIds.Count > 0);

            if (!hasPersonFilter && request.SelectedCourses != null && request.SelectedCourses.Count > 0)
            {
                var coursePredicates = new List<Func<Person, bool>>();
                foreach (var c in request.SelectedCourses)
                {
                    // Course matches if the person has this course, and if dateIds are provided, it must match one of them.
                    bool hasDateFilter = c.DateIds != null && c.DateIds.Count > 0;
                    if (hasDateFilter && c.DateIds != null)
                    {
                        var dateIds = c.DateIds;
                        coursePredicates.Add(p => p.Courses != null && p.Courses.Any(pc => 
                            (c.CourseId == 9 || c.CourseId == 10 ? (pc.CourseId == 9 || pc.CourseId == 10) : pc.CourseId == c.CourseId) && 
                            (
                                (pc.CourseDateId != null && dateIds.Contains(pc.CourseDateId.Value)) || 
                                (pc.RenewOtherId != null && dateIds.Contains(pc.RenewOtherId.Value))
                            )));
                    }
                    else
                    {
                        coursePredicates.Add(p => p.Courses != null && p.Courses.Any(pc => 
                            c.CourseId == 9 || c.CourseId == 10 ? (pc.CourseId == 9 || pc.CourseId == 10) : pc.CourseId == c.CourseId));
                    }
                }
                
                // Fetch to memory first due to complex EF translation for this dynamic OR logic
                // Or we can just evaluate it after fetching. Since we want to limit fetch size if possible, 
                // we'll fetch then filter.
            }

            // Fetch records
            var personsList = await query.ToListAsync();

            // Apply ID ranges filter against Registrations
            if (!string.IsNullOrEmpty(request.IdRanges))
            {
                var ranges = request.IdRanges.Split(',', StringSplitOptions.RemoveEmptyEntries);
                var validRecords = new List<Person>();
                foreach (var person in personsList)
                {
                    bool match = false;
                    foreach (var rangeStr in ranges)
                    {
                        var cleanStr = rangeStr.Replace("{", "").Replace("}", "").Trim();
                        var subParts = cleanStr.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries); // Handle space-separated like "1 2"
                        
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

            // Apply Course filter
            if (!hasPersonFilter && request.SelectedCourses != null && request.SelectedCourses.Count > 0)
            {
                var allBasics = await _context.RenewBasics.ToListAsync();
                var basicNameMap = allBasics.ToDictionary(b => b.Id, b => b.CourseName);
                var sameNameIdsMap = allBasics
                    .GroupBy(b => b.CourseName)
                    .ToDictionary(g => g.Key, g => g.Select(b => b.Id).ToHashSet());

                var validRecords = new List<Person>();
                foreach (var person in personsList)
                {
                    bool match = false;
                    foreach (var c in request.SelectedCourses)
                    {
                        if (!c.CourseId.HasValue) continue;
                        int cid = c.CourseId.Value;
                        HashSet<int>? allowedCourseIds = null;
                        if (cid == 9 || cid == 10)
                        {
                            allowedCourseIds = new HashSet<int> { 9, 10 };
                        }
                        else if (basicNameMap.TryGetValue(cid, out var cName) && !string.IsNullOrEmpty(cName) && sameNameIdsMap.TryGetValue(cName, out var groupIds))
                        {
                            allowedCourseIds = groupIds;
                        }
                        else
                        {
                            allowedCourseIds = new HashSet<int> { cid };
                        }

                        if (person.Courses.Any(pc => 
                            allowedCourseIds.Contains(pc.CourseId ?? 0) && 
                            (c.DateIds == null || c.DateIds.Count == 0 || c.DateIds.Contains(pc.CourseDateId ?? 0) || c.DateIds.Contains(pc.RenewOtherId ?? 0))))
                        {
                            match = true;
                            break;
                        }
                    }
                    if (match) validRecords.Add(person);
                }
                personsList = validRecords;
            }

            // Map results
            var results = new List<object>();

            var provinces = await _context.Provinces.ToDictionaryAsync(p => p.Id, p => p.ProvinceThai);
            var districts = await _context.Districts.ToDictionaryAsync(d => d.Id, d => d.DistrictThai);
            var subdistricts = await _context.SubDistricts.ToDictionaryAsync(s => s.Id, s => s.SubDistrictThai);
            
            var branches = await _context.AgentBranches.ToDictionaryAsync(b => b.Id, b => b.Name);
            var regions = await _context.AgentRegions.ToDictionaryAsync(r => r.Id, r => r.Name);
            
            var religionDict = await _context.Religions.ToDictionaryAsync(r => r.Id, r => r.Name);
            var bloodDict = await _context.BloodTypes.ToDictionaryAsync(b => b.Id, b => b.Name);
            
            var renewOthers = await _context.RenewOthers.ToListAsync();
            var pillars = await _context.RenewPillars.ToDictionaryAsync(p => p.Id, p => p.Name);
            var dates = await _context.RenewDates.ToDictionaryAsync(d => d.Id, d => d.CourseDateDisplay);
            var subjects = await _context.RenewCourses.ToDictionaryAsync(s => s.Id, s => s.Name);

            var companies = await _context.Companies.ToDictionaryAsync(c => c.Id, c => c.Name);
            var territories = await _context.Territories.ToDictionaryAsync(t => t.Id, t => t.Name);
            var expertises = await _context.Expertises.ToDictionaryAsync(e => e.Id, e => e.Name);
            var renewBasics = await _context.RenewBasics.ToDictionaryAsync(rb => rb.Id.ToString(), rb => rb.CourseName);
            var titles = await _context.Titles.ToDictionaryAsync(t => t.Id.ToString(), t => t.Name);

            var renewOtherDict = renewOthers.ToDictionary(ro => ro.Id, ro => $"[Pillar {(pillars.ContainsKey(ro.PillarId) ? pillars[ro.PillarId] : "")}] [{(dates.ContainsKey(ro.DateId) ? dates[ro.DateId] : "")}] : {(subjects.ContainsKey(ro.SubjectId) ? subjects[ro.SubjectId] : "")}");

            foreach (var p in personsList)
            {
                var lic = p.Licenses.FirstOrDefault();
                var aff = p.Affiliations.FirstOrDefault();
                var reg = p.Registrations.OrderByDescending(r => r.Id).FirstOrDefault();
                var addrA = p.Addresses.FirstOrDefault(a => a.AddressType == "A") ?? p.Addresses.FirstOrDefault();
                var addrC = p.Addresses.FirstOrDefault(a => a.AddressType == "C") ?? p.Addresses.LastOrDefault();

                string? mergedSubjectsStr = null;
                var tor4Courses = p.Courses.Where(c => c.CourseId == 9 || c.CourseId == 10).ToList();
                if (tor4Courses.Any())
                {
                    var allSelectedSubjects = new List<string>();
                    foreach(var tc in tor4Courses)
                    {
                        if (tc.RenewOtherId.HasValue)
                        {
                            var ro = renewOthers.FirstOrDefault(x => x.Id == tc.RenewOtherId.Value);
                            if (ro != null)
                            {
                                var pName = pillars.ContainsKey(ro.PillarId) ? pillars[ro.PillarId] : "";
                                var dName = dates.ContainsKey(ro.DateId) ? dates[ro.DateId] : "";
                                var sName = subjects.ContainsKey(ro.SubjectId) ? subjects[ro.SubjectId] : "";
                                
                                var formattedStr = $"[Pillar {pName}] [{dName}] : {sName}";
                                if (!allSelectedSubjects.Contains(formattedStr))
                                {
                                    allSelectedSubjects.Add(formattedStr);
                                }
                            }
                        }
                    }
                    if (allSelectedSubjects.Any()) {
                        mergedSubjectsStr = string.Join(" ; ", allSelectedSubjects);
                    }
                }

                results.Add(MapPersonToOutput(p, reg, lic, aff, addrA, addrC, mergedSubjectsStr, provinces, districts, subdistricts, branches, regions, religionDict, bloodDict, renewBasics, dates, companies, territories, expertises, titles, renewOtherDict, subjects));
            }

            return Ok(results);
        }

        private object MapPersonToOutput(Person p, PersonRegistration? reg, PersonLicense? lic, PersonAffiliation? aff, PersonAddress? addrA, PersonAddress? addrC, string? mergedSubjects, Dictionary<int, string> provinces, Dictionary<int, string> districts, Dictionary<int, string> subdistricts, Dictionary<int, string> branches, Dictionary<int, string> regions, Dictionary<int, string> religionDict, Dictionary<int, string> bloodDict, Dictionary<string, string> renewBasics, Dictionary<int, string> dates, Dictionary<int, string> companies, Dictionary<int, string> territories, Dictionary<int, string> expertises, Dictionary<string, string> titles, Dictionary<int, string> renewOtherDict, Dictionary<int, string> subjects)
        {
            var provName = addrA != null && addrA.ProvinceId.HasValue && provinces.ContainsKey(addrA.ProvinceId.Value) ? provinces[addrA.ProvinceId.Value] : "";
            var distName = addrA != null && addrA.DistrictId.HasValue && districts.ContainsKey(addrA.DistrictId.Value) ? districts[addrA.DistrictId.Value] : "";
            var subName = addrA != null && addrA.SubDistrictId.HasValue && subdistricts.ContainsKey(addrA.SubDistrictId.Value) ? subdistricts[addrA.SubDistrictId.Value] : "";
            
            var cProvName = addrC != null && addrC.ProvinceId.HasValue && provinces.ContainsKey(addrC.ProvinceId.Value) ? provinces[addrC.ProvinceId.Value] : "";
            var cDistName = addrC != null && addrC.DistrictId.HasValue && districts.ContainsKey(addrC.DistrictId.Value) ? districts[addrC.DistrictId.Value] : "";
            var cSubName = addrC != null && addrC.SubDistrictId.HasValue && subdistricts.ContainsKey(addrC.SubDistrictId.Value) ? subdistricts[addrC.SubDistrictId.Value] : "";

            var branchName = aff != null && aff.BranchId.HasValue && branches.ContainsKey(aff.BranchId.Value) ? branches[aff.BranchId.Value] : (aff?.BrokerBranch ?? "");
            var regionName = aff != null && aff.RegionId.HasValue && regions.ContainsKey(aff.RegionId.Value) ? regions[aff.RegionId.Value] : "";

            var other = p.Others?.FirstOrDefault();

            return new
            {
                // Person
                NationalId = p.NationId,
                Title = p.TitleTh == "1" ? "นาย" : p.TitleTh == "2" ? "นาง" : p.TitleTh == "3" ? "นางสาว" : p.TitleTh,
                FirstName = p.FirstNameTh,
                MiddleNameTh = p.MiddleNameTh,
                LastName = p.LastNameTh,
                TitleOldTh = p.TitleOldTh != null && titles.ContainsKey(p.TitleOldTh) ? titles[p.TitleOldTh] : p.TitleOldTh,
                FirstNameOldTh = p.FirstNameOldTh,
                MiddleNameOldTh = p.MiddleNameOldTh,
                LastNameOldTh = p.LastNameOldTh,
                Gender = p.GenderId == 1 ? "ชาย" : (p.GenderId == 2 ? "หญิง" : p.GenderId?.ToString()),
                BirthDate = p.BirthDate?.ToString("yyyy-MM-dd"),
                Religion = p.ReligionId.HasValue && religionDict.ContainsKey(p.ReligionId.Value) ? religionDict[p.ReligionId.Value] : "",
                BloodGroup = p.BloodGroupId.HasValue && bloodDict.ContainsKey(p.BloodGroupId.Value) ? bloodDict[p.BloodGroupId.Value] : "",
                Phone = p.PhoneOtp,
                Email = p.EmailAlt,
                LineId = p.LineId,
                Facebook = p.Facebook,
                Instagram = p.Instagram,
                FoodAllergy = p.FoodAllergy,
                MedicalCondition = p.MedicalCondition,
                EmergencyContactName = p.EmergencyContactName,
                EmergencyContactPhone = p.EmergencyContactPhone,

                // PersonRegistration
                Id = reg?.Id ?? 0,
                CreatedAt = reg?.start_time?.ToString("dd/MM/yyyy HH:mm:ss"),
                OnboardDate = reg?.start_time?.ToString("dd/MM/yyyy") ?? "",
                DeductionPrivilege = reg?.DeductionPrivilege,
                MasterDegreeStatus = reg?.MasterDegreeStatus,

                // PersonAddress
                Address = addrA != null ? $"{addrA.HouseNo} {addrA.Moo} {addrA.Village} {addrA.Soi} {addrA.Road} {subName} {distName} {provName} {addrA.Postcode}".Trim().Replace("  ", " ") : "",
                Address_HouseNo = addrA?.HouseNo,
                Address_Moo = addrA?.Moo,
                Address_Village = addrA?.Village,
                Address_Soi = addrA?.Soi,
                Address_Road = addrA?.Road,
                Address_Province = provName,
                Address_District = distName,
                Address_SubDistrict = subName,
                Address_Postcode = addrA?.Postcode,

                ContactAddress = addrC != null ? $"{addrC.HouseNo} {addrC.Moo} {addrC.Village} {addrC.Soi} {addrC.Road} {cSubName} {cDistName} {cProvName} {addrC.Postcode}".Trim().Replace("  ", " ") : "",
                Contact_HouseNo = addrC?.HouseNo,
                Contact_Moo = addrC?.Moo,
                Contact_Village = addrC?.Village,
                Contact_Soi = addrC?.Soi,
                Contact_Road = addrC?.Road,
                Contact_Province = cProvName,
                Contact_District = cDistName,
                Contact_SubDistrict = cSubName,
                Contact_Postcode = addrC?.Postcode,

                // PersonLicense
                LicenseNo = lic?.LicenseNo,
                LicenseIssueDate = lic?.LicenseIssueDate?.ToString("yyyy-MM-dd"),
                LicenseExpiryDate = lic?.LicenseExpiryDate?.ToString("yyyy-MM-dd"),
                CourseType = lic?.CourseType,
                License_CourseTypeCode = lic?.CourseTypeCode != null && renewBasics.ContainsKey(lic.CourseTypeCode) ? renewBasics[lic.CourseTypeCode] : lic?.CourseTypeCode,

                // PersonAffiliation
                Region = regionName,
                Branch = branchName,
                Affiliation_BrokerCompany = aff?.BrokerCompany,
                Affiliation_BrokerBranch = aff?.BrokerBranch,
                Affiliation_ViriyahAgentCode = aff?.ViriyahAgentCode,
                Affiliation_BrokerType = aff?.BrokerType,

                // PersonCourse
                MergedSubjects = mergedSubjects,
                Course_CourseDateIds = p.Courses != null ? string.Join(", ", p.Courses.Where(c => c.CourseDateId.HasValue).Select(c => c.CourseDateId.HasValue && dates.ContainsKey(c.CourseDateId.Value) ? dates[c.CourseDateId.Value] : (c.CourseDateId?.ToString() ?? ""))) : "",
                Course_RenewOtherIds = p.Courses != null ? string.Join(", ", p.Courses.Where(c => c.RenewOtherId.HasValue).Select(c => c.RenewOtherId.HasValue && renewOtherDict.ContainsKey(c.RenewOtherId.Value) ? renewOtherDict[c.RenewOtherId.Value] : (c.RenewOtherId?.ToString() ?? ""))) : "",

                // PersonOther
                Other_ExtraTrainingInterest = other?.ExtraTrainingInterest,
                Other_OtherBusiness = other?.OtherBusiness,
                Other_BrokerBranch = other?.BrokerBranch,
                Other_InsuranceExperienceYears = other?.InsuranceExperienceYears,
                
                // PersonOtherCompanies
                Other_CompanyIds = other?.OtherCompanies != null ? string.Join(", ", other.OtherCompanies.Where(c => c.CompanyId.HasValue).Select(c => companies.ContainsKey(c.CompanyId!.Value) ? companies[c.CompanyId.Value] : c.CompanyId.Value.ToString())) : "",

                // PersonOtherSalesArea
                Other_TerritoriesIds = other?.SalesAreas != null ? string.Join(", ", other.SalesAreas.Where(s => s.TerritoriesId.HasValue).Select(s => territories.ContainsKey(s.TerritoriesId!.Value) ? territories[s.TerritoriesId.Value] : s.TerritoriesId.Value.ToString())) : "",

                // PersonOtherSpecialty
                Other_ExpertiseIds = other?.Specialties != null ? string.Join(", ", other.Specialties.Where(s => s.ExpertiseId.HasValue).Select(s => expertises.ContainsKey(s.ExpertiseId!.Value) ? expertises[s.ExpertiseId.Value] : s.ExpertiseId.Value.ToString())) : "",

                // PersonTraining5y
                Training5y_CourseIds = p.Trainings != null ? string.Join(", ", p.Trainings.Where(t => t.CourseId.HasValue).Select(t => subjects.ContainsKey(t.CourseId!.Value) ? subjects[t.CourseId.Value] : t.CourseId.Value.ToString())) : ""
            };
        }
    }
}