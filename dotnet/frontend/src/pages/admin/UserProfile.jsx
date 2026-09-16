import { useState, useEffect } from 'react';
import { 
  User, Shield, Lock, MapPin, Briefcase, BookOpen, History, 
  Save, CheckCircle2, AlertCircle, RefreshCw, Key, Eye, EyeOff,
  Phone, Mail, Calendar, Building, Award, Clock, Image, Upload
} from 'lucide-react';
import Select from 'react-select';
import ThaiDatePicker from '../../components/ThaiDatePicker';
import HistorySnapshotViewer from '../../components/HistorySnapshotViewer';
import { useAuth } from '../../context/AuthContext';

export default function UserProfile() {
  const { user: authUser, token } = useAuth();

  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'address' | 'affiliation' | 'courses' | 'other' | 'documents' | 'password' | 'history'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploadingDocType, setUploadingDocType] = useState(null);

  // Form State
  const [accountData, setAccountData] = useState({
    fullName: '',
    email: '',
    phone: ''
  });

  const [personData, setPersonData] = useState({
    nationId: '',
    titleTh: '',
    firstNameTh: '',
    middleNameTh: '',
    lastNameTh: '',
    titleOldTh: '',
    firstNameOldTh: '',
    lastNameOldTh: '',
    birthDate: '',
    idCardExpiry: '',
    religionId: null,
    genderId: null,
    bloodGroupId: null,
    phoneOtp: '',
    emailAlt: '',
    lineId: '',
    facebook: '',
    instagram: '',
    foodAllergy: '',
    medicalCondition: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    addresses: [],
    affiliations: [],
    licenses: [],
    courses: [],
    trainings: [],
    others: [],
    registrations: []
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Address Mode State
  const [sameAddress, setSameAddress] = useState(true);

  // Edit History State
  const [histories, setHistories] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);

  // Master Data Dropdowns
  const [masterData, setMasterData] = useState({
    titles: [],
    religions: [],
    genders: [],
    bloods: [],
    provinces: [],
    courses: [],
    agentBranches: [],
    territories: [],
    expertises: [],
    companies: [],
    renewCourseCheckboxes: [],
    renewOtherOptions: []
  });

  const [districtsA, setDistrictsA] = useState([]);
  const [subDistrictsA, setSubDistrictsA] = useState([]);
  const [districtsC, setDistrictsC] = useState([]);
  const [subDistrictsC, setSubDistrictsC] = useState([]);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const getAuthHeaders = () => {
    const currentToken = token || localStorage.getItem('authToken') || localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
    };
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const safeFetchArray = (url, opts) => 
        fetch(url, opts).then(r => r.ok ? r.json() : []).then(data => Array.isArray(data) ? data : []).catch(() => []);

      const [
        titles, religions, genders, bloods, provinces, courses, agentBranches, 
        territories, expertises, companies, renewCourseCheckboxes, renewOtherOptions, profileRes
      ] = await Promise.all([
        safeFetchArray('http://localhost:8085/api/masterdata/titles?all=true'),
        safeFetchArray('http://localhost:8085/api/masterdata/religion?all=true'),
        safeFetchArray('http://localhost:8085/api/masterdata/gender?all=true'),
        safeFetchArray('http://localhost:8085/api/masterdata/blood?all=true'),
        safeFetchArray('http://localhost:8085/api/masterdata/provinces'),
        safeFetchArray('http://localhost:8085/api/masterdata/renew-courses?all=true'),
        safeFetchArray('http://localhost:8085/api/masterdata/agent-branches?all=true'),
        safeFetchArray('http://localhost:8085/api/masterdata/territories?all=true'),
        safeFetchArray('http://localhost:8085/api/masterdata/expertises?all=true'),
        safeFetchArray('http://localhost:8085/api/masterdata/companies?all=true'),
        safeFetchArray('http://localhost:8085/api/masterdata/renewcourse?all=true'),
        safeFetchArray('http://localhost:8085/api/masterdata/renew-other-courses?all=true'),
        fetch('http://localhost:8085/api/auth/profile', { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : {}).catch(() => ({}))
      ]);

      setMasterData({
        titles: Array.isArray(titles) ? titles : [],
        religions: Array.isArray(religions) ? religions : [],
        genders: Array.isArray(genders) ? genders : [],
        bloods: Array.isArray(bloods) ? bloods : [],
        provinces: Array.isArray(provinces) ? provinces : [],
        courses: Array.isArray(courses) ? courses : [],
        agentBranches: Array.isArray(agentBranches) ? agentBranches : [],
        territories: Array.isArray(territories) ? territories : [],
        expertises: Array.isArray(expertises) ? expertises : [],
        companies: Array.isArray(companies) ? companies : [],
        renewCourseCheckboxes: Array.isArray(renewCourseCheckboxes) ? renewCourseCheckboxes : [],
        renewOtherOptions: Array.isArray(renewOtherOptions) ? renewOtherOptions : []
      });

      if (profileRes.user) {
        setAccountData({
          fullName: profileRes.user.fullName || '',
          email: profileRes.user.email || '',
          phone: profileRes.user.phone || ''
        });
      }

      if (profileRes.person) {
        const p = profileRes.person;
        const rawAddrs = p.addresses || [];
        const hasAddrC = rawAddrs.some(a => a.addressType === 'C' || a.addressType === 'M');
        setSameAddress(!hasAddrC);

        let addrs = [...rawAddrs.filter(a => a.addressType === 'A' || a.addressType === 'C' || a.addressType === 'M')];
        if (!addrs.some(a => a.addressType === 'A')) {
          addrs.push({ addressType: 'A', houseNo: '', moo: '', village: '', soi: '', road: '', provinceId: null, districtId: null, subDistrictId: null, postcode: '' });
        }
        if (!addrs.some(a => a.addressType === 'C' || a.addressType === 'M')) {
          addrs.push({ addressType: 'C', houseNo: '', moo: '', village: '', soi: '', road: '', provinceId: null, districtId: null, subDistrictId: null, postcode: '' });
        }

        const formatDate = (d) => d ? d.split('T')[0] : '';

        setPersonData({
          nationId: p.nationId || profileRes.user.nationId || '',
          titleTh: p.titleTh || '',
          firstNameTh: p.firstNameTh || '',
          middleNameTh: p.middleNameTh || '',
          lastNameTh: p.lastNameTh || '',
          titleOldTh: p.titleOldTh || '',
          firstNameOldTh: p.firstNameOldTh || '',
          lastNameOldTh: p.lastNameOldTh || '',
          birthDate: formatDate(p.birthDate),
          idCardExpiry: formatDate(p.idCardExpiry),
          religionId: p.religionId || null,
          genderId: p.genderId || null,
          bloodGroupId: p.bloodGroupId || null,
          phoneOtp: p.phoneOtp || profileRes.user.phone || '',
          emailAlt: p.emailAlt || profileRes.user.email || '',
          lineId: p.lineId || '',
          facebook: p.facebook || '',
          instagram: p.instagram || '',
          foodAllergy: p.foodAllergy || '',
          medicalCondition: p.medicalCondition || '',
          emergencyContactName: p.emergencyContactName || '',
          emergencyContactPhone: p.emergencyContactPhone || '',
          addresses: addrs,
          affiliations: p.affiliations?.length > 0 ? p.affiliations : [{ brokerType: 'agent', branchId: null, brokerCompany: '', brokerBranch: '', viriyahAgentCode: '' }],
          licenses: p.licenses?.map(l => ({
            ...l,
            licenseIssueDate: formatDate(l.licenseIssueDate),
            licenseExpiryDate: formatDate(l.licenseExpiryDate)
          })) || [{ licenseNo: '', courseType: 'agent', licenseIssueDate: '', licenseExpiryDate: '' }],
          courses: p.courses || [],
          trainings: p.trainings || [],
          others: p.others?.length > 0 ? p.others : [{ otherBusiness: '', insuranceExperienceYears: null, salesAreas: [], specialties: [], otherCompanies: [] }],
          registrations: p.registrations?.length > 0 ? p.registrations : [{ DeductionPrivilege: null, MasterDegreeStatus: null }]
        });
      }

      if (profileRes.histories) {
        setHistories(profileRes.histories);
      }

      // Fetch Documents / Images
      const targetNationId = profileRes.person?.nationId || authUser?.nationId;
      if (targetNationId) {
        try {
          const docRes = await fetch(`http://localhost:8085/api/admin/trainees/${targetNationId}/documents`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (docRes.ok) setDocuments(await docRes.json());
        } catch (docErr) {
          console.error('Failed to load trainee documents', docErr);
        }
      }
    } catch (err) {
      console.error(err);
      showAlert('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const addrAProvince = personData.addresses.find(a => a.addressType === 'A')?.provinceId ?? personData.addresses[0]?.provinceId;
  const addrADistrict = personData.addresses.find(a => a.addressType === 'A')?.districtId ?? personData.addresses[0]?.districtId;
  const addrCProvince = personData.addresses.find(a => a.addressType === 'C' || a.addressType === 'M')?.provinceId ?? personData.addresses[1]?.provinceId;
  const addrCDistrict = personData.addresses.find(a => a.addressType === 'C' || a.addressType === 'M')?.districtId ?? personData.addresses[1]?.districtId;

  useEffect(() => {
    if (addrAProvince) {
      fetch(`http://localhost:8085/api/masterdata/districts/${addrAProvince}`)
        .then(r => r.json())
        .then(data => setDistrictsA(Array.isArray(data) ? data : []))
        .catch(() => setDistrictsA([]));
    } else {
      setDistrictsA([]);
    }
  }, [addrAProvince]);

  useEffect(() => {
    if (addrADistrict) {
      fetch(`http://localhost:8085/api/masterdata/subdistricts/${addrADistrict}`)
        .then(r => r.json())
        .then(data => setSubDistrictsA(Array.isArray(data) ? data : []))
        .catch(() => setSubDistrictsA([]));
    } else {
      setSubDistrictsA([]);
    }
  }, [addrADistrict]);

  useEffect(() => {
    if (addrCProvince) {
      fetch(`http://localhost:8085/api/masterdata/districts/${addrCProvince}`)
        .then(r => r.json())
        .then(data => setDistrictsC(Array.isArray(data) ? data : []))
        .catch(() => setDistrictsC([]));
    } else {
      setDistrictsC([]);
    }
  }, [addrCProvince]);

  useEffect(() => {
    if (addrCDistrict) {
      fetch(`http://localhost:8085/api/masterdata/subdistricts/${addrCDistrict}`)
        .then(r => r.json())
        .then(data => setSubDistrictsC(Array.isArray(data) ? data : []))
        .catch(() => setSubDistrictsC([]));
    } else {
      setSubDistrictsC([]);
    }
  }, [addrCDistrict]);

  const handleUploadDoc = async (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;

    const nationId = personData.nationId || authUser?.nationId;
    if (!nationId) {
      showAlert('error', 'ไม่พบรหัสประจำตัวประชาชนสำหรับอัปโหลด');
      return;
    }

    setUploadingDocType(docType);
    try {
      const formData = new FormData();
      formData.append('nationalId', nationId);
      formData.append('phone', accountData.phone || personData.phoneOtp || '0000000000');
      formData.append(docType, file);

      const res = await fetch('http://localhost:8085/api/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (res.ok) {
        showAlert('success', 'อัปโหลดรูปภาพเรียบร้อยแล้ว');
        const docRes = await fetch(`http://localhost:8085/api/admin/trainees/${nationId}/documents`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (docRes.ok) setDocuments(await docRes.json());
      } else {
        showAlert('error', 'ไม่สามารถอัปโหลดรูปภาพได้');
      }
    } catch (err) {
      showAlert('error', 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploadingDocType(null);
      e.target.value = null;
    }
  };

  // Handlers
  const handlePersonChange = (e) => {
    const { name, value } = e.target;
    setPersonData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (e, arrayName, index) => {
    const { name, value } = e.target;
    setPersonData(prev => {
      const newArray = [...prev[arrayName]];
      newArray[index] = { ...newArray[index], [name]: value };
      return { ...prev, [arrayName]: newArray };
    });
  };

  const handleReactSelectChange = (selectedOption, actionMeta, arrayName, index, fieldName) => {
    const value = selectedOption ? selectedOption.value : null;
    setPersonData(prev => {
      const newArray = [...prev[arrayName]];
      newArray[index] = { ...newArray[index], [fieldName]: value };
      if (fieldName === 'provinceId') {
        newArray[index].districtId = null;
        newArray[index].subDistrictId = null;
        newArray[index].postcode = '';
      } else if (fieldName === 'districtId') {
        newArray[index].subDistrictId = null;
        newArray[index].postcode = '';
      } else if (fieldName === 'subDistrictId') {
        const zip = selectedOption?.zipcode || selectedOption?.zipCode || selectedOption?.postalCode || selectedOption?.postal_code || '';
        if (zip) {
          newArray[index].postcode = zip;
        }
      }
      return { ...prev, [arrayName]: newArray };
    });
  };

  const handleCopyAddress = () => {
    const addrA = personData.addresses.find(a => a.addressType === 'A') || personData.addresses[0];
    const updatedAddrs = personData.addresses.map(a => {
      if (a.addressType === 'C' || a.addressType === 'M') {
        return {
          ...a,
          houseNo: addrA.houseNo,
          moo: addrA.moo,
          village: addrA.village,
          soi: addrA.soi,
          road: addrA.road,
          provinceId: addrA.provinceId,
          districtId: addrA.districtId,
          subDistrictId: addrA.subDistrictId,
          postcode: addrA.postcode
        };
      }
      return a;
    });
    setPersonData(prev => ({ ...prev, addresses: updatedAddrs }));
    showAlert('success', 'คัดลอกข้อมูลที่อยู่ตามทะเบียนบ้านเรียบร้อยแล้ว');
  };

  const handleSameAddressChange = (isSame) => {
    setSameAddress(isSame);
    if (isSame) {
      const addrA = personData.addresses.find(a => a.addressType === 'A') || personData.addresses[0];
      if (addrA) {
        setPersonData(prev => ({
          ...prev,
          addresses: prev.addresses.map(a => {
            if (a.addressType === 'C' || a.addressType === 'M') {
              return {
                ...a,
                houseNo: addrA.houseNo,
                moo: addrA.moo,
                village: addrA.village,
                soi: addrA.soi,
                road: addrA.road,
                provinceId: addrA.provinceId,
                districtId: addrA.districtId,
                subDistrictId: addrA.subDistrictId,
                postcode: addrA.postcode
              };
            }
            return a;
          })
        }));
      }
    }
  };

  // Course Handlers
  const handleCourseTypeChange = (courseId) => {
    const selectedCourseObj = masterData?.courses?.find(c => c.id === courseId);
    const dateId = selectedCourseObj?.dateId || null;
    
    const newCourses = [{
      courseId: courseId,
      courseDateId: dateId,
      renewOtherId: null,
      nationId: personData.nationId
    }];

    setPersonData(prev => ({
      ...prev,
      courses: newCourses
    }));
  };

  const handleCourseDateChange = (dateId) => {
    const newCourses = [...(personData.courses || [])];
    if (newCourses.length === 0) {
      newCourses.push({ courseDateId: dateId, nationId: personData.nationId });
    } else {
      newCourses[0] = { ...newCourses[0], courseDateId: dateId };
    }
    setPersonData(prev => ({ ...prev, courses: newCourses }));
  };

  const handleTrainingChange = (courseId, isChecked) => {
    let newTrainings = [...(personData.trainings || [])];
    if (isChecked) {
      if (!newTrainings.some(t => t.courseId?.toString() === courseId.toString())) {
        newTrainings.push({ courseId: parseInt(courseId), nationId: personData.nationId });
      }
    } else {
      newTrainings = newTrainings.filter(t => t.courseId?.toString() !== courseId.toString());
    }
    setPersonData(prev => ({ ...prev, trainings: newTrainings }));
  };

  const handleCourseSubjectChange = (otherCourseId, isChecked) => {
    const currentCourseId = personData.courses?.[0]?.courseId || null;
    let newCourses = [...(personData.courses || [])];
    
    if (isChecked) {
      if (newCourses.length === 1 && !newCourses[0].renewOtherId) {
        newCourses[0].renewOtherId = otherCourseId;
      } else if (!newCourses.some(c => c.renewOtherId === otherCourseId)) {
        newCourses.push({
          courseId: currentCourseId,
          courseDateId: null,
          renewOtherId: otherCourseId,
          nationId: personData.nationId
        });
      }
    } else {
      newCourses = newCourses.filter(c => c.renewOtherId !== otherCourseId);
      if (newCourses.length === 0) {
        newCourses.push({
          courseId: currentCourseId,
          courseDateId: null,
          renewOtherId: null,
          nationId: personData.nationId
        });
      }
    }
    setPersonData(prev => ({ ...prev, courses: newCourses }));
  };

  const handleRegistrationChange = (e, field) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    const newRegs = [...(personData.registrations || [])];
    if (newRegs.length === 0) newRegs.push({});
    const camelField = field.charAt(0).toLowerCase() + field.slice(1);
    const pascalField = field.charAt(0).toUpperCase() + field.slice(1);
    newRegs[0][camelField] = value;
    newRegs[0][pascalField] = value;
    setPersonData(prev => ({ ...prev, registrations: newRegs }));
  };

  // Other Handlers
  const handleOtherChange = (e, field) => {
    const value = e.target.value;
    const newOthers = [...(personData.others || [])];
    if (newOthers.length === 0) newOthers.push({ salesAreas: [], specialties: [], otherCompanies: [] });
    newOthers[0][field] = value;
    setPersonData(prev => ({ ...prev, others: newOthers }));
  };

  const handleOtherCheckboxChange = (collectionName, idField, idValue, isChecked) => {
    const newOthers = [...(personData.others || [])];
    if (newOthers.length === 0) newOthers.push({ salesAreas: [], specialties: [], otherCompanies: [] });
    
    let currentList = newOthers[0][collectionName] || [];
    if (isChecked) {
      if (!currentList.some(item => item[idField]?.toString() === idValue.toString())) {
        currentList.push({ [idField]: parseInt(idValue), nationId: personData.nationId });
      }
    } else {
      currentList = currentList.filter(item => item[idField]?.toString() !== idValue.toString());
    }
    
    newOthers[0][collectionName] = currentList;
    setPersonData(prev => ({ ...prev, others: newOthers }));
  };

  const validateForm = (data, master) => {
    const errors = [];

    // 1. ข้อมูลส่วนบุคคล
    if (!data.firstNameTh?.trim()) errors.push({ tab: 'personal', msg: 'กรุณากรอกชื่อ (ภาษาไทย)' });
    if (!data.lastNameTh?.trim()) errors.push({ tab: 'personal', msg: 'กรุณากรอกนามสกุล (ภาษาไทย)' });
    
    // Validate Birth Date (Age >= 20)
    if (!data.birthDate) {
      errors.push({ tab: 'personal', msg: 'กรุณาระบุวัน/เดือน/ปี เกิด' });
    } else {
      const birthDate = new Date(data.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 20) {
        errors.push({ tab: 'personal', msg: 'วัน/เดือน/ปี เกิด คำนวณแล้วต้องมีอายุ 20 ปีขึ้นไป (ผู้สมัครต้องมีอายุ 20 ปีบริบูรณ์ขึ้นไป)' });
      }
    }

    // Validate ID Card Expiry (Expiry > Today)
    if (!data.idCardExpiry) {
      errors.push({ tab: 'personal', msg: 'กรุณาระบุวันหมดอายุบัตรประชาชน' });
    } else {
      const expiryDate = new Date(data.idCardExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate <= today) {
        errors.push({ tab: 'personal', msg: 'วันหมดอายุบัตรประชาชนต้องมากกว่าวันที่ปัจจุบัน (บัตรประชาชนต้องยังไม่หมดอายุ)' });
      }
    }

    if (!data.genderId) errors.push({ tab: 'personal', msg: 'กรุณาเลือกเพศ' });
    if (!data.religionId) errors.push({ tab: 'personal', msg: 'กรุณาเลือกศาสนา' });
    if (!data.bloodGroupId) errors.push({ tab: 'personal', msg: 'กรุณาเลือกกรุ๊ปเลือด' });

    const phone = data.phoneOtp || accountData.phone;
    if (!phone?.trim()) {
      errors.push({ tab: 'personal', msg: 'กรุณากรอกเบอร์โทรศัพท์มือถือ' });
    } else if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      errors.push({ tab: 'personal', msg: 'เบอร์โทรศัพท์มือถือต้องเป็นตัวเลข 10 หลัก' });
    }

    const email = data.emailAlt || accountData.email;
    if (!email?.trim()) {
      errors.push({ tab: 'personal', msg: 'กรุณากรอกอีเมล' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push({ tab: 'personal', msg: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }

    if (!data.emergencyContactName?.trim()) errors.push({ tab: 'personal', msg: 'กรุณากรอกชื่อผู้ติดต่อฉุกเฉิน' });
    if (!data.emergencyContactPhone?.trim()) {
      errors.push({ tab: 'personal', msg: 'กรุณากรอกเบอร์โทรผู้ติดต่อฉุกเฉิน' });
    } else if (!/^\d{9,10}$/.test(data.emergencyContactPhone.replace(/\D/g, ''))) {
      errors.push({ tab: 'personal', msg: 'เบอร์โทรผู้ติดต่อฉุกเฉินต้องเป็นตัวเลข 9-10 หลัก' });
    }

    // 2. ข้อมูลที่อยู่
    const addrA = data.addresses?.find(a => a.addressType === 'A') || data.addresses?.[0];
    if (!addrA?.houseNo?.trim()) errors.push({ tab: 'address', msg: 'กรุณากรอกบ้านเลขที่ (ที่อยู่ตามทะเบียนบ้าน)' });
    if (!addrA?.provinceId) errors.push({ tab: 'address', msg: 'กรุณาเลือกจังหวัด (ที่อยู่ตามทะเบียนบ้าน)' });
    if (!addrA?.postcode?.trim() || !/^\d{5}$/.test(addrA.postcode.toString().trim())) errors.push({ tab: 'address', msg: 'กรุณาระบุรหัสไปรษณีย์ 5 หลัก (ที่อยู่ตามทะเบียนบ้าน)' });

    if (!sameAddress) {
      const addrC = data.addresses?.find(a => a.addressType === 'C' || a.addressType === 'M') || data.addresses?.[1];
      if (!addrC?.houseNo?.trim()) errors.push({ tab: 'address', msg: 'กรุณากรอกบ้านเลขที่ (ที่อยู่จัดส่งเอกสาร)' });
      if (!addrC?.provinceId) errors.push({ tab: 'address', msg: 'กรุณาเลือกจังหวัด (ที่อยู่จัดส่งเอกสาร)' });
      if (!addrC?.postcode?.trim() || !/^\d{5}$/.test(addrC.postcode.toString().trim())) errors.push({ tab: 'address', msg: 'กรุณาระบุรหัสไปรษณีย์ 5 หลัก (ที่อยู่จัดส่งเอกสาร)' });
    }

    // 3. สังกัด & ใบอนุญาต
    const affil = data.affiliations?.[0] || {};
    const lic = data.licenses?.[0] || {};
    if (!affil.branchId) errors.push({ tab: 'affiliation', msg: 'กรุณาเลือกสังกัดสาขาวิริยะ' });
    
    if (!affil.viriyahAgentCode?.trim()) {
      errors.push({ tab: 'affiliation', msg: 'กรุณากรอกรหัสที่มีสัญญากับ บมจ.วิริยะประกันภัย (5 หลัก)' });
    } else if (!/^\d{5}$/.test(affil.viriyahAgentCode.trim())) {
      errors.push({ tab: 'affiliation', msg: 'รหัสตัวแทนวิริยะต้องเป็นตัวเลข 5 หลัก' });
    }

    if (affil.brokerType === 'corporate' && !affil.brokerCompany?.trim()) {
      errors.push({ tab: 'affiliation', msg: 'กรุณาระบุข้อมูลสังกัดบริษัทโบรกเกอร์' });
    }

    // ตรวจสอบหลักสูตรและการต่ออายุ
    const courseId = data.courses?.[0]?.courseId;
    const selectedCourse = master?.courses?.find(c => c.id === courseId);
    const isRenewal = selectedCourse?.courseName?.includes('ต่อ') || ['2', '3', '4', '6', '7', '8', '9', '10'].includes(courseId?.toString());

    if (isRenewal) {
      if (!lic.licenseNo?.trim()) {
        errors.push({ tab: 'affiliation', msg: 'คอร์สขอต่อใบอนุญาตต้องระบุ "เลขที่ใบอนุญาต" (10 หลัก)' });
      } else if (!/^\d{10}$/.test(lic.licenseNo.trim())) {
        errors.push({ tab: 'affiliation', msg: 'เลขที่ใบอนุญาตต้องเป็นตัวเลข 10 หลัก' });
      } else if (!/^\d{2}(02|04|06)\d{6}$/.test(lic.licenseNo.trim())) {
        errors.push({ tab: 'affiliation', msg: 'เลขที่ใบอนุญาตในหลักที่ 3 และ 4 ต้องเป็น 02, 04 หรือ 06 เท่านั้น' });
      }

      if (!lic.licenseExpiryDate) {
        errors.push({ tab: 'affiliation', msg: 'คอร์สขอต่อใบอนุญาตต้องระบุ "วันหมดอายุใบอนุญาต"' });
      } else {
        const expDate = new Date(lic.licenseExpiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate <= today) {
          errors.push({ tab: 'affiliation', msg: 'วันที่บัตรหมดอายุต้องมากกว่าวันปัจจุบัน (บัตรต้องยังไม่หมดอายุ)' });
        }
      }
    } else {
      if (lic.licenseNo?.trim()) {
        if (!/^\d{10}$/.test(lic.licenseNo.trim())) {
          errors.push({ tab: 'affiliation', msg: 'เลขที่ใบอนุญาตต้องเป็นตัวเลข 10 หลัก' });
        } else if (!/^\d{2}(02|04|06)\d{6}$/.test(lic.licenseNo.trim())) {
          errors.push({ tab: 'affiliation', msg: 'เลขที่ใบอนุญาตในหลักที่ 3 และ 4 ต้องเป็น 02, 04 หรือ 06 เท่านั้น' });
        }
        if (lic.licenseExpiryDate) {
          const expDate = new Date(lic.licenseExpiryDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (expDate <= today) {
            errors.push({ tab: 'affiliation', msg: 'วันที่บัตรหมดอายุต้องมากกว่าวันปัจจุบัน (บัตรต้องยังไม่หมดอายุ)' });
          }
        }
      }
    }

    // 4. หลักสูตรที่อบรม
    if (!courseId) {
      errors.push({ tab: 'courses', msg: 'กรุณาเลือกระดับคอร์สที่ต้องการอบรม' });
    } else {
      const isComplex = selectedCourse && selectedCourse.dateId === null;
      if (!isComplex && !data.courses?.[0]?.courseDateId) {
        errors.push({ tab: 'courses', msg: 'กรุณาเลือกรอบวันอบรม' });
      }

      if (isComplex) {
        const subjects = data.courses?.filter(c => c.renewOtherId) || [];
        if (subjects.length === 0) {
          errors.push({ tab: 'courses', msg: 'กรุณาเลือกวิชาที่ประสงค์จะเข้าอบรมอย่างน้อย 1 วิชา' });
        }

        const deduction = data.registrations?.[0]?.DeductionPrivilege;
        const degStatus = data.registrations?.[0]?.MasterDegreeStatus;
        if (deduction?.includes('MasterDegree') && !degStatus) {
          errors.push({ tab: 'courses', msg: 'กรณีสำเร็จการศึกษาปริญญาโท กรุณาระบุสถานะการยื่นเอกสารลดหย่อน' });
        }
      }
    }

    return errors;
  };

  // Save Profile
  const handleSaveProfile = async (e) => {
    e?.preventDefault();

    // Run Validation
    const validationErrors = validateForm(personData, masterData);
    if (validationErrors.length > 0) {
      setActiveTab(validationErrors[0].tab);
      showAlert('error', `⚠️ ข้อมูลไม่ถูกต้อง: ${validationErrors[0].msg}`);
      return;
    }

    setSaving(true);
    try {
      const addrA = personData.addresses?.find(a => a.addressType === 'A') || personData.addresses?.[0];
      const addrC = personData.addresses?.find(a => a.addressType === 'C' || a.addressType === 'M') || personData.addresses?.[1];

      const finalAddresses = [];
      if (addrA) {
        finalAddresses.push({ ...addrA, addressType: 'A' });
      }
      if (!sameAddress && addrC) {
        finalAddresses.push({ ...addrC, addressType: 'C' });
      }

      const payload = {
        fullName: accountData.fullName || `${personData.firstNameTh} ${personData.lastNameTh}`.trim(),
        phone: accountData.phone || personData.phoneOtp,
        email: accountData.email || personData.emailAlt,
        personData: {
          ...personData,
          addresses: finalAddresses,
          birthDate: personData.birthDate ? new Date(personData.birthDate).toISOString() : null,
          idCardExpiry: personData.idCardExpiry ? new Date(personData.idCardExpiry).toISOString() : null,
          licenses: personData.licenses.map(l => ({
            ...l,
            licenseIssueDate: l.licenseIssueDate ? new Date(l.licenseIssueDate).toISOString() : null,
            licenseExpiryDate: l.licenseExpiryDate ? new Date(l.licenseExpiryDate).toISOString() : null
          }))
        }
      };

      const res = await fetch('http://localhost:8085/api/auth/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        let errMsg = data.message;
        if (!errMsg && data.errors) {
          errMsg = Object.values(data.errors).flat().join(', ');
        }
        throw new Error(errMsg || 'บันทึกข้อมูลไม่สำเร็จ');
      }

      showAlert('success', 'บันทึกข้อมูลและประวัติการแก้ไขสำเร็จ (History Saved)');
      fetchProfile();
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      showAlert('error', 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่');
      return;
    }
    if (passwordData.newPassword.length < 4) {
      showAlert('error', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showAlert('error', 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('http://localhost:8085/api/auth/change-password', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      }

      showAlert('success', 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      fetchProfile();
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm font-medium text-slate-500">กำลังโหลดข้อมูลโปรไฟล์ส่วนตัว...</span>
        </div>
      </div>
    );
  }

  const currentCourseType = personData.courses?.[0]?.courseId;
  const selectedCourseObj = masterData?.courses?.find(c => c.id === currentCourseType);
  const isComplexCourse = selectedCourseObj && selectedCourseObj.dateId === null;
  const showDeductionPrivilege = currentCourseType === 9 || currentCourseType === 10 || currentCourseType === '9' || currentCourseType === '10';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Alert Banner */}
      {alert && (
        <div className={`p-4 rounded-xl flex items-center gap-3 shadow-md transition-all ${
          alert.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {alert.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="text-sm font-semibold">{alert.message}</span>
        </div>
      )}

      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[#002882] text-white flex items-center justify-center text-2xl font-black shadow-md">
            {(accountData.fullName || authUser?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{accountData.fullName || authUser?.username}</h1>
              <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {authUser?.role || 'Applicant'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
              <span><strong>Username:</strong> {authUser?.username}</span>
              <span><strong>เลขบัตรประชาชน:</strong> {personData.nationId || '-'}</span>
              <span><strong>อีเมล:</strong> {accountData.email || '-'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-primary hover:bg-[#002882] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          บันทึกการเปลี่ยนแปลงทั้งหมด
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-2xl shadow-sm overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('personal')}
          className={`py-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'personal' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <User className="w-4 h-4" /> 1. ข้อมูลส่วนบุคคล & บัญชี
        </button>

        <button
          onClick={() => setActiveTab('address')}
          className={`py-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'address' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MapPin className="w-4 h-4" /> 2. ที่อยู่ (Addresses)
        </button>

        <button
          onClick={() => setActiveTab('affiliation')}
          className={`py-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'affiliation' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Briefcase className="w-4 h-4" /> 3. สังกัด & ใบอนุญาต
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`py-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" /> 4. หลักสูตร & วิชาที่เลือก
        </button>

        <button
          onClick={() => setActiveTab('other')}
          className={`py-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'other' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Award className="w-4 h-4" /> 5. ข้อมูลอื่นๆ & ธุรกิจ
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`py-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'documents' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Image className="w-4 h-4" /> 6. รูปภาพ & เอกสาร
        </button>

        <button
          onClick={() => setActiveTab('password')}
          className={`py-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'password' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Lock className="w-4 h-4" /> เปลี่ยนรหัสผ่าน
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`py-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" /> ประวัติการแก้ไข
          {histories.length > 0 && (
            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
              {histories.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: PERSONAL INFO */}
      {activeTab === 'personal' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> ข้อมูลส่วนบุคคลพื้นฐาน
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">เลขประจำตัวประชาชน (Readonly)</label>
                <input
                  type="text"
                  value={personData.nationId}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">คำนำหน้า (ไทย)</label>
                <select
                  name="titleTh"
                  value={personData.titleTh || ''}
                  onChange={handlePersonChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">-- เลือกคำนำหน้า --</option>
                  {masterData.titles.map(t => (
                    <option key={t.id} value={t.id.toString()}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อ (ภาษาไทย)</label>
                <input
                  type="text"
                  name="firstNameTh"
                  value={personData.firstNameTh}
                  onChange={handlePersonChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">นามสกุล (ภาษาไทย)</label>
                <input
                  type="text"
                  name="lastNameTh"
                  value={personData.lastNameTh}
                  onChange={handlePersonChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <ThaiDatePicker
                  label="วัน/เดือน/ปี เกิด"
                  id="birthDate"
                  name="birthDate"
                  value={personData.birthDate}
                  onChange={handlePersonChange}
                  inputClassName="!py-2 !text-sm !rounded-xl !border-slate-300"
                />
              </div>

              <div>
                <ThaiDatePicker
                  label="วันหมดอายุบัตรประชาชน"
                  id="idCardExpiry"
                  name="idCardExpiry"
                  value={personData.idCardExpiry || ''}
                  onChange={handlePersonChange}
                  inputClassName="!py-2 !text-sm !rounded-xl !border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">เพศ</label>
                <select
                  name="genderId"
                  value={personData.genderId || ''}
                  onChange={handlePersonChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">-- เลือกเพศ --</option>
                  {masterData.genders.map(g => (
                    <option key={g.id} value={g.id.toString()}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ศาสนา</label>
                <select
                  name="religionId"
                  value={personData.religionId || ''}
                  onChange={handlePersonChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">-- เลือกศาสนา --</option>
                  {masterData.religions.map(r => (
                    <option key={r.id} value={r.id.toString()}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">กรุ๊ปเลือด</label>
                <select
                  name="bloodGroupId"
                  value={personData.bloodGroupId || ''}
                  onChange={handlePersonChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">-- เลือกกรุ๊ปเลือด --</option>
                  {masterData.bloods.map(b => (
                    <option key={b.id} value={b.id.toString()}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" /> ข้อมูลการติดต่อ & โซเชียล
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">เบอร์โทรศัพท์ (มือถือ)</label>
                <input
                  type="text"
                  value={accountData.phone}
                  onChange={e => {
                    setAccountData({ ...accountData, phone: e.target.value });
                    setPersonData({ ...personData, phoneOtp: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">อีเมล (Email)</label>
                <input
                  type="email"
                  value={accountData.email}
                  onChange={e => {
                    setAccountData({ ...accountData, email: e.target.value });
                    setPersonData({ ...personData, emailAlt: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Line ID</label>
                <input
                  type="text"
                  name="lineId"
                  value={personData.lineId}
                  onChange={handlePersonChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Facebook</label>
                <input
                  type="text"
                  name="facebook"
                  value={personData.facebook}
                  onChange={handlePersonChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Instagram</label>
                <input
                  type="text"
                  name="instagram"
                  value={personData.instagram}
                  onChange={handlePersonChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ผู้ติดต่อฉุกเฉิน (ชื่อ-สกุล)</label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={personData.emergencyContactName}
                  onChange={handlePersonChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">เบอร์ผู้ติดต่อฉุกเฉิน</label>
                <input
                  type="text"
                  name="emergencyContactPhone"
                  value={personData.emergencyContactPhone}
                  onChange={handlePersonChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">แพ้อาหาร / ข้อจำกัด</label>
                <input
                  type="text"
                  name="foodAllergy"
                  value={personData.foodAllergy}
                  onChange={handlePersonChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">โรคประจำตัว</label>
                <input
                  type="text"
                  name="medicalCondition"
                  value={personData.medicalCondition}
                  onChange={handlePersonChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADDRESSES */}
      {activeTab === 'address' && (() => {
        const idxA = personData.addresses.findIndex(a => a.addressType === 'A');
        const idxC = personData.addresses.findIndex(a => a.addressType === 'C' || a.addressType === 'M');
        const actualIdxA = idxA !== -1 ? idxA : 0;
        const actualIdxC = idxC !== -1 ? idxC : 1;
        const addrA = personData.addresses[actualIdxA] || {};
        const addrC = personData.addresses[actualIdxC] || {};

        return (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* 1. ที่อยู่ตามทะเบียนบ้าน */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> ที่อยู่ตามทะเบียนบ้าน
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">บ้านเลขที่ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="houseNo"
                    value={addrA.houseNo || ''}
                    onChange={(e) => handleArrayChange(e, 'addresses', actualIdxA)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">หมู่ที่</label>
                  <input
                    type="text"
                    name="moo"
                    value={addrA.moo || ''}
                    onChange={(e) => handleArrayChange(e, 'addresses', actualIdxA)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">หมู่บ้าน / อาคาร</label>
                  <input
                    type="text"
                    name="village"
                    value={addrA.village || ''}
                    onChange={(e) => handleArrayChange(e, 'addresses', actualIdxA)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ซอย</label>
                  <input
                    type="text"
                    name="soi"
                    value={addrA.soi || ''}
                    onChange={(e) => handleArrayChange(e, 'addresses', actualIdxA)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ถนน</label>
                  <input
                    type="text"
                    name="road"
                    value={addrA.road || ''}
                    onChange={(e) => handleArrayChange(e, 'addresses', actualIdxA)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">จังหวัด <span className="text-red-500">*</span></label>
                  <Select
                    options={masterData.provinces.map(p => ({ value: p.provinceId, label: p.provinceThai }))}
                    value={masterData.provinces.filter(p => p.provinceId === addrA.provinceId).map(p => ({ value: p.provinceId, label: p.provinceThai }))[0] || null}
                    onChange={(sel) => handleReactSelectChange(sel, null, 'addresses', actualIdxA, 'provinceId')}
                    placeholder="เลือกจังหวัด..."
                    isClearable
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">อำเภอ/เขต <span className="text-red-500">*</span></label>
                  <Select
                    options={districtsA.map(d => ({ value: d.districtId, label: d.districtThai }))}
                    value={districtsA.filter(d => d.districtId === addrA.districtId).map(d => ({ value: d.districtId, label: d.districtThai }))[0] || null}
                    onChange={(sel) => handleReactSelectChange(sel, null, 'addresses', actualIdxA, 'districtId')}
                    placeholder={addrA.provinceId ? "เลือกอำเภอ/เขต..." : "กรุณาเลือกจังหวัดก่อน"}
                    isDisabled={!addrA.provinceId}
                    isClearable
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ตำบล/แขวง <span className="text-red-500">*</span></label>
                  <Select
                    options={subDistrictsA.map(s => ({ value: s.subDistrictId, label: s.subDistrictThai, zipcode: s.zipcode }))}
                    value={subDistrictsA.filter(s => s.subDistrictId === addrA.subDistrictId).map(s => ({ value: s.subDistrictId, label: s.subDistrictThai, zipcode: s.zipcode }))[0] || null}
                    onChange={(sel) => handleReactSelectChange(sel, null, 'addresses', actualIdxA, 'subDistrictId')}
                    placeholder={addrA.districtId ? "เลือกตำบล/แขวง..." : "กรุณาเลือกอำเภอก่อน"}
                    isDisabled={!addrA.districtId}
                    isClearable
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">รหัสไปรษณีย์ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="postcode"
                    value={addrA.postcode || ''}
                    onChange={(e) => handleArrayChange(e, 'addresses', actualIdxA)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 2. ที่อยู่สำหรับจัดส่งเอกสาร */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b pb-3 gap-2">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> ที่อยู่สำหรับจัดส่งเอกสาร
                </h3>
              </div>

              {/* Radio selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${sameAddress ? 'border-primary bg-blue-50/50 text-primary ring-1 ring-primary/20 shadow-xs' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <input 
                    type="radio" 
                    name="sameAddressChoice"
                    className="w-4 h-4 text-primary focus:ring-primary accent-primary"
                    checked={sameAddress}
                    onChange={() => handleSameAddressChange(true)}
                  />
                  <span className="font-bold text-sm">ใช้ที่อยู่เดียวกับที่อยู่ตามทะเบียนบ้าน</span>
                </label>

                <label className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${!sameAddress ? 'border-primary bg-blue-50/50 text-primary ring-1 ring-primary/20 shadow-xs' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <input 
                    type="radio" 
                    name="sameAddressChoice"
                    className="w-4 h-4 text-primary focus:ring-primary accent-primary"
                    checked={!sameAddress}
                    onChange={() => handleSameAddressChange(false)}
                  />
                  <span className="font-bold text-sm">ระบุที่อยู่จัดส่งเอกสารใหม่</span>
                </label>
              </div>

              {sameAddress ? (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-sm text-slate-600 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-primary rounded-lg shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-700">ใช้ที่อยู่เดียวกับที่อยู่ตามทะเบียนบ้าน</div>
                    <div className="text-xs text-slate-500 mt-0.5">ระบบจะใช้ที่อยู่ตามทะเบียนบ้านที่ระบุด้านบนเป็นที่อยู่สำหรับจัดส่งเอกสารโดยอัตโนมัติ</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg transition-all"
                    >
                      📋 คัดลอกจากที่อยู่ตามทะเบียนบ้าน
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">บ้านเลขที่ <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="houseNo"
                        value={addrC.houseNo || ''}
                        onChange={(e) => handleArrayChange(e, 'addresses', actualIdxC)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">หมู่ที่</label>
                      <input
                        type="text"
                        name="moo"
                        value={addrC.moo || ''}
                        onChange={(e) => handleArrayChange(e, 'addresses', actualIdxC)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">หมู่บ้าน / อาคาร</label>
                      <input
                        type="text"
                        name="village"
                        value={addrC.village || ''}
                        onChange={(e) => handleArrayChange(e, 'addresses', actualIdxC)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ซอย</label>
                      <input
                        type="text"
                        name="soi"
                        value={addrC.soi || ''}
                        onChange={(e) => handleArrayChange(e, 'addresses', actualIdxC)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ถนน</label>
                      <input
                        type="text"
                        name="road"
                        value={addrC.road || ''}
                        onChange={(e) => handleArrayChange(e, 'addresses', actualIdxC)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">จังหวัด <span className="text-red-500">*</span></label>
                      <Select
                        options={masterData.provinces.map(p => ({ value: p.provinceId, label: p.provinceThai }))}
                        value={masterData.provinces.filter(p => p.provinceId === addrC.provinceId).map(p => ({ value: p.provinceId, label: p.provinceThai }))[0] || null}
                        onChange={(sel) => handleReactSelectChange(sel, null, 'addresses', actualIdxC, 'provinceId')}
                        placeholder="เลือกจังหวัด..."
                        isClearable
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">อำเภอ/เขต <span className="text-red-500">*</span></label>
                      <Select
                        options={districtsC.map(d => ({ value: d.districtId, label: d.districtThai }))}
                        value={districtsC.filter(d => d.districtId === addrC.districtId).map(d => ({ value: d.districtId, label: d.districtThai }))[0] || null}
                        onChange={(sel) => handleReactSelectChange(sel, null, 'addresses', actualIdxC, 'districtId')}
                        placeholder={addrC.provinceId ? "เลือกอำเภอ/เขต..." : "กรุณาเลือกจังหวัดก่อน"}
                        isDisabled={!addrC.provinceId}
                        isClearable
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ตำบล/แขวง <span className="text-red-500">*</span></label>
                      <Select
                        options={subDistrictsC.map(s => ({ value: s.subDistrictId, label: s.subDistrictThai, zipcode: s.zipcode }))}
                        value={subDistrictsC.filter(s => s.subDistrictId === addrC.subDistrictId).map(s => ({ value: s.subDistrictId, label: s.subDistrictThai, zipcode: s.zipcode }))[0] || null}
                        onChange={(sel) => handleReactSelectChange(sel, null, 'addresses', actualIdxC, 'subDistrictId')}
                        placeholder={addrC.districtId ? "เลือกตำบล/แขวง..." : "กรุณาเลือกอำเภอก่อน"}
                        isDisabled={!addrC.districtId}
                        isClearable
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">รหัสไปรษณีย์ <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="postcode"
                        value={addrC.postcode || ''}
                        onChange={(e) => handleArrayChange(e, 'addresses', actualIdxC)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 3: AFFILIATION & LICENSES */}
      {activeTab === 'affiliation' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> ข้อมูลใบอนุญาต
            </h3>

            {personData.licenses.map((lic, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ประเภทใบอนุญาต</label>
                  <select
                    name="courseType"
                    value={lic.courseType || 'agent'}
                    onChange={(e) => handleArrayChange(e, 'licenses', idx)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                  >
                    <option value="agent">ตัวแทนประกันวินาศภัย</option>
                    <option value="broker">นายหน้าประกันวินาศภัย</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เลขที่ใบอนุญาต (10 หลัก)</label>
                  <input
                    type="text"
                    maxLength={10}
                    name="licenseNo"
                    value={lic.licenseNo || ''}
                    onChange={(e) => handleArrayChange(e, 'licenses', idx)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono"
                  />
                </div>

                <div>
                  <ThaiDatePicker
                    label="วันที่ออกใบอนุญาต"
                    id={`licenseIssueDate_${idx}`}
                    name="licenseIssueDate"
                    value={lic.licenseIssueDate || ''}
                    onChange={(e) => handleArrayChange(e, 'licenses', idx)}
                    inputClassName="!py-2 !text-sm !rounded-xl !border-slate-300"
                  />
                </div>

                <div>
                  <ThaiDatePicker
                    label="วันหมดอายุใบอนุญาต"
                    id={`licenseExpiryDate_${idx}`}
                    name="licenseExpiryDate"
                    value={lic.licenseExpiryDate || ''}
                    onChange={(e) => handleArrayChange(e, 'licenses', idx)}
                    inputClassName="!py-2 !text-sm !rounded-xl !border-slate-300"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" /> ข้อมูลสังกัดและสาขาวิริยะ
            </h3>

            {personData.affiliations.map((aff, idx) => {
              const isBroker = personData?.licenses?.[0]?.courseType === 'broker' || personData?.licenses?.[0]?.courseType === 'นายหน้า' || personData?.licenses?.[0]?.courseType === 'นายหน้าประกันวินาศภัย';
              return (
                <div key={idx} className="space-y-4">
                  <div className={`grid grid-cols-1 ${isBroker ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">สังกัดสาขาวิริยะ</label>
                      <Select
                        options={masterData.agentBranches.map(b => ({ value: b.branchId, label: b.branchName, regionId: b.regionId, regionName: b.regionName }))}
                        value={masterData.agentBranches.filter(b => b.branchId === aff.branchId).map(b => ({ value: b.branchId, label: b.branchName }))[0] || null}
                        onChange={(sel) => {
                          if (sel) {
                            handleReactSelectChange(sel, null, 'affiliations', idx, 'branchId');
                            const eRegion = { target: { name: 'regionId', value: sel.regionId } };
                            handleArrayChange(eRegion, 'affiliations', idx);
                          } else {
                            handleReactSelectChange(null, null, 'affiliations', idx, 'branchId');
                            const eRegion = { target: { name: 'regionId', value: null } };
                            handleArrayChange(eRegion, 'affiliations', idx);
                          }
                        }}
                        placeholder="ค้นหาสาขา..."
                        isClearable
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ภาค</label>
                      <input 
                        type="text" 
                        value={masterData.agentBranches.find(b => b.branchId === aff.branchId)?.regionName || ''} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-gray-100 text-gray-500" 
                        readOnly 
                      />
                    </div>

                    {isBroker && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">ประเภทนายหน้า (ถ้ามี)</label>
                        <select
                          name="brokerType"
                          value={aff.brokerType === 'corporate' ? 'corporate' : 'individual'}
                          onChange={(e) => handleArrayChange(e, 'affiliations', idx)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                        >
                          <option value="individual">นายหน้าบุคคลธรรมดา</option>
                          <option value="corporate">นายหน้านิติบุคคล</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">รหัสตัวแทนวิริยะ (5 หลัก)</label>
                      <input
                        type="text"
                        maxLength={5}
                        name="viriyahAgentCode"
                        value={aff.viriyahAgentCode || ''}
                        onChange={(e) => handleArrayChange(e, 'affiliations', idx)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono"
                      />
                    </div>
                  </div>

                  {isBroker && aff.brokerType === 'corporate' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ข้อมูลสังกัดบริษัทโบรกเกอร์</label>
                      <input 
                        type="text" 
                        name="brokerCompany" 
                        value={aff.brokerCompany || ''} 
                        onChange={(e) => handleArrayChange(e, 'affiliations', idx)} 
                        placeholder="ระบุชื่อบริษัทโบรกเกอร์" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">สาขาของบริษัทนายหน้าที่สังกัด</label>
                      <input 
                        type="text" 
                        name="brokerBranch" 
                        value={aff.brokerBranch || ''} 
                        onChange={(e) => handleArrayChange(e, 'affiliations', idx)} 
                        placeholder="ระบุสาขา (ถ้ามี)" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white" 
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* TAB 4: COURSES & SUBJECTS */}
      {activeTab === 'courses' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-150">
          <h2 className="text-base font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> หลักสูตรและวิชาที่เลือก (Courses & Subjects)
          </h2>

          <div className="space-y-4">
            {/* Level Radio List */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">ระดับคอร์สที่ต้องการอบรม</label>
              <div className="flex flex-col gap-2">
                {masterData?.courses?.filter(course => {
                  const licType = personData?.licenses?.[0]?.courseType;
                  const isBroker = (licType === 'broker' || licType === 'นายหน้า' || licType === 'นายหน้าประกันวินาศภัย');
                  const targetAgentType = isBroker ? 'broker' : 'agent';
                  return !course.agentType || course.agentType === targetAgentType || course.agentType === 'all';
                }).map((course, idx) => (
                  <label key={idx} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                    currentCourseType === course.id ? 'border-primary bg-blue-50/40 text-primary font-bold' : 'hover:bg-gray-50 text-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="profileCourseType"
                      className="w-4 h-4 accent-primary"
                      value={course.id}
                      checked={currentCourseType === course.id}
                      onChange={() => handleCourseTypeChange(course.id)}
                    />
                    <span className="text-sm">{course.courseName}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Single Date Course */}
            {!isComplexCourse && selectedCourseObj?.dateDisplay && (
              <div className="bg-gray-50 p-4 border rounded-xl space-y-2 animate-in fade-in">
                <label className="block text-sm font-bold text-primary">{selectedCourseObj.courseName}</label>
                <label className="flex items-center gap-2 p-3 border rounded-xl bg-white cursor-pointer hover:bg-blue-50/30">
                  <input 
                    type="radio" 
                    className="w-4 h-4 accent-primary" 
                    checked={personData.courses?.[0]?.courseDateId === selectedCourseObj.dateId} 
                    onChange={() => handleCourseDateChange(selectedCourseObj.dateId)} 
                  />
                  <span className="text-sm font-medium">{selectedCourseObj.dateDisplay}</span>
                </label>
              </div>
            )}

            {/* Complex Course (Course 4+ Multi-Subject) */}
            {isComplexCourse && (
              <div className="space-y-6 pt-2 animate-in fade-in">
                {/* 5 Years Previous Trainings */}
                <div className="p-4 border rounded-xl bg-slate-50 space-y-3">
                  <label className="block text-sm font-bold text-slate-800">
                    วิชาที่ท่านเคยเข้าอบรมในรอบการสะสมชั่วโมงอบรมปัจจุบัน (5 ปี)
                  </label>
                  <span className="text-xs text-red-500 block">
                    * สำคัญ : ท่านจะต้องไม่อบรมวิชาที่เคยเข้าอบรมซ้ำอีก ตามข้อกำหนดของ คปภ.
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {masterData?.renewCourseCheckboxes?.map((course, idx) => {
                      const isChecked = personData.trainings?.some(t => t.courseId?.toString() === course.id.toString());
                      return (
                        <label key={idx} className="flex items-start gap-2.5 p-2 bg-white rounded-lg border cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            className="mt-1 w-4 h-4 accent-primary"
                            checked={isChecked}
                            onChange={(e) => handleTrainingChange(course.id, e.target.checked)}
                          />
                          <span className="text-xs text-slate-700">{course.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Desired Subjects Selection */}
                <div className="p-4 border rounded-xl bg-blue-50/30 space-y-3">
                  <label className="block text-sm font-bold text-primary">
                    {selectedCourseObj.courseName} (เลือกวิชาที่ต้องการเข้าอบรม)
                  </label>
                  <span className="text-xs text-red-500 block">
                    * เลือกได้มากกว่า 1 วิชา (วิชาที่เคยอบรมจะไม่สามารถเลือกซ้ำได้)
                  </span>

                  <div className="flex flex-col gap-2 pt-1">
                    {masterData?.renewOtherOptions?.map((otherCourse, idx) => {
                      const isChecked = personData.courses?.some(c => c.renewOtherId === otherCourse.id);
                      return (
                        <label key={idx} className="flex items-start gap-2.5 p-2.5 border rounded-lg bg-white hover:bg-blue-50/20 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-1 w-4 h-4 accent-primary"
                            checked={isChecked}
                            onChange={(e) => handleCourseSubjectChange(otherCourse.id, e.target.checked)}
                          />
                          <span className="text-xs text-slate-800">{otherCourse.displayName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Master Degree Deduction Privilege */}
                {showDeductionPrivilege && (
                  <div className="p-4 border rounded-xl bg-white space-y-4">
                    <label className="block text-sm font-bold text-gray-700">
                      สำเร็จการศึกษาตั้งแต่ระดับปริญญาโทขึ้นไป หรือไม่
                    </label>

                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="profileDeductionPrivilege"
                          className="w-4 h-4 accent-primary"
                          value="MasterDegree"
                          checked={(personData.registrations?.[0]?.DeductionPrivilege || personData.registrations?.[0]?.deductionPrivilege || '').includes('MasterDegree')}
                          onChange={() => {
                            const synthetic = { target: { type: 'radio', value: 'MasterDegree' } };
                            handleRegistrationChange(synthetic, 'DeductionPrivilege');
                          }}
                        />
                        <span>ใช่ (ระดับปริญญาโทขึ้นไป)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="profileDeductionPrivilege"
                          className="w-4 h-4 accent-primary"
                          value="None"
                          checked={!(personData.registrations?.[0]?.DeductionPrivilege || personData.registrations?.[0]?.deductionPrivilege || '').includes('MasterDegree')}
                          onChange={() => {
                            const synthetic = { target: { type: 'radio', value: null } };
                            handleRegistrationChange(synthetic, 'DeductionPrivilege');
                            const synthetic2 = { target: { type: 'radio', value: null } };
                            handleRegistrationChange(synthetic2, 'MasterDegreeStatus');
                          }}
                        />
                        <span>ไม่ใช่</span>
                      </label>
                    </div>

                    {(personData.registrations?.[0]?.DeductionPrivilege || personData.registrations?.[0]?.deductionPrivilege || '').includes('MasterDegree') && (
                      <div className="pt-3 border-t space-y-2">
                        <label className="block text-xs font-bold text-gray-600">สถานะการยื่นเอกสารลดหย่อน</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input 
                              type="radio" 
                              name="profileMasterDegreeStatus"
                              className="w-4 h-4 accent-primary" 
                              value="เคยยื่นเอกสาร" 
                              checked={(personData.registrations?.[0]?.MasterDegreeStatus || personData.registrations?.[0]?.masterDegreeStatus) === "เคยยื่นเอกสาร"} 
                              onChange={(e) => handleRegistrationChange(e, 'MasterDegreeStatus')}
                            />
                            <span>เคยยื่นเอกสาร</span>
                          </label>

                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input 
                              type="radio" 
                              name="profileMasterDegreeStatus"
                              className="w-4 h-4 accent-primary" 
                              value="ไม่เคยยื่นเอกสาร" 
                              checked={(personData.registrations?.[0]?.MasterDegreeStatus || personData.registrations?.[0]?.masterDegreeStatus) === "ไม่เคยยื่นเอกสาร"} 
                              onChange={(e) => handleRegistrationChange(e, 'MasterDegreeStatus')}
                            />
                            <span>ไม่เคยยื่นเอกสาร</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: OTHER INFO & BUSINESS */}
      {activeTab === 'other' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" /> ข้อมูลธุรกิจและประสบการณ์
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">ธุรกิจอื่นที่ท่านทำ (ระบุประเภทธุรกิจ)</label>
                <input 
                  type="text" 
                  value={personData?.others?.[0]?.otherBusiness || ''} 
                  onChange={(e) => handleOtherChange(e, 'otherBusiness')} 
                  className="w-full border rounded-xl p-2.5 text-sm" 
                  placeholder="กรุณาระบุ..." 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">ประสบการณ์ในธุรกิจประกันภัย (ปี)</label>
                <input 
                  type="number" 
                  min="0"
                  value={personData?.others?.[0]?.insuranceExperienceYears || ''} 
                  onChange={(e) => handleOtherChange(e, 'insuranceExperienceYears')} 
                  className="w-full border rounded-xl p-2.5 text-sm" 
                  placeholder="จำนวนปี เช่น 3" 
                />
              </div>
            </div>

            {/* Territories */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-600 mb-2">เขตพื้นที่ขาย</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(Array.isArray(masterData?.territories) ? masterData.territories : []).map((territory, idx) => {
                  const checked = personData?.others?.[0]?.salesAreas?.some(sa => sa.territoriesId?.toString() === territory.id.toString());
                  return (
                    <label key={idx} className="flex items-center gap-2 p-2 border rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer text-xs">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-primary" 
                        checked={checked || false} 
                        onChange={(e) => handleOtherCheckboxChange('salesAreas', 'territoriesId', territory.id, e.target.checked)} 
                      />
                      <span>{territory.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Specialties */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-600 mb-2">ความเชี่ยวชาญประกันภัย</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(Array.isArray(masterData?.expertises) ? masterData.expertises : []).map((specialty, idx) => {
                  const checked = personData?.others?.[0]?.specialties?.some(sp => sp.expertiseId?.toString() === specialty.id.toString());
                  return (
                    <label key={idx} className="flex items-center gap-2 p-2 border rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer text-xs">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-primary" 
                        checked={checked || false} 
                        onChange={(e) => handleOtherCheckboxChange('specialties', 'expertiseId', specialty.id, e.target.checked)} 
                      />
                      <span>{specialty.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Other Companies */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-600 mb-2">บริษัทประกันภัยอื่นที่ท่านส่งงานในปัจจุบัน</label>
              <div className="max-h-52 overflow-y-auto p-3 border rounded-xl bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-2">
                {(Array.isArray(masterData?.companies) ? masterData.companies : []).map((company, idx) => {
                  const checked = personData?.others?.[0]?.otherCompanies?.some(oc => oc.companyId?.toString() === company.id.toString());
                  return (
                    <label key={idx} className="flex items-center gap-2 p-2 bg-white border rounded-xl hover:bg-gray-100 cursor-pointer text-xs">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-primary" 
                        checked={checked || false} 
                        onChange={(e) => handleOtherCheckboxChange('otherCompanies', 'companyId', company.id, e.target.checked)} 
                      />
                      <span>{company.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 6: DOCUMENTS & PHOTOS */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div className="border-b pb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Image className="w-5 h-5 text-primary" /> รูปภาพและเอกสารประจำตัว (Documents & Photos)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              ท่านสามารถดูรูปภาพปัจจุบัน และคลิกปุ่ม <strong>"เปลี่ยนรูปภาพ / อัปโหลดใหม่"</strong> เพื่ออัปเดตรูปของตนเองได้ทันที
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { key: 'Profile', altKeys: ['profile', 'Profile'], label: 'ภาพถ่ายหน้าตรง (Profile)' },
              { key: 'IDCardFace', altKeys: ['idCardWithFace', 'IDCardFace', 'idcardface', 'idcardwithface'], label: 'ภาพถ่ายคู่บัตร ปชช. (IDCardFace)' },
              { key: 'IDCard', altKeys: ['idCard', 'IDCard', 'idcard'], label: 'ภาพถ่ายบัตร ปชช. (IDCard)' }
            ].map(type => {
              const doc = documents.find(d => 
                d.documentType?.toLowerCase() === type.key.toLowerCase() || 
                (type.altKeys && type.altKeys.some(k => k.toLowerCase() === d.documentType?.toLowerCase()))
              );
              const isUploadingThis = uploadingDocType === type.key;

              return (
                <div key={type.key} className="border border-slate-200 rounded-2xl p-5 flex flex-col items-center bg-slate-50 shadow-sm hover:shadow-md transition-all">
                  <h4 className="font-bold text-sm text-slate-700 mb-3 text-center">{type.label}</h4>
                  
                  <div className="w-full aspect-[3/4] bg-slate-200 rounded-xl flex items-center justify-center mb-4 overflow-hidden border border-slate-300 relative group">
                    {doc ? (
                      <img 
                        src={`http://localhost:8085${doc.filePath}?t=${new Date(doc.uploadedAt).getTime()}`} 
                        alt={type.label} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <span className="text-slate-400 text-sm flex flex-col items-center">
                        <Image className="w-10 h-10 mb-2 opacity-40" />
                        ไม่มีรูปภาพ
                      </span>
                    )}
                  </div>

                  <div className="w-full mt-auto space-y-2">
                    <label className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold cursor-pointer transition-all shadow-sm ${
                      isUploadingThis 
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                        : 'bg-primary hover:bg-[#002882] text-white active:scale-95'
                    }`}>
                      {isUploadingThis ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> กำลังอัปโหลด...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" /> {doc ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ'}
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/gif" 
                        className="hidden" 
                        disabled={isUploadingThis}
                        onChange={(e) => handleUploadDoc(e, type.key)} 
                      />
                    </label>

                    {doc && (
                      <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" /> อัปเดต: {new Date(doc.uploadedAt).toLocaleString('th-TH')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 7: CHANGE PASSWORD */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-xl mx-auto space-y-6 animate-in fade-in duration-150">
          <h2 className="text-base font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" /> เปลี่ยนรหัสผ่านของฉัน (Change Password)
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">รหัสผ่านปัจจุบัน</label>
              <div className="relative">
                <input
                  type={showPassword.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm pr-10 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="กรอกรหัสผ่านเดิม..."
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">รหัสผ่านใหม่</label>
              <div className="relative">
                <input
                  type={showPassword.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm pr-10 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="อย่างน้อย 4 ตัวอักษร..."
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">ยืนยันรหัสผ่านใหม่</label>
              <div className="relative">
                <input
                  type={showPassword.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm pr-10 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง..."
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary hover:bg-[#002882] text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                ยืนยันเปลี่ยนรหัสผ่าน
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 7: EDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-150">
          <h2 className="text-base font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> ประวัติการบันทึก & แก้ไขข้อมูล (Register History)
          </h2>

          {histories.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
              ยังไม่มีประวัติการแก้ไขข้อมูล
            </div>
          ) : (
            <div className="space-y-3">
              {histories.map((h, i) => {
                const isSelected = selectedHistory?.id === (h.id || i);
                return (
                  <div key={h.id || i} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="p-4 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase ${
                            h.editedByType === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {h.editedByType || 'applicant'}
                          </span>
                          <span className="text-sm font-bold text-slate-800">
                            แก้ไขโดย: {h.createdBy || authUser?.username}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(h.createdAt).toLocaleString('th-TH')}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedHistory(isSelected ? null : { ...h, id: h.id || i })}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all border ${
                          isSelected 
                            ? 'bg-primary text-white border-primary shadow-sm' 
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isSelected ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด Snapshot'}
                      </button>
                    </div>

                    {isSelected && (
                      <div className="p-4 border-t border-slate-200 bg-slate-50/30">
                        <HistorySnapshotViewer 
                          oldData={h.oldData} 
                          newData={h.newData} 
                          masterData={masterData}
                          title={`ข้อมูลการเปลี่ยนแปลง #${h.id || i + 1} (${new Date(h.createdAt).toLocaleString('th-TH')})`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
