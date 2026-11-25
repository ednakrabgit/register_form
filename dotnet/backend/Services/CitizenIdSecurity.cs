using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace backend.Services
{
    public static class CitizenIdSecurity
    {
        // 256-bit encryption key and 128-bit fixed IV for deterministic URL-safe token obfuscation
        private static readonly byte[] Key = SHA256.HashData(Encoding.UTF8.GetBytes("Viriyah_Agent_Portal_Secure_Key_2026!#$@"));
        private static readonly byte[] FixedIv = new byte[16] { 0x4a, 0x76, 0x31, 0x89, 0x2e, 0x6f, 0x5a, 0x1b, 0x9c, 0x3d, 0x8e, 0x2f, 0x10, 0x55, 0xaa, 0xcc };

        /// <summary>
        /// Encrypts a 13-digit Thai citizen ID into a URL-safe secure token.
        /// </summary>
        public static string Encrypt(string citizenId)
        {
            if (string.IsNullOrWhiteSpace(citizenId)) return string.Empty;
            var clean = new string(citizenId.Where(char.IsDigit).ToArray());
            if (clean.Length != 13) return string.Empty;

            using var aes = Aes.Create();
            aes.Key = Key;
            aes.IV = FixedIv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            using var ms = new MemoryStream();
            using (var cs = new CryptoStream(ms, aes.CreateEncryptor(), CryptoStreamMode.Write))
            {
                var bytes = Encoding.UTF8.GetBytes("vry:" + clean);
                cs.Write(bytes, 0, bytes.Length);
                cs.FlushFinalBlock();
            }

            var base64 = Convert.ToBase64String(ms.ToArray());
            // Make URL-safe Base64: replace '+' with '-', '/' with '_', and strip '='
            return base64.Replace('+', '-').Replace('/', '_').TrimEnd('=');
        }

        /// <summary>
        /// Decrypts a secure token back into a 13-digit Thai citizen ID.
        /// Returns null if token is invalid or tampered.
        /// </summary>
        public static string? Decrypt(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return null;

            // Normalize URL-safe base64 back to standard base64
            var base64 = token.Trim().Replace('-', '+').Replace('_', '/');
            switch (base64.Length % 4)
            {
                case 2: base64 += "=="; break;
                case 3: base64 += "="; break;
            }

            try
            {
                var cipherBytes = Convert.FromBase64String(base64);
                using var aes = Aes.Create();
                aes.Key = Key;
                aes.IV = FixedIv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                using var ms = new MemoryStream();
                using (var cs = new CryptoStream(ms, aes.CreateDecryptor(), CryptoStreamMode.Write))
                {
                    cs.Write(cipherBytes, 0, cipherBytes.Length);
                    cs.FlushFinalBlock();
                }

                var plain = Encoding.UTF8.GetString(ms.ToArray());
                if (plain.StartsWith("vry:"))
                {
                    var id = plain.Substring(4);
                    if (id.Length == 13 && id.All(char.IsDigit))
                    {
                        return id;
                    }
                }
                return null;
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Masks a 13-digit ID to XXXXXXX123456 (hides first 7 digits).
        /// </summary>
        public static string Mask(string citizenId)
        {
            if (string.IsNullOrEmpty(citizenId) || citizenId.Length != 13) return citizenId ?? "";
            return new string('X', 7) + citizenId.Substring(7, 6);
        }
    }
}
