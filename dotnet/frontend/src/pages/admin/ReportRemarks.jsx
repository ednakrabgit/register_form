import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';



export default function ReportRemarks() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/Reports/Remarks`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถโหลดข้อมูลรายงานได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 border-b-2 border-primary pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-2">รายงานหมายเหตุ (Remarks)</h2>
          <p className="text-gray-500 text-sm">รายการผู้สมัครอบรมทั้งหมดที่มีการระบุหมายเหตุเพิ่มเติม</p>
        </div>
        <Link to="/admin/reports" className="px-4 py-2 border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors">
          <i className="fas fa-arrow-left mr-2"></i> กลับหน้ารายงาน
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="text-center py-10"><i className="fas fa-spinner fa-spin text-3xl text-primary"></i></div>
        ) : error ? (
          <div className="text-danger text-center py-5">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="p-3 border-b">วันที่สมัคร</th>
                  <th className="p-3 border-b">ชื่อ-นามสกุล</th>
                  <th className="p-3 border-b">เบอร์โทรศัพท์</th>
                  <th className="p-3 border-b">หมายเหตุ (Remark)</th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 whitespace-nowrap text-sm text-gray-600">
                      {new Date(item.regDate).toLocaleDateString('th-TH', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="p-3 font-medium text-primary">
                      {item.firstNameTh} {item.lastNameTh}
                    </td>
                    <td className="p-3 text-sm">{item.mobile}</td>
                    <td className="p-3 text-sm text-gray-800 bg-yellow-50 rounded italic m-1">
                      {item.remark}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center p-8 text-gray-500">ไม่พบผู้สมัครที่มีหมายเหตุ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
