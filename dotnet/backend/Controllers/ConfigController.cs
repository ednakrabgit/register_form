using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ConfigController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        private static readonly Dictionary<string, (string Value, string Description, string Group)> StandardDefaults = new()
        {
            ["APP_ENV"] = ("prd", "Environment (dev, uat, prd)", "system"),
            ["SESSION_TIMEOUT"] = ("3600", "Session timeout in seconds", "system"),
            ["SYSTEM_IS_ONLINE"] = ("true", "Is system online", "system"),
            ["SYSTEM_OPEN_PERIODS"] = ("[]", "JSON array of open periods", "system"),
            ["RENEW_COURSE_EXPIRY_DAYS_ADVANCE"] = ("30", "จำนวนวันปิดรับสมัครล่วงหน้าก่อนถึงวันเปิดอบรม (สำหรับ Frontend เช่น 30 วัน หรือ 7 วัน)", "schedule"),
            ["tab4_label_branch"] = ("สาขา *", "Label for Branch", "tab4"),
            ["tab4_hint_branch"] = ("พิมพ์เพื่อค้นหาสาขา", "Hint for Branch", "tab4"),
            ["tab4_label_region"] = ("ภาค *", "Label for Region", "tab4"),
            ["tab4_hint_region"] = ("ระบบจะเติมให้อัตโนมัติ", "Hint for Region", "tab4"),
            ["tab4_label_agentcode"] = ("รหัสที่มีสัญญากับ บมจ.วิริยะประกันภัย *", "Label for Agent Code", "tab4"),
            ["tab4_hint_agentcode"] = ("ถ้าไม่ทราบ สอบถามสาขา หรือตัวแทน/นายหน้าที่ท่านสังกัด, ถ้าเป็นขอรับใบอนุญาต และยังไม่มีรหัส ให้กรอก 00000", "Hint for Agent Code", "tab4"),
            ["tab4_default_branch"] = ("", "Default value for Branch", "tab4"),
            ["tab4_default_agentcode"] = ("", "Default value for Agent Code", "tab4"),
            ["tab4_allowed_agent_types"] = ("both", "Allowed agent types (both, agent, broker)", "tab4")
        };

        public ConfigController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllConfigs()
        {
            var configs = await _context.SysConfigs.ToListAsync();
            
            // Ensure all standard default keys exist
            var missingKeys = StandardDefaults.Keys.Except(configs.Select(c => c.Key)).ToList();
            if (missingKeys.Any())
            {
                foreach (var key in missingKeys)
                {
                    var def = StandardDefaults[key];
                    var newConfig = new SysConfig
                    {
                        Key = key,
                        Value = def.Value,
                        Description = def.Description,
                        Group = def.Group,
                        DefaultValue = def.Value
                    };
                    _context.SysConfigs.Add(newConfig);
                    configs.Add(newConfig);
                }
                await _context.SaveChangesAsync();
            }

            // Fill DefaultValue field if empty
            foreach (var item in configs)
            {
                if (string.IsNullOrEmpty(item.DefaultValue) && StandardDefaults.TryGetValue(item.Key, out var def))
                {
                    item.DefaultValue = def.Value;
                }
            }

            return Ok(configs);
        }

        [HttpGet("system-info")]
        public async Task<IActionResult> GetSystemInfo()
        {
            var configs = await _context.SysConfigs.ToDictionaryAsync(c => c.Key, c => c.Value);
            
            var isOnline = configs.GetValueOrDefault("SYSTEM_IS_ONLINE", "true") == "true";
            var openPeriodsJson = configs.GetValueOrDefault("SYSTEM_OPEN_PERIODS", "[]");
            
            var now = DateTime.Now;
            bool isWithinPeriod = true;
            string statusMessage = "ระบบเปิดรับสมัครตามปกติ";

            if (!isOnline)
            {
                isWithinPeriod = false;
                statusMessage = "ระบบปิดปรับปรุงชั่วคราว (Maintenance Mode)";
            }
            else if (!string.IsNullOrWhiteSpace(openPeriodsJson) && openPeriodsJson.Trim() != "[]")
            {
                try
                {
                    using var doc = JsonDocument.Parse(openPeriodsJson);
                    if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
                    {
                        bool matchesAny = false;
                        foreach (var elem in doc.RootElement.EnumerateArray())
                        {
                            DateTime? openTime = null;
                            DateTime? closeTime = null;

                            if (elem.TryGetProperty("open", out var oProp) && DateTime.TryParse(oProp.GetString(), out var oVal))
                                openTime = oVal;
                            if (elem.TryGetProperty("close", out var cProp) && DateTime.TryParse(cProp.GetString(), out var cVal))
                                closeTime = cVal;

                            if (openTime.HasValue && closeTime.HasValue)
                            {
                                if (now >= openTime.Value && now <= closeTime.Value) { matchesAny = true; break; }
                            }
                            else if (openTime.HasValue)
                            {
                                if (now >= openTime.Value) { matchesAny = true; break; }
                            }
                            else if (closeTime.HasValue)
                            {
                                if (now <= closeTime.Value) { matchesAny = true; break; }
                            }
                        }

                        isWithinPeriod = matchesAny;
                        if (!matchesAny)
                        {
                            statusMessage = "อยู่นอกช่วงเวลาเปิดรับสมัครตามกำหนดการ";
                        }
                    }
                }
                catch
                {
                    // If invalid JSON, default to isOnline
                }
            }

            var info = new
            {
                dotnetVersion = RuntimeInformation.FrameworkDescription,
                osDescription = RuntimeInformation.OSDescription,
                processArchitecture = RuntimeInformation.ProcessArchitecture.ToString(),
                environment = _env.EnvironmentName,
                serverLocalTime = now.ToString("yyyy-MM-dd HH:mm:ss"),
                serverUtcTime = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss 'UTC'"),
                isSystemOnline = isOnline,
                isRegistrationOpen = isOnline && isWithinPeriod,
                statusMessage,
                databaseProvider = _context.Database.ProviderName
            };

            return Ok(info);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateConfigs([FromBody] Dictionary<string, string> updates)
        {
            if (updates == null || updates.Count == 0)
                return BadRequest(new { message = "No updates provided" });

            // Validate SYSTEM_OPEN_PERIODS if provided
            if (updates.TryGetValue("SYSTEM_OPEN_PERIODS", out var periodsJson) && !string.IsNullOrWhiteSpace(periodsJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(periodsJson);
                    if (doc.RootElement.ValueKind != JsonValueKind.Array)
                    {
                        return BadRequest(new { message = "รูปแบบ SYSTEM_OPEN_PERIODS ต้องเป็น JSON Array เช่น [{\"open\": \"2026-06-01 08:00:00\", \"close\": \"2026-06-15 23:59:59\"}]" });
                    }
                }
                catch (JsonException ex)
                {
                    return BadRequest(new { message = $"รูปแบบ JSON ช่วงเวลาเปิดระบบไม่ถูกต้อง: {ex.Message}" });
                }
            }

            // Validate SESSION_TIMEOUT if provided
            if (updates.TryGetValue("SESSION_TIMEOUT", out var timeoutStr) && !string.IsNullOrWhiteSpace(timeoutStr))
            {
                if (!int.TryParse(timeoutStr, out int timeoutVal) || timeoutVal < 60)
                {
                    return BadRequest(new { message = "Session Timeout ต้องเป็นตัวเลขและมีค่าไม่ต่ำกว่า 60 วินาที" });
                }
            }

            var keysToUpdate = updates.Keys.ToList();
            var existingConfigs = await _context.SysConfigs
                                     .Where(c => keysToUpdate.Contains(c.Key))
                                     .ToListAsync();

            var existingKeys = existingConfigs.Select(c => c.Key).ToHashSet();

            foreach (var config in existingConfigs)
            {
                if (updates.TryGetValue(config.Key, out var newValue))
                {
                    config.Value = newValue ?? string.Empty;
                }
            }

            // Add any missing keys
            foreach (var kvp in updates)
            {
                if (!existingKeys.Contains(kvp.Key))
                {
                    var defGroup = StandardDefaults.TryGetValue(kvp.Key, out var def) ? def.Group : "custom";
                    var defDesc = StandardDefaults.TryGetValue(kvp.Key, out var defD) ? defD.Description : null;
                    _context.SysConfigs.Add(new SysConfig
                    {
                        Key = kvp.Key,
                        Value = kvp.Value ?? string.Empty,
                        Group = defGroup,
                        Description = defDesc,
                        DefaultValue = defDesc != null && StandardDefaults.TryGetValue(kvp.Key, out var defVal) ? defVal.Value : null
                    });
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "บันทึกการตั้งค่าเรียบร้อยแล้ว" });
        }

        [HttpPost("reset-defaults")]
        public async Task<IActionResult> ResetToDefaults()
        {
            var allConfigs = await _context.SysConfigs.ToListAsync();
            foreach (var config in allConfigs)
            {
                if (StandardDefaults.TryGetValue(config.Key, out var def))
                {
                    config.Value = def.Value;
                }
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = "คืนค่ามาตรฐานของระบบเรียบร้อยแล้ว" });
        }
    }
}
