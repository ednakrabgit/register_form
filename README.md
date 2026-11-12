# Viriyah Insurance — Registration System (`register_form`)

ระบบลงทะเบียนขอรับและขอต่ออายุใบอนุญาตตัวแทนและนายหน้าประกันวินาศภัย (บมจ. วิริยะประกันภัย) — React + .NET 8 Web API + SQL Server / SQLite

## Production Environments & URLs

| Environment | URL | Backend / API | Database |
| :--- | :--- | :--- | :--- |
| **GCE VM (`free-tier-vm`)** | https://34.29.162.204/ <br/> https://agentportal.วิริยะ.com/ *(Punycode: `agentportal.xn--z3cbl2brb.com`, รอถอด `A` Record เก่า `103.107.54.242` ใน DNS)* | Nginx `1.22.1` (HTTPS `443`) → `127.0.0.1:8085` (`.NET 8.0.34`) | SQLite `app.db` (46 ตาราง, WAL mode) |
| **Google Cloud Run** | https://register-frontend-779142529105.us-central1.run.app/login | https://register-backend-779142529105.us-central1.run.app/api | Embedded SQLite (`/App/app.db`) |

## Documentation

เอกสารทั้งหมดของโครงการจัดเก็บไว้ที่ [`dotnet/document/`](dotnet/document/):

- **[`dotnet/document/SERVER_ARCHITECTURE_AND_DEPLOY.md`](dotnet/document/SERVER_ARCHITECTURE_AND_DEPLOY.md)** — รายละเอียดเซิร์ฟเวอร์ `free-tier-vm` (`us-central1-a`), Firewall, Nginx, Systemd Services/Timers, Let's Encrypt HTTPS (IP + Domain), และการ Deploy
- **[`dotnet/document/main.txt`](dotnet/document/main.txt)** — เอกสารศูนย์กลางข้อมูลระบบ URLs, Automation Scripts และคู่มือปฏิบัติการทั้งหมด
- **[`dotnet/command/4_deploy_to_vm.bat`](dotnet/command/4_deploy_to_vm.bat)** — สคริปต์ Sync SQL Server → SQLite (`export_mssql_to_sqlite.py`), Build Frontend/Backend และ Deploy ขึ้น VM
