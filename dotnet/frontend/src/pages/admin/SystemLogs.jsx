import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect } from 'react';



export default function SystemLogs() {
  const [logFiles, setLogFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [logContent, setLogContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogFiles();
  }, []);

  useEffect(() => {
    if (selectedFile) {
      fetchLogContent(selectedFile);
    } else {
      setLogContent('');
    }
  }, [selectedFile]);

  const fetchLogFiles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/SystemLog/files`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setLogFiles(data);
      if (data.length > 0) {
        setSelectedFile(data[0]);
      }
    } catch (err) {
      console.error('Error fetching log files:', err);
      setError('ไม่สามารถดึงรายชื่อไฟล์ Log ได้');
    }
  };

  const fetchLogContent = async (filename) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/SystemLog/files/${filename}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.text();
      setLogContent(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching log content:', err);
      setError('ไม่สามารถดึงเนื้อหาไฟล์ Log ได้');
      setLogContent('');
    } finally {
      setLoading(false);
    }
  };

  const highlightSearchTerm = (text) => {
    if (!searchTerm) return text;
    
    const lines = text.split('\n');
    return lines.map((line, index) => {
      if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
        return (
          <div key={index} className="bg-yellow-200/50 block w-full px-2">
            {line}
          </div>
        );
      }
      return <div key={index} className="px-2">{line}</div>;
    });
  };

  const getFilteredLinesCount = () => {
    if (!logContent || !searchTerm) return 0;
    return logContent.split('\n').filter(line => line.toLowerCase().includes(searchTerm.toLowerCase())).length;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-primary">บันทึกระบบ (System Logs)</h2>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium text-gray-700 mb-1">เลือกไฟล์ Log</label>
          <select 
            className="w-full px-4 py-2 border rounded-md"
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
          >
            <option value="">-- กรุณาเลือกไฟล์ --</option>
            {logFiles.map(file => (
              <option key={file} value={file}>{file}</option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหาใน Log</label>
          <input 
            type="text" 
            placeholder="เช่น Error, Exception, POST..." 
            className="w-full px-4 py-2 border rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-1/3 flex items-end">
          <button 
            onClick={() => selectedFile && fetchLogContent(selectedFile)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md border hover:bg-gray-200 transition"
          >
            <i className="fas fa-sync-alt mr-2"></i> รีเฟรช
          </button>
        </div>
      </div>

      {error && <div className="text-red-500 py-2 mb-4 bg-red-50 px-4 rounded border border-red-200">{error}</div>}

      {searchTerm && logContent && (
        <div className="mb-2 text-sm text-gray-600">
          พบคำว่า "{searchTerm}" จำนวน {getFilteredLinesCount()} บรรทัด
        </div>
      )}

      <div className="border border-gray-800 rounded-lg overflow-hidden bg-[#1E1E1E] text-[#D4D4D4] font-mono text-sm relative">
        {loading && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
            <div className="text-white bg-black/80 px-4 py-2 rounded-lg">กำลังโหลด...</div>
          </div>
        )}
        <div className="h-[600px] overflow-auto py-2 whitespace-pre-wrap break-all">
          {logContent ? (
            searchTerm ? highlightSearchTerm(logContent) : <div className="px-2">{logContent}</div>
          ) : (
            <div className="px-4 text-gray-500 italic">ไม่พบเนื้อหาหรือยังไม่ได้เลือกไฟล์</div>
          )}
        </div>
      </div>
    </div>
  );
}
