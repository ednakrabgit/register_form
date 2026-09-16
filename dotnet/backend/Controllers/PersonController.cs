using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using System.Collections.Generic;
using System;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PersonController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly backend.Services.OicApiService _oicApiService;

        public PersonController(AppDbContext context, backend.Services.OicApiService oicApiService)
        {
            _context = context;
            _oicApiService = oicApiService;
        }

        [HttpPost("refresh-oic/{nationId}")]
        public async Task<IActionResult> RefreshOicProfile(string nationId)
        {
            var cleanNationId = nationId.Replace("-", "");
            var profile = await _oicApiService.GetProfileFromDbAsync(cleanNationId);
            if (profile == null)
            {
                return BadRequest(new { message = "ยังไม่มีข้อมูลจาก OIC (กรุณานำไฟล์ไปวางให้ Worker ทำงานก่อน)" });
            }
            return Ok(new { message = "ดึงข้อมูลล่าสุดจาก Database สำเร็จ", profile });
        }

        [HttpGet("{nationId}")]
        public async Task<IActionResult> GetPerson(string nationId)
        {
            // Remove hyphens if any
            var cleanNationId = nationId.Replace("-", "");

            var person = await _context.Persons
                .Include(p => p.Addresses)
                .Include(p => p.Licenses)
                .Include(p => p.Affiliations)
                .Include(p => p.Courses)
                .Include(p => p.Trainings)
                .Include(p => p.Others)
                    .ThenInclude(o => o.SalesAreas)
                .Include(p => p.Others)
                    .ThenInclude(o => o.OtherCompanies)
                .Include(p => p.Others)
                    .ThenInclude(o => o.Specialties)
                .FirstOrDefaultAsync(p => p.NationId == cleanNationId);

            var oicProfile = await _context.OicAgentProfileStores
                .OrderByDescending(o => o.ProfileId)
                .FirstOrDefaultAsync(o => o.IdCardNumber == cleanNationId && o.IsLatest);

            var userAccount = await _context.Users.FirstOrDefaultAsync(u => u.NationId == cleanNationId);

            // oicProfile will be null if the Background Worker hasn't processed the file yet.
            if (person == null && oicProfile == null && userAccount == null)
            {
                return NotFound(new { message = "ไม่พบข้อมูลเดิม และยังไม่มีข้อมูลจาก OIC (Worker ยังไม่ได้ทำงาน)" });
            }

            var oicData = new Dictionary<string, JsonElement>();
            if (oicProfile != null && !string.IsNullOrWhiteSpace(oicProfile.ProfilePayload))
            {
                try
                {
                    oicData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(oicProfile.ProfilePayload) ?? new Dictionary<string, JsonElement>();
                }
                catch (Exception ex)
                {
                    Serilog.Log.Error(ex, "Failed to parse OIC profile payload for NationId {NationId}", cleanNationId);
                }
            }

            string? GetStr(string key) => oicData.TryGetValue(key, out var val) && val.ValueKind == JsonValueKind.String ? val.GetString() : null;
            List<string>? GetStrList(string key) => oicData.TryGetValue(key, out var val) && val.ValueKind == JsonValueKind.Array ? val.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String).Select(x => x.GetString()!).ToList() : null;

            var provinces = await _context.Provinces.ToListAsync();
            var districts = await _context.Districts.ToListAsync();
            var subDistricts = await _context.SubDistricts.ToListAsync();
            var titles = await _context.Titles.ToListAsync();

            string GetTitleName(string? titleValue)
            {
                if (string.IsNullOrEmpty(titleValue)) return "";
                if (int.TryParse(titleValue, out int tid))
                {
                    var t = titles.FirstOrDefault(x => x.Id == tid);
                    if (t != null) return t.Name;
                }
                return titleValue;
            }

            int? GetProvinceId(string? name) => string.IsNullOrEmpty(name) ? null : provinces.FirstOrDefault(x => x.ProvinceThai == name)?.ProvinceId;
            int? GetDistrictId(string? name) => string.IsNullOrEmpty(name) ? null : districts.FirstOrDefault(x => x.DistrictThai == name)?.DistrictId;
            int? GetSubDistrictId(string? name) => string.IsNullOrEmpty(name) ? null : subDistricts.FirstOrDefault(x => x.SubDistrictThai == name)?.SubDistrictId;

            int? GetGenderId(string? name) => name?.ToLower() switch
            {
                "male" or "ชาย" => 1,
                "female" or "หญิง" => 2,
                _ => null
            };

            int? GetReligionId(string? name) => name?.ToLower() switch
            {
                "buddhism" or "พุทธ" => 1,
                "christianity" or "คริสต์" => 2,
                "islam" or "อิสลาม" => 3,
                "hinduism" or "ฮินดู" => 4,
                "sikhism" or "ซิกข์" => 5,
                _ => 6
            };

            int? GetBloodId(string? name) => name?.ToUpper() switch
            {
                "A" => 1,
                "B" => 2,
                "O" => 3,
                "AB" => 4,
                _ => 5
            };

            // Map to flat structure for the frontend RegistrationForm
            var addressHouse = person?.Addresses.FirstOrDefault(a => a.AddressType == "A"); // ทะเบียนบ้าน
            var addressCurrent = person?.Addresses.FirstOrDefault(a => a.AddressType == "C"); // ปัจจุบัน
            var affiliation = person?.Affiliations.FirstOrDefault();
            var other = person?.Others.FirstOrDefault();

            var rawTitle = person?.TitleTh ?? GetStr("titleTh");
            var firstNameVal = person?.FirstNameTh ?? GetStr("firstNameTh");
            var lastNameVal = person?.LastNameTh ?? GetStr("lastNameTh");

            // If first name not present from person or OIC, extract from userAccount
            if (string.IsNullOrWhiteSpace(firstNameVal) && userAccount != null && !string.IsNullOrWhiteSpace(userAccount.FullName))
            {
                var trimmedName = userAccount.FullName.Trim();
                if (string.IsNullOrWhiteSpace(rawTitle))
                {
                    if (trimmedName.StartsWith("นางสาว")) { rawTitle = "นางสาว"; trimmedName = trimmedName.Substring(6).Trim(); }
                    else if (trimmedName.StartsWith("นาง")) { rawTitle = "นาง"; trimmedName = trimmedName.Substring(3).Trim(); }
                    else if (trimmedName.StartsWith("นาย")) { rawTitle = "นาย"; trimmedName = trimmedName.Substring(3).Trim(); }
                }
                var parts = trimmedName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                firstNameVal = parts.Length > 0 ? parts[0] : "";
                lastNameVal = parts.Length > 1 ? parts[1] : "";
            }

            var resolvedTitleName = GetTitleName(rawTitle);

            var flatData = new
            {
                nationalId = person?.NationId ?? cleanNationId,
                idCardExpiry = person?.IdCardExpiry?.ToString("yyyy-MM-dd") ?? GetStr("idCardExpiry"),
                titleTh = rawTitle,
                titleThName = resolvedTitleName,
                firstNameTh = firstNameVal,
                middleNameTh = person?.MiddleNameTh ?? GetStr("middleNameTh"),
                lastNameTh = lastNameVal,
                hasChangedName = !string.IsNullOrEmpty(person?.FirstNameOldTh) ? "yes" : "no",
                titlePrev = person?.TitleOldTh,
                firstNameOldTh = person?.FirstNameOldTh,
                middleNameOldTh = person?.MiddleNameOldTh,
                lastNameOldTh = person?.LastNameOldTh,
                birthDate = person?.BirthDate?.ToString("yyyy-MM-dd") ?? GetStr("birthDate"),
                religion = person?.ReligionId?.ToString() ?? (GetReligionId(GetStr("religion")))?.ToString(),
                gender = person?.GenderId?.ToString() ?? (GetGenderId(GetStr("gender")))?.ToString(),
                bloodGroup = person?.BloodGroupId?.ToString() ?? (GetBloodId(GetStr("bloodGroup")))?.ToString(),
                phone = person?.PhoneOtp ?? GetStr("phoneOtp") ?? userAccount?.Phone,
                email = person?.EmailAlt ?? GetStr("email") ?? userAccount?.Email,
                lineId = person?.LineId ?? GetStr("lineId"),
                facebook = person?.Facebook ?? GetStr("facebook"),
                instagram = person?.Instagram ?? GetStr("instagram"),
                foodAllergy = person?.FoodAllergy ?? GetStr("foodAllergy"),
                medicalCondition = person?.MedicalCondition ?? GetStr("medicalCondition"),
                emergencyContactName = person?.EmergencyContactName ?? GetStr("emergencyContactName"),
                emergencyContactPhone = person?.EmergencyContactPhone ?? GetStr("emergencyContactPhone"),
                
                // Tab 3 Address
                sameAddress = addressCurrent == null,
                houseNo = addressHouse?.HouseNo ?? GetStr("addrHouseNo"),
                moo = addressHouse?.Moo ?? GetStr("addrMoo"),
                village = addressHouse?.Village ?? GetStr("addrVillage"),
                soi = addressHouse?.Soi ?? GetStr("addrSoi"),
                road = addressHouse?.Road ?? GetStr("addrRoad"),
                provinceId = addressHouse?.ProvinceId?.ToString() ?? (GetProvinceId(GetStr("addrProvince")))?.ToString(),
                districtId = addressHouse?.DistrictId?.ToString() ?? (GetDistrictId(GetStr("addrDistrict")))?.ToString(),
                subDistrictId = addressHouse?.SubDistrictId?.ToString() ?? (GetSubDistrictId(GetStr("addrSubdistrict")))?.ToString(),
                zipcode = addressHouse?.Postcode ?? GetStr("addrPostcode"),

                shipHouseNo = addressCurrent?.HouseNo,
                shipMoo = addressCurrent?.Moo,
                shipVillage = addressCurrent?.Village,
                shipSoi = addressCurrent?.Soi,
                shipRoad = addressCurrent?.Road,
                shipprovinceId = addressCurrent?.ProvinceId?.ToString(),
                shipdistrictId = addressCurrent?.DistrictId?.ToString(),
                shipsubDistrictId = addressCurrent?.SubDistrictId?.ToString(),
                shipzipcode = addressCurrent?.Postcode,
                
                // Tab 4 License & Affiliation
                agentRegion = affiliation?.RegionId?.ToString() ?? GetStr("agentRegion"),
                agentBranch = affiliation?.BranchId?.ToString() ?? GetStr("agentBranch"),
                brokerAffiliation = affiliation?.BrokerCompany ?? GetStr("brokerAffiliation"),
                viriyaContractCode = affiliation?.ViriyahAgentCode ?? GetStr("viriyaContractCode"),
                brokerType = affiliation?.BrokerType ?? GetStr("brokerType"),

                // Licenses
                licenseNo = person?.Licenses?.FirstOrDefault()?.LicenseNo ?? GetStr("licenseNo"),
                licenseIssue = person?.Licenses?.FirstOrDefault()?.LicenseIssueDate?.ToString("yyyy-MM-dd") ?? GetStr("licenseIssue"),
                licenseExpire = person?.Licenses?.FirstOrDefault()?.LicenseExpiryDate?.ToString("yyyy-MM-dd") ?? GetStr("licenseExpire"),
                agentType = person?.Licenses?.FirstOrDefault()?.CourseType ?? GetStr("agentType"),
                
                // Tab 5 Course
                courseType = (person?.Courses != null ? (person.Courses.FirstOrDefault(c => c.CourseId != null && c.CourseId != 9 && c.CourseId != 10)?.CourseId?.ToString() ?? person.Courses.FirstOrDefault(c => c.CourseId == 9 || c.CourseId == 10)?.CourseId?.ToString()) : null) ?? GetStr("courseType"),
                trainingDate = person?.Courses?.FirstOrDefault(c => c.CourseDateId != null)?.CourseDateId?.ToString() ?? GetStr("trainingDate"),
                selectedSubjects = (person?.Courses != null && person.Courses.Any(c => c.RenewOtherId != null)) ? person.Courses.Where(c => c.RenewOtherId != null).Select(c => c.RenewOtherId?.ToString() ?? "").Where(s => !string.IsNullOrEmpty(s)).ToList() : (GetStrList("selectedSubjects") ?? new List<string>()),
                previousCourses = (person?.Trainings != null && person.Trainings.Any(t => t.CourseId != null)) ? person.Trainings.Where(t => t.CourseId != null).Select(t => t.CourseId?.ToString() ?? "").Where(s => !string.IsNullOrEmpty(s)).ToList() : (GetStrList("previousCourses") ?? new List<string>()),

                // Other
                insuranceExperienceYears = other?.InsuranceExperienceYears?.ToString() ?? GetStr("insuranceExperienceYears"),
                occupation = other?.OtherBusiness ?? GetStr("occupation"),
                brokerBranch = other?.BrokerBranch ?? GetStr("brokerBranch"),
                extraTrainingInterest = other?.ExtraTrainingInterest ?? GetStr("extraTrainingInterest"),
                
                salesTerritories = (other?.SalesAreas != null && other.SalesAreas.Any(s => s.TerritoriesId != null)) ? other.SalesAreas.Where(s => s.TerritoriesId != null).Select(s => s.TerritoriesId?.ToString() ?? "").Where(s => !string.IsNullOrEmpty(s)).ToList() : (GetStrList("salesTerritories") ?? new List<string>()),
                otherInsuranceCompanies = (other?.OtherCompanies != null && other.OtherCompanies.Any(c => c.CompanyId != null)) ? other.OtherCompanies.Where(c => c.CompanyId != null).Select(c => c.CompanyId?.ToString() ?? "").Where(s => !string.IsNullOrEmpty(s)).ToList() : (GetStrList("otherInsuranceCompanies") ?? new List<string>()),
                insuranceSpecialty = (other?.Specialties != null && other.Specialties.Any(s => s.ExpertiseId != null)) ? other.Specialties.Where(s => s.ExpertiseId != null).Select(s => s.ExpertiseId?.ToString() ?? "").Where(s => !string.IsNullOrEmpty(s)).ToList() : (GetStrList("insuranceSpecialty") ?? new List<string>())
            };

            return Ok(flatData);
        }
    }
}
