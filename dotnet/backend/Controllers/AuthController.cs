using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public class LoginRequest
        {
            public string Username { get; set; } = null!; // Can be Username or Email
            public string Password { get; set; } = null!;
        }

        public class RegisterRequest
        {
            public string Email { get; set; } = null!;
            public string Password { get; set; } = null!;
            public string NationId { get; set; } = null!;
            public string FullName { get; set; } = null!;
            public string? Phone { get; set; }
        }

        public class ForgotPasswordRequest
        {
            public string Email { get; set; } = null!;
        }

        public class ResetPasswordRequest
        {
            public string Email { get; set; } = null!;
            public string Token { get; set; } = null!;
            public string NewPassword { get; set; } = null!;
        }

        public class UpdateProfileRequest
        {
            public string? FullName { get; set; }
            public string? Phone { get; set; }
            public string? Email { get; set; }
            public Person? PersonData { get; set; }
        }

        public class ChangePasswordRequest
        {
            public string CurrentPassword { get; set; } = null!;
            public string NewPassword { get; set; } = null!;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน" });
            }

            var trimmedInput = request.Username.Trim();
            
            Models.User? user = null;
            try
            {
                // Search by Username OR Email (case-insensitive)
                user = await _context.Users.SingleOrDefaultAsync(u => 
                    u.Username.ToLower() == trimmedInput.ToLower() || 
                    (u.Email != null && u.Email.ToLower() == trimmedInput.ToLower()));
            }
            catch (Exception ex)
            {
                Serilog.Log.Warning("Database lookup failed during login: {Message}", ex.Message);
            }
            
            if (user == null || user.PasswordHash != request.Password)
            {
                // Fallback for admin / test accounts (including quick logins)
                if ((trimmedInput == "admin" && (request.Password == "editor" || request.Password == "password123")) ||
                    (trimmedInput == "karnindy@gmail.com" && request.Password == "password123") ||
                    (trimmedInput == "viewer" && (request.Password == "viewer" || request.Password == "password123")) ||
                    (trimmedInput == "superadmin" && request.Password == "password123"))
                {
                    var fallbackRole = trimmedInput == "superadmin" ? "Superadmin" : (trimmedInput == "viewer" ? "Viewer" : "Admin");
                    user = new Models.User 
                    { 
                        Id = 999,
                        Username = trimmedInput, 
                        FullName = trimmedInput == "karnindy@gmail.com" ? "Karnindy Admin" : trimmedInput,
                        Email = trimmedInput.Contains("@") ? trimmedInput : "admin@viriyah.co.th",
                        Role = fallbackRole,
                        IsActive = true
                    };
                }
                else
                {
                    return Unauthorized(new { message = "อีเมล/ชื่อผู้ใช้งาน หรือรหัสผ่านไม่ถูกต้อง" });
                }
            }

            if (!user.IsActive) 
            {
                return StatusCode(403, new { message = "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" });
            }

            // Update LastLoginAt if existing user
            if (user.Id != 999)
            {
                try
                {
                    user.LastLoginAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
                catch { }
            }

            // Generate JWT Token
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:SecretKey"] ?? "default_secret_key_needs_to_be_long_enough_for_hs256");
            
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role)
            };

            if (!string.IsNullOrEmpty(user.Email)) claims.Add(new Claim(ClaimTypes.Email, user.Email));
            if (!string.IsNullOrEmpty(user.NationId)) claims.Add(new Claim("NationId", user.NationId));
            if (!string.IsNullOrEmpty(user.FullName)) claims.Add(new Claim("FullName", user.FullName));

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);

            // Fetch dynamic permissions for this role
            var permissions = new List<object>();
            try
            {
                var roleEntity = await _context.Roles
                    .Include(r => r.Permissions)
                    .SingleOrDefaultAsync(r => r.RoleCode.ToLower() == user.Role.ToLower());

                if (roleEntity?.Permissions != null)
                {
                    permissions = roleEntity.Permissions
                        .Select(p => (object)new
                        {
                            menuKey = p.MenuKey,
                            canView = p.CanView,
                            canEdit = p.CanEdit
                        }).ToList();
                }
            }
            catch (Exception ex)
            {
                Serilog.Log.Warning("Failed to fetch dynamic permissions: {Message}", ex.Message);
            }
            
            return Ok(new 
            { 
                token = tokenHandler.WriteToken(token),
                user = new
                {
                    id = user.Id,
                    username = user.Username,
                    email = user.Email,
                    role = user.Role,
                    nationId = user.NationId,
                    fullName = user.FullName,
                    phone = user.Phone,
                    permissions = permissions
                }
            });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.NationId))
            {
                return BadRequest(new { message = "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (อีเมล, รหัสผ่าน, เลขบัตรประชาชน)" });
            }

            // Validate Thai National ID Checksum (Modulo 11)
            var cleanNationId = Regex.Replace(request.NationId, @"\D", "");
            if (cleanNationId.Length != 13 || !ValidateThaiNationalId(cleanNationId))
            {
                return BadRequest(new { message = "เลขประจำตัวประชาชน 13 หลักไม่ถูกต้องตามหลักการคำนวณ" });
            }

            var cleanEmail = request.Email.Trim().ToLower();

            // Check if Email already exists
            var existingUser = await _context.Users.AnyAsync(u => u.Username.ToLower() == cleanEmail || (u.Email != null && u.Email.ToLower() == cleanEmail));
            if (existingUser)
            {
                return BadRequest(new { message = "อีเมลนี้ถูกใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น" });
            }

            // Check if NationId already registered as an applicant
            var existingNationId = await _context.Users.AnyAsync(u => u.NationId == cleanNationId && u.Role == "Applicant");
            if (existingNationId)
            {
                return BadRequest(new { message = "เลขประจำตัวประชาชนนี้มีบัญชีผู้ใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบ" });
            }

            var newUser = new User
            {
                Username = cleanEmail,
                Email = cleanEmail,
                PasswordHash = request.Password, // Can use BCrypt in production
                Role = "Applicant",
                NationId = cleanNationId,
                FullName = request.FullName?.Trim() ?? cleanEmail,
                Phone = request.Phone?.Trim(),
                IsActive = true,
                IsEmailVerified = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            // Auto-login: Generate JWT Token
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:SecretKey"] ?? "default_secret_key_needs_to_be_long_enough_for_hs256");
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, newUser.Id.ToString()),
                new Claim(ClaimTypes.Name, newUser.Username),
                new Claim(ClaimTypes.Role, newUser.Role),
                new Claim(ClaimTypes.Email, newUser.Email ?? ""),
                new Claim("NationId", newUser.NationId ?? ""),
                new Claim("FullName", newUser.FullName ?? "")
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return Created("", new
            {
                message = "สมัครสมาชิกสำเร็จ",
                token = tokenHandler.WriteToken(token),
                user = new
                {
                    id = newUser.Id,
                    username = newUser.Username,
                    email = newUser.Email,
                    role = newUser.Role,
                    nationId = newUser.NationId,
                    fullName = newUser.FullName,
                    phone = newUser.Phone
                }
            });
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return Unauthorized(new { message = "ไม่มี Token ยืนยันตัวตน" });
            }

            var tokenStr = authHeader.Substring("Bearer ".Length).Trim();
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(_configuration["Jwt:SecretKey"] ?? "default_secret_key_needs_to_be_long_enough_for_hs256");
                tokenHandler.ValidateToken(tokenStr, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                var jwtToken = (JwtSecurityToken)validatedToken;
                var userIdClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == ClaimTypes.NameIdentifier || x.Type == "nameid" || x.Type == "sub")?.Value;
                var usernameClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == ClaimTypes.Name || x.Type == "unique_name" || x.Type == "name")?.Value;

                if (string.IsNullOrEmpty(userIdClaim) && string.IsNullOrEmpty(usernameClaim))
                {
                    return Unauthorized(new { message = "Token ไม่ถูกต้อง" });
                }

                User? user = null;
                try
                {
                    if (int.TryParse(userIdClaim, out int userId) && userId != 999)
                    {
                        user = await _context.Users.FindAsync(userId);
                    }
                    
                    if (user == null && !string.IsNullOrEmpty(usernameClaim))
                    {
                        user = await _context.Users.SingleOrDefaultAsync(u => u.Username == usernameClaim);
                    }
                }
                catch (Exception ex)
                {
                    Serilog.Log.Warning("DB lookup in GetCurrentUser failed: {Message}", ex.Message);
                }

                if (user == null && !string.IsNullOrEmpty(usernameClaim))
                {
                    var roleClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == ClaimTypes.Role || x.Type == "role")?.Value ?? "Admin";
                    var emailClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == ClaimTypes.Email || x.Type == "email")?.Value ?? (usernameClaim.Contains("@") ? usernameClaim : "admin@viriyah.co.th");
                    var nationClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "NationId" || x.Type == "nationId")?.Value;
                    var nameClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "FullName" || x.Type == "fullName")?.Value ?? usernameClaim;

                    user = new User
                    {
                        Id = 999,
                        Username = usernameClaim,
                        Role = roleClaim,
                        Email = emailClaim,
                        NationId = nationClaim,
                        FullName = nameClaim,
                        IsActive = true
                    };
                }

                if (user == null)
                {
                    return NotFound(new { message = "ไม่พบข้อมูลผู้ใช้งาน" });
                }

                // Fetch dynamic permissions for this role
                var permissions = new List<object>();
                try
                {
                    var roleEntity = await _context.Roles
                        .Include(r => r.Permissions)
                        .SingleOrDefaultAsync(r => r.RoleCode.ToLower() == user.Role.ToLower());

                    if (roleEntity?.Permissions != null)
                    {
                        permissions = roleEntity.Permissions
                            .Select(p => (object)new
                            {
                                menuKey = p.MenuKey,
                                canView = p.CanView,
                                canEdit = p.CanEdit
                            }).ToList();
                    }
                }
                catch (Exception ex)
                {
                    Serilog.Log.Warning("Failed to fetch permissions in GetCurrentUser: {Message}", ex.Message);
                }

                return Ok(new
                {
                    id = user.Id,
                    username = user.Username,
                    email = user.Email,
                    role = user.Role,
                    nationId = user.NationId,
                    fullName = user.FullName,
                    phone = user.Phone,
                    permissions = permissions
                });
            }
            catch (Exception ex)
            {
                return Unauthorized(new { message = "Token หมดอายุหรือไม่ถูกต้อง: " + ex.Message });
            }
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { message = "กรุณากรอกอีเมล" });
            }

            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == request.Email.Trim().ToLower());
            if (user == null)
            {
                // Return success to avoid email enumeration
                return Ok(new { message = "หากอีเมลนี้มีอยู่ในระบบ ระบบจะส่งคำแนะนำการตั้งรหัสผ่านใหม่ไปให้ท่าน" });
            }

            user.PasswordResetToken = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();
            user.ResetTokenExpires = DateTime.UtcNow.AddHours(2);
            await _context.SaveChangesAsync();

            return Ok(new 
            { 
                message = "หากอีเมลนี้มีอยู่ในระบบ ระบบจะส่งคำแนะนำการตั้งรหัสผ่านใหม่ไปให้ท่าน",
                mockResetToken = user.PasswordResetToken // Provided for easy dev testing
            });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest(new { message = "กรุณากรอกข้อมูลให้ครบถ้วน" });
            }

            var user = await _context.Users.SingleOrDefaultAsync(u => 
                u.Email != null && u.Email.ToLower() == request.Email.Trim().ToLower() &&
                u.PasswordResetToken == request.Token.Trim() &&
                u.ResetTokenExpires > DateTime.UtcNow);

            if (user == null)
            {
                return BadRequest(new { message = "รหัสยืนยันไม่ถูกต้องหรือหมดอายุการใช้งานแล้ว" });
            }

            user.PasswordHash = request.NewPassword;
            user.PasswordResetToken = null;
            user.ResetTokenExpires = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "ตั้งรหัสผ่านใหม่สำเร็จแล้ว ท่านสามารถเข้าสู่ระบบได้ทันที" });
        }

        private async Task<User?> GetCurrentUserFromToken()
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            var tokenStr = authHeader.Substring("Bearer ".Length).Trim();
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                if (!tokenHandler.CanReadToken(tokenStr)) return null;

                var jwtToken = tokenHandler.ReadJwtToken(tokenStr);
                var userIdClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier || c.Type == "nameid" || c.Type == "sub")?.Value;
                var usernameClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name || c.Type == "unique_name")?.Value;

                if (int.TryParse(userIdClaim, out int userId))
                {
                    var user = await _context.Users.FindAsync(userId);
                    if (user != null) return user;
                }

                if (!string.IsNullOrEmpty(usernameClaim))
                {
                    return await _context.Users.SingleOrDefaultAsync(u => u.Username == usernameClaim);
                }
            }
            catch { }

            return null;
        }

        /// <summary>
        /// ดึงข้อมูลโปรไฟล์ส่วนตัวของผู้ที่กำลัง Login อยู่ พร้อมข้อมูลผู้สมัครและประวัติการแก้ไข
        /// </summary>
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var user = await GetCurrentUserFromToken();
            if (user == null)
            {
                return Unauthorized(new { message = "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
            }

            // Find linked Person record
            Person? person = null;
            if (!string.IsNullOrEmpty(user.NationId))
            {
                person = await _context.Persons
                    .Include(x => x.Registrations)
                    .Include(x => x.Licenses)
                    .Include(x => x.Addresses)
                    .Include(x => x.Affiliations)
                    .Include(x => x.Courses)
                    .Include(x => x.Trainings)
                    .Include(x => x.Others).ThenInclude(o => o.SalesAreas)
                    .Include(x => x.Others).ThenInclude(o => o.OtherCompanies)
                    .Include(x => x.Others).ThenInclude(o => o.Specialties)
                    .FirstOrDefaultAsync(x => x.NationId == user.NationId);
            }

            if (person == null && !string.IsNullOrEmpty(user.Email))
            {
                person = await _context.Persons
                    .Include(x => x.Registrations)
                    .Include(x => x.Licenses)
                    .Include(x => x.Addresses)
                    .Include(x => x.Affiliations)
                    .Include(x => x.Courses)
                    .Include(x => x.Trainings)
                    .Include(x => x.Others).ThenInclude(o => o.SalesAreas)
                    .Include(x => x.Others).ThenInclude(o => o.OtherCompanies)
                    .Include(x => x.Others).ThenInclude(o => o.Specialties)
                    .FirstOrDefaultAsync(x => x.EmailAlt == user.Email);
            }

            // Fetch edit history for this user
            var regIds = person?.Registrations?.Select(r => r.Id).ToList() ?? new List<int>();
            var histories = await _context.RegisterHistories
                .Where(h => (person != null && regIds.Contains(h.RegisterId)) || h.CreatedBy == user.Username)
                .OrderByDescending(h => h.CreatedAt)
                .Take(50)
                .ToListAsync();

            return Ok(new
            {
                user = new
                {
                    id = user.Id,
                    username = user.Username,
                    email = user.Email,
                    role = user.Role,
                    nationId = user.NationId,
                    fullName = user.FullName,
                    phone = user.Phone
                },
                person,
                histories
            });
        }

        /// <summary>
        /// บันทึกแก้ไขโปรไฟล์ส่วนตัวของผู้ที่กำลัง Login อยู่ และบันทึกประวัติ Snapshot ลง register_history
        /// </summary>
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var user = await GetCurrentUserFromToken();
            if (user == null)
            {
                return Unauthorized(new { message = "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
            }

            var nationId = user.NationId;

            // 1. Snapshot OLD Data for History
            Person? p = null;
            if (!string.IsNullOrEmpty(nationId))
            {
                p = await _context.Persons
                    .Include(x => x.Registrations)
                    .Include(x => x.Licenses)
                    .Include(x => x.Addresses)
                    .Include(x => x.Affiliations)
                    .Include(x => x.Courses)
                    .Include(x => x.Trainings)
                    .Include(x => x.Others).ThenInclude(o => o.SalesAreas)
                    .Include(x => x.Others).ThenInclude(o => o.OtherCompanies)
                    .Include(x => x.Others).ThenInclude(o => o.Specialties)
                    .FirstOrDefaultAsync(x => x.NationId == user.NationId);
            }

            var oldSnapshot = new
            {
                User = new { user.Username, user.Email, user.FullName, user.Phone },
                Person = p != null ? new
                {
                    p.NationId,
                    p.TitleTh,
                    p.FirstNameTh,
                    p.LastNameTh,
                    p.BirthDate,
                    p.GenderId,
                    p.BloodGroupId,
                    p.ReligionId,
                    p.PhoneOtp,
                    p.EmailAlt,
                    Addresses = p.Addresses?.Select(a => new { a.AddressType, a.HouseNo, a.Moo, a.Village, a.Soi, a.Road, a.ProvinceId, a.DistrictId, a.SubDistrictId, a.Postcode }).ToList(),
                    Affiliations = p.Affiliations?.Select(a => new { AgentType = a.BrokerType, AgentBranch = a.BranchId, BrokerBranch = a.BrokerBranch, a.ViriyahAgentCode }).ToList(),
                    Licenses = p.Licenses?.Select(l => new { l.LicenseNo, l.CourseType, l.LicenseIssueDate, l.LicenseExpiryDate }).ToList(),
                    Courses = p.Courses?.Select(c => new { c.CourseId, c.CourseDateId, c.RenewOtherId }).ToList(),
                    Others = p.Others?.Select(o => new { o.ExtraTrainingInterest, o.OtherBusiness, o.InsuranceExperienceYears }).ToList()
                } : null
            };

            // 1. Snapshot OLD Data for History
            var oldSnapshotDict = BuildPersonSnapshotDict(p, "ก่อนแก้ไขข้อมูลส่วนตัว");

            // 2. Update user account info
            if (!string.IsNullOrWhiteSpace(request.FullName)) user.FullName = request.FullName.Trim();
            if (!string.IsNullOrWhiteSpace(request.Phone)) user.Phone = request.Phone.Trim();
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var cleanEmail = request.Email.Trim().ToLower();
                var emailExists = await _context.Users.AnyAsync(u => u.Id != user.Id && u.Email != null && u.Email.ToLower() == cleanEmail);
                if (emailExists)
                {
                    return BadRequest(new { message = "อีเมลนี้มีผู้ใช้งานอื่นในระบบแล้ว" });
                }
                user.Email = cleanEmail;
            }
            user.UpdatedAt = DateTime.UtcNow;

            // 3. Update or Create Person Data if provided
            if (request.PersonData != null)
            {
                if (request.PersonData.Licenses != null)
                {
                    foreach (var lItem in request.PersonData.Licenses)
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

                nationId = user.NationId ?? request.PersonData.NationId;
                if (!string.IsNullOrEmpty(nationId))
                {
                    if (p == null)
                    {
                        p = new Person { NationId = nationId };
                        _context.Persons.Add(p);
                    }

                    // Update scalar values
                    p.TitleTh = request.PersonData.TitleTh;
                    p.FirstNameTh = request.PersonData.FirstNameTh;
                    p.MiddleNameTh = request.PersonData.MiddleNameTh;
                    p.LastNameTh = request.PersonData.LastNameTh;
                    p.TitleOldTh = request.PersonData.TitleOldTh;
                    p.FirstNameOldTh = request.PersonData.FirstNameOldTh;
                    p.LastNameOldTh = request.PersonData.LastNameOldTh;
                    p.BirthDate = request.PersonData.BirthDate;
                    p.IdCardExpiry = request.PersonData.IdCardExpiry;
                    p.ReligionId = request.PersonData.ReligionId;
                    p.GenderId = request.PersonData.GenderId;
                    p.BloodGroupId = request.PersonData.BloodGroupId;
                    p.PhoneOtp = request.Phone ?? p.PhoneOtp;
                    p.EmailAlt = request.Email ?? p.EmailAlt;
                    p.LineId = request.PersonData.LineId;
                    p.Facebook = request.PersonData.Facebook;
                    p.Instagram = request.PersonData.Instagram;
                    p.FoodAllergy = request.PersonData.FoodAllergy;
                    p.MedicalCondition = request.PersonData.MedicalCondition;
                    p.EmergencyContactName = request.PersonData.EmergencyContactName;
                    p.EmergencyContactPhone = request.PersonData.EmergencyContactPhone;

                    // Addresses
                    if (request.PersonData.Addresses != null)
                    {
                        _context.PersonAddresses.RemoveRange(p.Addresses);
                        foreach (var a in request.PersonData.Addresses)
                        {
                            a.Id = 0;
                            a.NationId = nationId;
                            p.Addresses.Add(a);
                        }
                    }

                    // Affiliations
                    if (request.PersonData.Affiliations != null)
                    {
                        _context.PersonAffiliations.RemoveRange(p.Affiliations);
                        foreach (var aff in request.PersonData.Affiliations)
                        {
                            aff.Id = 0;
                            aff.NationId = nationId;
                            p.Affiliations.Add(aff);
                        }
                    }

                    // Licenses
                    if (request.PersonData.Licenses != null)
                    {
                        _context.PersonLicenses.RemoveRange(p.Licenses);
                        foreach (var lItem in request.PersonData.Licenses)
                        {
                            lItem.Id = 0;
                            lItem.NationId = user.NationId;
                            p.Licenses.Add(lItem);
                        }
                    }

                    // Courses
                    if (request.PersonData.Courses != null)
                    {
                        _context.PersonCourses.RemoveRange(p.Courses);
                        foreach (var c in request.PersonData.Courses)
                        {
                            c.PersonCourseId = 0;
                            c.NationId = nationId;
                            p.Courses.Add(c);
                        }
                    }

                    // Others
                    if (request.PersonData.Others != null)
                    {
                        foreach (var other in p.Others)
                        {
                            _context.PersonOtherSalesAreas.RemoveRange(other.SalesAreas);
                            _context.PersonOtherCompanies.RemoveRange(other.OtherCompanies);
                            _context.PersonOtherSpecialties.RemoveRange(other.Specialties);
                        }
                        _context.PersonOthers.RemoveRange(p.Others);

                        foreach (var other in request.PersonData.Others)
                        {
                            other.id = 0;
                            other.NationId = nationId;
                            if (other.SalesAreas != null) { foreach (var sa in other.SalesAreas) { sa.Id = 0; sa.NationId = nationId; } }
                            if (other.OtherCompanies != null) { foreach (var oc in other.OtherCompanies) { oc.Id = 0; oc.NationId = nationId; } }
                            p.Others.Add(other);
                        }
                    }

                    // Registrations
                    if (request.PersonData.Registrations != null && request.PersonData.Registrations.Any())
                    {
                        var firstReg = request.PersonData.Registrations.First();
                        var existing = p.Registrations?.FirstOrDefault();
                        if (existing != null)
                        {
                            existing.DeductionPrivilege = firstReg.DeductionPrivilege;
                            existing.MasterDegreeStatus = firstReg.MasterDegreeStatus;
                        }
                        else
                        {
                            firstReg.Id = 0;
                            firstReg.NationId = nationId;
                            p.Registrations.Add(firstReg);
                        }
                    }
                }
            }

            // 4. Snapshot NEW Data for History
            var addrA = request.PersonData?.Addresses?.FirstOrDefault(a => (a.AddressType != null && a.AddressType.ToUpper() == "A")) 
                        ?? request.PersonData?.Addresses?.FirstOrDefault()
                        ?? p?.Addresses?.LastOrDefault(a => (a.AddressType != null && a.AddressType.ToUpper() == "A")) 
                        ?? p?.Addresses?.LastOrDefault();
            var addrC = request.PersonData?.Addresses?.FirstOrDefault(a => (a.AddressType != null && (a.AddressType.ToUpper() == "C" || a.AddressType.ToUpper() == "M"))) 
                        ?? p?.Addresses?.LastOrDefault(a => (a.AddressType != null && (a.AddressType.ToUpper() == "C" || a.AddressType.ToUpper() == "M")));
            var affil = request.PersonData?.Affiliations?.FirstOrDefault() ?? p?.Affiliations?.LastOrDefault();
            var lic = request.PersonData?.Licenses?.FirstOrDefault() ?? p?.Licenses?.LastOrDefault();
            var course = request.PersonData?.Courses?.FirstOrDefault() ?? p?.Courses?.LastOrDefault();
            var otherObj = request.PersonData?.Others?.FirstOrDefault() ?? p?.Others?.LastOrDefault();
            var salesAreas = otherObj?.SalesAreas?.Select(s => s.TerritoriesId?.ToString()).Where(s => !string.IsNullOrEmpty(s)).Select(s => s!).Distinct().OrderBy(x => x).ToList() ?? new List<string>();
            var companies = otherObj?.OtherCompanies?.Select(c => c.CompanyId?.ToString()).Where(s => !string.IsNullOrEmpty(s)).Select(s => s!).Distinct().OrderBy(x => x).ToList() ?? new List<string>();
            var specialties = otherObj?.Specialties?.Select(s => s.ExpertiseId?.ToString()).Where(s => !string.IsNullOrEmpty(s)).Select(s => s!).Distinct().OrderBy(x => x).ToList() ?? new List<string>();
            var prevTrainings = (request.PersonData?.Trainings ?? p?.Trainings)?.Select(t => t.CourseId?.ToString()).Where(s => !string.IsNullOrEmpty(s)).Select(s => s!).Distinct().OrderBy(x => x).ToList() ?? new List<string>();
            var selectedSubjs = (request.PersonData?.Courses ?? p?.Courses)?.Select(c => c.RenewOtherId?.ToString()).Where(s => !string.IsNullOrEmpty(s)).Select(s => s!).Distinct().OrderBy(x => x).ToList() ?? new List<string>();
            var regObj = request.PersonData?.Registrations?.FirstOrDefault() ?? p?.Registrations?.FirstOrDefault();

            var newSnapshotDict = BuildPersonSnapshotDict(p, "แก้ไขข้อมูลส่วนตัว");

            var jsonOptions = new System.Text.Json.JsonSerializerOptions
            {
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                WriteIndented = false
            };

            var oldHistoryJson = System.Text.Json.JsonSerializer.Serialize(oldSnapshotDict, jsonOptions);
            var newHistoryJson = System.Text.Json.JsonSerializer.Serialize(newSnapshotDict, jsonOptions);

            // 5. Create RegisterHistory & RegistrationHistoryModel entry
            var registerId = p?.Registrations?.FirstOrDefault()?.Id ?? 0;
            var historyRecord = new RegisterHistory
            {
                RegisterId = registerId,
                EditedByType = user.Role?.ToLower() ?? "applicant",
                CreatedBy = user.Username,
                OldData = oldHistoryJson,
                NewData = newHistoryJson,
                CreatedAt = DateTime.UtcNow
            };
            _context.RegisterHistories.Add(historyRecord);

            if (!string.IsNullOrEmpty(nationId))
            {
                var historyRecordNew = new RegistrationHistoryModel
                {
                    RegisterId = registerId,
                    NationId = nationId,
                    EditedByType = user.Role?.ToLower() ?? "applicant",
                    CreatedBy = user.Username,
                    OldData = oldHistoryJson,
                    NewData = newHistoryJson,
                    CreatedAt = DateTime.UtcNow
                };
                _context.RegistrationHistoriesNew.Add(historyRecordNew);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "บันทึกข้อมูลส่วนตัวและประวัติการแก้ไขเรียบร้อยแล้ว",
                user = new
                {
                    id = user.Id,
                    username = user.Username,
                    email = user.Email,
                    role = user.Role,
                    nationId = user.NationId,
                    fullName = user.FullName,
                    phone = user.Phone
                },
                person = p
            });
        }

        /// <summary>
        /// เปลี่ยนรหัสผ่านของตนเอง
        /// </summary>
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var user = await GetCurrentUserFromToken();
            if (user == null)
            {
                return Unauthorized(new { message = "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
            }

            if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest(new { message = "กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่" });
            }

            if (request.NewPassword.Length < 4)
            {
                return BadRequest(new { message = "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร" });
            }

            if (user.PasswordHash != request.CurrentPassword)
            {
                return BadRequest(new { message = "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
            }

            user.PasswordHash = request.NewPassword;
            user.UpdatedAt = DateTime.UtcNow;

            var historyRecord = new RegisterHistory
            {
                RegisterId = 0,
                EditedByType = user.Role?.ToLower() ?? "applicant",
                CreatedBy = user.Username,
                OldData = System.Text.Json.JsonSerializer.Serialize(new { action = "ChangePassword", username = user.Username, note = "Changed password" }),
                NewData = System.Text.Json.JsonSerializer.Serialize(new { action = "ChangePassword", username = user.Username, note = "Password updated successfully" }),
                CreatedAt = DateTime.UtcNow
            };
            _context.RegisterHistories.Add(historyRecord);

            await _context.SaveChangesAsync();

            return Ok(new { message = "เปลี่ยนรหัสผ่านสำเร็จแล้ว" });
        }

        private static bool ValidateThaiNationalId(string id)
        {
            if (id.Length != 13 || !long.TryParse(id, out _)) return false;
            int sum = 0;
            for (int i = 0; i < 12; i++)
            {
                sum += (id[i] - '0') * (13 - i);
            }
            int checkDigit = (11 - (sum % 11)) % 10;
            return checkDigit == (id[12] - '0');
        }

        private static Dictionary<string, object?> BuildPersonSnapshotDict(Person? p, string actionName = "แก้ไขข้อมูลส่วนตัว")
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
    }
}

