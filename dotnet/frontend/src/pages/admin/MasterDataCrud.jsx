import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8085/api';

export default function MasterDataCrud() {
  const { type } = useParams();
  const [data, setData] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // For the subject modal
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    defaultPillarId: '', 
    displayOrder: 0, 
    status: 'active' 
  });

  // For the Course Details (OIC Codes) modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState(null);
  const [courseDetailsList, setCourseDetailsList] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editingDetailId, setEditingDetailId] = useState(null);
  const [detailFormData, setDetailFormData] = useState({
    agentType: 'agent',
    announcementCode: '',
    courseShortName: '',
    curriculumCode: '',
    courseCode: '',
    oicCourseCode: '',
    subCourseName: '',
    displayOrder: 1,
    status: 'active'
  });

  // Titles for the UI
  const getTypeTitle = () => {
    switch (type) {
      case 'titles': return 'จัดการคำนำหน้าชื่อ';
      case 'religion': return 'จัดการศาสนา';
      case 'gender': return 'จัดการเพศ';
      case 'blood': return 'จัดการกรุ๊ปเลือด';
      case 'renewcourse': return 'จัดการชื่อวิชา (Subjects)';
      default: return 'จัดการข้อมูล';
    }
  };

  const isRenewCourse = type === 'renewcourse';

  useEffect(() => {
    fetchData();
    if (isRenewCourse) {
      fetchPillars();
    }
  }, [type]);

  const fetchPillars = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/MasterData/pillars?all=true`);
      if (res.ok) {
        const json = await res.json();
        setPillars(json.filter(x => x.status === 'active'));
      }
    } catch (err) {
      console.error('Failed to fetch pillars', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/MasterData/${type}?all=true`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!formData.id;
      const url = isEdit ? `${API_BASE_URL}/MasterData/${type}/${formData.id}` : `${API_BASE_URL}/MasterData/${type}`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = { ...formData };
      if (!isRenewCourse) {
        delete payload.defaultPillarId;
      } else {
        payload.defaultPillarId = payload.defaultPillarId ? parseInt(payload.defaultPillarId) : null;
      }

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Save failed');
      
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/MasterData/${type}/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const openAddModal = () => {
    setFormData({ 
      id: null, 
      name: '', 
      defaultPillarId: '', 
      displayOrder: data.length + 1, 
      status: 'active',
      isActiveBackend: true,
      isActiveFrontend: true,
      startActiveDatetime: '',
      endActiveDatetime: ''
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setFormData({ 
      id: item.id, 
      name: item.name, 
      defaultPillarId: item.defaultPillarId || '',
      displayOrder: item.displayOrder, 
      status: item.status || 'active',
      isActiveBackend: item.isActiveBackend !== false,
      isActiveFrontend: item.isActiveFrontend !== false,
      startActiveDatetime: item.startActiveDatetime ? item.startActiveDatetime.slice(0, 16) : '',
      endActiveDatetime: item.endActiveDatetime ? item.endActiveDatetime.slice(0, 16) : ''
    });
    setShowModal(true);
  };

  // --- Course Details (OIC Codes) Modal Handlers ---
  const openDetailsModal = (course) => {
    setSelectedCourseForDetails(course);
    setEditingDetailId(null);
    setDetailFormData({
      agentType: 'agent',
      announcementCode: '',
      courseShortName: '',
      curriculumCode: '',
      courseCode: '',
      oicCourseCode: '',
      subCourseName: '',
      displayOrder: (course.details?.length || 0) + 1,
      status: 'active'
    });
    setShowDetailsModal(true);
    fetchCourseDetails(course.id);
  };

  const fetchCourseDetails = async (courseId) => {
    try {
      setDetailsLoading(true);
      const res = await fetch(`${API_BASE_URL}/CourseCurriculum?courseType=renew&courseId=${courseId}&all=true`);
      if (res.ok) {
        const json = await res.json();
        // Flatten or map for modal table display
        const mapped = json.map(c => ({
          id: c.id,
          agentType: c.agentType,
          announcementCode: c.announcementCode,
          courseShortName: c.courseShortName,
          curriculumCode: c.curriculumCode,
          courseCode: c.trainingCourseCode,
          oicCourseCode: c.subDetails?.[0]?.oicCourseCode || '',
          subCourseName: c.subDetails?.[0]?.subCourseName || '',
          displayOrder: c.displayOrder,
          status: c.status,
          rawCurriculum: c
        }));
        setCourseDetailsList(mapped);
      }
    } catch (err) {
      console.error('Failed to load course details', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const resetDetailForm = () => {
    setEditingDetailId(null);
    setDetailFormData({
      agentType: 'agent',
      announcementCode: 'NLGA-2564',
      courseShortName: 'ตนว4',
      curriculumCode: 'ตนว4642037',
      courseCode: '',
      oicCourseCode: '',
      subCourseName: '',
      displayOrder: courseDetailsList.length + 1,
      status: 'active'
    });
  };

  const handleEditDetail = (detail) => {
    setEditingDetailId(detail.id);
    setDetailFormData({
      agentType: detail.agentType || 'agent',
      announcementCode: detail.announcementCode || '',
      courseShortName: detail.courseShortName || '',
      curriculumCode: detail.curriculumCode || '',
      courseCode: detail.courseCode || '',
      oicCourseCode: detail.oicCourseCode || '',
      subCourseName: detail.subCourseName || '',
      displayOrder: detail.displayOrder || 1,
      status: detail.status || 'active'
    });
  };

  const handleSaveDetail = async (e) => {
    e.preventDefault();
    if (!selectedCourseForDetails) return;

    try {
      const method = editingDetailId ? 'PUT' : 'POST';
      const url = editingDetailId 
        ? `${API_BASE_URL}/CourseCurriculum/${editingDetailId}` 
        : `${API_BASE_URL}/CourseCurriculum`;

      const payload = {
        id: editingDetailId || 0,
        courseType: 'renew',
        courseId: selectedCourseForDetails.id,
        agentType: detailFormData.agentType,
        trainingCourseCode: detailFormData.courseCode,
        announcementCode: detailFormData.announcementCode,
        curriculumCode: detailFormData.curriculumCode,
        courseShortName: detailFormData.courseShortName,
        displayOrder: parseInt(detailFormData.displayOrder) || 1,
        status: detailFormData.status || 'active',
        subDetails: [
          {
            id: editingDetailId ? (courseDetailsList.find(d => d.id === editingDetailId)?.rawCurriculum?.subDetails?.[0]?.id || 0) : 0,
            curriculumId: editingDetailId || 0,
            oicCourseCode: detailFormData.oicCourseCode,
            subCourseName: detailFormData.subCourseName,
            displayOrder: 1,
            status: 'active'
          }
        ]
      };

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Save curriculum failed');

      resetDetailForm();
      await fetchCourseDetails(selectedCourseForDetails.id);
      await fetchData(); // Refresh parent table badges
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกรหัส OIC: ' + err.message);
    }
  };

  const handleDeleteDetail = async (detailId) => {
    if (!window.confirm('คุณต้องการลบรหัส OIC รายการนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/CourseCurriculum/${detailId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete detail failed');
      await fetchCourseDetails(selectedCourseForDetails.id);
      await fetchData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 border-b-2 border-primary pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-2">{getTypeTitle()}</h2>
          <p className="text-gray-500 text-sm">
            {isRenewCourse 
              ? 'จัดการชื่อวิชา, เสาหลักเริ่มต้น (Default Pillar) และกำหนดรหัสวิชา OIC (1 วิชา สามารถผูกได้หลายรหัส OIC)' 
              : 'เพิ่ม ลบ หรือแก้ไขข้อมูล'}
          </p>
        </div>
        <Link to="/admin/master-data" className="px-4 py-2 border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors">
          <i className="fas fa-arrow-left mr-2"></i> กลับหน้ารวม Master Data
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-end mb-4">
          <button onClick={openAddModal} className="px-4 py-2 bg-success text-white rounded hover:bg-green-600 transition">
            <i className="fas fa-plus mr-2"></i> เพิ่มข้อมูล
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10"><i className="fas fa-spinner fa-spin text-3xl text-primary"></i></div>
        ) : error ? (
          <div className="text-danger text-center py-5">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-3 border-b w-14">ID</th>
                  <th className="p-3 border-b min-w-[220px]">{isRenewCourse ? 'ชื่อวิชา (Subject)' : 'ชื่อรายการ'}</th>
                  {isRenewCourse && (
                    <>
                      <th className="p-3 border-b min-w-[280px]">รหัสประกาศ / รหัสหลักสูตร / รหัสวิชา OIC</th>
                      <th className="p-3 border-b whitespace-nowrap">Default Pillar</th>
                    </>
                  )}
                  <th className="p-3 border-b w-20 text-center">ลำดับ</th>
                  <th className="p-3 border-b min-w-[170px] text-center">สถานะ (Backend / Frontend)</th>
                  <th className="p-3 border-b text-center w-36">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-gray-500 font-mono">#{item.id}</td>
                    <td className="p-3 font-medium text-gray-900">
                      <div>{item.name}</div>
                    </td>
                    {isRenewCourse && (
                      <>
                        <td className="p-3">
                          <div className="flex flex-col gap-1.5">
                            {item.curriculums && item.curriculums.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {item.curriculums.map(c => {
                                  const sub = c.subDetails?.[0];
                                  return (
                                    <div key={c.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded text-xs shadow-xs">
                                      {c.agentType === 'broker' ? (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">นายหน้า</span>
                                      ) : c.agentType === 'both' ? (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded">Agent+Broker</span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">ตัวแทน</span>
                                      )}
                                      {sub?.subCourseName && (
                                        <span className="font-semibold text-gray-900" title="รายวิชาย่อย">
                                          {sub.subCourseName}
                                        </span>
                                      )}
                                      {sub?.oicCourseCode && (
                                        <span className="font-bold text-rose-700 font-mono" title="รหัสวิชา OIC">
                                          <i className="fas fa-certificate text-[10px] mr-1"></i>{sub.oicCourseCode}
                                        </span>
                                      )}
                                      {c.trainingCourseCode && (
                                        <span className="text-blue-700 font-mono font-bold" title="รหัสวิชาระบบอบรม">
                                          ({c.trainingCourseCode})
                                        </span>
                                      )}
                                      {c.curriculumCode && (
                                        <span className="text-teal-700 bg-teal-50 px-1 rounded text-[11px] font-mono" title="รหัสหลักสูตร">
                                          {c.curriculumCode}
                                        </span>
                                      )}
                                      {c.announcementCode && (
                                        <span className="text-amber-700 text-[10px] font-mono" title="รหัสประกาศ">
                                          [{c.announcementCode}]
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : item.details && item.details.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {item.details.map(d => (
                                  <div key={d.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded text-xs shadow-xs">
                                    {d.agentType === 'broker' ? (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">นายหน้า</span>
                                    ) : d.agentType === 'both' ? (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded">Agent+Broker</span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">ตัวแทน</span>
                                    )}
                                    {d.subCourseName && (
                                      <span className="font-semibold text-gray-900" title="รายวิชาย่อย">
                                        {d.subCourseName}
                                      </span>
                                    )}
                                    {d.oicCourseCode && (
                                      <span className="font-bold text-rose-700 font-mono" title="รหัสวิชา OIC">
                                        <i className="fas fa-certificate text-[10px] mr-1"></i>{d.oicCourseCode}
                                      </span>
                                    )}
                                    {d.courseCode && (
                                      <span className="text-blue-700 font-mono" title="รหัสวิชา">
                                        ({d.courseCode})
                                      </span>
                                    )}
                                    {d.curriculumCode && (
                                      <span className="text-teal-700 bg-teal-50 px-1 rounded text-[11px] font-mono" title="รหัสหลักสูตร">
                                        {d.curriculumCode}
                                      </span>
                                    )}
                                    {d.announcementCode && (
                                      <span className="text-amber-700 text-[10px] font-mono" title="รหัสประกาศ">
                                        [{d.announcementCode}]
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-xs">ยังไม่มีรหัส OIC ผูกไว้</span>
                            )}
                            <div>
                              <button 
                                onClick={() => openDetailsModal(item)}
                                className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline mt-0.5"
                              >
                                <i className="fas fa-tags mr-1"></i>
                                จัดการรหัส OIC ({item.curriculums?.length || item.details?.length || 0} รายการ)
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {item.defaultPillarName || (item.defaultPillarId ? `Pillar #${item.defaultPillarId}` : null) ? (
                            <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-bold text-xs">
                              {item.defaultPillarName || `Pillar #${item.defaultPillarId}`}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">-</span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="p-3 text-center">{item.displayOrder}</td>
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
                      {isRenewCourse && (
                        <button 
                          onClick={() => openDetailsModal(item)} 
                          className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 mx-1"
                          title="จัดการรหัส OIC / รายละเอียดหลักสูตร"
                        >
                          <i className="fas fa-tags"></i>
                        </button>
                      )}
                      <button onClick={() => openEditModal(item)} className="text-primary hover:text-blue-700 mx-1.5" title="แก้ไข">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-danger hover:text-red-700 mx-1.5" title="ลบ/ซ่อน">
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={isRenewCourse ? 7 : 5} className="text-center p-8 text-gray-500">ไม่มีข้อมูล</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subject Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
              {formData.id ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล'}
            </h3>
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRenewCourse ? 'ชื่อวิชา (Subject Name)' : 'ชื่อรายการ'} <span className="text-danger">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none" 
                  placeholder={isRenewCourse ? 'เช่น การประกันความเสี่ยงภัยทรัพย์สิน' : ''}
                />
              </div>

              {isRenewCourse && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เสาหลักเริ่มต้น (Default Pillar)
                  </label>
                  <select 
                    value={formData.defaultPillarId || ''} 
                    onChange={e => setFormData({...formData, defaultPillarId: e.target.value})} 
                    className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none text-sm"
                  >
                    <option value="">-- ไม่ระบุ (ให้เลือกเองตอนจับคู่) --</option>
                    {pillars.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-500 mt-1 block">
                    เมื่อลากวิชานี้มาวางในหน้าจับคู่ ระบบจะเติมเสาหลัก (Pillar) ให้อัตโนมัติ
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ลำดับการแสดงผล</label>
                  <input 
                    type="number" 
                    required 
                    value={formData.displayOrder} 
                    onChange={e => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})} 
                    className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">สถานะทั่วไป</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="active">Active (ใช้งาน)</option>
                    <option value="inactive">Inactive (ระงับ/ซ่อน)</option>
                  </select>
                </div>
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

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100 text-gray-600">ยกเลิก</button>
                <button type="submit" className="px-5 py-2 bg-primary text-white font-medium rounded hover:bg-blue-700">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Details (OIC Codes) Modal */}
      {showDetailsModal && selectedCourseForDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl p-6 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex justify-between items-start border-b pb-3 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  <i className="fas fa-tags text-indigo-600 mr-2"></i>
                  จัดการรหัส OIC / รายละเอียดหลักสูตร
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  วิชา: <span className="font-semibold text-primary">{selectedCourseForDetails.name}</span> (ID: #{selectedCourseForDetails.id})
                </p>
                <p className="text-xs text-gray-500">
                  * 1 วิชาสามารถผูกได้หลายรหัสประกาศ, รหัสหลักสูตร, และรหัสวิชา OIC (เก็บในตาราง <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">mst_course_detail</code>)
                </p>
              </div>
              <button 
                onClick={() => { setShowDetailsModal(false); resetDetailForm(); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Existing Details List */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-700 mb-2">รายการรหัส OIC ที่ผูกไว้ ({courseDetailsList.length} รายการ):</h4>
              {detailsLoading ? (
                <div className="text-center py-6"><i className="fas fa-spinner fa-spin text-indigo-600 text-xl"></i></div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="p-2.5 border-b">ประเภท</th>
                        <th className="p-2.5 border-b">รหัสประกาศ</th>
                        <th className="p-2.5 border-b">ชื่อย่อหลักสูตร</th>
                        <th className="p-2.5 border-b">รหัสหลักสูตร</th>
                        <th className="p-2.5 border-b">รหัสวิชา</th>
                        <th className="p-2.5 border-b">รหัสวิชา OIC</th>
                        <th className="p-2.5 border-b">รายวิชาย่อย</th>
                        <th className="p-2.5 border-b text-center w-16">สถานะ</th>
                        <th className="p-2.5 border-b text-center w-20">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseDetailsList.map(detail => (
                        <tr key={detail.id} className={`border-b hover:bg-gray-50 ${editingDetailId === detail.id ? 'bg-indigo-50/60' : ''}`}>
                          <td className="p-2.5">
                            {detail.agentType === 'broker' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">นายหน้า (Broker)</span>
                            ) : detail.agentType === 'both' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">ตัวแทน + นายหน้า</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">ตัวแทน (Agent)</span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono">{detail.announcementCode || <span className="text-gray-400">-</span>}</td>
                          <td className="p-2.5">{detail.courseShortName || <span className="text-gray-400">-</span>}</td>
                          <td className="p-2.5 font-mono">{detail.curriculumCode || <span className="text-gray-400">-</span>}</td>
                          <td className="p-2.5 font-mono">{detail.courseCode || <span className="text-gray-400">-</span>}</td>
                          <td className="p-2.5 font-mono font-bold text-rose-700">{detail.oicCourseCode || <span className="text-gray-400 font-normal">-</span>}</td>
                          <td className="p-2.5 font-medium text-gray-800">{detail.subCourseName || <span className="text-gray-400 font-normal">-</span>}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${detail.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {detail.status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <button 
                              onClick={() => handleEditDetail(detail)}
                              className="text-blue-600 hover:text-blue-800 mx-1" 
                              title="แก้ไข"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              onClick={() => handleDeleteDetail(detail.id)}
                              className="text-red-600 hover:text-red-800 mx-1" 
                              title="ลบ"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {courseDetailsList.length === 0 && (
                        <tr>
                          <td colSpan="9" className="text-center p-6 text-gray-500">
                            ยังไม่มีรายการรหัส OIC กรุณาเพิ่มข้อมูลด้านล่าง
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add / Edit Detail Form */}
            <div className="bg-gray-50 border rounded-lg p-4">
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
                <span>
                  <i className={`fas ${editingDetailId ? 'fa-edit text-blue-600' : 'fa-plus-circle text-green-600'} mr-1.5`}></i>
                  {editingDetailId ? 'แก้ไขรหัส OIC' : 'เพิ่มรหัส OIC / รายละเอียดใหม่'}
                </span>
                {editingDetailId && (
                  <button 
                    type="button" 
                    onClick={resetDetailForm}
                    className="text-xs text-gray-500 hover:text-gray-700 underline font-normal"
                  >
                    ยกเลิกการแก้ไข (เพิ่มใหม่)
                  </button>
                )}
              </h4>
              <form onSubmit={handleSaveDetail}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ประเภท (Agent / Broker)</label>
                    <select 
                      value={detailFormData.agentType || 'agent'} 
                      onChange={e => setDetailFormData({...detailFormData, agentType: e.target.value})}
                      className="w-full border rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none bg-white text-gray-800"
                    >
                      <option value="agent">ตัวแทน (Agent)</option>
                      <option value="broker">นายหน้า (Broker)</option>
                      <option value="both">ทั้งสองประเภท (Both)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">รหัสประกาศ</label>
                    <input 
                      type="text" 
                      value={detailFormData.announcementCode} 
                      onChange={e => setDetailFormData({...detailFormData, announcementCode: e.target.value})}
                      placeholder="เช่น ANN-2567-01"
                      className="w-full border rounded p-2 text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อย่อหลักสูตร</label>
                    <input 
                      type="text" 
                      value={detailFormData.courseShortName} 
                      onChange={e => setDetailFormData({...detailFormData, courseShortName: e.target.value})}
                      placeholder="เช่น ปรภ.1"
                      className="w-full border rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">รหัสหลักสูตร</label>
                    <input 
                      type="text" 
                      value={detailFormData.curriculumCode} 
                      onChange={e => setDetailFormData({...detailFormData, curriculumCode: e.target.value})}
                      placeholder="เช่น CURR-101"
                      className="w-full border rounded p-2 text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">รหัสวิชา (Course Code)</label>
                    <input 
                      type="text" 
                      value={detailFormData.courseCode} 
                      onChange={e => setDetailFormData({...detailFormData, courseCode: e.target.value})}
                      placeholder="เช่น SUBJ-001"
                      className="w-full border rounded p-2 text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">รหัสวิชา OIC</label>
                    <input 
                      type="text" 
                      value={detailFormData.oicCourseCode} 
                      onChange={e => setDetailFormData({...detailFormData, oicCourseCode: e.target.value})}
                      placeholder="เช่น OIC-SUBJ-001"
                      className="w-full border rounded p-2 text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none bg-white" 
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">รายวิชาย่อย</label>
                    <input 
                      type="text" 
                      value={detailFormData.subCourseName} 
                      onChange={e => setDetailFormData({...detailFormData, subCourseName: e.target.value})}
                      placeholder="ระบุชื่อรายวิชาย่อย (ถ้ามี)"
                      maxLength={500}
                      className="w-full border rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ลำดับ</label>
                    <input 
                      type="number" 
                      value={detailFormData.displayOrder} 
                      onChange={e => setDetailFormData({...detailFormData, displayOrder: e.target.value})}
                      className="w-full border rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-center bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">สถานะ</label>
                    <select 
                      value={detailFormData.status} 
                      onChange={e => setDetailFormData({...detailFormData, status: e.target.value})}
                      className="w-full border rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                  {editingDetailId && (
                    <button 
                      type="button" 
                      onClick={resetDetailForm}
                      className="px-3 py-1.5 border rounded text-xs text-gray-600 hover:bg-gray-100"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button 
                    type="submit" 
                    className="px-4 py-1.5 bg-indigo-600 text-white font-medium rounded text-xs hover:bg-indigo-700 shadow-sm"
                  >
                    <i className="fas fa-save mr-1"></i>
                    {editingDetailId ? 'บันทึกการแก้ไข' : 'เพิ่มรหัส OIC นี้'}
                  </button>
                </div>
              </form>
            </div>

            <div className="flex justify-end mt-4 pt-3 border-t">
              <button 
                type="button" 
                onClick={() => { setShowDetailsModal(false); resetDetailForm(); }}
                className="px-5 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
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

