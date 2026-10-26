import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect } from 'react';
import Select from 'react-select';
import ThaiDatePicker from '../../components/ThaiDatePicker';
import { useAuth } from '../../context/AuthContext';

export default function TraineeEditModal({ nationId, onClose, onSuccess }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'address' | 'license' | 'course' | 'other'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sameAddress, setSameAddress] = useState(true);

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token');
        
        const safeFetchArray = (url, opts) => 
          fetch(url, opts).then(r => r.ok ? r.json() : []).then(data => Array.isArray(data) ? data : []).catch(() => []);

        const [
          titles, religions, genders, bloods, provinces, courses, agentBranches, 
          territories, expertises, companies, renewCourseCheckboxes, renewOtherOptions, fullData
        ] = await Promise.all([
          safeFetchArray(`${API_BASE_URL}/masterdata/titles?all=true`),
          safeFetchArray(`${API_BASE_URL}/masterdata/religion?all=true`),
          safeFetchArray(`${API_BASE_URL}/masterdata/gender?all=true`),
          safeFetchArray(`${API_BASE_URL}/masterdata/blood?all=true`),
          safeFetchArray(`${API_BASE_URL}/masterdata/provinces`),
          safeFetchArray(`${API_BASE_URL}/masterdata/renew-courses?all=true`),
          safeFetchArray(`${API_BASE_URL}/masterdata/agent-branches?all=true`),
          safeFetchArray(`${API_BASE_URL}/masterdata/territories?all=true`),
          safeFetchArray(`${API_BASE_URL}/masterdata/expertises?all=true`),
          safeFetchArray(`${API_BASE_URL}/masterdata/companies?all=true`),
          safeFetchArray(`${API_BASE_URL}/masterdata/renewcourse?all=true`),
          safeFetchArray(`${API_BASE_URL}/masterdata/renew-other-courses?all=true`),
          fetch(`${API_BASE_URL}/admin/trainees/${nationId}/full`, { 
            headers: token ? { 'Authorization': `Bearer ${token}` } : {} 
          }).then(r => r.ok ? r.json() : {}).catch(() => ({}))
        ]);

        // Ensure addresses has A and C/M
        const rawAddrs = fullData.addresses || [];
        const hasAddrC = rawAddrs.some(a => a.addressType === 'C' || a.addressType === 'M');
        setSameAddress(!hasAddrC);

        let addrs = [...rawAddrs.filter(a => a.addressType === 'A' || a.addressType === 'C' || a.addressType === 'M')];
        if (!addrs.some(a => a.addressType === 'A')) {
          addrs.push({ addressType: 'A', houseNo: '', moo: '', village: '', soi: '', road: '', provinceId: null, districtId: null, subDistrictId: null, postcode: '' });
        }
        if (!addrs.some(a => a.addressType === 'C' || a.addressType === 'M')) {
          addrs.push({ addressType: 'C', houseNo: '', moo: '', village: '', soi: '', road: '', provinceId: null, districtId: null, subDistrictId: null, postcode: '' });
        }

        fullData.addresses = addrs;

        fullData.birthDate = fullData.birthDate ? fullData.birthDate.split('T')[0] : '';
        fullData.idCardExpiry = fullData.idCardExpiry ? fullData.idCardExpiry.split('T')[0] : '';
        fullData.licenses = fullData.licenses?.length > 0 ? fullData.licenses : [{ licenseNo: '', courseType: 'agent', licenseIssueDate: null, licenseExpiryDate: null }];
        fullData.affiliations = fullData.affiliations?.length > 0 ? fullData.affiliations : [{ brokerType: 'agent', branchId: null, brokerCompany: '', brokerBranch: '', viriyahAgentCode: '' }];
        fullData.courses = fullData.courses || [];
        fullData.trainings = fullData.trainings || [];
        fullData.others = fullData.others?.length > 0 ? fullData.others : [{ otherBusiness: '', insuranceExperienceYears: null, salesAreas: [], specialties: [], otherCompanies: [] }];
        fullData.registrations = fullData.registrations?.length > 0 ? fullData.registrations : [{ DeductionPrivilege: null, MasterDegreeStatus: null }];

        if (fullData.titleTh) {
          const matchedTitle = (Array.isArray(titles) ? titles : []).find(t => t.name === fullData.titleTh || t.id?.toString() === fullData.titleTh?.toString());
          if (matchedTitle) {
            fullData.titleTh = matchedTitle.id.toString();
          }
        }

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
        setFormData(fullData);
      } catch (err) {
        console.error('Failed to load trainee full data', err);
      } finally {
        setLoading(false);
      }
    };

    if (nationId) fetchData();
  }, [nationId]);

  const addrAProvince = formData?.addresses?.find(a => a.addressType === 'A')?.provinceId ?? formData?.addresses?.[0]?.provinceId;
  const addrADistrict = formData?.addresses?.find(a => a.addressType === 'A')?.districtId ?? formData?.addresses?.[0]?.districtId;
  const addrCProvince = formData?.addresses?.find(a => a.addressType === 'C' || a.addressType === 'M')?.provinceId ?? formData?.addresses?.[1]?.provinceId;
  const addrCDistrict = formData?.addresses?.find(a => a.addressType === 'C' || a.addressType === 'M')?.districtId ?? formData?.addresses?.[1]?.districtId;

  useEffect(() => {
    if (addrAProvince) {
      fetch(`${API_BASE_URL}/masterdata/districts/${addrAProvince}`)
        .then(r => r.json())
        .then(data => setDistrictsA(Array.isArray(data) ? data : []))
        .catch(() => setDistrictsA([]));
    } else {
      setDistrictsA([]);
    }
  }, [addrAProvince]);

  useEffect(() => {
    if (addrADistrict) {
      fetch(`${API_BASE_URL}/masterdata/subdistricts/${addrADistrict}`)
        .then(r => r.json())
        .then(data => setSubDistrictsA(Array.isArray(data) ? data : []))
        .catch(() => setSubDistrictsA([]));
    } else {
      setSubDistrictsA([]);
    }
  }, [addrADistrict]);

  useEffect(() => {
    if (addrCProvince) {
      fetch(`${API_BASE_URL}/masterdata/districts/${addrCProvince}`)
        .then(r => r.json())
        .then(data => setDistrictsC(Array.isArray(data) ? data : []))
        .catch(() => setDistrictsC([]));
    } else {
      setDistrictsC([]);
    }
  }, [addrCProvince]);

  useEffect(() => {
    if (addrCDistrict) {
      fetch(`${API_BASE_URL}/masterdata/subdistricts/${addrCDistrict}`)
        .then(r => r.json())
        .then(data => setSubDistrictsC(Array.isArray(data) ? data : []))
        .catch(() => setSubDistrictsC([]));
    } else {
      setSubDistrictsC([]);
    }
  }, [addrCDistrict]);

  // Form Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (e, arrayName, index) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newArray = [...prev[arrayName]];
      newArray[index] = { ...newArray[index], [name]: value };
      return { ...prev, [arrayName]: newArray };
    });
  };

  const handleReactSelectChange = (selectedOption, actionMeta, arrayName, index, fieldName) => {
    const value = selectedOption ? selectedOption.value : null;
    setFormData(prev => {
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
    const addrA = formData.addresses.find(a => a.addressType === 'A') || formData.addresses[0];
    const updatedAddrs = formData.addresses.map(a => {
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
    setFormData(prev => ({ ...prev, addresses: updatedAddrs }));
  };

  const handleSameAddressChange = (isSame) => {
    setSameAddress(isSame);
    if (isSame) {
      const addrA = formData.addresses.find(a => a.addressType === 'A') || formData.addresses[0];
      if (addrA) {
        setFormData(prev => ({
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
      nationId: nationId
    }];

    setFormData(prev => ({
      ...prev,
      courses: newCourses
    }));
  };

  const handleCourseDateChange = (dateId) => {
    const newCourses = [...(formData.courses || [])];
    if (newCourses.length === 0) {
      newCourses.push({ courseDateId: dateId, nationId: nationId });
    } else {
      newCourses[0] = { ...newCourses[0], courseDateId: dateId };
    }
    setFormData(prev => ({ ...prev, courses: newCourses }));
  };

  const handleTrainingChange = (courseId, isChecked) => {
    let newTrainings = [...(formData.trainings || [])];
    if (isChecked) {
      if (!newTrainings.some(t => t.courseId?.toString() === courseId.toString())) {
        newTrainings.push({ courseId: parseInt(courseId), nationId: nationId });
      }
    } else {
      newTrainings = newTrainings.filter(t => t.courseId?.toString() !== courseId.toString());
    }
    setFormData(prev => ({ ...prev, trainings: newTrainings }));
  };

  const handleCourseSubjectChange = (otherCourseId, isChecked) => {
    const currentCourseId = formData.courses?.[0]?.courseId || null;
    let newCourses = [...(formData.courses || [])];
    
    if (isChecked) {
      if (newCourses.length === 1 && !newCourses[0].renewOtherId) {
        newCourses[0].renewOtherId = otherCourseId;
      } else if (!newCourses.some(c => c.renewOtherId === otherCourseId)) {
        newCourses.push({
          courseId: currentCourseId,
          courseDateId: null,
          renewOtherId: otherCourseId,
          nationId: nationId
        });
      }
    } else {
      newCourses = newCourses.filter(c => c.renewOtherId !== otherCourseId);
      if (newCourses.length === 0) {
        newCourses.push({
          courseId: currentCourseId,
          courseDateId: null,
          renewOtherId: null,
          nationId: nationId
        });
      }
    }
    setFormData(prev => ({ ...prev, courses: newCourses }));
  };

  const handleRegistrationChange = (e, field) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    const newRegs = [...(formData.registrations || [])];
    if (newRegs.length === 0) newRegs.push({});
    const camelField = field.charAt(0).toLowerCase() + field.slice(1);
    const pascalField = field.charAt(0).toUpperCase() + field.slice(1);
    newRegs[0][camelField] = value;
    newRegs[0][pascalField] = value;
    setFormData(prev => ({ ...prev, registrations: newRegs }));
  };

  // Other Tab Handlers
  const handleOtherChange = (e, field) => {
    const value = e.target.value;
    const newOthers = [...(formData.others || [])];
    if (newOthers.length === 0) newOthers.push({ salesAreas: [], specialties: [], otherCompanies: [] });
    newOthers[0][field] = value;
    setFormData(prev => ({ ...prev, others: newOthers }));
  };

  const handleOtherCheckboxChange = (collectionName, idField, idValue, isChecked) => {
    const newOthers = [...(formData.others || [])];
    if (newOthers.length === 0) newOthers.push({ salesAreas: [], specialties: [], otherCompanies: [] });
    
    let currentList = newOthers[0][collectionName] || [];
    if (isChecked) {
      if (!currentList.some(item => item[idField]?.toString() === idValue.toString())) {
        currentList.push({ [idField]: parseInt(idValue), nationId: nationId });
      }
    } else {
      currentList = currentList.filter(item => item[idField]?.toString() !== idValue.toString());
    }
    
    newOthers[0][collectionName] = currentList;
    setFormData(prev => ({ ...prev, others: newOthers }));
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

    const phone = data.phoneOtp;
    if (!phone?.trim()) {
      errors.push({ tab: 'personal', msg: 'กรุณากรอกเบอร์โทรศัพท์มือถือ' });
    } else if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      errors.push({ tab: 'personal', msg: 'เบอร์โทรศัพท์มือถือต้องเป็นตัวเลข 10 หลัก' });
    }

    const email = data.emailAlt;
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
    if (!affil.branchId) errors.push({ tab: 'license', msg: 'กรุณาเลือกสังกัดสาขาวิริยะ' });
    
    if (!affil.viriyahAgentCode?.trim()) {
      errors.push({ tab: 'license', msg: 'กรุณากรอกรหัสที่มีสัญญากับ บมจ.วิริยะประกันภัย (5 หลัก)' });
    } else if (!/^\d{5}$/.test(affil.viriyahAgentCode.trim())) {
      errors.push({ tab: 'license', msg: 'รหัสตัวแทนวิริยะต้องเป็นตัวเลข 5 หลัก' });
    }

    if (affil.brokerType === 'corporate' && !affil.brokerCompany?.trim()) {
      errors.push({ tab: 'license', msg: 'กรุณาระบุข้อมูลสังกัดบริษัทโบรกเกอร์' });
    }

    // ตรวจสอบหลักสูตรและการต่ออายุ
    const courseId = data.courses?.[0]?.courseId;
    const selectedCourse = master?.courses?.find(c => c.id === courseId);
    const isRenewal = selectedCourse?.courseName?.includes('ต่อ') || ['2', '3', '4', '6', '7', '8', '9', '10'].includes(courseId?.toString());

    if (isRenewal) {
      if (!lic.licenseNo?.trim()) {
        errors.push({ tab: 'license', msg: 'คอร์สขอต่อใบอนุญาตต้องระบุ "เลขที่ใบอนุญาต" (10 หลัก)' });
      } else if (!/^\d{10}$/.test(lic.licenseNo.trim())) {
        errors.push({ tab: 'license', msg: 'เลขที่ใบอนุญาตต้องเป็นตัวเลข 10 หลัก' });
      } else if (!/^\d{2}(02|04|06)\d{6}$/.test(lic.licenseNo.trim())) {
        errors.push({ tab: 'license', msg: 'เลขที่ใบอนุญาตในหลักที่ 3 และ 4 ต้องเป็น 02, 04 หรือ 06 เท่านั้น' });
      }

      if (!lic.licenseExpiryDate) {
        errors.push({ tab: 'license', msg: 'คอร์สขอต่อใบอนุญาตต้องระบุ "วันหมดอายุใบอนุญาต"' });
      } else {
        const expDate = new Date(lic.licenseExpiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate <= today) {
          errors.push({ tab: 'license', msg: 'วันที่บัตรหมดอายุต้องมากกว่าวันปัจจุบัน (บัตรต้องยังไม่หมดอายุ)' });
        }
      }
    } else {
      if (lic.licenseNo?.trim()) {
        if (!/^\d{10}$/.test(lic.licenseNo.trim())) {
          errors.push({ tab: 'license', msg: 'เลขที่ใบอนุญาตต้องเป็นตัวเลข 10 หลัก' });
        } else if (!/^\d{2}(02|04|06)\d{6}$/.test(lic.licenseNo.trim())) {
          errors.push({ tab: 'license', msg: 'เลขที่ใบอนุญาตในหลักที่ 3 และ 4 ต้องเป็น 02, 04 หรือ 06 เท่านั้น' });
        }
        if (lic.licenseExpiryDate) {
          const expDate = new Date(lic.licenseExpiryDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (expDate <= today) {
            errors.push({ tab: 'license', msg: 'วันที่บัตรหมดอายุต้องมากกว่าวันปัจจุบัน (บัตรต้องยังไม่หมดอายุ)' });
          }
        }
      }
    }

    // 4. หลักสูตรที่อบรม
    if (!courseId) {
      errors.push({ tab: 'course', msg: 'กรุณาเลือกระดับคอร์สที่ต้องการอบรม' });
    } else {
      const isComplex = selectedCourse && selectedCourse.dateId === null;
      if (!isComplex && !data.courses?.[0]?.courseDateId) {
        errors.push({ tab: 'course', msg: 'กรุณาเลือกรอบวันอบรม' });
      }

      if (isComplex) {
        const subjects = data.courses?.filter(c => c.renewOtherId) || [];
        if (subjects.length === 0) {
          errors.push({ tab: 'course', msg: 'กรุณาเลือกวิชาที่ประสงค์จะเข้าอบรมอย่างน้อย 1 วิชา' });
        }

        const deduction = data.registrations?.[0]?.DeductionPrivilege;
        const degStatus = data.registrations?.[0]?.MasterDegreeStatus;
        if (deduction?.includes('MasterDegree') && !degStatus) {
          errors.push({ tab: 'course', msg: 'กรณีสำเร็จการศึกษาปริญญาโท กรุณาระบุสถานะการยื่นเอกสารลดหย่อน' });
        }
      }
    }

    return errors;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm(formData, masterData);
    if (validationErrors.length > 0) {
      setActiveTab(validationErrors[0].tab);
      alert(`⚠️ กรุณาตรวจสอบข้อมูล:\n\n• ${validationErrors[0].msg}`);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token');
      
      const addrA = formData.addresses?.find(a => a.addressType === 'A') || formData.addresses?.[0];
      const addrC = formData.addresses?.find(a => a.addressType === 'C' || a.addressType === 'M') || formData.addresses?.[1];

      const finalAddresses = [];
      if (addrA) {
        finalAddresses.push({ ...addrA, addressType: 'A' });
      }
      if (!sameAddress && addrC) {
        finalAddresses.push({ ...addrC, addressType: 'C' });
      }

      const selectedTitleObj = masterData.titles.find(t => t.id?.toString() === formData.titleTh?.toString() || t.name === formData.titleTh);
      const resolvedTitleTh = selectedTitleObj ? selectedTitleObj.name : formData.titleTh;

      const payload = {
        ...formData,
        titleTh: resolvedTitleTh,
        addresses: finalAddresses,
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
        idCardExpiry: formData.idCardExpiry ? new Date(formData.idCardExpiry).toISOString() : null,
        religionId: formData.religionId ? parseInt(formData.religionId) : null,
        genderId: formData.genderId ? parseInt(formData.genderId) : null,
        bloodGroupId: formData.bloodGroupId ? parseInt(formData.bloodGroupId) : null
      };

      const res = await fetch(`${API_BASE_URL}/admin/trainees/${nationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('บันทึกข้อมูลและประวัติการแก้ไขเรียบร้อยแล้ว');
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[60] backdrop-blur-sm">
        <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex items-center gap-3 font-semibold text-slate-700">
          <i className="fas fa-spinner fa-spin text-primary text-xl"></i> กำลังโหลดข้อมูล...
        </div>
      </div>
    );
  }

  const currentCourseType = formData.courses?.[0]?.courseId;
  const selectedCourseObj = masterData?.courses?.find(c => c.id === currentCourseType);
  const isComplexCourse = selectedCourseObj && selectedCourseObj.dateId === null;
  const showDeductionPrivilege = currentCourseType === 9 || currentCourseType === 10 || currentCourseType === '9' || currentCourseType === '10';

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <i className="fas fa-user-edit text-primary"></i> แก้ไขข้อมูลผู้สมัคร: {formData?.firstNameTh} {formData?.lastNameTh}
            </h3>
            <p className="text-xs text-gray-500 font-mono">Nation ID: {formData?.nationId || nationId}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-lg hover:bg-gray-200">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-white overflow-x-auto flex-shrink-0 px-4">
          <button 
            type="button" 
            onClick={() => setActiveTab('personal')} 
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap flex-shrink-0 border-b-2 transition-all ${
              activeTab === 'personal' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            1. ข้อมูลส่วนตัว
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('address')} 
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap flex-shrink-0 border-b-2 transition-all ${
              activeTab === 'address' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            2. ข้อมูลที่อยู่
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('license')} 
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap flex-shrink-0 border-b-2 transition-all ${
              activeTab === 'license' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            3. ใบอนุญาตและการทำงาน
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('course')} 
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap flex-shrink-0 border-b-2 transition-all ${
              activeTab === 'course' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            4. หลักสูตรที่อบรม
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('other')} 
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap flex-shrink-0 border-b-2 transition-all ${
              activeTab === 'other' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            5. ข้อมูลอื่นๆ & ธุรกิจ
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          <form id="editPersonForm" onSubmit={handleSubmit}>
            
            {/* TAB 1: PERSONAL INFO */}
            {activeTab === 'personal' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                    <i className="fas fa-id-badge text-primary"></i> ข้อมูลส่วนบุคคลพื้นฐาน
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">คำนำหน้า (ไทย)</label>
                      <select 
                        name="titleTh" 
                        value={masterData.titles.find(t => t.name === formData?.titleTh || t.id?.toString() === formData?.titleTh?.toString())?.id?.toString() || formData?.titleTh || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="">-- เลือกคำนำหน้า --</option>
                        {masterData.titles.map(t => (
                          <option key={t.id} value={t.id.toString()}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">ชื่อ (ไทย)</label>
                      <input 
                        type="text" 
                        name="firstNameTh" 
                        value={formData?.firstNameTh || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">นามสกุล (ไทย)</label>
                      <input 
                        type="text" 
                        name="lastNameTh" 
                        value={formData?.lastNameTh || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                      />
                    </div>

                    <div>
                      <ThaiDatePicker
                        label="วัน/เดือน/ปี เกิด"
                        id="birthDate"
                        name="birthDate"
                        value={formData?.birthDate ? formData.birthDate.split('T')[0] : ''}
                        onChange={handleChange}
                        inputClassName="!py-2 !text-sm !rounded-lg"
                      />
                    </div>

                    <div>
                      <ThaiDatePicker
                        label="วันหมดอายุบัตรประชาชน"
                        id="idCardExpiry"
                        name="idCardExpiry"
                        value={formData?.idCardExpiry ? formData.idCardExpiry.split('T')[0] : ''}
                        onChange={handleChange}
                        inputClassName="!py-2 !text-sm !rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">เพศ</label>
                      <select 
                        name="genderId" 
                        value={formData?.genderId || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="">-- เลือกเพศ --</option>
                        {masterData.genders.map(g => (
                          <option key={g.id} value={g.id.toString()}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">ศาสนา</label>
                      <select 
                        name="religionId" 
                        value={formData?.religionId || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="">-- เลือกศาสนา --</option>
                        {masterData.religions.map(r => (
                          <option key={r.id} value={r.id.toString()}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">กรุ๊ปเลือด</label>
                      <select 
                        name="bloodGroupId" 
                        value={formData?.bloodGroupId || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="">-- เลือกกรุ๊ปเลือด --</option>
                        {masterData.bloods.map(b => (
                          <option key={b.id} value={b.id.toString()}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                    <i className="fas fa-phone-alt text-primary"></i> ข้อมูลการติดต่อและโซเชียล
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">เบอร์โทรศัพท์ (มือถือ)</label>
                      <input 
                        type="text" 
                        name="phoneOtp" 
                        value={formData?.phoneOtp || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">อีเมล (Email)</label>
                      <input 
                        type="email" 
                        name="emailAlt" 
                        value={formData?.emailAlt || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Line ID</label>
                      <input 
                        type="text" 
                        name="lineId" 
                        value={formData?.lineId || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Facebook</label>
                      <input 
                        type="text" 
                        name="facebook" 
                        value={formData?.facebook || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Instagram</label>
                      <input 
                        type="text" 
                        name="instagram" 
                        value={formData?.instagram || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">แพ้อาหาร / ข้อจำกัด</label>
                      <input 
                        type="text" 
                        name="foodAllergy" 
                        value={formData?.foodAllergy || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">โรคประจำตัว</label>
                      <input 
                        type="text" 
                        name="medicalCondition" 
                        value={formData?.medicalCondition || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">ผู้ติดต่อฉุกเฉิน (ชื่อ-สกุล)</label>
                      <input 
                        type="text" 
                        name="emergencyContactName" 
                        value={formData?.emergencyContactName || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">เบอร์ผู้ติดต่อฉุกเฉิน</label>
                      <input 
                        type="text" 
                        name="emergencyContactPhone" 
                        value={formData?.emergencyContactPhone || ''} 
                        onChange={handleChange} 
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ADDRESSES */}
            {activeTab === 'address' && (() => {
              const idxA = formData?.addresses?.findIndex(a => a.addressType === 'A') ?? -1;
              const idxC = formData?.addresses?.findIndex(a => a.addressType === 'C' || a.addressType === 'M') ?? -1;
              const actualIdxA = idxA !== -1 ? idxA : 0;
              const actualIdxC = idxC !== -1 ? idxC : 1;
              const addrA = formData?.addresses?.[actualIdxA] || {};
              const addrC = formData?.addresses?.[actualIdxC] || {};

              return (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* 1. ที่อยู่ตามทะเบียนบ้าน */}
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="font-bold text-gray-700 flex items-center gap-2">
                        <i className="fas fa-map-marker-alt text-primary"></i> ที่อยู่ตามทะเบียนบ้าน
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">บ้านเลขที่ <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          name="houseNo" 
                          value={addrA.houseNo || ''} 
                          onChange={(e) => handleArrayChange(e, 'addresses', actualIdxA)} 
                          className="w-full border rounded-lg p-2.5 text-sm" 
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">หมู่ที่</label>
                        <input 
                          type="text" 
                          name="moo" 
                          value={addrA.moo || ''} 
                          onChange={(e) => handleArrayChange(e, 'addresses', actualIdxA)} 
                          className="w-full border rounded-lg p-2.5 text-sm" 
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">หมู่บ้าน / อาคาร</label>
                        <input 
                          type="text" 
                          name="village" 
                          value={addrA.village || ''} 
                          onChange={(e) => handleArrayChange(e, 'addresses', actualIdxA)} 
                          className="w-full border rounded-lg p-2.5 text-sm" 
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">ซอย</label>
                        <input 
                          type="text" 
                          name="soi" 
                          value={addrA.soi || ''} 
                          onChange={(e) => handleArrayChange(e, 'addresses', actualIdxA)} 
                          className="w-full border rounded-lg p-2.5 text-sm" 
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">ถนน</label>
                        <input 
                          type="text" 
                          name="road" 
                          value={addrA.road || ''} 
                          onChange={(e) => handleArrayChange(e, 'addresses', actualIdxA)} 
                          className="w-full border rounded-lg p-2.5 text-sm" 
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">จังหวัด <span className="text-red-500">*</span></label>
                        <Select
                          options={masterData.provinces.map(p => ({ value: p.provinceId, label: p.provinceThai }))}
                          value={masterData.provinces.filter(p => p.provinceId === addrA.provinceId).map(p => ({ value: p.provinceId, label: p.provinceThai }))[0] || null}
                          onChange={(sel) => handleReactSelectChange(sel, null, 'addresses', actualIdxA, 'provinceId')}
                          placeholder="เลือกจังหวัด..."
                          isClearable
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">อำเภอ/เขต <span className="text-red-500">*</span></label>
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
                        <label className="block text-xs font-bold text-gray-600 mb-1">ตำบล/แขวง <span className="text-red-500">*</span></label>
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
                        <label className="block text-xs font-bold text-gray-600 mb-1">รหัสไปรษณีย์ <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          name="postcode" 
                          value={addrA.postcode || ''} 
                          onChange={(e) => handleArrayChange(e, 'addresses', actualIdxA)} 
                          className="w-full border rounded-lg p-2.5 text-sm font-mono" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. ที่อยู่สำหรับจัดส่งเอกสาร */}
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="font-bold text-gray-700 flex items-center gap-2">
                        <i className="fas fa-map-marker-alt text-primary"></i> ที่อยู่สำหรับจัดส่งเอกสาร
                      </h4>
                    </div>

                    {/* Radio selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${sameAddress ? 'border-primary bg-blue-50/50 text-primary ring-1 ring-primary/20 shadow-xs' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                        <input 
                          type="radio" 
                          name="traineeSameAddressChoice"
                          className="w-4 h-4 text-primary focus:ring-primary accent-primary"
                          checked={sameAddress}
                          onChange={() => handleSameAddressChange(true)}
                        />
                        <span className="font-bold text-sm">ใช้ที่อยู่เดียวกับที่อยู่ตามทะเบียนบ้าน</span>
                      </label>

                      <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${!sameAddress ? 'border-primary bg-blue-50/50 text-primary ring-1 ring-primary/20 shadow-xs' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                        <input 
                          type="radio" 
                          name="traineeSameAddressChoice"
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
                          <i className="fas fa-check-circle text-lg"></i>
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
                            <label className="block text-xs font-bold text-gray-600 mb-1">บ้านเลขที่ <span className="text-red-500">*</span></label>
                            <input 
                              type="text" 
                              name="houseNo" 
                              value={addrC.houseNo || ''} 
                              onChange={(e) => handleArrayChange(e, 'addresses', actualIdxC)} 
                              className="w-full border rounded-lg p-2.5 text-sm" 
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">หมู่ที่</label>
                            <input 
                              type="text" 
                              name="moo" 
                              value={addrC.moo || ''} 
                              onChange={(e) => handleArrayChange(e, 'addresses', actualIdxC)} 
                              className="w-full border rounded-lg p-2.5 text-sm" 
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">หมู่บ้าน / อาคาร</label>
                            <input 
                              type="text" 
                              name="village" 
                              value={addrC.village || ''} 
                              onChange={(e) => handleArrayChange(e, 'addresses', actualIdxC)} 
                              className="w-full border rounded-lg p-2.5 text-sm" 
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">ซอย</label>
                            <input 
                              type="text" 
                              name="soi" 
                              value={addrC.soi || ''} 
                              onChange={(e) => handleArrayChange(e, 'addresses', actualIdxC)} 
                              className="w-full border rounded-lg p-2.5 text-sm" 
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">ถนน</label>
                            <input 
                              type="text" 
                              name="road" 
                              value={addrC.road || ''} 
                              onChange={(e) => handleArrayChange(e, 'addresses', actualIdxC)} 
                              className="w-full border rounded-lg p-2.5 text-sm" 
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">จังหวัด <span className="text-red-500">*</span></label>
                            <Select
                              options={masterData.provinces.map(p => ({ value: p.provinceId, label: p.provinceThai }))}
                              value={masterData.provinces.filter(p => p.provinceId === addrC.provinceId).map(p => ({ value: p.provinceId, label: p.provinceThai }))[0] || null}
                              onChange={(sel) => handleReactSelectChange(sel, null, 'addresses', actualIdxC, 'provinceId')}
                              placeholder="เลือกจังหวัด..."
                              isClearable
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">อำเภอ/เขต <span className="text-red-500">*</span></label>
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
                            <label className="block text-xs font-bold text-gray-600 mb-1">ตำบล/แขวง <span className="text-red-500">*</span></label>
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
                            <label className="block text-xs font-bold text-gray-600 mb-1">รหัสไปรษณีย์ <span className="text-red-500">*</span></label>
                            <input 
                              type="text" 
                              name="postcode" 
                              value={addrC.postcode || ''} 
                              onChange={(e) => handleArrayChange(e, 'addresses', actualIdxC)} 
                              className="w-full border rounded-lg p-2.5 text-sm font-mono" 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* TAB 3: LICENSES & AFFILIATION */}
            {activeTab === 'license' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                    <i className="fas fa-certificate text-primary"></i> ข้อมูลใบอนุญาต
                  </h4>

                  {formData?.licenses.map((license, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">ประเภทใบอนุญาต</label>
                        <select 
                          name="courseType" 
                          value={license.courseType || 'agent'} 
                          onChange={(e) => handleArrayChange(e, 'licenses', index)} 
                          className="w-full border rounded-lg p-2.5 text-sm bg-white"
                        >
                          <option value="agent">ตัวแทนประกันวินาศภัย</option>
                          <option value="broker">นายหน้าประกันวินาศภัย</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">เลขที่ใบอนุญาต (10 หลัก)</label>
                        <input 
                          type="text" 
                          maxLength={10}
                          name="licenseNo" 
                          value={license.licenseNo || ''} 
                          onChange={(e) => handleArrayChange(e, 'licenses', index)} 
                          className="w-full border rounded-lg p-2.5 text-sm font-mono" 
                        />
                      </div>

                      <div>
                        <ThaiDatePicker
                          label="วันที่ออกใบอนุญาต"
                          id={`licenseIssueDate_${index}`}
                          name="licenseIssueDate"
                          value={license.licenseIssueDate ? license.licenseIssueDate.split('T')[0] : ''}
                          onChange={(e) => handleArrayChange(e, 'licenses', index)}
                          inputClassName="!py-2 !text-sm !rounded-lg"
                        />
                      </div>

                      <div>
                        <ThaiDatePicker
                          label="วันหมดอายุใบอนุญาต"
                          id={`licenseExpiryDate_${index}`}
                          name="licenseExpiryDate"
                          value={license.licenseExpiryDate ? license.licenseExpiryDate.split('T')[0] : ''}
                          onChange={(e) => handleArrayChange(e, 'licenses', index)}
                          inputClassName="!py-2 !text-sm !rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                    <i className="fas fa-building text-primary"></i> ข้อมูลสังกัดและสาขาวิริยะ
                  </h4>

                  {formData?.affiliations.map((affil, index) => {
                    const isBroker = formData?.licenses?.[0]?.courseType === 'broker' || formData?.licenses?.[0]?.courseType === 'นายหน้า' || formData?.licenses?.[0]?.courseType === 'นายหน้าประกันวินาศภัย';
                    return (
                      <div key={index} className="space-y-4">
                        <div className={`grid grid-cols-1 ${isBroker ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">สังกัดสาขาวิริยะ</label>
                            <Select
                              options={masterData.agentBranches.map(b => ({ value: b.branchId, label: b.branchName, regionId: b.regionId, regionName: b.regionName }))}
                              value={masterData.agentBranches.filter(b => b.branchId === affil.branchId).map(b => ({ value: b.branchId, label: b.branchName }))[0] || null}
                              onChange={(sel) => {
                                if (sel) {
                                  handleReactSelectChange(sel, null, 'affiliations', index, 'branchId');
                                  const eRegion = { target: { name: 'regionId', value: sel.regionId } };
                                  handleArrayChange(eRegion, 'affiliations', index);
                                } else {
                                  handleReactSelectChange(null, null, 'affiliations', index, 'branchId');
                                  const eRegion = { target: { name: 'regionId', value: null } };
                                  handleArrayChange(eRegion, 'affiliations', index);
                                }
                              }}
                              placeholder="ค้นหาสาขา..."
                              isClearable
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">ภาค</label>
                            <input 
                              type="text" 
                              value={masterData.agentBranches.find(b => b.branchId === affil.branchId)?.regionName || ''} 
                              className="w-full border rounded-lg p-2.5 text-sm bg-gray-100 text-gray-500" 
                              readOnly 
                            />
                          </div>

                          {isBroker && (
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">ประเภทนายหน้า (ถ้ามี)</label>
                              <select 
                                name="brokerType" 
                                value={affil.brokerType === 'corporate' ? 'corporate' : 'individual'} 
                                onChange={(e) => handleArrayChange(e, 'affiliations', index)} 
                                className="w-full border rounded-lg p-2.5 text-sm bg-white"
                              >
                                <option value="individual">นายหน้าบุคคลธรรมดา</option>
                                <option value="corporate">นายหน้านิติบุคคล</option>
                              </select>
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">รหัสตัวแทนวิริยะ (5 หลัก)</label>
                            <input 
                              type="text" 
                              maxLength={5}
                              name="viriyahAgentCode" 
                              value={affil.viriyahAgentCode || ''} 
                              onChange={(e) => handleArrayChange(e, 'affiliations', index)} 
                              className="w-full border rounded-lg p-2.5 text-sm font-mono" 
                            />
                          </div>
                        </div>

                        {isBroker && affil.brokerType === 'corporate' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl animate-in fade-in">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">ข้อมูลสังกัดบริษัทโบรกเกอร์</label>
                              <input 
                                type="text" 
                                name="brokerCompany" 
                                value={affil.brokerCompany || ''} 
                                onChange={(e) => handleArrayChange(e, 'affiliations', index)} 
                                placeholder="ระบุชื่อบริษัทโบรกเกอร์" 
                                className="w-full border rounded-lg p-2.5 text-sm bg-white" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">สาขาของบริษัทนายหน้าที่สังกัด</label>
                              <input 
                                type="text" 
                                name="brokerBranch" 
                                value={affil.brokerBranch || ''} 
                                onChange={(e) => handleArrayChange(e, 'affiliations', index)} 
                                placeholder="ระบุสาขา (ถ้ามี)" 
                                className="w-full border rounded-lg p-2.5 text-sm bg-white" 
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
            {activeTab === 'course' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                    <i className="fas fa-graduation-cap text-primary"></i> หลักสูตรที่ประสงค์เข้าอบรม
                  </h4>

                  {/* Level Radio List */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">ระดับคอร์สที่ต้องการอบรม</label>
                    <div className="flex flex-col gap-2">
                      {masterData?.courses?.filter(course => {
                        const licType = formData?.licenses?.[0]?.courseType;
                        const isBroker = (licType === 'broker' || licType === 'นายหน้า' || licType === 'นายหน้าประกันวินาศภัย');
                        const targetAgentType = isBroker ? 'broker' : 'agent';
                        return !course.agentType || course.agentType === targetAgentType || course.agentType === 'all';
                      }).map((course, idx) => (
                        <label key={idx} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          currentCourseType === course.id ? 'border-primary bg-blue-50/40 text-primary font-bold' : 'hover:bg-gray-50 text-gray-700'
                        }`}>
                          <input
                            type="radio"
                            name="courseType"
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
                          checked={formData.courses?.[0]?.courseDateId === selectedCourseObj.dateId} 
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
                            const isChecked = formData.trainings?.some(t => t.courseId?.toString() === course.id.toString());
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
                            const isChecked = formData.courses?.some(c => c.renewOtherId === otherCourse.id);
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
                                name="deductionPrivilege"
                                className="w-4 h-4 accent-primary"
                                value="MasterDegree"
                                checked={(formData.registrations?.[0]?.DeductionPrivilege || formData.registrations?.[0]?.deductionPrivilege || '').includes('MasterDegree')}
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
                                name="deductionPrivilege"
                                className="w-4 h-4 accent-primary"
                                value="None"
                                checked={!(formData.registrations?.[0]?.DeductionPrivilege || formData.registrations?.[0]?.deductionPrivilege || '').includes('MasterDegree')}
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

                          {(formData.registrations?.[0]?.DeductionPrivilege || formData.registrations?.[0]?.deductionPrivilege || '').includes('MasterDegree') && (
                            <div className="pt-3 border-t space-y-2">
                              <label className="block text-xs font-bold text-gray-600">สถานะการยื่นเอกสารลดหย่อน</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="masterDegreeStatus"
                                    className="w-4 h-4 accent-primary" 
                                    value="เคยยื่นเอกสาร" 
                                    checked={(formData.registrations?.[0]?.MasterDegreeStatus || formData.registrations?.[0]?.masterDegreeStatus) === "เคยยื่นเอกสาร"} 
                                    onChange={(e) => handleRegistrationChange(e, 'MasterDegreeStatus')}
                                  />
                                  <span>เคยยื่นเอกสาร</span>
                                </label>

                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="masterDegreeStatus"
                                    className="w-4 h-4 accent-primary" 
                                    value="ไม่เคยยื่นเอกสาร" 
                                    checked={(formData.registrations?.[0]?.MasterDegreeStatus || formData.registrations?.[0]?.masterDegreeStatus) === "ไม่เคยยื่นเอกสาร"} 
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
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                    <i className="fas fa-briefcase text-primary"></i> ข้อมูลธุรกิจและประสบการณ์
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">ธุรกิจอื่นที่ท่านทำ (ระบุประเภทธุรกิจ)</label>
                      <input 
                        type="text" 
                        value={formData?.others?.[0]?.otherBusiness || ''} 
                        onChange={(e) => handleOtherChange(e, 'otherBusiness')} 
                        className="w-full border rounded-lg p-2.5 text-sm" 
                        placeholder="กรุณาระบุ..." 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">ประสบการณ์ในธุรกิจประกันภัย (ปี)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formData?.others?.[0]?.insuranceExperienceYears || ''} 
                        onChange={(e) => handleOtherChange(e, 'insuranceExperienceYears')} 
                        className="w-full border rounded-lg p-2.5 text-sm" 
                        placeholder="จำนวนปี เช่น 3" 
                      />
                    </div>
                  </div>

                  {/* Territories */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-gray-600 mb-2">เขตพื้นที่ขาย</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {(Array.isArray(masterData?.territories) ? masterData.territories : []).map((territory, idx) => {
                        const checked = formData?.others?.[0]?.salesAreas?.some(sa => sa.territoriesId?.toString() === territory.id.toString());
                        return (
                          <label key={idx} className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer text-xs">
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
                        const checked = formData?.others?.[0]?.specialties?.some(sp => sp.expertiseId?.toString() === specialty.id.toString());
                        return (
                          <label key={idx} className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer text-xs">
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
                        const checked = formData?.others?.[0]?.otherCompanies?.some(oc => oc.companyId?.toString() === company.id.toString());
                        return (
                          <label key={idx} className="flex items-center gap-2 p-2 bg-white border rounded-lg hover:bg-gray-100 cursor-pointer text-xs">
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

          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-all"
          >
            ยกเลิก
          </button>
          <button 
            type="submit" 
            form="editPersonForm" 
            disabled={saving} 
            className="px-6 py-2.5 bg-primary hover:bg-[#002882] text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
            {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล (Update Current)'}
          </button>
        </div>

      </div>
    </div>
  );
}
