import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';



export default function TrainingImport() {
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'history'
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [syncVerified, setSyncVerified] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchNationId, setSearchNationId] = useState('');
  const [searchCourseCode, setSearchCourseCode] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, page]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setPreviewData(null);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) {
      alert('กรุณาเลือกไฟล์ Excel (.xlsx)');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${API_BASE_URL}/TrainingStamp/preview`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'ไม่สามารถอ่านไฟล์ Excel ได้');
      }

      const json = await res.json();
      setPreviewData(json);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedFile) return;

    if (!confirm(`ยืนยันการ Stamp ผลการอบรมจำนวน ${previewData?.totalRows || 0} รายการ ใช่หรือไม่?`)) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${API_BASE_URL}/TrainingStamp/execute?syncVerifiedData=${syncVerified}`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'การ Stamp ผลการอบรมล้มเหลว');
      }

      const json = await res.json();
      setSuccessMessage(`ดำเนินการ Stamp ผลการอบรมสำเร็จเรียบร้อยแล้ว (${json.summary?.passedCount || 0} ผ่าน / ${json.summary?.failedCount || 0} ไม่ผ่าน)`);
      setPreviewData(null);
      setSelectedFile(null);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      let url = `${API_BASE_URL}/TrainingStamp/results?page=${page}&pageSize=30`;
      if (searchNationId) url += `&nationId=${encodeURIComponent(searchNationId)}`;
      if (searchCourseCode) url += `&trainingCourseCode=${encodeURIComponent(searchCourseCode)}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setHistoryList(json.data || []);
        setTotalCount(json.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSyncSingle = async (resultId) => {
    if (!confirm('ต้องการซิงค์ข้อมูลที่ผ่านการตรวจสอบนี้เข้าสู่ข้อมูลผู้สมัคร (Person Profile) ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/TrainingStamp/sync-verified/${resultId}`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'ซิงค์ข้อมูลไม่สำเร็จ');
      }
      alert('ซิงค์ข้อมูลสำเร็จเรียบร้อย');
      fetchHistory();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6 border-b-2 border-primary pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
            <i className="fas fa-file-import text-blue-600"></i>
            นำเข้าผลการอบรม (Training Result Stamp)
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            นำเข้าไฟล์ Excel จากระบบอบรม (Viriyah Online Learning) เพื่อ Stamp ผลการผ่านการอบรมและบันทึกข้อมูลที่ผ่านการตรวจสอบ
          </p>
        </div>
        <Link to="/admin" className="px-4 py-2 border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors text-sm">
          <i className="fas fa-arrow-left mr-2"></i> กลับหน้าหลัก
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('import')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'import'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className="fas fa-upload"></i> นำเข้าไฟล์ Excel & Stamp ผล
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className="fas fa-history"></i> ประวัติการ Stamp ({totalCount})
        </button>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <i className="fas fa-check-circle text-green-600 text-lg"></i>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <i className="fas fa-exclamation-triangle text-red-600 text-lg"></i>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:text-red-800">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* TAB 1: IMPORT & STAMP */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* File Upload Box */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
              <i className="fas fa-file-excel text-emerald-600"></i> เลือกไฟล์ Excel จากระบบอบรม
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              รองรับไฟล์ Excel ผลการอบรม เช่น <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono text-xs">post_VIRIYAH_NA4_20260819-20260825.xlsx</code>
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-300 rounded-lg p-1.5"
              />
              <button
                onClick={handlePreview}
                disabled={!selectedFile || loading}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shrink-0 shadow-xs"
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                อ่านข้อมูล & Preview
              </button>
            </div>
          </div>

          {/* Preview Results */}
          {previewData && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs text-center">
                  <div className="text-xs text-gray-500 font-medium">แถวทั้งหมด</div>
                  <div className="text-2xl font-black text-gray-800 mt-1">{previewData.totalRows}</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-xs text-center">
                  <div className="text-xs text-emerald-700 font-semibold">อนุมัติ / ผ่าน</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{previewData.passedCount}</div>
                </div>
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-xs text-center">
                  <div className="text-xs text-rose-700 font-semibold">ไม่ผ่าน</div>
                  <div className="text-2xl font-black text-rose-700 mt-1">{previewData.failedCount}</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-xs text-center">
                  <div className="text-xs text-amber-700 font-semibold">สิทธิลดหย่อนต่อ 4</div>
                  <div className="text-2xl font-black text-amber-700 mt-1">{previewData.deductionCount}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-xs text-center">
                  <div className="text-xs text-blue-700 font-semibold">พบในระบบ (Person)</div>
                  <div className="text-2xl font-black text-blue-700 mt-1">{previewData.matchedPersonsCount}</div>
                </div>
                <div className="bg-gray-100 p-4 rounded-xl border border-gray-300 shadow-xs text-center">
                  <div className="text-xs text-gray-600 font-semibold">ไม่พบในระบบ</div>
                  <div className="text-2xl font-black text-gray-600 mt-1">{previewData.unmatchedPersonsCount}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 shadow-xs text-center">
                  <div className="text-xs text-purple-700 font-semibold">ข้อมูลไม่ตรงกัน</div>
                  <div className="text-2xl font-black text-purple-700 mt-1">{previewData.mismatchedDataCount}</div>
                </div>
              </div>

              {/* Execution Actions Box */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer font-medium select-none">
                    <input
                      type="checkbox"
                      checked={syncVerified}
                      onChange={(e) => setSyncVerified(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span>ซิงค์ข้อมูลที่ตรวจสอบแล้ว (ชื่อ-สกุล, เลขใบอนุญาต Col T-W) เข้า <strong>Person Profile</strong> ทันที</span>
                  </label>
                </div>
                <button
                  onClick={handleExecute}
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-stamp"></i>}
                  ยืนยันและดำเนินการ Stamp ผล ({previewData.totalRows} รายการ)
                </button>
              </div>

              {/* Preview Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                    <i className="fas fa-table"></i> รายละเอียดข้อมูลที่จะ Stamp
                  </h4>
                  <span className="text-xs text-gray-500">ไฟล์: {previewData.fileName}</span>
                </div>

                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-gray-100 text-gray-700 sticky top-0 shadow-xs z-10">
                      <tr>
                        <th className="p-2.5 border-b w-10 text-center">#</th>
                        <th className="p-2.5 border-b min-w-[130px]">เลขบัตร ปชช. (Col F)</th>
                        <th className="p-2.5 border-b min-w-[180px]">ชื่อ-สกุล (ตรวจสอบแล้ว Col T-V)</th>
                        <th className="p-2.5 border-b min-w-[130px]">เลขใบอนุญาต (Col W)</th>
                        <th className="p-2.5 border-b min-w-[120px]">รหัสวิชา (Col R)</th>
                        <th className="p-2.5 border-b min-w-[100px]">รอบเรียน (Col Q)</th>
                        <th className="p-2.5 border-b w-24 text-center">ผลอบรม (Col L)</th>
                        <th className="p-2.5 border-b w-20 text-center">ลดหย่อน (Col J)</th>
                        <th className="p-2.5 border-b min-w-[100px] text-center">คะแนน/ความคืบหน้า</th>
                        <th className="p-2.5 border-b min-w-[140px]">สถานะในระบบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.rows.map((row, idx) => (
                        <tr key={idx} className={`hover:bg-gray-50 ${row.IsDataMismatch ? 'bg-amber-50/40' : ''}`}>
                          <td className="p-2.5 text-center text-gray-400 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-medium text-gray-900">{row.nationalId}</td>
                          <td className="p-2.5">
                            <div className="font-medium text-gray-900">
                              {row.verifiedTitleTh}{row.verifiedFirstNameTh} {row.verifiedLastNameTh}
                            </div>
                            {row.originalFirstName && (
                              <div className="text-[10px] text-gray-500">
                                เดิม: {row.originalPrefix}{row.originalFirstName} {row.originalLastName}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className="font-mono font-semibold text-blue-800">{row.verifiedLicenseNo || row.originalLicenseNo || '-'}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="font-mono bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-bold">
                              {row.trainingCourseCode}
                            </span>
                            <div className="text-[10px] text-gray-500 truncate max-w-[150px]" title={row.trainingCourseName}>
                              {row.trainingCourseName}
                            </div>
                          </td>
                          <td className="p-2.5 font-mono text-gray-700">{row.trainingDateDisplay}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              row.trainingStatus === 'อนุมัติ' || row.trainingStatus === 'ผ่าน'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {row.trainingStatus || '-'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            {row.deductionPrivilege === 'Y' ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                                ใช้สิทธิ (Y)
                              </span>
                            ) : (
                              <span className="text-gray-400 font-mono text-[10px]">N</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center text-[11px]">
                            <span className="font-mono text-teal-700 font-semibold">{row.progressPercent || '-'}</span> / <span className="font-mono text-indigo-700 font-semibold">{row.scorePercent || '-'}</span>
                          </td>
                          <td className="p-2.5">
                            {row.isPersonMatched ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                                <i className="fas fa-check-circle"></i> พบในระบบ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 italic">
                                <i className="fas fa-question-circle"></i> ไม่พบผู้สมัคร
                              </span>
                            )}
                            {row.isDataMismatch && (
                              <div className="text-[10px] text-amber-700 mt-0.5 font-medium" title={row.mismatchDetails}>
                                <i className="fas fa-exclamation-circle text-amber-600 mr-1"></i>ข้อมูลไม่ตรง
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-1/3">
              <input
                type="text"
                value={searchNationId}
                onChange={(e) => setSearchNationId(e.target.value)}
                placeholder="ค้นหาด้วยเลขบัตร ปชช. (13 หลัก)..."
                className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-full sm:w-1/3">
              <input
                type="text"
                value={searchCourseCode}
                onChange={(e) => setSearchCourseCode(e.target.value)}
                placeholder="ค้นหาด้วยรหัสวิชา (เช่น A4P1_04)..."
                className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => { setPage(1); fetchHistory(); }}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <i className="fas fa-search mr-1"></i> ค้นหา
            </button>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {historyLoading ? (
              <div className="p-12 text-center text-gray-500">
                <i className="fas fa-spinner fa-spin text-3xl text-blue-600 mb-2 block"></i>
                กำลังโหลดประวัติ...
              </div>
            ) : historyList.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <i className="fas fa-folder-open text-4xl mb-2 block"></i>
                ยังไม่มีข้อมูลประวัติการ Stamp ผลการอบรม
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="p-3 border-b">วันที่ Stamp</th>
                      <th className="p-3 border-b">เลขบัตร ปชช.</th>
                      <th className="p-3 border-b">ชื่อ-สกุล (Verified)</th>
                      <th className="p-3 border-b">เลขใบอนุญาต (Verified)</th>
                      <th className="p-3 border-b">รหัสวิชา/หลักสูตร</th>
                      <th className="p-3 border-b">รอบเรียน</th>
                      <th className="p-3 border-b text-center">ผลอบรม</th>
                      <th className="p-3 border-b text-center">สิทธิลดหย่อน</th>
                      <th className="p-3 border-b">ชื่อไฟล์ที่นำเข้า</th>
                      <th className="p-3 border-b text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {historyList.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-gray-500">
                          {new Date(item.stampDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 font-mono font-medium text-gray-900">{item.nationId}</td>
                        <td className="p-3 font-medium text-gray-900">
                          {item.verifiedTitleTh}{item.verifiedFirstNameTh} {item.verifiedLastNameTh}
                        </td>
                        <td className="p-3 font-mono text-blue-800 font-semibold">{item.verifiedLicenseNo || '-'}</td>
                        <td className="p-3">
                          <span className="font-mono bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-bold">
                            {item.trainingCourseCode}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{item.trainingDateDisplay}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.trainingStatus === 'อนุมัติ' || item.trainingStatus === 'ผ่าน'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.trainingStatus || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {item.deductionPrivilege === 'Y' ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">Y</span>
                          ) : (
                            <span className="text-gray-400 font-mono">N</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-500 truncate max-w-[160px]" title={item.importFileName}>
                          {item.importFileName}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleSyncSingle(item.id)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors text-[11px] font-medium"
                            title="ซิงค์ข้อมูลชื่อ-สกุล/เลขใบอนุญาตเข้า Person Profile"
                          >
                            <i className="fas fa-sync-alt mr-1"></i> ซิงค์ Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
