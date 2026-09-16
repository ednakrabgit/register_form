using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MasterDataController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MasterDataController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("provinces")]
        public async Task<IActionResult> GetProvinces([FromQuery] bool all = false)
        {
            var query = _context.Provinces.AsQueryable();
            if (!all)
            {
                var now = DateTime.Now;
                query = query.Where(p => p.IsActiveFrontend && (p.StartActiveDatetime == null || now >= p.StartActiveDatetime) && (p.EndActiveDatetime == null || now <= p.EndActiveDatetime));
            }
            var data = await query.OrderBy(p => p.ProvinceThai).ToListAsync();
            return Ok(data);
        }

        [HttpGet("districts/{provinceId}")]
        public async Task<IActionResult> GetDistricts(int provinceId, [FromQuery] bool all = false)
        {
            var query = _context.Districts.Where(d => d.ProvinceId == provinceId);
            if (!all)
            {
                var now = DateTime.Now;
                query = query.Where(d => d.IsActiveFrontend && (d.StartActiveDatetime == null || now >= d.StartActiveDatetime) && (d.EndActiveDatetime == null || now <= d.EndActiveDatetime));
            }
            var data = await query.OrderBy(d => d.DistrictThai).ToListAsync();
            return Ok(data);
        }

        [HttpGet("subdistricts/{districtId}")]
        public async Task<IActionResult> GetSubDistricts(int districtId, [FromQuery] bool all = false)
        {
            var query = _context.SubDistricts.Where(s => s.DistrictId == districtId);
            if (!all)
            {
                var now = DateTime.Now;
                query = query.Where(s => s.IsActiveFrontend && (s.StartActiveDatetime == null || now >= s.StartActiveDatetime) && (s.EndActiveDatetime == null || now <= s.EndActiveDatetime));
            }
            var data = await query.OrderBy(s => s.SubDistrictThai).ToListAsync();
            return Ok(data);
        }

        [HttpGet("districts")]
        public async Task<IActionResult> GetAllDistricts([FromQuery] bool all = false)
        {
            var query = _context.Districts.AsQueryable();
            if (!all)
            {
                var now = DateTime.Now;
                query = query.Where(d => d.IsActiveFrontend && (d.StartActiveDatetime == null || now >= d.StartActiveDatetime) && (d.EndActiveDatetime == null || now <= d.EndActiveDatetime));
            }
            var data = await query.ToListAsync();
            return Ok(data);
        }

        [HttpGet("subdistricts")]
        public async Task<IActionResult> GetAllSubDistricts([FromQuery] bool all = false)
        {
            var query = _context.SubDistricts.AsQueryable();
            if (!all)
            {
                var now = DateTime.Now;
                query = query.Where(s => s.IsActiveFrontend && (s.StartActiveDatetime == null || now >= s.StartActiveDatetime) && (s.EndActiveDatetime == null || now <= s.EndActiveDatetime));
            }
            var data = await query.ToListAsync();
            return Ok(data);
        }

        [HttpGet("agent-branches")]
        public async Task<IActionResult> GetAgentBranches([FromQuery] bool all = false)
        {
            var query = _context.AgentBranches.AsQueryable();
            if (!all)
            {
                var now = DateTime.Now;
                query = query.Where(b => b.IsActiveFrontend && (b.StartActiveDatetime == null || now >= b.StartActiveDatetime) && (b.EndActiveDatetime == null || now <= b.EndActiveDatetime));
            }

            var data = await query
                .Join(_context.AgentRegions,
                    b => b.RegionId,
                    r => r.Id,
                    (b, r) => new
                    {
                        branchId = b.Id,
                        branchName = b.Name,
                        regionId = r.Id,
                        regionName = r.Name,
                        isActiveBackend = b.IsActiveBackend,
                        isActiveFrontend = b.IsActiveFrontend,
                        startActiveDatetime = b.StartActiveDatetime,
                        endActiveDatetime = b.EndActiveDatetime
                    })
                .OrderBy(x => x.branchName)
                .ToListAsync();
                
            return Ok(data);
        }

        [HttpGet("renew-courses")]
        [HttpGet("courses")]
        public async Task<IActionResult> GetRenewCourses([FromQuery] string? agentType, [FromQuery] bool all = false)
        {
            var query = _context.RenewBasics.AsQueryable();
            var now = DateTime.Now;
            if (!all)
            {
                query = query.Where(c => c.IsActiveFrontend && (c.StartActiveDatetime == null || now >= c.StartActiveDatetime) && (c.EndActiveDatetime == null || now <= c.EndActiveDatetime) && c.Status == "active");
            }

            if (!string.IsNullOrEmpty(agentType))
            {
                query = query.Where(c => c.AgentType == agentType || c.AgentType == null);
            }

            var dateQuery = _context.RenewDates.AsQueryable();
            if (!all)
            {
                dateQuery = dateQuery.Where(d => d.IsActiveFrontend && (d.StartActiveDatetime == null || now >= d.StartActiveDatetime) && (d.EndActiveDatetime == null || now <= d.EndActiveDatetime) && d.Status == "active");
            }

            var data = await query
                .GroupJoin(dateQuery, b => b.DateId, d => d.Id, (b, dates) => new { b, dates })
                .SelectMany(x => x.dates.DefaultIfEmpty(), (x, d) => new {
                    id = x.b.Id,
                    courseName = x.b.CourseName,
                    agentType = x.b.AgentType,
                    dateId = x.b.DateId,
                    dateDisplay = d != null ? d.CourseDateDisplay : null,
                    status = x.b.Status,
                    isActiveBackend = x.b.IsActiveBackend,
                    isActiveFrontend = x.b.IsActiveFrontend,
                    startActiveDatetime = x.b.StartActiveDatetime,
                    endActiveDatetime = x.b.EndActiveDatetime
                })
                .OrderBy(c => c.id)
                .ToListAsync();

            return Ok(data);
        }

        private async Task<int> GetAdvanceExpiryDaysAsync()
        {
            var config = await _context.SysConfigs.FirstOrDefaultAsync(c => c.Key == "RENEW_COURSE_EXPIRY_DAYS_ADVANCE");
            if (config != null && int.TryParse(config.Value, out int days))
            {
                return days;
            }
            return 30;
        }

        [HttpGet("renew-other-courses")]
        public async Task<IActionResult> GetRenewOtherCourses([FromQuery] bool all = false)
        {
            var now = DateTime.Now;
            var advanceDays = await GetAdvanceExpiryDaysAsync();
            var cutoffDate = DateTime.Today.AddDays(advanceDays);

            var query = from o in _context.RenewOthers
                        join p in _context.RenewPillars on o.PillarId equals p.Id
                        join d in _context.RenewDates on o.DateId equals d.Id
                        join c in _context.RenewCourses on o.SubjectId equals c.Id
                        where all || (
                            o.IsActiveFrontend && (o.StartActiveDatetime == null || now >= o.StartActiveDatetime) && (o.EndActiveDatetime == null || now <= o.EndActiveDatetime) && o.Status == "active"
                            && p.IsActiveFrontend && (p.StartActiveDatetime == null || now >= p.StartActiveDatetime) && (p.EndActiveDatetime == null || now <= p.EndActiveDatetime) && p.Status == "active"
                            && d.IsActiveFrontend && (d.StartActiveDatetime == null || now >= d.StartActiveDatetime) && (d.EndActiveDatetime == null || now <= d.EndActiveDatetime) && d.Status == "active"
                            && c.IsActiveFrontend && (c.StartActiveDatetime == null || now >= c.StartActiveDatetime) && (c.EndActiveDatetime == null || now <= c.EndActiveDatetime) && c.Status == "active"
                            && d.CourseDate >= cutoffDate
                        )
                        orderby o.DisplayOrder ascending
                        select new {
                            id = o.Id,
                            subjectId = c.Id,
                            subjectName = c.Name,
                            pillarId = p.Id,
                            pillarName = p.Name,
                            dateId = d.Id,
                            dateDisplay = d.CourseDateDisplay,
                            displayName = $"[{p.Name}][{d.CourseDateDisplay}] : {c.Name}",
                            status = o.Status,
                            isActiveBackend = o.IsActiveBackend,
                            isActiveFrontend = o.IsActiveFrontend,
                            startActiveDatetime = o.StartActiveDatetime,
                            endActiveDatetime = o.EndActiveDatetime
                        };

            var data = await query.ToListAsync();
            return Ok(data);
        }

        // Generic Master Data DTO
        public class MasterDataDto
        {
            public int Id { get; set; }
            public int? DefaultPillarId { get; set; }
            public string? DefaultPillarName { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Status { get; set; } = "active";
            public bool IsActiveBackend { get; set; } = true;
            public bool IsActiveFrontend { get; set; } = true;
            public DateTime? StartActiveDatetime { get; set; }
            public DateTime? EndActiveDatetime { get; set; }
            public int DisplayOrder { get; set; }
            public List<MstCourseCurriculum> Curriculums { get; set; } = new();
        }

        [HttpGet("{type}")]
        public async Task<IActionResult> GetGenericMasterData(string type, [FromQuery] bool all = false)
        {
            var now = DateTime.Now;
            switch (type.ToLower())
            {
                case "blood":
                case "bloods":
                    var bloodQ = _context.BloodTypes.AsQueryable();
                    if (!all) bloodQ = bloodQ.Where(b => b.IsActiveFrontend && (b.StartActiveDatetime == null || now >= b.StartActiveDatetime) && (b.EndActiveDatetime == null || now <= b.EndActiveDatetime) && b.Status == "active");
                    return Ok(await bloodQ
                        .OrderBy(b => b.DisplayOrder)
                        .Select(b => new MasterDataDto { 
                            Id = b.Id, Name = b.Name, Status = b.Status, 
                            IsActiveBackend = b.IsActiveBackend, IsActiveFrontend = b.IsActiveFrontend,
                            StartActiveDatetime = b.StartActiveDatetime, EndActiveDatetime = b.EndActiveDatetime,
                            DisplayOrder = b.DisplayOrder 
                        })
                        .ToListAsync());

                case "gender":
                case "genders":
                    var genderQ = _context.Genders.AsQueryable();
                    if (!all) genderQ = genderQ.Where(g => g.IsActiveFrontend && (g.StartActiveDatetime == null || now >= g.StartActiveDatetime) && (g.EndActiveDatetime == null || now <= g.EndActiveDatetime) && g.Status == "active");
                    return Ok(await genderQ
                        .OrderBy(g => g.DisplayOrder)
                        .Select(g => new MasterDataDto { 
                            Id = g.Id, Name = g.Name, Status = g.Status, 
                            IsActiveBackend = g.IsActiveBackend, IsActiveFrontend = g.IsActiveFrontend,
                            StartActiveDatetime = g.StartActiveDatetime, EndActiveDatetime = g.EndActiveDatetime,
                            DisplayOrder = g.DisplayOrder 
                        })
                        .ToListAsync());

                case "religion":
                case "religions":
                    var relQ = _context.Religions.AsQueryable();
                    if (!all) relQ = relQ.Where(r => r.IsActiveFrontend && (r.StartActiveDatetime == null || now >= r.StartActiveDatetime) && (r.EndActiveDatetime == null || now <= r.EndActiveDatetime) && r.Status == "active");
                    return Ok(await relQ
                        .OrderBy(r => r.DisplayOrder)
                        .Select(r => new MasterDataDto { 
                            Id = r.Id, Name = r.Name, Status = r.Status, 
                            IsActiveBackend = r.IsActiveBackend, IsActiveFrontend = r.IsActiveFrontend,
                            StartActiveDatetime = r.StartActiveDatetime, EndActiveDatetime = r.EndActiveDatetime,
                            DisplayOrder = r.DisplayOrder 
                        })
                        .ToListAsync());

                case "title":
                case "titles":
                    var titleQ = _context.Titles.AsQueryable();
                    if (!all) titleQ = titleQ.Where(t => t.IsActiveFrontend && (t.StartActiveDatetime == null || now >= t.StartActiveDatetime) && (t.EndActiveDatetime == null || now <= t.EndActiveDatetime) && t.Status == "active");
                    return Ok(await titleQ
                        .OrderBy(t => t.DisplayOrder)
                        .Select(t => new MasterDataDto { 
                            Id = t.Id, Name = t.Name, Status = t.Status, 
                            IsActiveBackend = t.IsActiveBackend, IsActiveFrontend = t.IsActiveFrontend,
                            StartActiveDatetime = t.StartActiveDatetime, EndActiveDatetime = t.EndActiveDatetime,
                            DisplayOrder = t.DisplayOrder 
                        })
                        .ToListAsync());

                case "territory":
                case "territories":
                    var terQ = _context.Territories.AsQueryable();
                    if (!all) terQ = terQ.Where(t => t.IsActiveFrontend && (t.StartActiveDatetime == null || now >= t.StartActiveDatetime) && (t.EndActiveDatetime == null || now <= t.EndActiveDatetime) && t.Status == "active");
                    return Ok(await terQ
                        .OrderBy(t => t.DisplayOrder)
                        .Select(t => new MasterDataDto { 
                            Id = t.Id, Name = t.Name, Status = t.Status, 
                            IsActiveBackend = t.IsActiveBackend, IsActiveFrontend = t.IsActiveFrontend,
                            StartActiveDatetime = t.StartActiveDatetime, EndActiveDatetime = t.EndActiveDatetime,
                            DisplayOrder = t.DisplayOrder 
                        })
                        .ToListAsync());

                case "expertise":
                case "expertises":
                    var expQ = _context.Expertises.AsQueryable();
                    if (!all) expQ = expQ.Where(e => e.IsActiveFrontend && (e.StartActiveDatetime == null || now >= e.StartActiveDatetime) && (e.EndActiveDatetime == null || now <= e.EndActiveDatetime) && e.Status == "active");
                    return Ok(await expQ
                        .OrderBy(e => e.DisplayOrder)
                        .Select(e => new MasterDataDto { 
                            Id = e.Id, Name = e.Name, Status = e.Status, 
                            IsActiveBackend = e.IsActiveBackend, IsActiveFrontend = e.IsActiveFrontend,
                            StartActiveDatetime = e.StartActiveDatetime, EndActiveDatetime = e.EndActiveDatetime,
                            DisplayOrder = e.DisplayOrder 
                        })
                        .ToListAsync());

                case "company":
                case "companies":
                    var comQ = _context.Companies.AsQueryable();
                    if (!all) comQ = comQ.Where(c => c.IsActiveFrontend && (c.StartActiveDatetime == null || now >= c.StartActiveDatetime) && (c.EndActiveDatetime == null || now <= c.EndActiveDatetime) && c.Status == "active");
                    return Ok(await comQ
                        .OrderBy(c => c.DisplayOrder)
                        .Select(c => new MasterDataDto { 
                            Id = c.Id, Name = c.Name, Status = c.Status, 
                            IsActiveBackend = c.IsActiveBackend, IsActiveFrontend = c.IsActiveFrontend,
                            StartActiveDatetime = c.StartActiveDatetime, EndActiveDatetime = c.EndActiveDatetime,
                            DisplayOrder = c.DisplayOrder 
                        })
                        .ToListAsync());

                case "renewcourse":
                case "renewcourses":
                    var rcQ = _context.RenewCourses.AsQueryable();
                    if (!all) rcQ = rcQ.Where(c => c.IsActiveFrontend && (c.StartActiveDatetime == null || now >= c.StartActiveDatetime) && (c.EndActiveDatetime == null || now <= c.EndActiveDatetime) && c.Status == "active");
                    var renewCourses = await rcQ
                        .OrderBy(c => c.DisplayOrder)
                        .Select(c => new MasterDataDto { 
                            Id = c.Id, 
                            Name = c.Name, 
                            DefaultPillarId = c.DefaultPillarId,
                            Status = c.Status, 
                            IsActiveBackend = c.IsActiveBackend,
                            IsActiveFrontend = c.IsActiveFrontend,
                            StartActiveDatetime = c.StartActiveDatetime,
                            EndActiveDatetime = c.EndActiveDatetime,
                            DisplayOrder = c.DisplayOrder 
                        })
                        .ToListAsync();

                    var pillarDict = await _context.RenewPillars.ToDictionaryAsync(p => p.Id, p => p.Name);

                    var currQ = _context.CourseCurriculums
                        .Include(c => c.SubDetails)
                        .Where(c => c.CourseType == "renew");
                    if (!all) currQ = currQ.Where(c => c.IsActiveFrontend && (c.StartActiveDatetime == null || now >= c.StartActiveDatetime) && (c.EndActiveDatetime == null || now <= c.EndActiveDatetime) && c.Status == "active");
                    var curriculums = await currQ.OrderBy(c => c.DisplayOrder).ToListAsync();
                    var curriculumsByCourseId = curriculums.GroupBy(c => c.CourseId).ToDictionary(g => g.Key, g => g.ToList());

                    foreach (var c in renewCourses)
                    {
                        if (c.DefaultPillarId.HasValue && pillarDict.TryGetValue(c.DefaultPillarId.Value, out var pName))
                        {
                            c.DefaultPillarName = pName;
                        }
                        if (curriculumsByCourseId.TryGetValue(c.Id, out var cList))
                        {
                            c.Curriculums = cList;
                        }
                    }
                    return Ok(renewCourses);

                case "pillar":
                case "pillars":
                    var pilQ = _context.RenewPillars.AsQueryable();
                    if (!all) pilQ = pilQ.Where(p => p.IsActiveFrontend && (p.StartActiveDatetime == null || now >= p.StartActiveDatetime) && (p.EndActiveDatetime == null || now <= p.EndActiveDatetime) && p.Status == "active");
                    return Ok(await pilQ
                        .OrderBy(p => p.DisplayOrder)
                        .Select(p => new MasterDataDto { 
                            Id = p.Id, Name = p.Name, Status = p.Status, 
                            IsActiveBackend = p.IsActiveBackend, IsActiveFrontend = p.IsActiveFrontend,
                            StartActiveDatetime = p.StartActiveDatetime, EndActiveDatetime = p.EndActiveDatetime,
                            DisplayOrder = p.DisplayOrder 
                        })
                        .ToListAsync());

                default:
                    return NotFound(new { message = $"Master data type '{type}' not found or not supported for generic API." });
            }
        }

        [HttpPost("{type}")]
        public async Task<IActionResult> CreateGenericMasterData(string type, [FromBody] MasterDataDto dto)
        {
            switch (type.ToLower())
            {
                case "blood":
                case "bloods":
                    var b = new Models.MstBlood { 
                        Name = dto.Name, Status = dto.Status, DisplayOrder = dto.DisplayOrder,
                        IsActiveBackend = dto.IsActiveBackend, IsActiveFrontend = dto.IsActiveFrontend,
                        StartActiveDatetime = dto.StartActiveDatetime, EndActiveDatetime = dto.EndActiveDatetime
                    };
                    _context.BloodTypes.Add(b); break;
                case "gender":
                case "genders":
                    var g = new Models.MstGender { 
                        Name = dto.Name, Status = dto.Status, DisplayOrder = dto.DisplayOrder,
                        IsActiveBackend = dto.IsActiveBackend, IsActiveFrontend = dto.IsActiveFrontend,
                        StartActiveDatetime = dto.StartActiveDatetime, EndActiveDatetime = dto.EndActiveDatetime
                    };
                    _context.Genders.Add(g); break;
                case "religion":
                case "religions":
                    var r = new Models.MstReligion { 
                        Name = dto.Name, Status = dto.Status, DisplayOrder = dto.DisplayOrder,
                        IsActiveBackend = dto.IsActiveBackend, IsActiveFrontend = dto.IsActiveFrontend,
                        StartActiveDatetime = dto.StartActiveDatetime, EndActiveDatetime = dto.EndActiveDatetime
                    };
                    _context.Religions.Add(r); break;
                case "title":
                case "titles":
                    var t = new Models.MstTitle { 
                        Name = dto.Name, Status = dto.Status, DisplayOrder = dto.DisplayOrder,
                        IsActiveBackend = dto.IsActiveBackend, IsActiveFrontend = dto.IsActiveFrontend,
                        StartActiveDatetime = dto.StartActiveDatetime, EndActiveDatetime = dto.EndActiveDatetime
                    };
                    _context.Titles.Add(t); break;
                case "renewcourse":
                case "renewcourses":
                    var c = new Models.MstRenewCourse { 
                        Name = dto.Name, 
                        DefaultPillarId = dto.DefaultPillarId,
                        Status = dto.Status, 
                        DisplayOrder = dto.DisplayOrder,
                        IsActiveBackend = dto.IsActiveBackend, 
                        IsActiveFrontend = dto.IsActiveFrontend,
                        StartActiveDatetime = dto.StartActiveDatetime, 
                        EndActiveDatetime = dto.EndActiveDatetime
                    };
                    _context.RenewCourses.Add(c); break;
                case "territory":
                case "territories":
                    var territory = new Models.MstTerritory { 
                        Name = dto.Name, Status = dto.Status, DisplayOrder = dto.DisplayOrder,
                        IsActiveBackend = dto.IsActiveBackend, IsActiveFrontend = dto.IsActiveFrontend,
                        StartActiveDatetime = dto.StartActiveDatetime, EndActiveDatetime = dto.EndActiveDatetime
                    };
                    _context.Territories.Add(territory); break;
                case "expertise":
                case "expertises":
                    var expertise = new Models.MstExpertise { 
                        Name = dto.Name, Status = dto.Status, DisplayOrder = dto.DisplayOrder,
                        IsActiveBackend = dto.IsActiveBackend, IsActiveFrontend = dto.IsActiveFrontend,
                        StartActiveDatetime = dto.StartActiveDatetime, EndActiveDatetime = dto.EndActiveDatetime
                    };
                    _context.Expertises.Add(expertise); break;
                case "company":
                case "companies":
                    var company = new Models.MstCompany { 
                        Name = dto.Name, Status = dto.Status, DisplayOrder = dto.DisplayOrder,
                        IsActiveBackend = dto.IsActiveBackend, IsActiveFrontend = dto.IsActiveFrontend,
                        StartActiveDatetime = dto.StartActiveDatetime, EndActiveDatetime = dto.EndActiveDatetime
                    };
                    _context.Companies.Add(company); break;
                case "pillar":
                case "pillars":
                    var pillar = new Models.MstRenewPillar { 
                        Name = dto.Name, Status = dto.Status, DisplayOrder = dto.DisplayOrder,
                        IsActiveBackend = dto.IsActiveBackend, IsActiveFrontend = dto.IsActiveFrontend,
                        StartActiveDatetime = dto.StartActiveDatetime, EndActiveDatetime = dto.EndActiveDatetime
                    };
                    _context.RenewPillars.Add(pillar); break;
                default:
                    return BadRequest("Invalid type");
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = "Created successfully" });
        }

        [HttpPut("{type}/{id}")]
        public async Task<IActionResult> UpdateGenericMasterData(string type, int id, [FromBody] MasterDataDto dto)
        {
            switch (type.ToLower())
            {
                case "blood":
                case "bloods":
                    var b = await _context.BloodTypes.FindAsync(id);
                    if (b == null) return NotFound();
                    b.Name = dto.Name; b.Status = dto.Status; b.DisplayOrder = dto.DisplayOrder;
                    b.IsActiveBackend = dto.IsActiveBackend; b.IsActiveFrontend = dto.IsActiveFrontend;
                    b.StartActiveDatetime = dto.StartActiveDatetime; b.EndActiveDatetime = dto.EndActiveDatetime;
                    break;
                case "gender":
                case "genders":
                    var g = await _context.Genders.FindAsync(id);
                    if (g == null) return NotFound();
                    g.Name = dto.Name; g.Status = dto.Status; g.DisplayOrder = dto.DisplayOrder;
                    g.IsActiveBackend = dto.IsActiveBackend; g.IsActiveFrontend = dto.IsActiveFrontend;
                    g.StartActiveDatetime = dto.StartActiveDatetime; g.EndActiveDatetime = dto.EndActiveDatetime;
                    break;
                case "religion":
                case "religions":
                    var r = await _context.Religions.FindAsync(id);
                    if (r == null) return NotFound();
                    r.Name = dto.Name; r.Status = dto.Status; r.DisplayOrder = dto.DisplayOrder;
                    r.IsActiveBackend = dto.IsActiveBackend; r.IsActiveFrontend = dto.IsActiveFrontend;
                    r.StartActiveDatetime = dto.StartActiveDatetime; r.EndActiveDatetime = dto.EndActiveDatetime;
                    break;
                case "title":
                case "titles":
                    var t = await _context.Titles.FindAsync(id);
                    if (t == null) return NotFound();
                    t.Name = dto.Name; t.Status = dto.Status; t.DisplayOrder = dto.DisplayOrder;
                    t.IsActiveBackend = dto.IsActiveBackend; t.IsActiveFrontend = dto.IsActiveFrontend;
                    t.StartActiveDatetime = dto.StartActiveDatetime; t.EndActiveDatetime = dto.EndActiveDatetime;
                    break;
                case "renewcourse":
                case "renewcourses":
                    var c = await _context.RenewCourses.FindAsync(id);
                    if (c == null) return NotFound();
                    c.Name = dto.Name; 
                    c.DefaultPillarId = dto.DefaultPillarId;
                    c.Status = dto.Status; 
                    c.DisplayOrder = dto.DisplayOrder;
                    c.IsActiveBackend = dto.IsActiveBackend; 
                    c.IsActiveFrontend = dto.IsActiveFrontend;
                    c.StartActiveDatetime = dto.StartActiveDatetime; 
                    c.EndActiveDatetime = dto.EndActiveDatetime;
                    break;
                case "territory":
                case "territories":
                    var territory = await _context.Territories.FindAsync(id);
                    if (territory == null) return NotFound();
                    territory.Name = dto.Name; territory.Status = dto.Status; territory.DisplayOrder = dto.DisplayOrder;
                    territory.IsActiveBackend = dto.IsActiveBackend; territory.IsActiveFrontend = dto.IsActiveFrontend;
                    territory.StartActiveDatetime = dto.StartActiveDatetime; territory.EndActiveDatetime = dto.EndActiveDatetime;
                    break;
                case "expertise":
                case "expertises":
                    var expertise = await _context.Expertises.FindAsync(id);
                    if (expertise == null) return NotFound();
                    expertise.Name = dto.Name; expertise.Status = dto.Status; expertise.DisplayOrder = dto.DisplayOrder;
                    expertise.IsActiveBackend = dto.IsActiveBackend; expertise.IsActiveFrontend = dto.IsActiveFrontend;
                    expertise.StartActiveDatetime = dto.StartActiveDatetime; expertise.EndActiveDatetime = dto.EndActiveDatetime;
                    break;
                case "company":
                case "companies":
                    var company = await _context.Companies.FindAsync(id);
                    if (company == null) return NotFound();
                    company.Name = dto.Name; company.Status = dto.Status; company.DisplayOrder = dto.DisplayOrder;
                    company.IsActiveBackend = dto.IsActiveBackend; company.IsActiveFrontend = dto.IsActiveFrontend;
                    company.StartActiveDatetime = dto.StartActiveDatetime; company.EndActiveDatetime = dto.EndActiveDatetime;
                    break;
                case "pillar":
                case "pillars":
                    var pillar = await _context.RenewPillars.FindAsync(id);
                    if (pillar == null) return NotFound();
                    pillar.Name = dto.Name; pillar.Status = dto.Status; pillar.DisplayOrder = dto.DisplayOrder;
                    pillar.IsActiveBackend = dto.IsActiveBackend; pillar.IsActiveFrontend = dto.IsActiveFrontend;
                    pillar.StartActiveDatetime = dto.StartActiveDatetime; pillar.EndActiveDatetime = dto.EndActiveDatetime;
                    break;
                default:
                    return BadRequest("Invalid type");
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = "Updated successfully" });
        }

        [HttpDelete("{type}/{id}")]
        public async Task<IActionResult> DeleteGenericMasterData(string type, int id)
        {
            // Instead of hard delete, we set status = inactive and is_active_frontend = false
            switch (type.ToLower())
            {
                case "blood":
                case "bloods":
                    var b = await _context.BloodTypes.FindAsync(id);
                    if (b != null) { b.Status = "inactive"; b.IsActiveFrontend = false; } break;
                case "gender":
                case "genders":
                    var g = await _context.Genders.FindAsync(id);
                    if (g != null) { g.Status = "inactive"; g.IsActiveFrontend = false; } break;
                case "religion":
                case "religions":
                    var r = await _context.Religions.FindAsync(id);
                    if (r != null) { r.Status = "inactive"; r.IsActiveFrontend = false; } break;
                case "title":
                case "titles":
                    var t = await _context.Titles.FindAsync(id);
                    if (t != null) { t.Status = "inactive"; t.IsActiveFrontend = false; } break;
                case "renewcourse":
                case "renewcourses":
                    var c = await _context.RenewCourses.FindAsync(id);
                    if (c != null) { c.Status = "inactive"; c.IsActiveFrontend = false; } break;
                case "territory":
                case "territories":
                    var territory = await _context.Territories.FindAsync(id);
                    if (territory != null) { territory.Status = "inactive"; territory.IsActiveFrontend = false; } break;
                case "expertise":
                case "expertises":
                    var expertise = await _context.Expertises.FindAsync(id);
                    if (expertise != null) { expertise.Status = "inactive"; expertise.IsActiveFrontend = false; } break;
                case "company":
                case "companies":
                    var company = await _context.Companies.FindAsync(id);
                    if (company != null) { company.Status = "inactive"; company.IsActiveFrontend = false; } break;
                case "pillar":
                case "pillars":
                    var pillar = await _context.RenewPillars.FindAsync(id);
                    if (pillar != null) { pillar.Status = "inactive"; pillar.IsActiveFrontend = false; } break;
                default:
                    return BadRequest("Invalid type");
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = "Deleted (soft) successfully" });
        }
    }
}
