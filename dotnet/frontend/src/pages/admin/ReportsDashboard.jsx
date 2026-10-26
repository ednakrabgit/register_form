import { Link } from 'react-router-dom';



export default function ReportsDashboard() {
  const handleExportData = () => {
    // We can reuse the Trainees endpoint and convert to CSV, or better yet
    // just hit the export endpoint if one existed. Since we don't have a direct CSV endpoint,
    // we can use the Trainees list approach. Or we can just prompt the user that export is in Trainees menu.
    // For now, I'll redirect them to the Trainees page where the export button already exists.
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 border-b-2 border-primary pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-2">ระบบรายงาน (Reports)</h2>
          <p className="text-gray-500 text-sm">เลือกระบบรายงานที่คุณต้องการ</p>
        </div>
        <Link to="/admin" className="px-4 py-2 border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors">
          <i className="fas fa-arrow-left mr-2"></i> กลับหน้าหลัก
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Export Data */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex flex-col items-center text-center transition-shadow hover:shadow-md h-full">
          <i className="fas fa-file-export text-5xl text-primary mb-4"></i>
          <h4 className="text-xl font-bold text-gray-800 mb-2">ข้อมูลการลงทะเบียน (Export Data)</h4>
          <p className="text-gray-500 text-xs mb-6 flex-1">ส่งออกข้อมูลผู้สมัครทั้งหมดแยกตามสาขา หรือรูปแบบที่คุณต้องการ (CSV/Excel)</p>
          <Link to="/admin/reports/export" className="px-6 py-2 border border-primary text-primary rounded hover:bg-primary hover:text-white transition-colors text-sm w-full">
            ไปที่หน้า Export ข้อมูล
          </Link>
        </div>

        {/* Card 2: Report Remarks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex flex-col items-center text-center transition-shadow hover:shadow-md h-full">
          <i className="fas fa-comments text-5xl text-primary mb-4"></i>
          <h4 className="text-xl font-bold text-gray-800 mb-2">รายงานหมายเหตุ (Remarks)</h4>
          <p className="text-gray-500 text-xs mb-6 flex-1">ดูรายการผู้สมัครอบรมทั้งหมดที่มีการระบุหมายเหตุเพิ่มเติม (Remark) พร้อมดูรายละเอียด</p>
          <Link to="/admin/reports/remarks" className="px-6 py-2 border border-primary text-primary rounded hover:bg-primary hover:text-white transition-colors text-sm w-full">
            เข้าสู่หน้ารายงาน
          </Link>
        </div>
      </div>
    </div>
  );
}
