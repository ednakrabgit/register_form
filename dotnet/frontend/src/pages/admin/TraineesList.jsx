import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect, Fragment } from 'react';
import TraineeEditModal from './TraineeEditModal';
import { useAuth } from '../../context/AuthContext';

export default function TraineesList() {
  const { canEditMenu, user } = useAuth();
  const canEditTrainees = canEditMenu('trainees');
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [editingTraineeId, setEditingTraineeId] = useState(null);
  
  const [masterMap, setMasterMap] = useState({});

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [
          provinces, districts, subdistricts, 
          branches, renewcourses, companies, territories, expertises, renewother,
          basicCourses, genders, bloods, religions
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/masterdata/provinces`).then(r => r.json()),
          fetch(`${API_BASE_URL}/masterdata/districts`).then(r => r.json()),
          fetch(`${API_BASE_URL}/masterdata/subdistricts`).then(r => r.json()),
          fetch(`${API_BASE_URL}/masterdata/agent-branches?all=true`).then(r => r.json()),
          fetch(`${API_BASE_URL}/masterdata/renewcourse?all=true`).then(r => r.json()),
          fetch(`${API_BASE_URL}/masterdata/company?all=true`).then(r => r.json()),
          fetch(`${API_BASE_URL}/masterdata/territory?all=true`).then(r => r.json()),
          fetch(`${API_BASE_URL}/masterdata/expertise?all=true`).then(r => r.json()),
          fetch(`${API_BASE_URL}/masterdata/renew-other-courses?all=true`).then(r => r.json()),
          fetch(`${API_BASE_URL}/masterdata/renew-courses?all=true`).then(r => r.json()),
          fetch(`${API_BASE_URL}/masterdata/gender?all=true`).then(r => r.json()),
          fetch(`${API_BASE_URL}/masterdata/blood?all=true`).then(r => r.json()),
          fetch(`${API_BASE_URL}/masterdata/religion?all=true`).then(r => r.json())
        ]);
        
        const map = {
          ProvinceId: provinces.reduce((a,c) => ({...a, [c.provinceId]: c.provinceThai, [String(c.provinceId)]: c.provinceThai}), {}),
          DistrictId: districts.reduce((a,c) => ({...a, [c.districtId]: c.districtThai, [String(c.districtId)]: c.districtThai}), {}),
          SubDistrictId: subdistricts.reduce((a,c) => ({...a, [c.subDistrictId]: c.subDistrictThai, [String(c.subDistrictId)]: c.subDistrictThai}), {}),
          BrokerBranch: branches.reduce((a,c) => ({...a, [c.branchId]: c.branchName, [String(c.branchId)]: c.branchName}), {}),
          AgentBranch: branches.reduce((a,c) => ({...a, [c.branchId]: c.branchName, [String(c.branchId)]: c.branchName}), {}),
          PreviousCourses: renewcourses.reduce((a,c) => ({...a, [c.id]: c.name || c.courseName, [String(c.id)]: c.name || c.courseName}), {}),
          OtherInsuranceCompanies: companies.reduce((a,c) => ({...a, [c.id]: c.name, [String(c.id)]: c.name}), {}),
          SalesArea: territories.reduce((a,c) => ({...a, [c.id]: c.name, [String(c.id)]: c.name}), {}),
          InsuranceSpecialty: expertises.reduce((a,c) => ({...a, [c.id]: c.name, [String(c.id)]: c.name}), {}),
          ExtraTrainingInterest: {
            ...renewcourses.reduce((a,c) => ({...a, [c.id]: c.name, [String(c.id)]: c.name}), {}),
            ...renewother.reduce((a,c) => ({...a, [c.id]: c.displayName || c.name || c.courseName, [String(c.id)]: c.displayName || c.name || c.courseName}), {})
          },
          courseType: basicCourses.reduce((a,c) => ({...a, [c.id]: c.courseName || c.name, [String(c.id)]: c.courseName || c.name}), {}),
          gender: genders.reduce((a,c) => ({...a, [c.id]: c.name, [String(c.id)]: c.name}), {}),
          blood: bloods.reduce((a,c) => ({...a, [c.id]: c.name, [String(c.id)]: c.name}), {}),
          religion: religions.reduce((a,c) => ({...a, [c.id]: c.name, [String(c.id)]: c.name}), {})
        };
        
        map.provinceId = map.ProvinceId;
        map.districtId = map.DistrictId;
        map.subDistrictId = map.SubDistrictId;
        map.brokerBranch = map.BrokerBranch;
        map.agentBranch = map.AgentBranch;
        map.previousCourses = map.PreviousCourses;
        map.otherInsuranceCompanies = map.OtherInsuranceCompanies;
        map.salesArea = map.SalesArea;
        map.insuranceSpecialty = map.InsuranceSpecialty;
        map.extraTrainingInterest = map.ExtraTrainingInterest;
        map.additionalCourseRequirement = map.ExtraTrainingInterest;
        map.AdditionalCourseRequirement = map.ExtraTrainingInterest;
        map.SelectedSubjects = map.ExtraTrainingInterest;
        map.selectedSubjects = map.ExtraTrainingInterest;
        map.CourseType = map.courseType;
        map.CourseId = map.courseType;
        map.courseId = map.courseType;
        map.agentType = { agent: 'ตัวแทน', broker: 'นายหน้า' };
        map.AgentType = map.agentType;
        map.brokerType = { individual: 'นายหน้าบุคคลธรรมดา', corporate: 'นายหน้านิติบุคคล' };
        map.BrokerType = map.brokerType;

        setMasterMap(map);
      } catch (e) { console.error('Failed to load master data for mapping', e); }
    };
    fetchMasterData();
  }, []);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchTrainees = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token');
      const qs = new URLSearchParams({ search: searchTerm, page, pageSize: pageSize === 'All' ? 0 : pageSize, sortBy, sortDir });
      const response = await fetch(`${API_BASE_URL}/admin/trainees?${qs.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const res = await response.json();
        if (res.data) {
          setTrainees(res.data);
          setTotal(res.total);
        } else {
          setTrainees(res);
          setTotal(res.length);
        }
      }
    } catch (error) {
      console.error('Failed to fetch trainees', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainees();
  }, [page, pageSize, sortBy, sortDir]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTrainees();
  };

  const handleViewTrainee = async (trainee) => {
    setSelectedTrainee(trainee);
    setDocuments([]);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE_URL}/admin/trainees/${trainee.idCard}/documents?_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadDocument = async (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('nationalId', selectedTrainee.idCard);
      formData.append('phone', '0000000000');
      formData.append(docType, file);

      const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (res.ok) {
        alert('อัปโหลดไฟล์สำเร็จ');
        handleViewTrainee(selectedTrainee);
        fetchTrainees();
      } else {
        alert('อัปโหลดไฟล์ไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const docTypes = [
    { key: 'Profile', altKeys: ['profile', 'Profile'], label: 'ภาพถ่ายหน้าตรง (Profile)' },
    { key: 'IDCardFace', altKeys: ['idCardWithFace', 'IDCardFace', 'idcardface', 'idcardwithface'], label: 'ภาพถ่ายคู่บัตร ปชช. (IDCardFace)' },
    { key: 'IDCard', altKeys: ['idCard', 'IDCard', 'idcard'], label: 'ภาพถ่ายบัตร ปชช. (IDCard)' }
  ];

  if (loading) return <div className="text-center p-10">กำลังโหลดข้อมูล...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-primary">
          {user?.role === 'Applicant' ? 'ข้อมูลผู้สมัครของฉัน (My Trainee Profile)' : 'รายชื่อผู้ลงทะเบียนอบรม'}
        </h2>
        
        <div className="flex flex-wrap items-center gap-4">
          <form onSubmit={handleSearch} className="flex">
            <input 
              type="text" 
              placeholder="ค้นหา ชื่อ, บัตร ปชช, เบอร์..." 
              className="border border-gray-300 rounded-l px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded-r hover:bg-primary-light">
              <i className="fas fa-search"></i>
            </button>
          </form>

          <button className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">
            <i className="fas fa-file-excel mr-2"></i> Export
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          แสดง 
          <select 
            className="mx-2 border rounded p-1" 
            value={pageSize} 
            onChange={(e) => {
              setPageSize(e.target.value === 'All' ? 'All' : Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
            <option value="All">ทั้งหมด</option>
          </select>
          รายการต่อหน้า
        </div>
        <div className="text-sm text-gray-600">พบทั้งหมด {total} รายการ</div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {[
                { key: 'registrationid', label: 'ลำดับ' },
                { key: 'name', label: 'ชื่อ-นามสกุล' },
                { key: 'idcard', label: 'เลขบัตร ปชช.' },
                { key: 'course', label: 'หลักสูตรล่าสุด' },
                { key: 'date', label: 'วันที่สมัครล่าสุด' },
                { key: 'status', label: 'สถานะ' }
              ].map(col => (
                <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => {
                  if (sortBy === col.key) {
                    setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy(col.key);
                    setSortDir('asc');
                  }
                }}>
                  <div className="flex items-center space-x-1">
                    <span>{col.label}</span>
                    {sortBy === col.key && (
                      <i className={`fas fa-sort-${sortDir === 'asc' ? 'up' : 'down'}`}></i>
                    )}
                    {sortBy !== col.key && (
                      <i className="fas fa-sort text-gray-300"></i>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trainees.length > 0 ? (
              trainees.map((t, index) => (
                <Fragment key={t.nationId}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button onClick={() => toggleRow(t.nationId)} className="mr-2 text-gray-500 hover:text-gray-700">
                        <i className={`fas fa-chevron-${expandedRows[t.nationId] ? 'down' : 'right'}`}></i>
                      </button>
                      {t.registrationId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.idCard}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.course}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.status === 'ยืนยันแล้ว' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => handleViewTrainee(t)} className="text-primary hover:text-primary-light mr-3" title="ดูรูปภาพเอกสาร">
                        <i className="fas fa-image"></i> ดูรูปภาพ
                      </button>
                      {canEditTrainees && (
                        <>
                          <button onClick={() => setEditingTraineeId(t.nationId)} className="text-yellow-600 hover:text-yellow-900 mr-3" title="แก้ไขข้อมูล/ประวัติ">
                            <i className="fas fa-edit"></i> แก้ไข
                          </button>
                          <button className="text-red-600 hover:text-red-900" title="ลบข้อมูล">
                            <i className="fas fa-trash"></i>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  
                  {expandedRows[t.nationId] && (
                    <tr className="bg-blue-50/50">
                      <td colSpan="7" className="px-6 py-4">
                        <div className="text-sm text-gray-700 bg-white p-4 rounded border shadow-inner">
                          <h4 className="font-bold mb-3 text-primary">
                            <i className="fas fa-history mr-2"></i>ประวัติการทำรายการ (Transactions)
                          </h4>
                          
                          {t.transactions && t.transactions.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-100 text-gray-600">
                                  <tr>
                                    <th className="px-4 py-2 border">ครั้งที่</th>
                                    <th className="px-4 py-2 border">ชื่อ-นามสกุล</th>
                                    <th className="px-4 py-2 border">เลขบัตร ปชช.</th>
                                    <th className="px-4 py-2 border">หลักสูตร</th>
                                    <th className="px-4 py-2 border">วันที่ทำรายการ</th>
                                    <th className="px-4 py-2 border">สถานะ</th>
                                    <th className="px-4 py-2 border text-red-600">สิ่งที่แก้ไขจากครั้งก่อน</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {t.transactions.map((trans, i) => {
                                    // Parse NewData
                                    let currentData = {};
                                    let prevData = {};
                                    try { currentData = JSON.parse(trans.newData || '{}'); } catch(e){}
                                    if (i + 1 < t.transactions.length) {
                                      for (let j = i + 1; j < t.transactions.length; j++) {
                                        try {
                                          const candidate = JSON.parse(t.transactions[j].newData || '{}');
                                          if (candidate) {
                                            prevData = candidate;
                                            const hasProfileKeys = Boolean(candidate.TitleTh || candidate.titleTh || candidate.FirstNameTh || candidate.firstNameTh || candidate.HouseNo || candidate.houseNo);
                                            if (hasProfileKeys || j === t.transactions.length - 1) {
                                              break;
                                            }
                                          }
                                        } catch(e){}
                                      }
                                    }
                                    
                                    // Compute diffs
                                    let diffs = [];
                                    const isImageAction = currentData.Action && (currentData.Action.includes('รูปภาพ') || currentData.UploadedFiles);
                                    
                                    if (isImageAction) {
                                      const fileList = currentData.UploadedFiles || [];
                                      diffs.push(
                                        <div key="upload-action" className="text-xs space-y-1">
                                          <div className="font-bold text-primary flex items-center gap-1">
                                            <i className="fas fa-camera text-blue-600"></i> อัปโหลด / เปลี่ยนรูปภาพเอกสาร:
                                          </div>
                                          {fileList.length > 0 ? (
                                            <ul className="list-disc ml-5 text-gray-700 space-y-0.5">
                                              {fileList.map((uf, idx) => (
                                                <li key={idx}>
                                                  <span className="font-semibold text-gray-800">
                                                    {uf.DocumentType === 'Profile' ? 'ภาพถ่ายหน้าตรง (Profile)' :
                                                     uf.DocumentType === 'IDCardFace' ? 'ภาพถ่ายคู่บัตร ปชช. (IDCardFace)' :
                                                     uf.DocumentType === 'IDCard' ? 'ภาพถ่ายบัตร ปชช. (IDCard)' : uf.DocumentType}
                                                  </span>
                                                  {uf.FileName ? <span className="text-gray-500 text-[11px]"> ({uf.FileName})</span> : ''}
                                                </li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <div className="text-green-600 font-medium">อัปเดตไฟล์รูปภาพเรียบร้อย</div>
                                          )}
                                        </div>
                                      );
                                    } else if (i + 1 < t.transactions.length) {
                                      const comparisonFields = [
                                        { label: 'คำนำหน้า', keys: ['TitleTh', 'titleTh', 'title_th'] },
                                        { label: 'ชื่อ', keys: ['FirstNameTh', 'firstNameTh', 'first_name_th'] },
                                        { label: 'ชื่อกลาง', keys: ['MiddleNameTh', 'middleNameTh', 'middle_name_th'] },
                                        { label: 'นามสกุล', keys: ['LastNameTh', 'lastNameTh', 'last_name_th'] },
                                        { label: 'คำนำหน้าเดิม', keys: ['TitleOldTh', 'titleOldTh', 'title_old_th'] },
                                        { label: 'ชื่อเดิม', keys: ['FirstNameOldTh', 'firstNameOldTh', 'first_name_old_th'] },
                                        { label: 'ชื่อกลางเดิม', keys: ['MiddleNameOldTh', 'middleNameOldTh', 'middle_name_old_th'] },
                                        { label: 'นามสกุลเดิม', keys: ['LastNameOldTh', 'lastNameOldTh', 'last_name_old_th'] },
                                        { label: 'วันเกิด', keys: ['BirthDate', 'birthDate', 'birth_date'] },
                                        { label: 'เพศ', keys: ['GenderId', 'genderId', 'gender_id', 'Gender', 'gender'], mapType: 'gender' },
                                        { label: 'หมู่เลือด', keys: ['BloodGroupId', 'bloodGroupId', 'blood_group_id', 'BloodGroup', 'bloodGroup'], mapType: 'blood' },
                                        { label: 'ศาสนา', keys: ['ReligionId', 'religionId', 'religion_id', 'Religion', 'religion'], mapType: 'religion' },
                                        { label: 'แพ้อาหาร/ข้อจำกัด', keys: ['FoodAllergy', 'foodAllergy', 'food_allergy'] },
                                        { label: 'โรคประจำตัว', keys: ['MedicalCondition', 'medicalCondition', 'medical_condition'] },
                                        { label: 'วันหมดอายุบัตร ปชช.', keys: ['IdCardExpiry', 'idCardExpiry', 'id_card_expiry'] },
                                        { label: 'เบอร์โทร', keys: ['PhoneOtp', 'phone', 'phoneOtp', 'phone_otp'] },
                                        { label: 'อีเมล', keys: ['EmailAlt', 'email', 'emailAlt', 'email_alt'] },
                                        { label: 'Line ID', keys: ['LineId', 'lineId', 'line_id'] },
                                        { label: 'Facebook', keys: ['Facebook', 'facebook'] },
                                        { label: 'Instagram', keys: ['Instagram', 'instagram'] },
                                        { label: 'ชื่อ-สกุล ผู้ติดต่อฉุกเฉิน', keys: ['EmergencyContactName', 'emergencyContactName', 'emergency_contact_name'] },
                                        { label: 'เบอร์โทรฉุกเฉิน', keys: ['EmergencyContactPhone', 'emergencyContactPhone', 'emergency_contact_phone'] },
                                        { label: 'บ้านเลขที่', keys: ['HouseNo', 'houseNo', 'AddrHouseNo', 'addrHouseNo', 'addr_house_no'] },
                                        { label: 'หมู่', keys: ['Moo', 'moo', 'AddrMoo', 'addrMoo', 'addr_moo'] },
                                        { label: 'หมู่บ้าน/อาคาร', keys: ['Village', 'village', 'AddrVillage', 'addrVillage', 'addr_village'] },
                                        { label: 'ซอย', keys: ['Soi', 'soi', 'AddrSoi', 'addrSoi', 'addr_soi'] },
                                        { label: 'ถนน', keys: ['Road', 'road', 'AddrRoad', 'addrRoad', 'addr_road'] },
                                        { label: 'จังหวัด', keys: ['ProvinceId', 'provinceId', 'AddrProvinceId', 'addrProvinceId', 'province_id'], mapType: 'ProvinceId' },
                                        { label: 'อำเภอ/เขต', keys: ['DistrictId', 'districtId', 'AddrDistrictId', 'addrDistrictId', 'district_id'], mapType: 'DistrictId' },
                                        { label: 'ตำบล/แขวง', keys: ['SubDistrictId', 'subDistrictId', 'AddrSubDistrictId', 'addrSubDistrictId', 'sub_district_id'], mapType: 'SubDistrictId' },
                                        { label: 'รหัสไปรษณีย์', keys: ['Postcode', 'postcode', 'zipCode', 'ZipCode', 'AddrPostcode', 'addrPostcode', 'postal_code'] },
                                        { label: 'บ้านเลขที่ (จัดส่งเอกสาร)', keys: ['ContactHouseNo', 'contactHouseNo', 'DeliveryHouseNo', 'deliveryHouseNo'] },
                                        { label: 'หมู่ (จัดส่งเอกสาร)', keys: ['ContactMoo', 'contactMoo'] },
                                        { label: 'หมู่บ้าน/อาคาร (จัดส่งเอกสาร)', keys: ['ContactVillage', 'contactVillage'] },
                                        { label: 'ซอย (จัดส่งเอกสาร)', keys: ['ContactSoi', 'contactSoi'] },
                                        { label: 'ถนน (จัดส่งเอกสาร)', keys: ['ContactRoad', 'contactRoad'] },
                                        { label: 'จังหวัด (จัดส่งเอกสาร)', keys: ['ContactProvinceId', 'contactProvinceId'], mapType: 'ProvinceId' },
                                        { label: 'อำเภอ/เขต (จัดส่งเอกสาร)', keys: ['ContactDistrictId', 'contactDistrictId'], mapType: 'DistrictId' },
                                        { label: 'ตำบล/แขวง (จัดส่งเอกสาร)', keys: ['ContactSubDistrictId', 'contactSubDistrictId'], mapType: 'SubDistrictId' },
                                        { label: 'รหัสไปรษณีย์ (จัดส่งเอกสาร)', keys: ['ContactPostcode', 'contactPostcode'] },
                                        { label: 'สาขาวิริยะ', keys: ['AgentBranch', 'agentBranch', 'BranchId', 'branchId'], mapType: 'AgentBranch' },
                                        { label: 'ประเภทนายหน้า', keys: ['BrokerType', 'brokerType'], mapType: 'brokerType' },
                                        { label: 'ข้อมูลสังกัดบริษัทโบรกเกอร์', keys: ['BrokerCompany', 'brokerCompany', 'broker_company'] },
                                        { label: 'สาขาของบริษัทนายหน้าที่สังกัด', keys: ['BrokerBranch', 'brokerBranch', 'broker_branch'] },
                                        { label: 'รหัสตัวแทนวิริยะ', keys: ['viriyahAgentCode', 'ViriyahAgentCode', 'viriyah_agent_code'] },
                                        { label: 'ระดับคอร์ส', keys: ['CourseId', 'courseId', 'CourseType', 'courseType', 'course_type'], mapType: 'courseType' },
                                        { label: 'ประเภทใบอนุญาต', keys: ['AgentType', 'agentType', 'agent_type'], mapType: 'agentType' },
                                        { label: 'เลขที่ใบอนุญาต', keys: ['LicenseNo', 'licenseNo', 'license_no'] },
                                        { label: 'วันออกบัตรใบอนุญาต', keys: ['LicenseIssueDate', 'licenseIssueDate', 'license_issue_date'] },
                                        { label: 'วันหมดอายุใบอนุญาต', keys: ['LicenseExpiryDate', 'licenseExpiryDate', 'license_expiry_date'] },
                                        { label: 'วันที่อบรม', keys: ['TrainingDate', 'trainingDate', 'CourseDateId', 'courseDateId'] },
                                        { label: 'วิชาลงทะเบียน', keys: ['SelectedSubjects', 'selectedSubjects'], mapType: 'ExtraTrainingInterest', isList: true },
                                        { label: 'วิชาที่เคยอบรม', keys: ['PreviousCourses', 'previousCourses'], mapType: 'PreviousCourses', isList: true },
                                        { label: 'วิชาที่ประสงค์จะอบรม', keys: ['ExtraTrainingInterest', 'extraTrainingInterest', 'AdditionalCourseRequirement', 'additionalCourseRequirement'], mapType: 'ExtraTrainingInterest', isList: true },
                                        { label: 'ธุรกิจอื่น', keys: ['MainBusiness', 'mainBusiness', 'OtherBusiness', 'otherBusiness'] },
                                        { label: 'ปีประสบการณ์', keys: ['InsuranceExperienceYears', 'insuranceExperienceYears'] },
                                        { label: 'พื้นที่ขาย', keys: ['SalesArea', 'salesArea'], mapType: 'SalesArea', isList: true },
                                        { label: 'ความเชี่ยวชาญ', keys: ['InsuranceSpecialty', 'insuranceSpecialty'], mapType: 'InsuranceSpecialty', isList: true },
                                        { label: 'บริษัทประกันอื่น', keys: ['OtherInsuranceCompanies', 'otherInsuranceCompanies'], mapType: 'OtherInsuranceCompanies', isList: true },
                                        { label: 'สำเร็จการศึกษาตั้งแต่ระดับปริญญาโทขึ้นไป หรือ ไม่', keys: ['DeductionPrivilege', 'deductionPrivilege'] },
                                        { label: 'สถานะการยื่นเอกสาร', keys: ['MasterDegreeStatus', 'masterDegreeStatus'] }
                                      ];

                                      const getVal = (data, keys) => {
                                        for (const k of keys) {
                                          if (data && data[k] !== undefined && data[k] !== null && data[k] !== '') {
                                            return data[k];
                                          }
                                        }
                                        return undefined;
                                      };

                                      const getValFromHistory = (startIndex, keys) => {
                                        for (let j = startIndex; j < t.transactions.length; j++) {
                                          try {
                                            const data = JSON.parse(t.transactions[j].newData || '{}');
                                            const v = getVal(data, keys);
                                            if (v !== undefined) return v;
                                          } catch(e) {}
                                        }
                                        return undefined;
                                      };

                                      comparisonFields.forEach(field => {
                                        const rawNew = getVal(currentData, field.keys);
                                        if (rawNew === undefined) return;
                                        const rawOld = getValFromHistory(i + 1, field.keys);

                                        const resolveValue = (val, mapType, label) => {
                                          if (val === null || val === undefined || val === '') return '';
                                          if (['วันเกิด', 'วันหมดอายุบัตร ปชช.', 'วันออกบัตรใบอนุญาต', 'วันหมดอายุใบอนุญาต', 'วันที่อบรม'].includes(label)) {
                                            const dStr = String(val).split('T')[0];
                                            const parts = dStr.split('-');
                                            if (parts.length === 3) {
                                              let year = parseInt(parts[0], 10);
                                              const month = parts[1];
                                              const day = parts[2];
                                              if (year < 2400) year += 543;
                                              return `${day}/${month}/${year}`;
                                            }
                                            return dStr;
                                          }
                                          if (label === 'สำเร็จการศึกษาตั้งแต่ระดับปริญญาโทขึ้นไป หรือ ไม่') {
                                            if (Array.isArray(val)) return val.includes('MasterDegree') ? 'ใช่' : 'ไม่ใช่';
                                            if (typeof val === 'string') return val.includes('MasterDegree') ? 'ใช่' : 'ไม่ใช่';
                                            return 'ไม่ใช่';
                                          }
                                          if (label === 'คำนำหน้า') {
                                            return [1, "1", 1].includes(val) ? 'นาย' : [2, "2", 2].includes(val) ? 'นาง' : [3, "3", 3].includes(val) ? 'นางสาว' : val;
                                          }
                                          if (label === 'สถานะการยื่นเอกสาร') {
                                            if (val === 'เคยยื่นเอกสารลดหย่อนก่อนหน้านี้แล้ว') return 'เคยยื่นเอกสาร';
                                            if (val === 'ไม่เคยยื่นเอกสารลดหย่อนก่อนหน้านี้แล้ว') return 'ไม่เคยยื่นเอกสาร';
                                            return val;
                                          }
                                          const mapObj = mapType ? masterMap[mapType] : null;
                                          if (mapObj) {
                                            if (Array.isArray(val)) {
                                              const unique = Array.from(new Set(val.map(id => mapObj[id] || id).filter(Boolean)));
                                              return unique.join(', ');
                                            }
                                            if (typeof val === 'string' && val.includes(',')) {
                                              const unique = Array.from(new Set(val.split(',').map(id => mapObj[id.trim()] || id.trim()).filter(Boolean)));
                                              return unique.join(', ');
                                            }
                                            return mapObj[val] || val;
                                          }
                                          if (Array.isArray(val)) {
                                            return Array.from(new Set(val.filter(Boolean))).join(', ');
                                          }
                                          if (typeof val === 'string' && val.includes(',')) {
                                            return Array.from(new Set(val.split(',').map(s => s.trim()).filter(Boolean))).join(', ');
                                          }
                                          return val;
                                        };

                                        let oldVal = resolveValue(rawOld, field.mapType, field.label);
                                        let newVal = resolveValue(rawNew, field.mapType, field.label);

                                        if (field.isList) {
                                          const norm = (v) => Array.from(new Set(String(v || '').split(',').map(s => s.trim()))).filter(Boolean).sort().join(', ');
                                          oldVal = norm(oldVal);
                                          newVal = norm(newVal);
                                        }

                                        // Only skip if both are empty or both are equal
                                        if ((!oldVal && !newVal) || String(oldVal || '').trim() === String(newVal || '').trim()) {
                                          return;
                                        }

                                        const isMultiVal = (v) => typeof v === 'string' && v.includes(', ');
                                        if (field.isList && (isMultiVal(oldVal) || isMultiVal(newVal))) {
                                          const renderList = (v) => {
                                            if (!v) return '-';
                                            return (
                                              <ul className="list-disc ml-5 mt-1 mb-1">
                                                {String(v).split(', ').map((item, idx) => <li key={idx}>{item}</li>)}
                                              </ul>
                                            );
                                          };
                                          diffs.push(
                                            <div key={field.label} className="mb-2 text-xs">
                                              <div className="font-semibold text-gray-700">{field.label}:</div>
                                              {oldVal && <div className="text-gray-400 line-through">{renderList(oldVal)}</div>}
                                              {newVal && <div className="text-green-600 font-medium">{renderList(newVal)}</div>}
                                            </div>
                                          );
                                        } else {
                                          diffs.push(
                                            <div key={field.label} className="mb-1 text-xs">
                                              <span className="font-semibold text-gray-700">{field.label}:</span>{' '}
                                              <span className="text-gray-400 line-through">{oldVal || '-'}</span>{' '}
                                              <span className="text-green-600 font-medium">&rarr; {newVal || '-'}</span>
                                            </div>
                                          );
                                        }
                                      });
                                    } else {
                                      diffs.push(<div key="first" className="text-blue-500 font-medium text-xs">ลงทะเบียนครั้งแรก</div>);
                                    }

                                    const titleRaw = currentData.titleTh || currentData.TitleTh;
                                    const titleResolved = [1, "1", 1].includes(titleRaw) ? 'นาย' : [2, "2", 2].includes(titleRaw) ? 'นาง' : [3, "3", 3].includes(titleRaw) ? 'นางสาว' : (titleRaw || '');
                                    const fName = currentData.firstNameTh || currentData.FirstNameTh;
                                    const lName = currentData.lastNameTh || currentData.LastNameTh;
                                    const displayName = fName ? `${titleResolved}${fName} ${lName || ''}`.trim() : (t.name || '-');
                                    const displayIdCard = currentData.idCard || currentData.NationalId || currentData.NationId || t.idCard || t.nationId || '-';
                                    
                                    const rawCourse = currentData.courseType || currentData.CourseType || currentData.CourseId || currentData.courseId || currentData.Course || currentData.course;
                                    const displayCourse = (masterMap.courseType && masterMap.courseType[rawCourse]) 
                                      ? masterMap.courseType[rawCourse] 
                                      : ((rawCourse && isNaN(rawCourse) && rawCourse !== 'agent' && rawCourse !== 'broker') ? rawCourse : (t.course || '-'));

                                    return (
                                      <tr key={trans.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-2 border text-center">{t.transactions.length - i}</td>
                                        <td className="px-4 py-2 border">{displayName}</td>
                                        <td className="px-4 py-2 border">{displayIdCard}</td>
                                        <td className="px-4 py-2 border">{displayCourse}</td>
                                        <td className="px-4 py-2 border">{trans.createdAt}</td>
                                        <td className="px-4 py-2 border">บันทึกระบบ</td>
                                        <td className="px-4 py-2 border text-left">
                                          {diffs.length > 0 ? diffs : <span className="text-gray-400">-</span>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">ไม่มีประวัติการทำรายการ</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  ไม่พบข้อมูลผู้สมัครที่ตรงกับคำค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageSize !== 'All' && total > 0 && (
        <div className="flex justify-center mt-6">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
              หน้า {page} จาก {Math.ceil(total / pageSize) || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
              disabled={page >= Math.ceil(total / pageSize)}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <i className="fas fa-chevron-right"></i>
            </button>
          </nav>
        </div>
      )}

      {selectedTrainee && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">
                ข้อมูลรูปภาพ: {selectedTrainee.name} (รหัส ปชช. {selectedTrainee.idCard})
              </h3>
              <button 
                onClick={() => setSelectedTrainee(null)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {docTypes.map(type => {
                  const doc = documents.find(d => 
                    d.documentType?.toLowerCase() === type.key.toLowerCase() || 
                    (type.altKeys && type.altKeys.some(k => k.toLowerCase() === d.documentType?.toLowerCase()))
                  );
                  return (
                    <div key={type.key} className="border border-gray-200 rounded-lg p-4 flex flex-col items-center bg-gray-50">
                      <h4 className="font-semibold text-sm mb-3 text-center">{type.label}</h4>
                      <div className="w-full aspect-[3/4] bg-gray-200 rounded flex items-center justify-center mb-4 overflow-hidden border border-gray-300">
                        {doc ? (
                          <img 
                            src={`${API_ORIGIN}${doc.filePath}?t=${new Date(doc.uploadedAt || Date.now()).getTime()}`} 
                            alt={type.label} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="text-gray-400 text-sm flex flex-col items-center">
                            <i className="fas fa-image text-3xl mb-2"></i>ไม่มีรูปภาพ
                          </span>
                        )}
                      </div>
                      <div className="w-full mt-auto relative">
                        {(canEditTrainees || user?.role === 'Applicant') && (
                          <label className={`w-full block text-center text-sm font-medium py-2 px-4 rounded cursor-pointer transition-colors ${isUploading ? 'bg-gray-300 text-gray-500' : 'bg-primary text-white hover:bg-primary-light'}`}>
                            {isUploading ? 'กำลังอัปโหลด...' : (doc ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ')}
                            <input 
                              type="file" 
                              accept="image/jpeg,image/png,image/gif" 
                              className="hidden" 
                              disabled={isUploading}
                              onChange={(e) => handleUploadDocument(e, type.key)} 
                            />
                          </label>
                        )}
                        {doc && <p className="text-xs text-gray-500 text-center mt-2">อัปเดตล่าสุด: {new Date(doc.uploadedAt).toLocaleString('th-TH')}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {editingTraineeId && (
        <TraineeEditModal 
          nationId={editingTraineeId} 
          onClose={() => setEditingTraineeId(null)} 
          onSuccess={() => {
            setEditingTraineeId(null);
            fetchTrainees();
          }} 
        />
      )}
    </div>
  );
}
