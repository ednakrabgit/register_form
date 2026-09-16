using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using System.Text.RegularExpressions;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        public class CreateUserDto
        {
            public string Username { get; set; } = null!;
            public string? Email { get; set; }
            public string Password { get; set; } = null!;
            public string Role { get; set; } = "Applicant"; // Superadmin, Admin, Viewer, Applicant
            public string? NationId { get; set; }
            public string? TitleTh { get; set; }
            public string? FirstName { get; set; }
            public string? LastName { get; set; }
            public string? FullName { get; set; }
            public string? Phone { get; set; }
            public bool IsActive { get; set; } = true;
        }

        public class UpdateUserDto
        {
            public string? Email { get; set; }
            public string Role { get; set; } = "Applicant";
            public string? NationId { get; set; }
            public string? TitleTh { get; set; }
            public string? FirstName { get; set; }
            public string? LastName { get; set; }
            public string? FullName { get; set; }
            public string? Phone { get; set; }
            public bool IsActive { get; set; } = true;
        }

        public class ChangePasswordDto
        {
            public string NewPassword { get; set; } = null!;
        }

        /// <summary>
        /// ดึงรายชื่อผู้ใช้งานทั้งหมด พร้อมระบบค้นหาและกรอง Role
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] string? search, [FromQuery] string? role, [FromQuery] bool? isActive)
        {
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(role) && role != "all")
            {
                query = query.Where(u => u.Role == role);
            }

            if (isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == isActive.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(u => 
                    u.Username.ToLower().Contains(s) ||
                    (u.Email != null && u.Email.ToLower().Contains(s)) ||
                    (u.FullName != null && u.FullName.ToLower().Contains(s)) ||
                    (u.NationId != null && u.NationId.Contains(s)) ||
                    (u.Phone != null && u.Phone.Contains(s))
                );
            }

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.Email,
                    u.Role,
                    u.NationId,
                    u.FullName,
                    u.Phone,
                    u.IsActive,
                    u.IsEmailVerified,
                    u.LastLoginAt,
                    u.CreatedAt,
                    u.UpdatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        /// <summary>
        /// ดึงข้อมูลผู้ใช้งานรายบุคคล
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "ไม่พบผู้ใช้งาน" });

            return Ok(new
            {
                user.Id,
                user.Username,
                user.Email,
                user.Role,
                user.NationId,
                user.FullName,
                user.Phone,
                user.IsActive,
                user.IsEmailVerified,
                user.LastLoginAt,
                user.CreatedAt,
                user.UpdatedAt
            });
        }

        /// <summary>
        /// สร้างผู้ใช้งานใหม่
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
        {
            var callerRole = backend.Common.RoleHierarchy.GetCallerRole(HttpContext);

            if (!backend.Common.RoleHierarchy.CanManageRole(callerRole, dto.Role))
            {
                return StatusCode(403, new { message = $"การสร้างผู้ใช้งานต้องทำโดย Role ที่มีระดับสิทธิ์สูงกว่าเท่านั้น บัญชีระดับ '{callerRole}' ไม่สามารถสร้างผู้ใช้งานระดับ '{dto.Role}' ได้" });
            }

            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "กรุณาระบุชื่อผู้ใช้และรหัสผ่าน" });
            }

            var cleanUsername = dto.Username.Trim();
            var cleanEmail = dto.Email?.Trim().ToLower();

            // Check duplicate username
            var existingUsername = await _context.Users.AnyAsync(u => u.Username.ToLower() == cleanUsername.ToLower());
            if (existingUsername)
            {
                return BadRequest(new { message = "ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว" });
            }

            // Check duplicate email if provided
            if (!string.IsNullOrEmpty(cleanEmail))
            {
                var existingEmail = await _context.Users.AnyAsync(u => u.Email != null && u.Email.ToLower() == cleanEmail);
                if (existingEmail)
                {
                    return BadRequest(new { message = "อีเมลนี้มีอยู่ในระบบแล้ว" });
                }
            }

            string? cleanNationId = null;
            if (!string.IsNullOrWhiteSpace(dto.NationId))
            {
                cleanNationId = Regex.Replace(dto.NationId, @"\D", "");
                if (cleanNationId.Length != 13)
                {
                    return BadRequest(new { message = "เลขประจำตัวประชาชนต้องเป็นตัวเลข 13 หลัก" });
                }
            }

            var cleanFullName = !string.IsNullOrWhiteSpace(dto.FullName)
                ? dto.FullName.Trim()
                : $"{dto.TitleTh}{dto.FirstName} {dto.LastName}".Trim();

            var newUser = new User
            {
                Username = cleanUsername,
                Email = cleanEmail ?? (dto.Role == "Applicant" ? cleanUsername : null),
                PasswordHash = dto.Password, // Plain/hash
                Role = dto.Role,
                NationId = cleanNationId,
                FullName = cleanFullName,
                Phone = dto.Phone?.Trim(),
                IsActive = dto.IsActive,
                IsEmailVerified = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(newUser);

            // Sync with Person table if NationId is provided
            if (!string.IsNullOrWhiteSpace(cleanNationId))
            {
                var person = await _context.Persons.FirstOrDefaultAsync(p => p.NationId == cleanNationId);
                if (person == null)
                {
                    person = new Person
                    {
                        NationId = cleanNationId,
                        TitleTh = dto.TitleTh,
                        FirstNameTh = dto.FirstName ?? cleanFullName,
                        LastNameTh = dto.LastName,
                        PhoneOtp = dto.Phone?.Trim(),
                        EmailAlt = cleanEmail
                    };
                    _context.Persons.Add(person);
                }
                else
                {
                    if (!string.IsNullOrWhiteSpace(dto.TitleTh)) person.TitleTh = dto.TitleTh;
                    if (!string.IsNullOrWhiteSpace(dto.FirstName)) person.FirstNameTh = dto.FirstName;
                    if (!string.IsNullOrWhiteSpace(dto.LastName)) person.LastNameTh = dto.LastName;
                    if (!string.IsNullOrWhiteSpace(dto.Phone)) person.PhoneOtp = dto.Phone.Trim();
                    if (!string.IsNullOrWhiteSpace(cleanEmail)) person.EmailAlt = cleanEmail;
                }
            }

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUser), new { id = newUser.Id }, new
            {
                newUser.Id,
                newUser.Username,
                newUser.Email,
                newUser.Role,
                newUser.NationId,
                newUser.FullName,
                newUser.Phone,
                newUser.IsActive,
                newUser.CreatedAt
            });
        }

        /// <summary>
        /// แก้ไขข้อมูลผู้ใช้งาน
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
        {
            var callerRole = backend.Common.RoleHierarchy.GetCallerRole(HttpContext);

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "ไม่พบผู้ใช้งาน" });

            if (!backend.Common.RoleHierarchy.CanManageRole(callerRole, user.Role))
            {
                return StatusCode(403, new { message = $"การจัดการผู้ใช้งานต้องทำโดย Role ที่มีระดับสิทธิ์สูงกว่าเท่านั้น บัญชีระดับ '{callerRole}' ไม่สามารถแก้ไขผู้ใช้งานระดับ '{user.Role}' ได้" });
            }

            if (!backend.Common.RoleHierarchy.CanManageRole(callerRole, dto.Role))
            {
                return StatusCode(403, new { message = $"บัญชีระดับ '{callerRole}' ไม่สามารถปรับระดับสิทธิ์ผู้ใช้งานเป็น '{dto.Role}' ได้" });
            }

            var cleanEmail = dto.Email?.Trim().ToLower();
            if (!string.IsNullOrEmpty(cleanEmail) && cleanEmail != user.Email?.ToLower())
            {
                var existingEmail = await _context.Users.AnyAsync(u => u.Id != id && u.Email != null && u.Email.ToLower() == cleanEmail);
                if (existingEmail)
                {
                    return BadRequest(new { message = "อีเมลนี้มีผู้ใช้งานอื่นใช้แล้ว" });
                }
                user.Email = cleanEmail;
            }

            string? cleanNationId = null;
            if (!string.IsNullOrWhiteSpace(dto.NationId))
            {
                cleanNationId = Regex.Replace(dto.NationId, @"\D", "");
                user.NationId = cleanNationId;
            }
            else
            {
                user.NationId = null;
            }

            var cleanFullName = !string.IsNullOrWhiteSpace(dto.FullName)
                ? dto.FullName.Trim()
                : $"{dto.TitleTh}{dto.FirstName} {dto.LastName}".Trim();

            user.Role = dto.Role;
            user.FullName = cleanFullName;
            user.Phone = dto.Phone?.Trim();
            user.IsActive = dto.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            // Sync with Person table if NationId is present
            if (!string.IsNullOrWhiteSpace(cleanNationId))
            {
                var person = await _context.Persons.FirstOrDefaultAsync(p => p.NationId == cleanNationId);
                if (person == null)
                {
                    person = new Person
                    {
                        NationId = cleanNationId,
                        TitleTh = dto.TitleTh,
                        FirstNameTh = dto.FirstName ?? cleanFullName,
                        LastNameTh = dto.LastName,
                        PhoneOtp = dto.Phone?.Trim(),
                        EmailAlt = cleanEmail
                    };
                    _context.Persons.Add(person);
                }
                else
                {
                    if (!string.IsNullOrWhiteSpace(dto.TitleTh)) person.TitleTh = dto.TitleTh;
                    if (!string.IsNullOrWhiteSpace(dto.FirstName)) person.FirstNameTh = dto.FirstName;
                    if (!string.IsNullOrWhiteSpace(dto.LastName)) person.LastNameTh = dto.LastName;
                    if (!string.IsNullOrWhiteSpace(dto.Phone)) person.PhoneOtp = dto.Phone.Trim();
                    if (!string.IsNullOrWhiteSpace(cleanEmail)) person.EmailAlt = cleanEmail;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "อัปเดตข้อมูลผู้ใช้งานสำเร็จ", user });
        }

        /// <summary>
        /// เปลี่ยนรหัสผ่านให้ผู้ใช้งาน
        /// </summary>
        [HttpPut("{id}/password")]
        public async Task<IActionResult> ChangePassword(int id, [FromBody] ChangePasswordDto dto)
        {
            var callerRole = backend.Common.RoleHierarchy.GetCallerRole(HttpContext);

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "ไม่พบผู้ใช้งาน" });

            if (!backend.Common.RoleHierarchy.CanManageRole(callerRole, user.Role))
            {
                return StatusCode(403, new { message = $"การเปลี่ยนรหัสผ่านต้องทำโดย Role ที่มีระดับสิทธิ์สูงกว่าเท่านั้น บัญชีระดับ '{callerRole}' ไม่สามารถเปลี่ยนรหัสผ่านของผู้ใช้งานระดับ '{user.Role}' ได้" });
            }

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 4)
            {
                return BadRequest(new { message = "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร" });
            }

            user.PasswordHash = dto.NewPassword;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"เปลี่ยนรหัสผ่านสำหรับผู้ใช้ {user.Username} สำเร็จ" });
        }

        /// <summary>
        /// สลับสถานะเปิด/ปิดการใช้งานผู้ใช้ (Toggle Active/Inactive)
        /// </summary>
        [HttpPatch("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(int id)
        {
            var callerRole = backend.Common.RoleHierarchy.GetCallerRole(HttpContext);

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "ไม่พบผู้ใช้งาน" });

            if (!backend.Common.RoleHierarchy.CanManageRole(callerRole, user.Role))
            {
                return StatusCode(403, new { message = $"การระงับหรือเปิดใช้งานบัญชีต้องทำโดย Role ที่มีระดับสิทธิ์สูงกว่าเท่านั้น บัญชีระดับ '{callerRole}' ไม่สามารถจัดการบัญชีระดับ '{user.Role}' ได้" });
            }

            user.IsActive = !user.IsActive;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"เปลี่ยนสถานะเป็น {(user.IsActive ? "เปิดใช้งาน" : "ระงับการใช้งาน")} สำเร็จ", isActive = user.IsActive });
        }

        /// <summary>
        /// ลบผู้ใช้งานออกจากระบบ
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var callerRole = backend.Common.RoleHierarchy.GetCallerRole(HttpContext);

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "ไม่พบผู้ใช้งาน" });

            if (!backend.Common.RoleHierarchy.CanManageRole(callerRole, user.Role))
            {
                return StatusCode(403, new { message = $"การลบผู้ใช้งานต้องทำโดย Role ที่มีระดับสิทธิ์สูงกว่าเท่านั้น บัญชีระดับ '{callerRole}' ไม่สามารถลบผู้ใช้งานระดับ '{user.Role}' ได้" });
            }

            if (user.Role == "Superadmin" || user.Username.ToLower() == "superadmin" || user.Username.ToLower() == "admin")
            {
                return BadRequest(new { message = "ไม่อนุญาตให้ลบบัญชีผู้ดูแลระบบหลักของระบบ" });
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "ลบผู้ใช้งานสำเร็จ" });
        }
    }
}
