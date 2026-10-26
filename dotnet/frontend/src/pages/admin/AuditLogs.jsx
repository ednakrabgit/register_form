import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect } from 'react';
import HistorySnapshotViewer from '../../components/HistorySnapshotViewer';



export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/AuditLog`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setLogs(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('ไม่สามารถดึงข้อมูล Audit Logs ได้');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.registerId.toString().includes(searchLower) ||
      (log.createdBy && log.createdBy.toLowerCase().includes(searchLower)) ||
      (log.editedByType && log.editedByType.toLowerCase().includes(searchLower))
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('th-TH');
  };

  const formatJson = (jsonString) => {
    if (!jsonString) return 'ไม่มีข้อมูล';
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch {
      return jsonString;
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-primary">ประวัติการแก้ไขข้อมูล (Audit Logs)</h2>
      
      <div className="mb-4">
        <input 
          type="text" 
          placeholder="ค้นหาตามรหัสผู้สมัคร, ผู้แก้ไข..." 
          className="w-full md:w-1/3 px-4 py-2 border rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-10">กำลังโหลด...</div>
      ) : error ? (
        <div className="text-red-500 py-5">{error}</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันเวลา</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รหัสผู้สมัคร</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">แก้ไขโดย (ประเภท)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อผู้แก้ไข</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(log.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">#{log.registerId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs ${log.editedByType === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {log.editedByType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.createdBy}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="text-primary hover:text-primary-light"
                    >
                      ดูข้อมูล
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">ไม่พบประวัติการแก้ไข</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
              <h3 className="text-lg font-bold">รายละเอียดการแก้ไข - รหัสผู้สมัคร #{selectedLog.registerId}</h3>
              <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-black">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <HistorySnapshotViewer 
                oldData={selectedLog.oldData} 
                newData={selectedLog.newData}
                title={`ประวัติการแก้ไข #${selectedLog.id} (รหัสผู้สมัคร #${selectedLog.registerId})`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
