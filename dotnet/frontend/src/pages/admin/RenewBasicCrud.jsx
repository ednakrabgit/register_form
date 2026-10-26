import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = API_BASE_URL;

export default function RenewBasicCrud() {
  const [data, setData] = useState([]);
  const [renewDates, setRenewDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Main CRUD modal state
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    courseName: '',
    status: 'active',
    dateId: '',
    agentType: 'agent'
  });

  // Normalized Curriculum & Sub-Details Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState(null);
  const [curriculumsList, setCurriculumsList] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Curriculum Package Form State (Level 1)
  const [editingCurriculumId, setEditingCurriculumId] = useState(null);
  const [curriculumForm, setCurriculumForm] = useState({
    agentType: 'agent',
    trainingCourseCode: '',
    announcementCode: '',
    courseShortName: '',
    curriculumCode: '',
    displayOrder: 1,
    status: 'active'
  });

  // Sub-detail Add/Edit State (Level 2)
  const [selectedCurriculumForSub, setSelectedCurriculumForSub] = useState(null);
  const [editingSubDetailId, setEditingSubDetailId] = useState(null);
  const [subDetailForm, setSubDetailForm] = useState({
    oicCourseCode: '',
    subCourseName: '',
    displayOrder: 1,
    status: 'active'
  });

  useEffect(() => {
    fetchData();
    fetchRenewDates();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/RenewBasic?all=true`);
      if (!res.ok) throw new Error('Failed to fetch renew basic');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRenewDates = async () => {
    try {
      const res = await fetch(`${API_BASE}/RenewData/dates?all=true`);
      if (res.ok) {
        const json = await res.json();
        setRenewDates(json);
      }
    } catch (err) {
      console.error('Failed to load dates', err);
    }
  };

  const openAddModal = () => {
    setEditItem(null);
    setFormData({
      courseName: '',
      status: 'active',
      dateId: '',
      agentType: 'agent',
      isActiveBackend: true,
      isActiveFrontend: true,
      startActiveDatetime: '',
      endActiveDatetime: ''
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditItem(item);
    setFormData({
      courseName: item.courseName || '',
      status: item.status || 'active',
      dateId: item.dateId || '',
      agentType: item.agentType || 'agent',
      isActiveBackend: item.isActiveBackend !== false,
      isActiveFrontend: item.isActiveFrontend !== false,
      startActiveDatetime: item.startActiveDatetime ? item.startActiveDatetime.slice(0, 16) : '',
      endActiveDatetime: item.endActiveDatetime ? item.endActiveDatetime.slice(0, 16) : ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = editItem ? 'PUT' : 'POST';
      const url = editItem ? `${API_BASE}/RenewBasic/${editItem.id}` : `${API_BASE}/RenewBasic`;
      
      const payload = {
        id: editItem ? editItem.id : 0,
        courseName: formData.courseName,
        status: formData.status,
        dateId: formData.dateId ? parseInt(formData.dateId) : null,
        agentType: formData.agentType,
        isActiveBackend: formData.isActiveBackend !== false,
        isActiveFrontend: formData.isActiveFrontend !== false,
        startActiveDatetime: formData.startActiveDatetime ? new Date(formData.startActiveDatetime).toISOString() : null,
        endActiveDatetime: formData.endActiveDatetime ? new Date(formData.endActiveDatetime).toISOString() : null
      };
        
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to save');
      
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`${API_BASE}/RenewBasic/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // --- Normalized Course Curriculum & Sub-Courses Handlers ---
  const openDetailsModal = async (course) => {
    setSelectedCourseForDetails(course);
    resetCurriculumForm();
    setSelectedCurriculumForSub(null);
    setShowDetailsModal(true);
    await fetchCurriculums(course.id);
  };

  const fetchCurriculums = async (courseId) => {
    try {
      setDetailsLoading(true);
      const res = await fetch(`${API_BASE}/CourseCurriculum?courseType=basic&courseId=${courseId}&all=true`);
      if (res.ok) {
        const json = await res.json();
        setCurriculumsList(json);
      }
    } catch (err) {
      console.error('Failed to load curriculums', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const resetCurriculumForm = () => {
    setEditingCurriculumId(null);
    setCurriculumForm({
      agentType: selectedCourseForDetails?.agentType || 'agent',
      trainingCourseCode: '',
      announcementCode: 'NLGA-2564',
      courseShortName: '',
      curriculumCode: '',
      displayOrder: curriculumsList.length + 1,
      status: 'active'
    });
  };

  const handleEditCurriculum = (curr) => {
    setEditingCurriculumId(curr.id);
    setCurriculumForm({
      agentType: curr.agentType || 'agent',
      trainingCourseCode: curr.trainingCourseCode || '',
      announcementCode: curr.announcementCode || '',
      courseShortName: curr.courseShortName || '',
      curriculumCode: curr.curriculumCode || '',
      displayOrder: curr.displayOrder || 1,
      status: curr.status || 'active'
    });
  };

  const handleSaveCurriculum = async (e) => {
    e.preventDefault();
    if (!selectedCourseForDetails) return;

    try {
      const method = editingCurriculumId ? 'PUT' : 'POST';
      const url = editingCurriculumId 
        ? `${API_BASE}/CourseCurriculum/${editingCurriculumId}` 
        : `${API_BASE}/CourseCurriculum`;

      const payload = {
        id: editingCurriculumId || 0,
        courseType: 'basic',
        courseId: selectedCourseForDetails.id,
        ...curriculumForm,
        displayOrder: parseInt(curriculumForm.displayOrder) || 1
      };

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Save curriculum failed');

      resetCurriculumForm();
      await fetchCurriculums(selectedCourseForDetails.id);
      await fetchData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกหลักสูตร: ' + err.message);
    }
  };

  const handleDeleteCurriculum = async (curriculumId) => {
    if (!window.confirm('คุณต้องการลบแพ็กเกจหลักสูตรนี้และวิชาย่อยทั้งหมดใช่หรือไม่?')) return;
    try {
      const res = await fetch(`${API_BASE}/CourseCurriculum/${curriculumId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete curriculum failed');
      await fetchCurriculums(selectedCourseForDetails.id);
      await fetchData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
    }
  };

  // Sub-detail handlers
  const openAddSubDetail = (curr) => {
    setSelectedCurriculumForSub(curr);
    setEditingSubDetailId(null);
    setSubDetailForm({
      oicCourseCode: '',
      subCourseName: '',
      displayOrder: (curr.subDetails?.length || 0) + 1,
      status: 'active'
    });
  };

  const handleEditSubDetail = (curr, sub) => {
    setSelectedCurriculumForSub(curr);
    setEditingSubDetailId(sub.id);
    setSubDetailForm({
      oicCourseCode: sub.oicCourseCode || '',
      subCourseName: sub.subCourseName || '',
      displayOrder: sub.displayOrder || 1,
      status: sub.status || 'active'
    });
  };

  const handleSaveSubDetail = async (e) => {
    e.preventDefault();
    if (!selectedCurriculumForSub) return;

    try {
      const method = editingSubDetailId ? 'PUT' : 'POST';
      const url = editingSubDetailId
        ? `${API_BASE}/CourseCurriculum/sub-detail/${editingSubDetailId}`
        : `${API_BASE}/CourseCurriculum/${selectedCurriculumForSub.id}/sub-detail`;

      const payload = {
        id: editingSubDetailId || 0,
        curriculumId: selectedCurriculumForSub.id,
        ...subDetailForm,
        displayOrder: parseInt(subDetailForm.displayOrder) || 1
      };

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Save sub-course failed');

      setSelectedCurriculumForSub(null);
      setEditingSubDetailId(null);
      await fetchCurriculums(selectedCourseForDetails.id);
      await fetchData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกวิชาย่อย: ' + err.message);
    }
  };

  const handleDeleteSubDetail = async (subId) => {
    if (!window.confirm('คุณต้องการลบวิชาย่อยนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`${API_BASE}/CourseCurriculum/sub-detail/${subId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete sub-course failed');
      await fetchCurriculums(selectedCourseForDetails.id);
      await fetchData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6 border-b-2 border-warning pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-warning mb-2">จัดการหลักสูตรพื้นฐาน (Renew Basic)</h2>
          <p className="text-gray-500 text-sm">
            จัดการหลักสูตรพื้นฐานและโครงสร้างรหัสเชื่อมโยงระบบอบรม (Normalized Curriculum & Sub-Courses)
          </p>
        </div>
        <Link to="/admin/master-data" className="px-4 py-2 border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors text-sm">
          <i className="fas fa-arrow-left mr-2"></i> กลับหน้ารวม Master Data
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-end mb-4">
          <button onClick={openAddModal} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm">
            <i className="fas fa-plus mr-2"></i> เพิ่มหลักสูตรพื้นฐาน
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10"><i className="fas fa-spinner fa-spin text-3xl text-warning"></i></div>
        ) : error ? (
          <div className="text-red-600 text-center py-5">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-3 border-b w-14">ID</th>
                  <th className="p-3 border-b min-w-[180px]">หลักสูตร</th>
                  <th className="p-3 border-b min-w-[320px]">รหัสประกาศ / รหัสหลักสูตร / รหัสวิชา OIC (Normalized)</th>
                  <th className="p-3 border-b w-24">ประเภท</th>
                  <th className="p-3 border-b">วันที่อบรม</th>
                  <th className="p-3 border-b min-w-[160px] text-center">สถานะ (Backend / Frontend)</th>
                  <th className="p-3 border-b text-center w-36">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => {
                  const curriculums = item.curriculums && item.curriculums.length > 0 ? item.curriculums : [];
                  const legacyDetails = item.details || [];
                  const totalSubCourses = curriculums.reduce((acc, c) => acc + (c.subDetails?.length || 0), 0);

                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-gray-500 font-mono">#{item.id}</td>
                      <td className="p-3 font-bold text-gray-800">{item.courseName}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-2">
                          {curriculums.length > 0 ? (
                            curriculums.map(c => (
                              <div key={c.id} className="p-2 bg-blue-50/60 border border-blue-200 rounded-lg text-xs space-y-1.5 shadow-xs">
                                <div className="flex items-center gap-2 flex-wrap font-medium">
                                  {c.agentType === 'broker' ? (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">นายหน้า (Broker)</span>
                                  ) : c.agentType === 'both' ? (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded">Agent+Broker</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">ตัวแทน (Agent)</span>
                                  )}
                                  <span className="font-bold text-gray-900">{c.courseShortName || '-'}</span>
                                  {c.trainingCourseCode && (
                                    <span className="bg-purple-100 text-purple-800 font-mono px-1.5 py-0.5 rounded font-bold" title="รหัสคอร์สระบบอบรม (Col R)">
                                      <i className="fas fa-desktop mr-1 text-[10px]"></i>{c.trainingCourseCode}
                                    </span>
                                  )}
                                  {c.curriculumCode && (
                                    <span className="bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-mono text-[11px]" title="รหัสหลักสูตร คปภ.">
                                      {c.curriculumCode}
                                    </span>
                                  )}
                                  {c.announcementCode && (
                                    <span className="text-amber-700 font-mono text-[10px]" title="รหัสประกาศ">
                                      [{c.announcementCode}]
                                    </span>
                                  )}
                                </div>

                                {c.subDetails && c.subDetails.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 pl-2 border-l-2 border-blue-300">
                                    {c.subDetails.map(s => (
                                      <span key={s.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[11px] text-gray-800 shadow-2xs">
                                        <span className="font-bold text-rose-700 font-mono">{s.oicCourseCode}</span>
                                        {s.subCourseName && <span className="text-gray-700">{s.subCourseName}</span>}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-gray-400 italic text-[11px] pl-2">ยังไม่มีวิชาย่อย</div>
                                )}
                              </div>
                            ))
                          ) : legacyDetails.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {legacyDetails.map(d => (
                                <div key={d.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-50 text-yellow-900 border border-yellow-200 rounded text-xs">
                                  {d.subCourseName && <span className="font-semibold text-gray-900">{d.subCourseName}</span>}
                                  {d.oicCourseCode && <span className="font-bold text-rose-700 font-mono">{d.oicCourseCode}</span>}
                                  {d.courseCode && <span className="text-blue-700 font-mono">({d.courseCode})</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-xs">ยังไม่มีรหัสหลักสูตร/OIC ผูกไว้</span>
                          )}

                          <div>
                            <button 
                              onClick={() => openDetailsModal(item)} 
                              className="inline-flex items-center text-xs text-blue-700 hover:text-blue-900 font-semibold hover:underline mt-1"
                            >
                              <i className="fas fa-tags mr-1"></i>
                              จัดการหลักสูตร & วิชาย่อย ({curriculums.length} แพ็กเกจ / {totalSubCourses || legacyDetails.length} วิชาย่อย)
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 uppercase text-xs font-bold">
                        {item.agentType === 'agent' ? <span className="text-blue-600">Agent</span> : <span className="text-purple-600">Broker</span>}
                      </td>
                      <td className="p-3 text-gray-600">
                        {renewDates.find(d => d.id === item.dateId)?.courseDateDisplay || (item.dateId ? `ID: ${item.dateId}` : '-')}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.isActiveBackend !== false ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>
                              BE: {item.isActiveBackend !== false ? 'Active' : 'Off'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.isActiveFrontend !== false && item.status !== 'inactive' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              FE: {item.isActiveFrontend !== false && item.status !== 'inactive' ? 'Active' : 'Off'}
                            </span>
                          </div>
                          {(item.startActiveDatetime || item.endActiveDatetime) && (
                            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-0.5" title="ช่วงเวลาเปิดรับสมัครบน Frontend">
                              <i className="far fa-clock text-[9px]"></i>
                              <span>
                                {item.startActiveDatetime ? new Date(item.startActiveDatetime).toLocaleDateString('th-TH') : 'เลย'} - {item.endActiveDatetime ? new Date(item.endActiveDatetime).toLocaleDateString('th-TH') : 'ไม่จำกัด'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => openDetailsModal(item)} 
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 mx-1"
                          title="จัดการรหัสหลักสูตรและวิชาย่อย OIC"
                        >
                          <i className="fas fa-tags"></i>
                        </button>
                        <button onClick={() => openEditModal(item)} className="text-primary hover:text-blue-700 mx-1.5" title="แก้ไข">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-danger hover:text-red-700 mx-1.5" title="ลบ">
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-gray-500">ไม่มีข้อมูล</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Renew Basic Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
              {editItem ? 'แก้ไขหลักสูตรพื้นฐาน' : 'เพิ่มหลักสูตรพื้นฐาน'}
            </h3>
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อหลักสูตร <span className="text-danger">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  value={formData.courseName} 
                  onChange={e => setFormData({...formData, courseName: e.target.value})} 
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-warning outline-none" 
                  placeholder="เช่น ขอรับใบอนุญาตตัวแทนประกันวินาศภัย"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ประเภท (Agent / Broker) <span className="text-danger">*</span>
                </label>
                <select 
                  value={formData.agentType} 
                  onChange={e => setFormData({...formData, agentType: e.target.value})} 
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-warning outline-none bg-white font-medium"
                >
                  <option value="agent">ตัวแทน (Agent)</option>
                  <option value="broker">นายหน้า (Broker)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เปิดอบรม</label>
                <select 
                  value={formData.dateId} 
                  onChange={e => setFormData({...formData, dateId: e.target.value})} 
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-warning outline-none bg-white"
                >
                  <option value="">-- ไม่ระบุ --</option>
                  {renewDates.map(d => (
                    <option key={d.id} value={d.id}>{d.courseDateDisplay}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">สถานะทั่วไป</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})} 
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-warning outline-none bg-white"
                >
                  <option value="active">Active (เปิดใช้งาน)</option>
                  <option value="inactive">Inactive (ปิดใช้งาน)</option>
                </select>
              </div>

              {/* Dual Active Flags */}
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mb-4 space-y-3">
                <div className="font-semibold text-xs text-gray-700 uppercase tracking-wider">
                  <i className="fas fa-toggle-on mr-1 text-primary"></i> การควบคุมการมองเห็น (Visibility Flags)
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2 bg-white rounded border cursor-pointer hover:bg-blue-50/50">
                    <input 
                      type="checkbox" 
                      checked={formData.isActiveBackend !== false} 
                      onChange={e => setFormData({...formData, isActiveBackend: e.target.checked})}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-gray-800">Backend / Admin</div>
                      <div className="text-gray-500 text-[10px]">เปิดใช้ในระบบหลังบ้าน</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded border cursor-pointer hover:bg-emerald-50/50">
                    <input 
                      type="checkbox" 
                      checked={formData.isActiveFrontend !== false} 
                      onChange={e => setFormData({...formData, isActiveFrontend: e.target.checked})}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-gray-800">Frontend / หน้าสมัคร</div>
                      <div className="text-gray-500 text-[10px]">แสดงให้ผู้สมัครเห็น</div>
                    </div>
                  </label>
                </div>

                {/* Frontend Active DateTime Range */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-1.5">
                    <i className="far fa-calendar-alt mr-1 text-amber-600"></i> ช่วงเวลาเปิดใช้งานบน Frontend (หน้าสมัคร):
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-0.5">เวลาเริ่มต้น (Start)</label>
                      <input 
                        type="datetime-local" 
                        value={formData.startActiveDatetime || ''} 
                        onChange={e => setFormData({...formData, startActiveDatetime: e.target.value})}
                        className="w-full border rounded p-1.5 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-0.5">เวลาสิ้นสุด (End)</label>
                      <input 
                        type="datetime-local" 
                        value={formData.endActiveDatetime || ''} 
                        onChange={e => setFormData({...formData, endActiveDatetime: e.target.value})}
                        className="w-full border rounded p-1.5 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">* ปล่อยว่างหากต้องการเปิดใช้งานตลอดเวลา</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100 transition">
                  ยกเลิก
                </button>
                <button type="submit" className="px-4 py-2 bg-warning text-white rounded hover:bg-yellow-600 transition">
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NORMALIZED CURRICULUM & SUB-COURSES MODAL */}
      {showDetailsModal && selectedCourseForDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 p-6 animate-in fade-in duration-150">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <i className="fas fa-sitemap text-blue-600"></i>
                  จัดการหลักสูตรและวิชาย่อย (Normalized Curriculums)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  หลักสูตร: <span className="font-bold text-gray-800">{selectedCourseForDetails.courseName}</span> (ID: #{selectedCourseForDetails.id})
                </p>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            {/* List of Curriculum Packages */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-700 mb-2">1. รายการแพ็กเกจหลักสูตร (Curriculum Packages)</h4>
              
              {detailsLoading ? (
                <div className="text-center py-6"><i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i></div>
              ) : curriculumsList.length === 0 ? (
                <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-400 text-sm">
                  ยังไม่มีแพ็กเกจหลักสูตร กรุณาเพิ่มข้อมูลด้านล่าง
                </div>
              ) : (
                <div className="space-y-4">
                  {curriculumsList.map((curr, idx) => (
                    <div key={curr.id} className="border border-blue-200 rounded-xl p-4 bg-white shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-gray-400 font-bold text-xs">#{idx + 1}</span>
                          {curr.agentType === 'broker' ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">นายหน้า (Broker)</span>
                          ) : curr.agentType === 'both' ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">Agent+Broker</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">ตัวแทน (Agent)</span>
                          )}
                          <span className="font-bold text-base text-gray-900">{curr.courseShortName}</span>
                          <span className="bg-purple-100 text-purple-800 font-mono px-2 py-0.5 rounded text-xs font-bold" title="รหัสในระบบอบรม (Col R)">
                            <i className="fas fa-desktop mr-1 text-[10px]"></i>รหัสระบบอบรม: {curr.trainingCourseCode || '-'}
                          </span>
                          <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded text-xs font-mono" title="รหัสหลักสูตร คปภ.">
                            คปภ: {curr.curriculumCode || '-'}
                          </span>
                          <span className="text-amber-700 font-mono text-xs">
                            [{curr.announcementCode || '-'}]
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openAddSubDetail(curr)}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1"
                          >
                            <i className="fas fa-plus text-[10px]"></i> เพิ่มวิชาย่อย
                          </button>
                          <button
                            onClick={() => handleEditCurriculum(curr)}
                            className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs"
                            title="แก้ไขหลักสูตร"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteCurriculum(curr.id)}
                            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs"
                            title="ลบหลักสูตร"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>

                      {/* Sub-courses under this curriculum */}
                      <div>
                        <div className="text-xs font-bold text-gray-500 mb-2 flex items-center justify-between">
                          <span>วิชาย่อย คปภ. ({curr.subDetails?.length || 0} รายวิชา):</span>
                        </div>
                        {curr.subDetails && curr.subDetails.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {curr.subDetails.map((sub, sIdx) => (
                              <div key={sub.id} className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between gap-2 text-xs">
                                <div>
                                  <div className="font-bold text-rose-700 font-mono">{sub.oicCourseCode}</div>
                                  <div className="text-gray-800 font-medium line-clamp-1" title={sub.subCourseName}>
                                    {sub.subCourseName || '-'}
                                  </div>
                                </div>
                                <div className="flex items-center shrink-0">
                                  <button
                                    onClick={() => handleEditSubDetail(curr, sub)}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                    title="แก้ไขวิชาย่อย"
                                  >
                                    <i className="fas fa-edit text-[11px]"></i>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubDetail(sub.id)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="ลบวิชาย่อย"
                                  >
                                    <i className="fas fa-trash text-[11px]"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded text-center text-gray-400 text-xs italic">
                            ยังไม่มีวิชาย่อย คลิก "เพิ่มวิชาย่อย" เพื่อกำหนดรายวิชา
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub Detail Add/Edit Dialog (Level 2) */}
            {selectedCurriculumForSub && (
              <div className="mb-6 p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl animate-in fade-in duration-150">
                <h4 className="text-sm font-bold text-emerald-900 mb-3 flex items-center justify-between">
                  <span>
                    <i className="fas fa-book-reader mr-1.5"></i>
                    {editingSubDetailId ? 'แก้ไขวิชาย่อย' : `เพิ่มวิชาย่อย ภายใต้หลักสูตร: ${selectedCurriculumForSub.courseShortName} (${selectedCurriculumForSub.trainingCourseCode})`}
                  </span>
                  <button
                    onClick={() => { setSelectedCurriculumForSub(null); setEditingSubDetailId(null); }}
                    className="text-xs text-emerald-700 hover:text-emerald-900 underline"
                  >
                    ปิดฟอร์ม
                  </button>
                </h4>
                <form onSubmit={handleSaveSubDetail} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      รหัสวิชา OIC (เช่น นว264ก) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={subDetailForm.oicCourseCode}
                      onChange={e => setSubDetailForm({...subDetailForm, oicCourseCode: e.target.value})}
                      placeholder="เช่น นว264ก"
                      className="w-full border rounded p-2 text-xs font-mono bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      ชื่อรายวิชาย่อย (Sub Course Name)
                    </label>
                    <input
                      type="text"
                      value={subDetailForm.subCourseName}
                      onChange={e => setSubDetailForm({...subDetailForm, subCourseName: e.target.value})}
                      placeholder="เช่น กฎหมายที่เกี่ยวข้องกับการประกันวินาศภัย"
                      className="w-full border rounded p-2 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-3 flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => { setSelectedCurriculumForSub(null); setEditingSubDetailId(null); }}
                      className="px-3 py-1.5 border rounded text-xs hover:bg-gray-100"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs"
                    >
                      {editingSubDetailId ? 'บันทึกการแก้ไข' : 'เพิ่มวิชาย่อย'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Curriculum Package Form (Level 1) */}
            <div className="bg-gray-50 border rounded-xl p-4">
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
                <span>
                  <i className={`fas ${editingCurriculumId ? 'fa-edit text-blue-600' : 'fa-plus-circle text-blue-600'} mr-1.5`}></i>
                  {editingCurriculumId ? 'แก้ไขแพ็กเกจหลักสูตร' : 'เพิ่มแพ็กเกจหลักสูตรใหม่'}
                </span>
                {editingCurriculumId && (
                  <button 
                    type="button" 
                    onClick={resetCurriculumForm}
                    className="text-xs text-gray-500 hover:text-gray-700 underline font-normal"
                  >
                    ยกเลิกการแก้ไข (เพิ่มใหม่)
                  </button>
                )}
              </h4>
              <form onSubmit={handleSaveCurriculum}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ประเภท</label>
                    <select 
                      value={curriculumForm.agentType || 'agent'} 
                      onChange={e => setCurriculumForm({...curriculumForm, agentType: e.target.value})}
                      className="w-full border rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-blue-600 outline-none bg-white text-gray-800"
                    >
                      <option value="agent">ตัวแทน (Agent)</option>
                      <option value="broker">นายหน้า (Broker)</option>
                      <option value="both">ทั้งสองประเภท (Both)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อย่อหลักสูตร</label>
                    <input 
                      type="text" 
                      value={curriculumForm.courseShortName} 
                      onChange={e => setCurriculumForm({...curriculumForm, courseShortName: e.target.value})}
                      placeholder="เช่น นว2, ตว2"
                      className="w-full border rounded p-2 text-xs focus:ring-1 focus:ring-blue-600 outline-none bg-white font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">รหัสในระบบอบรม (Col R)</label>
                    <input 
                      type="text" 
                      value={curriculumForm.trainingCourseCode} 
                      onChange={e => setCurriculumForm({...curriculumForm, trainingCourseCode: e.target.value})}
                      placeholder="เช่น B2N0G00"
                      className="w-full border rounded p-2 text-xs font-mono focus:ring-1 focus:ring-blue-600 outline-none bg-white font-bold text-purple-700" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">รหัสหลักสูตร คปภ.</label>
                    <input 
                      type="text" 
                      value={curriculumForm.curriculumCode} 
                      onChange={e => setCurriculumForm({...curriculumForm, curriculumCode: e.target.value})}
                      placeholder="เช่น นว2649991"
                      className="w-full border rounded p-2 text-xs font-mono focus:ring-1 focus:ring-blue-600 outline-none bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">รหัสประกาศ</label>
                    <input 
                      type="text" 
                      value={curriculumForm.announcementCode} 
                      onChange={e => setCurriculumForm({...curriculumForm, announcementCode: e.target.value})}
                      placeholder="เช่น NLGA-2564"
                      className="w-full border rounded p-2 text-xs font-mono focus:ring-1 focus:ring-blue-600 outline-none bg-white" 
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-xs"
                  >
                    <i className="fas fa-save mr-1.5"></i>
                    {editingCurriculumId ? 'บันทึกการแก้ไขหลักสูตร' : 'เพิ่มแพ็กเกจหลักสูตร'}
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-6 flex justify-end border-t pt-4">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
