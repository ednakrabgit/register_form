using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RenewDataController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RenewDataController(AppDbContext context)
        {
            _context = context;
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

        // --- Renew Dates ---
        [HttpGet("dates")]
        public async Task<IActionResult> GetRenewDates([FromQuery] bool all = false)
        {
            var query = _context.RenewDates.AsQueryable();
            if (!all)
            {
                var now = DateTime.Now;
                var advanceDays = await GetAdvanceExpiryDaysAsync();
                var cutoffDate = DateTime.Today.AddDays(advanceDays);
                query = query.Where(d => d.IsActiveFrontend 
                    && (d.StartActiveDatetime == null || now >= d.StartActiveDatetime) 
                    && (d.EndActiveDatetime == null || now <= d.EndActiveDatetime) 
                    && d.Status == "active"
                    && d.CourseDate >= cutoffDate);
            }
            return Ok(await query.OrderBy(d => d.DisplayOrder).ToListAsync());
        }

        [HttpPost("dates")]
        public async Task<IActionResult> CreateRenewDate([FromBody] MstRenewDate dto)
        {
            _context.RenewDates.Add(dto);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Created successfully" });
        }

        [HttpPut("dates/{id}")]
        public async Task<IActionResult> UpdateRenewDate(int id, [FromBody] MstRenewDate dto)
        {
            var existing = await _context.RenewDates.FindAsync(id);
            if (existing == null) return NotFound();
            
            existing.Status = dto.Status;
            existing.DisplayOrder = dto.DisplayOrder;
            existing.CourseDateDisplay = dto.CourseDateDisplay;
            existing.CourseDate = dto.CourseDate;
            existing.IsActiveBackend = dto.IsActiveBackend;
            existing.IsActiveFrontend = dto.IsActiveFrontend;
            existing.StartActiveDatetime = dto.StartActiveDatetime;
            existing.EndActiveDatetime = dto.EndActiveDatetime;
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "Updated successfully" });
        }

        [HttpDelete("dates/{id}")]
        public async Task<IActionResult> DeleteRenewDate(int id)
        {
            var existing = await _context.RenewDates.FindAsync(id);
            if (existing != null) {
                existing.Status = "inactive";
                existing.IsActiveFrontend = false;
                await _context.SaveChangesAsync();
            }
            return Ok(new { message = "Deleted successfully" });
        }

        // --- Renew Mappings ---
        [HttpGet("mappings")]
        public async Task<IActionResult> GetRenewMappings([FromQuery] bool all = false)
        {
            var now = DateTime.Now;
            var advanceDays = await GetAdvanceExpiryDaysAsync();
            var cutoffDate = DateTime.Today.AddDays(advanceDays);

            var query = _context.RenewOthers
                .Join(_context.RenewPillars, o => o.PillarId, p => p.Id, (o, p) => new { o, p })
                .Join(_context.RenewDates, x => x.o.DateId, d => d.Id, (x, d) => new { x.o, x.p, d })
                .Join(_context.RenewCourses, y => y.o.SubjectId, c => c.Id, (y, c) => new { 
                    Id = y.o.Id,
                    PillarId = y.o.PillarId,
                    PillarName = y.p.Name,
                    DateId = y.o.DateId,
                    DateDisplay = y.d.CourseDateDisplay,
                    CourseDate = y.d.CourseDate,
                    SubjectId = y.o.SubjectId,
                    SubjectName = c.Name,
                    Status = y.o.Status,
                    IsActiveBackend = y.o.IsActiveBackend,
                    IsActiveFrontend = y.o.IsActiveFrontend,
                    StartActiveDatetime = y.o.StartActiveDatetime,
                    EndActiveDatetime = y.o.EndActiveDatetime,
                    DisplayOrder = y.o.DisplayOrder
                });
            
            if (!all)
            {
                query = query.Where(m => m.IsActiveFrontend 
                    && (m.StartActiveDatetime == null || now >= m.StartActiveDatetime) 
                    && (m.EndActiveDatetime == null || now <= m.EndActiveDatetime) 
                    && m.Status == "active"
                    && m.CourseDate >= cutoffDate);
            }
            
            return Ok(await query.OrderBy(m => m.DisplayOrder).ToListAsync());
        }

        [HttpPost("mappings")]
        public async Task<IActionResult> CreateRenewMapping([FromBody] MstRenewOther dto)
        {
            _context.RenewOthers.Add(dto);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Created successfully" });
        }

        [HttpPut("mappings/{id}")]
        public async Task<IActionResult> UpdateRenewMapping(int id, [FromBody] MstRenewOther dto)
        {
            var existing = await _context.RenewOthers.FindAsync(id);
            if (existing == null) return NotFound();
            
            existing.PillarId = dto.PillarId;
            existing.DateId = dto.DateId;
            existing.SubjectId = dto.SubjectId;
            existing.Status = dto.Status;
            existing.DisplayOrder = dto.DisplayOrder;
            existing.IsActiveBackend = dto.IsActiveBackend;
            existing.IsActiveFrontend = dto.IsActiveFrontend;
            existing.StartActiveDatetime = dto.StartActiveDatetime;
            existing.EndActiveDatetime = dto.EndActiveDatetime;
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "Updated successfully" });
        }

        [HttpDelete("mappings/{id}")]
        public async Task<IActionResult> DeleteRenewMapping(int id)
        {
            var existing = await _context.RenewOthers.FindAsync(id);
            if (existing != null) {
                existing.Status = "inactive";
                existing.IsActiveFrontend = false;
                await _context.SaveChangesAsync();
            }
            return Ok(new { message = "Deleted successfully" });
        }
    }
}
