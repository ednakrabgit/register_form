using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RolesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RolesController(AppDbContext context)
        {
            _context = context;
        }

        public class RolePermissionDto
        {
            public string MenuKey { get; set; } = null!;
            public bool CanView { get; set; }
            public bool CanEdit { get; set; }
        }

        public class CreateRoleDto
        {
            public string RoleCode { get; set; } = null!;
            public string RoleName { get; set; } = null!;
            public string? Description { get; set; }
            public List<RolePermissionDto>? Permissions { get; set; }
        }

        public class UpdateRoleDto
        {
            public string RoleName { get; set; } = null!;
            public string? Description { get; set; }
            public List<RolePermissionDto>? Permissions { get; set; }
        }

        public class CreateMenuDto
        {
            public string MenuKey { get; set; } = null!;
            public string MenuName { get; set; } = null!;
            public string Category { get; set; } = "Admin";
            public string? Icon { get; set; }
            public string? Path { get; set; }
            public int SortOrder { get; set; } = 0;
        }

        public class UpdateMenuDto
        {
            public string MenuName { get; set; } = null!;
            public string Category { get; set; } = "Admin";
            public string? Icon { get; set; }
            public string? Path { get; set; }
            public int SortOrder { get; set; } = 0;
        }

        /// <summary>
        /// ดึงรายการเมนูทั้งหมดที่สามารถกำหนดสิทธิ์ได้
        /// </summary>
        [HttpGet("menus")]
        public async Task<IActionResult> GetMenus()
        {
            var menus = await _context.Menus
                .OrderBy(m => m.SortOrder)
                .ToListAsync();
            return Ok(menus);
        }

        /// <summary>
        /// สร้างเมนูระบบใหม่ เพื่อให้สามารถกำหนดสิทธิ์และแสดงผลใน Sidebar ได้ทันที
        /// </summary>
        [HttpPost("menus")]
        public async Task<IActionResult> CreateMenu([FromBody] CreateMenuDto dto)
        {
            var callerRole = backend.Common.RoleHierarchy.GetCallerRole(HttpContext);
            if (!string.Equals(callerRole, "Superadmin", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(callerRole, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(403, new { message = "เฉพาะผู้ดูแลระบบ (Superadmin / Admin) เท่านั้นที่สามารถเพิ่มเมนูระบบได้" });
            }

            if (string.IsNullOrWhiteSpace(dto.MenuKey) || string.IsNullOrWhiteSpace(dto.MenuName))
            {
                return BadRequest(new { message = "กรุณาระบุ Menu Key และชื่อเมนู" });
            }

            var cleanKey = dto.MenuKey.Trim().ToLower().Replace(" ", "_");
            var exists = await _context.Menus.AnyAsync(m => m.MenuKey.ToLower() == cleanKey);
            if (exists)
            {
                return BadRequest(new { message = $"Menu Key '{cleanKey}' มีอยู่ในระบบแล้ว" });
            }

            int nextSort = dto.SortOrder > 0 ? dto.SortOrder : (await _context.Menus.MaxAsync(m => (int?)m.SortOrder) ?? 0) + 1;

            var menu = new Menu
            {
                MenuKey = cleanKey,
                MenuName = dto.MenuName.Trim(),
                Category = string.IsNullOrWhiteSpace(dto.Category) ? "Admin" : dto.Category.Trim(),
                Icon = string.IsNullOrWhiteSpace(dto.Icon) ? "fas fa-circle" : dto.Icon.Trim(),
                Path = string.IsNullOrWhiteSpace(dto.Path) ? $"/admin/{cleanKey}" : dto.Path.Trim(),
                SortOrder = nextSort
            };

            _context.Menus.Add(menu);
            await _context.SaveChangesAsync();

            // Auto-grant full access to Superadmin for newly created menu
            var superadmin = await _context.Roles.FirstOrDefaultAsync(r => r.RoleCode.ToLower() == "superadmin");
            if (superadmin != null)
            {
                var existingSuperPerm = await _context.RolePermissions.FirstOrDefaultAsync(p => p.RoleId == superadmin.Id && p.MenuKey == menu.MenuKey);
                if (existingSuperPerm == null)
                {
                    _context.RolePermissions.Add(new RolePermission
                    {
                        RoleId = superadmin.Id,
                        MenuKey = menu.MenuKey,
                        CanView = true,
                        CanEdit = true
                    });
                    await _context.SaveChangesAsync();
                }
            }

            return Ok(new { message = "เพิ่มเมนูระบบสำเร็จ", menu });
        }

        /// <summary>
        /// อัปเดตข้อมูลเมนูระบบ
        /// </summary>
        [HttpPut("menus/{id}")]
        public async Task<IActionResult> UpdateMenu(int id, [FromBody] UpdateMenuDto dto)
        {
            var callerRole = backend.Common.RoleHierarchy.GetCallerRole(HttpContext);
            if (!string.Equals(callerRole, "Superadmin", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(callerRole, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(403, new { message = "เฉพาะผู้ดูแลระบบ (Superadmin / Admin) เท่านั้นที่สามารถแก้ไขเมนูระบบได้" });
            }

            var menu = await _context.Menus.FindAsync(id);
            if (menu == null) return NotFound(new { message = "ไม่พบเมนูนี้ในระบบ" });

            menu.MenuName = dto.MenuName.Trim();
            menu.Category = string.IsNullOrWhiteSpace(dto.Category) ? "Admin" : dto.Category.Trim();
            menu.Icon = string.IsNullOrWhiteSpace(dto.Icon) ? "fas fa-circle" : dto.Icon.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Path)) menu.Path = dto.Path.Trim();
            if (dto.SortOrder > 0) menu.SortOrder = dto.SortOrder;

            await _context.SaveChangesAsync();
            return Ok(new { message = "อัปเดตข้อมูลเมนูสำเร็จ", menu });
        }

        /// <summary>
        /// ลบเมนูระบบ (เฉพาะเมนูที่สร้างขึ้นเอง ไม่อนุญาตให้ลบ Core Menus)
        /// </summary>
        [HttpDelete("menus/{id}")]
        public async Task<IActionResult> DeleteMenu(int id)
        {
            var callerRole = backend.Common.RoleHierarchy.GetCallerRole(HttpContext);
            if (!string.Equals(callerRole, "Superadmin", StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(403, new { message = "เฉพาะ Superadmin เท่านั้นที่สามารถลบเมนูระบบได้" });
            }

            var menu = await _context.Menus.FindAsync(id);
            if (menu == null) return NotFound(new { message = "ไม่พบเมนูนี้ในระบบ" });

            var coreKeys = new[] { "dashboard", "profile", "trainees", "training_import", "reports", "users", "config", "master_data", "audit_logs", "system_logs", "registration_form", "my_registrations" };
            if (coreKeys.Contains(menu.MenuKey.ToLower()))
            {
                return BadRequest(new { message = "ไม่อนุญาตให้ลบเมนูหลักของระบบ (Core System Menu)" });
            }

            var perms = await _context.RolePermissions.Where(p => p.MenuKey == menu.MenuKey).ToListAsync();
            _context.RolePermissions.RemoveRange(perms);

            _context.Menus.Remove(menu);
            await _context.SaveChangesAsync();

            return Ok(new { message = "ลบเมนูระบบสำเร็จ" });
        }

        /// <summary>
        /// ดึงรายการ Roles ทั้งหมด พร้อมจำนวนผู้ใช้งานและสรุปสิทธิ์
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _context.Roles
                .Include(r => r.Permissions)
                .OrderBy(r => r.Id)
                .ToListAsync();

            var userCounts = await _context.Users
                .GroupBy(u => u.Role)
                .Select(g => new { Role = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Role, x => x.Count);

            var result = roles.Select(r => new
            {
                r.Id,
                r.RoleCode,
                r.RoleName,
                r.Description,
                r.IsSystem,
                r.CreatedAt,
                r.UpdatedAt,
                UserCount = userCounts.ContainsKey(r.RoleCode) ? userCounts[r.RoleCode] : 0,
                ViewableMenuCount = r.Permissions.Count(p => p.CanView),
                EditableMenuCount = r.Permissions.Count(p => p.CanEdit)
            });

            return Ok(result);
        }

        /// <summary>
        /// ดึงข้อมูล Role และตารางสิทธิ์ตาม ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRole(int id)
        {
            var role = await _context.Roles
                .Include(r => r.Permissions)
                .SingleOrDefaultAsync(r => r.Id == id);

            if (role == null) return NotFound(new { message = "ไม่พบ Role นี้ในระบบ" });

            var allMenus = await _context.Menus.OrderBy(m => m.SortOrder).ToListAsync();

            var permissionsMatrix = allMenus.Select(m =>
            {
                var existing = role.Permissions.FirstOrDefault(p => p.MenuKey == m.MenuKey);
                return new
                {
                    m.MenuKey,
                    m.MenuName,
                    m.Category,
                    m.Icon,
                    m.Path,
                    CanView = existing?.CanView ?? false,
                    CanEdit = existing?.CanEdit ?? false
                };
            }).ToList();

            return Ok(new
            {
                role.Id,
                role.RoleCode,
                role.RoleName,
                role.Description,
                role.IsSystem,
                role.CreatedAt,
                role.UpdatedAt,
                Permissions = permissionsMatrix
            });
        }

        /// <summary>
        /// ดึงตารางสิทธิ์การใช้งานตาม RoleCode
        /// </summary>
        [HttpGet("by-code/{roleCode}")]
        public async Task<IActionResult> GetRoleByCode(string roleCode)
        {
            var role = await _context.Roles
                .Include(r => r.Permissions)
                .SingleOrDefaultAsync(r => r.RoleCode.ToLower() == roleCode.Trim().ToLower());

            if (role == null)
            {
                // Fallback permissions based on role code
                return Ok(new List<object>());
            }

            var permissions = role.Permissions.Select(p => new
            {
                p.MenuKey,
                p.CanView,
                p.CanEdit
            }).ToList();

            return Ok(new
            {
                role.RoleCode,
                role.RoleName,
                Permissions = permissions
            });
        }

        /// <summary>
        /// สร้าง Role ใหม่พร้อมกำหนดสิทธิ์
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateRole([FromBody] CreateRoleDto dto)
        {
            var callerRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (string.Equals(callerRole, "Viewer", StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(403, new { message = "บทบาท Viewer มีสิทธิ์สำหรับค้นหาและดูข้อมูล (Enquiry Only) เท่านั้น ไม่ได้รับอนุญาตให้สร้างหรือแก้ไขสิทธิ์" });
            }

            if (string.IsNullOrWhiteSpace(dto.RoleCode) || string.IsNullOrWhiteSpace(dto.RoleName))
            {
                return BadRequest(new { message = "กรุณาระบุรหัส Role และชื่อ Role" });
            }

            var cleanCode = dto.RoleCode.Trim();
            var exists = await _context.Roles.AnyAsync(r => r.RoleCode.ToLower() == cleanCode.ToLower());
            if (exists)
            {
                return BadRequest(new { message = "รหัส Role นี้มีอยู่ในระบบแล้ว" });
            }

            var role = new Role
            {
                RoleCode = cleanCode,
                RoleName = dto.RoleName.Trim(),
                Description = dto.Description?.Trim(),
                IsSystem = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Roles.Add(role);
            await _context.SaveChangesAsync();

            // Add permissions
            if (dto.Permissions != null && dto.Permissions.Count > 0)
            {
                foreach (var p in dto.Permissions)
                {
                    _context.RolePermissions.Add(new RolePermission
                    {
                        RoleId = role.Id,
                        MenuKey = p.MenuKey,
                        CanView = p.CanView,
                        CanEdit = p.CanEdit
                    });
                }
                await _context.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetRole), new { id = role.Id }, new { message = "สร้าง Role สำเร็จ", roleId = role.Id });
        }

        /// <summary>
        /// อัปเดตข้อมูล Role และแก้ไขตารางสิทธิ์
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleDto dto)
        {
            var callerRole = backend.Common.RoleHierarchy.GetCallerRole(HttpContext);

            var role = await _context.Roles
                .Include(r => r.Permissions)
                .SingleOrDefaultAsync(r => r.Id == id);

            if (role == null) return NotFound(new { message = "ไม่พบ Role นี้ในระบบ" });

            // Superadmin is the supreme root role and must always have 100% full access
            if (role.RoleCode.ToLower() == "superadmin")
            {
                return BadRequest(new { message = "สิทธิ์ของ Superadmin เป็นสิทธิ์สูงสุดของระบบ (Full Access) ถูกล็อคไว้เสมอ ไม่สามารถปรับลดสิทธิ์ได้เพื่อป้องกันระบบขัดข้อง" });
            }

            // Enforce: Role can only configure strictly lower roles (Role cannot configure itself or higher roles)
            if (!backend.Common.RoleHierarchy.CanManageRole(callerRole, role.RoleCode))
            {
                return StatusCode(403, new { message = $"การกำหนดสิทธิ์ต้องกระทำโดย Role ที่มีระดับสิทธิ์สูงกว่าเท่านั้น บทบาท '{callerRole ?? "ไม่มีสิทธิ์"}' ไม่สามารถแก้ไขสิทธิ์ของ Role '{role.RoleName}' ({role.RoleCode}) ได้" });
            }

            role.RoleName = dto.RoleName.Trim();
            role.Description = dto.Description?.Trim();
            role.UpdatedAt = DateTime.UtcNow;

            // Update permissions
            if (dto.Permissions != null)
            {
                // Remove existing permissions
                _context.RolePermissions.RemoveRange(role.Permissions);

                // Add new permissions
                foreach (var p in dto.Permissions)
                {
                    _context.RolePermissions.Add(new RolePermission
                    {
                        RoleId = role.Id,
                        MenuKey = p.MenuKey,
                        CanView = p.CanView,
                        CanEdit = p.CanEdit
                    });
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "อัปเดตสิทธิ์ของ Role สำเร็จ" });
        }

        /// <summary>
        /// ลบ Role (เฉพาะ Custom Role ที่ไม่มีผู้ใช้ผูกอยู่)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRole(int id)
        {
            var callerRole = backend.Common.RoleHierarchy.GetCallerRole(HttpContext);

            var role = await _context.Roles.FindAsync(id);
            if (role == null) return NotFound(new { message = "ไม่พบ Role นี้ในระบบ" });

            if (!backend.Common.RoleHierarchy.CanManageRole(callerRole, role.RoleCode))
            {
                return StatusCode(403, new { message = $"การลบ Role ต้องกระทำโดย Role ที่มีระดับสิทธิ์สูงกว่าเท่านั้น" });
            }

            if (role.IsSystem)
            {
                return BadRequest(new { message = "ไม่อนุญาตให้ลบ Role เริ่มต้นของระบบ (System Role)" });
            }

            var hasUsers = await _context.Users.AnyAsync(u => u.Role == role.RoleCode);
            if (hasUsers)
            {
                return BadRequest(new { message = "ไม่สามารถลบ Role นี้ได้เนื่องจากมีผู้ใช้งานผูกอยู่ กรุณาย้ายผู้ใช้งานไป Role อื่นก่อน" });
            }

            _context.Roles.Remove(role);
            await _context.SaveChangesAsync();

            return Ok(new { message = "ลบ Role สำเร็จ" });
        }
    }
}
