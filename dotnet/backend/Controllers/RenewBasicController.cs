using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RenewBasicController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RenewBasicController(AppDbContext context)
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

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool all = false)
        {
            var query = _context.RenewBasics.AsQueryable();
            var now = DateTime.Now;
            if (!all)
            {
                query = query.Where(b => b.IsActiveFrontend 
                    && (b.StartActiveDatetime == null || now >= b.StartActiveDatetime) 
                    && (b.EndActiveDatetime == null || now <= b.EndActiveDatetime) 
                    && b.Status == "active");
            }

            var data = await query
                .OrderBy(x => x.Id)
                .ToListAsync();

            var currQ = _context.CourseCurriculums
                .Include(c => c.SubDetails)
                .Where(c => c.CourseType == "basic");
            if (!all)
            {
                currQ = currQ.Where(c => c.IsActiveFrontend && (c.StartActiveDatetime == null || now >= c.StartActiveDatetime) && (c.EndActiveDatetime == null || now <= c.EndActiveDatetime) && c.Status == "active");
            }
            var curriculums = await currQ.OrderBy(c => c.DisplayOrder).ToListAsync();

            var curriculumsByCourseId = curriculums.GroupBy(c => c.CourseId).ToDictionary(g => g.Key, g => g.ToList());

            var result = data.Select(b => new {
                b.Id,
                b.CourseName,
                b.Status,
                b.DateId,
                b.AgentType,
                b.IsActiveBackend,
                b.IsActiveFrontend,
                b.StartActiveDatetime,
                b.EndActiveDatetime,
                Curriculums = curriculumsByCourseId.GetValueOrDefault(b.Id, new List<MstCourseCurriculum>())
            });

            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] MstRenewBasic model)
        {
            _context.RenewBasics.Add(model);
            await _context.SaveChangesAsync();
            return Ok(model);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] MstRenewBasic model)
        {
            var existing = await _context.RenewBasics.FindAsync(id);
            if (existing == null) return NotFound();
            existing.CourseName = model.CourseName;
            existing.AgentType = model.AgentType;
            existing.DateId = model.DateId;
            existing.Status = model.Status;
            existing.IsActiveBackend = model.IsActiveBackend;
            existing.IsActiveFrontend = model.IsActiveFrontend;
            existing.StartActiveDatetime = model.StartActiveDatetime;
            existing.EndActiveDatetime = model.EndActiveDatetime;
            
            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _context.RenewBasics.FindAsync(id);
            if (existing == null) return NotFound();

            existing.Status = "inactive";
            existing.IsActiveFrontend = false;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Deleted successfully" });
        }
    }
}
