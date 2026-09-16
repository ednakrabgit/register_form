using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CourseCurriculumController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CourseCurriculumController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] string? courseType, [FromQuery] int? courseId, [FromQuery] bool all = false)
        {
            var query = _context.CourseCurriculums
                .Include(c => c.SubDetails.OrderBy(s => s.DisplayOrder))
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrEmpty(courseType))
            {
                query = query.Where(c => c.CourseType == courseType);
            }

            if (courseId.HasValue)
            {
                query = query.Where(c => c.CourseId == courseId.Value);
            }

            if (!all)
            {
                var now = DateTime.Now;
                query = query.Where(c => c.IsActiveFrontend && (c.StartActiveDatetime == null || now >= c.StartActiveDatetime) && (c.EndActiveDatetime == null || now <= c.EndActiveDatetime) && c.Status == "active");
            }

            var list = await query.OrderBy(c => c.DisplayOrder).ToListAsync();
            return Ok(list);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _context.CourseCurriculums
                .Include(c => c.SubDetails.OrderBy(s => s.DisplayOrder))
                .FirstOrDefaultAsync(c => c.Id == id);

            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] MstCourseCurriculum model)
        {
            if (string.IsNullOrWhiteSpace(model.CourseType) || model.CourseId <= 0)
            {
                return BadRequest(new { message = "CourseType and CourseId are required" });
            }

            _context.CourseCurriculums.Add(model);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = model.Id }, model);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] MstCourseCurriculum model)
        {
            if (id != model.Id) return BadRequest();

            var existing = await _context.CourseCurriculums
                .Include(c => c.SubDetails)
                .FirstOrDefaultAsync(c => c.Id == id);
            if (existing == null) return NotFound();

            existing.AgentType = model.AgentType;
            existing.TrainingCourseCode = model.TrainingCourseCode;
            existing.AnnouncementCode = model.AnnouncementCode;
            existing.CurriculumCode = model.CurriculumCode;
            existing.CourseShortName = model.CourseShortName;
            existing.DisplayOrder = model.DisplayOrder;
            existing.Status = model.Status;
            existing.IsActiveBackend = model.IsActiveBackend;
            existing.IsActiveFrontend = model.IsActiveFrontend;
            existing.StartActiveDatetime = model.StartActiveDatetime;
            existing.EndActiveDatetime = model.EndActiveDatetime;

            if (model.SubDetails != null)
            {
                var incomingIds = model.SubDetails.Where(s => s.Id > 0).Select(s => s.Id).ToList();
                var toRemove = existing.SubDetails.Where(s => !incomingIds.Contains(s.Id)).ToList();
                _context.CourseSubDetails.RemoveRange(toRemove);

                foreach (var sub in model.SubDetails)
                {
                    if (sub.Id > 0)
                    {
                        var existingSub = existing.SubDetails.FirstOrDefault(s => s.Id == sub.Id);
                        if (existingSub != null)
                        {
                            existingSub.OicCourseCode = sub.OicCourseCode;
                            existingSub.SubCourseName = sub.SubCourseName;
                            existingSub.Hours = sub.Hours;
                            existingSub.DisplayOrder = sub.DisplayOrder;
                            existingSub.Status = sub.Status;
                            existingSub.IsActiveBackend = sub.IsActiveBackend;
                            existingSub.IsActiveFrontend = sub.IsActiveFrontend;
                            existingSub.StartActiveDatetime = sub.StartActiveDatetime;
                            existingSub.EndActiveDatetime = sub.EndActiveDatetime;
                        }
                    }
                    else
                    {
                        sub.CurriculumId = id;
                        _context.CourseSubDetails.Add(sub);
                    }
                }
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _context.CourseCurriculums
                .Include(c => c.SubDetails)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (existing == null) return NotFound();

            _context.CourseSubDetails.RemoveRange(existing.SubDetails);
            _context.CourseCurriculums.Remove(existing);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // --- Sub Detail Endpoints ---

        [HttpPost("{curriculumId}/sub-detail")]
        public async Task<IActionResult> AddSubDetail(int curriculumId, [FromBody] MstCourseSubDetail subDetail)
        {
            var curriculum = await _context.CourseCurriculums.FindAsync(curriculumId);
            if (curriculum == null) return NotFound(new { message = "Curriculum not found" });

            subDetail.CurriculumId = curriculumId;
            _context.CourseSubDetails.Add(subDetail);
            await _context.SaveChangesAsync();

            return Ok(subDetail);
        }

        [HttpPut("sub-detail/{id}")]
        public async Task<IActionResult> UpdateSubDetail(int id, [FromBody] MstCourseSubDetail subDetail)
        {
            if (id != subDetail.Id) return BadRequest();

            var existing = await _context.CourseSubDetails.FindAsync(id);
            if (existing == null) return NotFound();

            existing.OicCourseCode = subDetail.OicCourseCode;
            existing.SubCourseName = subDetail.SubCourseName;
            existing.Hours = subDetail.Hours;
            existing.DisplayOrder = subDetail.DisplayOrder;
            existing.Status = subDetail.Status;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("sub-detail/{id}")]
        public async Task<IActionResult> DeleteSubDetail(int id)
        {
            var existing = await _context.CourseSubDetails.FindAsync(id);
            if (existing == null) return NotFound();

            _context.CourseSubDetails.Remove(existing);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
