import { API_BASE_URL, API_ORIGIN } from '../config/api';
import React, { useState, useMemo } from 'react';
import { 
  User, Phone, Home, Mail, Building, Award, Briefcase, 
  GraduationCap, AlertCircle, Search, FileText, Code
} from 'lucide-react';

// Decode unicode escape sequences (e.g. \u0e41\u0e1e\u0e49 -> แพ้)
export function decodeUnicode(str) {
  if (typeof str !== 'string') return str;
  try {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => 
      String.fromCharCode(parseInt(code, 16))
    );
  } catch {
    return str;
  }
}

// Safely parse JSON strings (handling double serialization & unicode decoding)
export function parseSnapshot(data) {
  if (!data) return {};
  if (typeof data === 'object') return data;
  try {
    let unescaped = decodeUnicode(data);
    let parsed = JSON.parse(unescaped);
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    try {
      return JSON.parse(data);
    } catch {
      return { raw: data };
    }
  }
}

// Format Date to Thai readable string
export function formatThaiDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear() + 543; // Buddhist Era
  return `${day}/${month}/${year}`;
}

// Field Definitions with Category and Converter
export const FIELD_DEFINITIONS = [
  // 👤 ข้อมูลส่วนบุคคล
  { key: 'TitleTh', aliases: ['titleTh'], label: 'คำนำหน้าชื่อ (ไทย)', category: 'personal', type: 'master_title' },
  { key: 'FirstNameTh', aliases: ['firstNameTh'], label: 'ชื่อ (ไทย)', category: 'personal' },
  { key: 'MiddleNameTh', aliases: ['middleNameTh'], label: 'ชื่อกลาง (ไทย)', category: 'personal' },
  { key: 'LastNameTh', aliases: ['lastNameTh'], label: 'นามสกุล (ไทย)', category: 'personal' },
  { key: 'TitleOldTh', aliases: ['titleOldTh'], label: 'คำนำหน้าชื่อเดิม', category: 'personal', type: 'master_title' },
  { key: 'FirstNameOldTh', aliases: ['firstNameOldTh'], label: 'ชื่อเดิม', category: 'personal' },
  { key: 'MiddleNameOldTh', aliases: ['middleNameOldTh'], label: 'ชื่อกลางเดิม', category: 'personal' },
  { key: 'LastNameOldTh', aliases: ['lastNameOldTh'], label: 'นามสกุลเดิม', category: 'personal' },
  { key: 'BirthDate', aliases: ['birthDate'], label: 'วัน/เดือน/ปีเกิด', category: 'personal', type: 'date' },
  { key: 'IdCardExpiry', aliases: ['idCardExpiry'], label: 'วันหมดอายุบัตรประชาชน', category: 'personal', type: 'date' },
  { key: 'GenderId', aliases: ['genderId'], label: 'เพศ', category: 'personal', type: 'master_gender' },
  { key: 'ReligionId', aliases: ['religionId'], label: 'ศาสนา', category: 'personal', type: 'master_religion' },
  { key: 'BloodGroupId', aliases: ['bloodGroupId'], label: 'หมู่เลือด', category: 'personal', type: 'master_blood' },
  { key: 'FoodAllergy', aliases: ['foodAllergy'], label: 'อาหารที่แพ้', category: 'personal' },
  { key: 'MedicalCondition', aliases: ['medicalCondition'], label: 'โรคประจำตัว', category: 'personal' },

  // 📞 ข้อมูลการติดต่อ
  { key: 'PhoneOtp', aliases: ['phone', 'phoneOtp'], label: 'เบอร์โทรศัพท์มือถือ', category: 'contact' },
  { key: 'EmailAlt', aliases: ['email', 'emailAlt'], label: 'อีเมล', category: 'contact' },
  { key: 'LineId', aliases: ['lineId'], label: 'Line ID', category: 'contact' },
  { key: 'Facebook', aliases: ['facebook'], label: 'Facebook', category: 'contact' },
  { key: 'Instagram', aliases: ['instagram'], label: 'Instagram', category: 'contact' },
  { key: 'EmergencyContactName', aliases: ['emergencyContactName'], label: 'ชื่อบุคคลติดต่อฉุกเฉิน', category: 'contact' },
  { key: 'EmergencyContactPhone', aliases: ['emergencyContactPhone'], label: 'เบอร์ติดต่อฉุกเฉิน', category: 'contact' },

  // 🏠 ที่อยู่ตามทะเบียนบ้าน
  { key: 'HouseNo', aliases: ['houseNo'], label: 'บ้านเลขที่ (ตามทะเบียนบ้าน)', category: 'address_registered' },
  { key: 'Moo', aliases: ['moo'], label: 'หมู่ที่ (ตามทะเบียนบ้าน)', category: 'address_registered' },
  { key: 'Village', aliases: ['village'], label: 'หมู่บ้าน/อาคาร (ตามทะเบียนบ้าน)', category: 'address_registered' },
  { key: 'Soi', aliases: ['soi'], label: 'ซอย (ตามทะเบียนบ้าน)', category: 'address_registered' },
  { key: 'Road', aliases: ['road'], label: 'ถนน (ตามทะเบียนบ้าน)', category: 'address_registered' },
  { key: 'SubDistrictId', aliases: ['subDistrictId'], label: 'ตำบล/แขวง (ตามทะเบียนบ้าน)', category: 'address_registered', type: 'master_subdistrict' },
  { key: 'DistrictId', aliases: ['districtId'], label: 'อำเภอ/เขต (ตามทะเบียนบ้าน)', category: 'address_registered', type: 'master_district' },
  { key: 'ProvinceId', aliases: ['provinceId'], label: 'จังหวัด (ตามทะเบียนบ้าน)', category: 'address_registered', type: 'master_province' },
  { key: 'Postcode', aliases: ['postcode'], label: 'รหัสไปรษณีย์ (ตามทะเบียนบ้าน)', category: 'address_registered' },

  // 📬 ที่อยู่สำหรับติดต่อ
  { key: 'ContactHouseNo', aliases: ['contactHouseNo'], label: 'บ้านเลขที่ (ที่อยู่ติดต่อ)', category: 'address_contact' },
  { key: 'ContactMoo', aliases: ['contactMoo'], label: 'หมู่ที่ (ที่อยู่ติดต่อ)', category: 'address_contact' },
  { key: 'ContactVillage', aliases: ['contactVillage'], label: 'หมู่บ้าน/อาคาร (ที่อยู่ติดต่อ)', category: 'address_contact' },
  { key: 'ContactSoi', aliases: ['contactSoi'], label: 'ซอย (ที่อยู่ติดต่อ)', category: 'address_contact' },
  { key: 'ContactRoad', aliases: ['contactRoad'], label: 'ถนน (ที่อยู่ติดต่อ)', category: 'address_contact' },
  { key: 'ContactSubDistrictId', aliases: ['contactSubDistrictId'], label: 'ตำบล/แขวง (ที่อยู่ติดต่อ)', category: 'address_contact', type: 'master_subdistrict' },
  { key: 'ContactDistrictId', aliases: ['contactDistrictId'], label: 'อำเภอ/เขต (ที่อยู่ติดต่อ)', category: 'address_contact', type: 'master_district' },
  { key: 'ContactProvinceId', aliases: ['contactProvinceId'], label: 'จังหวัด (ที่อยู่ติดต่อ)', category: 'address_contact', type: 'master_province' },
  { key: 'ContactPostcode', aliases: ['contactPostcode'], label: 'รหัสไปรษณีย์ (ที่อยู่ติดต่อ)', category: 'address_contact' },

  // 🏢 ข้อมูลสังกัด / ตัวแทน
  { key: 'AgentBranch', aliases: ['agentBranch', 'branchId'], label: 'สาขาตัวแทน (วิริยะ)', category: 'affiliation', type: 'master_branch' },
  { key: 'BrokerType', aliases: ['brokerType'], label: 'ประเภทนายหน้า', category: 'affiliation', type: 'enum_broker_type' },
  { key: 'BrokerCompany', aliases: ['brokerCompany'], label: 'ชื่อบริษัทนายหน้า', category: 'affiliation' },
  { key: 'BrokerBranch', aliases: ['brokerBranch'], label: 'สาขาบริษัทนายหน้า', category: 'affiliation' },
  { key: 'viriyahAgentCode', aliases: ['ViriyahAgentCode'], label: 'รหัสตัวแทนวิริยะ', category: 'affiliation' },

  // 📜 ข้อมูลใบอนุญาต & การอบรม
  { key: 'AgentType', aliases: ['agentType'], label: 'ประเภทตัวแทน/นายหน้า', category: 'course', type: 'enum_agent_type' },
  { key: 'LicenseNo', aliases: ['licenseNo'], label: 'เลขที่ใบอนุญาต', category: 'course' },
  { key: 'LicenseIssueDate', aliases: ['licenseIssueDate'], label: 'วันที่ออกใบอนุญาต', category: 'course', type: 'date' },
  { key: 'LicenseExpiryDate', aliases: ['licenseExpiryDate'], label: 'วันที่ใบอนุญาตหมดอายุ', category: 'course', type: 'date' },
  { key: 'CourseType', aliases: ['courseType', 'courseId', 'CourseId'], label: 'หลักสูตรที่สมัคร/อบรม', category: 'course', type: 'master_course' },
  { key: 'CourseDateId', aliases: ['courseDateId'], label: 'รอบวันที่อบรม (รหัส)', category: 'course' },
  { key: 'PreviousCourses', aliases: ['previousCourses'], label: 'หลักสูตรต่ออายุที่เคยผ่าน', category: 'course', type: 'master_courses_multi' },
  { key: 'SelectedSubjects', aliases: ['selectedSubjects'], label: 'วิชาเลือกที่ลงทะเบียน', category: 'course', type: 'master_subjects_multi' },

  // 💼 ข้อมูลอื่นๆ
  { key: 'SalesArea', aliases: ['salesArea'], label: 'พื้นที่ขายหลัก', category: 'other', type: 'master_territories_multi' },
  { key: 'InsuranceSpecialty', aliases: ['insuranceSpecialty'], label: 'ความเชี่ยวชาญด้านประกัน', category: 'other', type: 'master_expertises_multi' },
  { key: 'OtherInsuranceCompanies', aliases: ['otherInsuranceCompanies'], label: 'บริษัทประกันภัยอื่นที่สังกัด', category: 'other', type: 'master_companies_multi' },
  { key: 'MainBusiness', aliases: ['mainBusiness'], label: 'อาชีพหลัก/ธุรกิจอื่น', category: 'other' },
  { key: 'InsuranceExperienceYears', aliases: ['insuranceExperienceYears'], label: 'ประสบการณ์ในธุรกิจประกัน (ปี)', category: 'other' },

  // 🎓 สิทธิลดหย่อน & คุณวุฒิ
  { key: 'DeductionPrivilege', aliases: ['deductionPrivilege'], label: 'สิทธิลดหย่อนชั่วโมงอบรม', category: 'privilege', type: 'enum_deduction' },
  { key: 'MasterDegreeStatus', aliases: ['masterDegreeStatus'], label: 'คุณวุฒิปริญญาโทขึ้นไป', category: 'privilege', type: 'enum_degree' },
  { key: 'Action', aliases: ['action'], label: 'บันทึกการดำเนินการ', category: 'privilege' }
];

export const CATEGORY_INFO = {
  personal: { title: 'ข้อมูลส่วนบุคคล', icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
  contact: { title: 'ข้อมูลการติดต่อ & โซเชียล', icon: Phone, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  address_registered: { title: 'ที่อยู่ตามทะเบียนบ้าน', icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  address_contact: { title: 'ที่อยู่สำหรับติดต่อ', icon: Mail, color: 'text-violet-600', bg: 'bg-violet-50' },
  affiliation: { title: 'ข้อมูลสังกัด / ตัวแทน / นายหน้า', icon: Building, color: 'text-amber-600', bg: 'bg-amber-50' },
  course: { title: 'ข้อมูลหลักสูตร & ใบอนุญาต', icon: Award, color: 'text-rose-600', bg: 'bg-rose-50' },
  other: { title: 'ข้อมูลพื้นที่ขายและความเชี่ยวชาญ', icon: Briefcase, color: 'text-teal-600', bg: 'bg-teal-50' },
  privilege: { title: 'สิทธิลดหย่อน & คุณวุฒิ', icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' }
};

// Convert value to readable Thai string using masterData
export function resolveValueLabel(val, fieldDef, masterData = {}) {
  if (val === null || val === undefined || val === '') return '-';

  const type = fieldDef?.type;
  const strVal = String(val).trim();

  // 1. Date
  if (type === 'date') {
    return formatThaiDate(strVal);
  }

  // 2. Titles
  if (type === 'master_title') {
    const found = masterData.titles?.find(t => String(t.id) === strVal || t.name === strVal);
    return found ? found.name : strVal;
  }

  // 3. Gender
  if (type === 'master_gender') {
    const found = masterData.genders?.find(g => String(g.id) === strVal || g.name === strVal);
    if (found) return found.name;
    if (strVal === '1') return 'ชาย';
    if (strVal === '2') return 'หญิง';
    return strVal;
  }

  // 4. Religion
  if (type === 'master_religion') {
    const found = masterData.religions?.find(r => String(r.id) === strVal || r.name === strVal);
    return found ? found.name : strVal;
  }

  // 5. Blood Group
  if (type === 'master_blood') {
    const found = masterData.bloods?.find(b => String(b.id) === strVal || b.name === strVal);
    return found ? found.name : strVal;
  }

  // 6. Province
  if (type === 'master_province') {
    const found = masterData.provinces?.find(p => String(p.provinceId || p.id) === strVal || p.provinceThai === strVal);
    return found ? found.provinceThai : strVal;
  }

  // 7. District
  if (type === 'master_district') {
    const found = masterData.districts?.find(d => String(d.districtId || d.id) === strVal || d.districtThai === strVal);
    return found ? found.districtThai : strVal;
  }

  // 8. SubDistrict
  if (type === 'master_subdistrict') {
    const found = masterData.subDistricts?.find(s => String(s.subDistrictId || s.id) === strVal || s.subDistrictThai === strVal);
    return found ? found.subDistrictThai : strVal;
  }

  // 9. Agent Branch
  if (type === 'master_branch') {
    const found = masterData.agentBranches?.find(b => String(b.branchId || b.id) === strVal || b.branchName === strVal);
    return found ? found.branchName : strVal;
  }

  // 10. Course
  if (type === 'master_course') {
    const inCourses = masterData.courses?.find(c => String(c.id || c.courseId) === strVal || c.courseName === strVal);
    if (inCourses) return inCourses.courseName || inCourses.name;
    const inRenew = masterData.renewCourseCheckboxes?.find(c => String(c.id || c.courseId) === strVal || c.name === strVal);
    if (inRenew) return inRenew.name;
    const inOther = masterData.renewOtherOptions?.find(c => String(c.id) === strVal);
    if (inOther) return inOther.displayName || inOther.subjectName;
    return strVal;
  }

  // 11. Multi Courses
  if (type === 'master_courses_multi') {
    const ids = strVal.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return '-';
    const names = ids.map(id => {
      const found = masterData.renewCourseCheckboxes?.find(c => String(c.id) === id || c.name === id)
        || masterData.courses?.find(c => String(c.id) === id || c.courseName === id);
      return found ? (found.name || found.courseName) : id;
    });
    return names.join(', ');
  }

  // 12. Multi Subjects
  if (type === 'master_subjects_multi') {
    const ids = strVal.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return '-';
    const names = ids.map(id => {
      const found = masterData.renewOtherOptions?.find(o => String(o.id) === id)
        || masterData.renewCourseCheckboxes?.find(c => String(c.id) === id);
      return found ? (found.displayName || found.subjectName || found.name) : id;
    });
    return names.join('; ');
  }

  // 13. Territories Multi
  if (type === 'master_territories_multi') {
    const ids = strVal.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return '-';
    const names = ids.map(id => {
      const found = masterData.territories?.find(t => String(t.id) === id || t.name === id);
      return found ? found.name : id;
    });
    return names.join(', ');
  }

  // 14. Expertises Multi
  if (type === 'master_expertises_multi') {
    const ids = strVal.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return '-';
    const names = ids.map(id => {
      const found = masterData.expertises?.find(e => String(e.id) === id || e.name === id);
      return found ? found.name : id;
    });
    return names.join(', ');
  }

  // 15. Companies Multi
  if (type === 'master_companies_multi') {
    const ids = strVal.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return '-';
    const names = ids.map(id => {
      const found = masterData.companies?.find(c => String(c.id) === id || c.name === id);
      return found ? found.name : id;
    });
    return names.join(', ');
  }

  // 16. Enums
  if (type === 'enum_agent_type') {
    if (strVal.toLowerCase() === 'agent') return 'ตัวแทนประกันชีวิต';
    if (strVal.toLowerCase() === 'broker') return 'นายหน้าประกันชีวิต';
    return strVal;
  }

  if (type === 'enum_broker_type') {
    if (strVal.toLowerCase() === 'individual') return 'บุคคลธรรมดา';
    if (strVal.toLowerCase() === 'juristic') return 'นิติบุคคล';
    return strVal;
  }

  if (type === 'enum_deduction') {
    if (['used', 'yes', 'true'].includes(strVal.toLowerCase())) return 'ใช้สิทธิ์ลดหย่อนชั่วโมงอบรม';
    if (['not_used', 'no', 'false'].includes(strVal.toLowerCase())) return 'ไม่ใช้สิทธิ์ลดหย่อน';
    return strVal;
  }

  if (type === 'enum_degree') {
    if (['has_degree', 'yes', 'true'].includes(strVal.toLowerCase())) return 'มีคุณวุฒิปริญญาโทขึ้นไป';
    if (['no_degree', 'no', 'false'].includes(strVal.toLowerCase())) return 'ไม่มีคุณวุฒิปริญญาโทขึ้นไป';
    return strVal;
  }

  // Fallback string decode
  return decodeUnicode(strVal);
}

// Global MasterData Cache
let globalMasterDataCache = null;

// Main Component
export default function HistorySnapshotViewer({ 
  oldData, 
  newData, 
  masterData = {}, 
  title = "รายละเอียดการบันทึก & เปลี่ยนแปลงข้อมูล",
  className = "" 
}) {
  const [viewMode, setViewMode] = useState('diff'); // 'diff' | 'all' | 'raw'
  const [searchQuery, setSearchQuery] = useState('');
  const [internalMaster, setInternalMaster] = useState(() => globalMasterDataCache || {});

  // Automatically fetch master data if not provided
  React.useEffect(() => {
    if (masterData && Object.keys(masterData).length > 3) {
      setInternalMaster(masterData);
      return;
    }

    if (globalMasterDataCache) {
      setInternalMaster(globalMasterDataCache);
      return;
    }

    const safeFetch = (url) => 
      fetch(url).then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) ? d : []).catch(() => []);

    Promise.all([
      safeFetch(`${API_BASE_URL}/masterdata/titles`),
      safeFetch(`${API_BASE_URL}/masterdata/religion`),
      safeFetch(`${API_BASE_URL}/masterdata/gender`),
      safeFetch(`${API_BASE_URL}/masterdata/blood`),
      safeFetch(`${API_BASE_URL}/masterdata/provinces`),
      safeFetch(`${API_BASE_URL}/masterdata/agent-branches`),
      safeFetch(`${API_BASE_URL}/masterdata/renew-courses`),
      safeFetch(`${API_BASE_URL}/masterdata/territories`),
      safeFetch(`${API_BASE_URL}/masterdata/expertises`),
      safeFetch(`${API_BASE_URL}/masterdata/companies`),
      safeFetch(`${API_BASE_URL}/masterdata/renewcourse`),
      safeFetch(`${API_BASE_URL}/masterdata/renew-other-courses`),
      safeFetch(`${API_BASE_URL}/masterdata/districts`),
      safeFetch(`${API_BASE_URL}/masterdata/subdistricts`)
    ]).then(([
      titles, religions, genders, bloods, provinces, agentBranches,
      courses, territories, expertises, companies, renewCourseCheckboxes, 
      renewOtherOptions, districts, subDistricts
    ]) => {
      const merged = {
        titles, religions, genders, bloods, provinces, agentBranches,
        courses, territories, expertises, companies, renewCourseCheckboxes,
        renewOtherOptions, districts, subDistricts, ...masterData
      };
      globalMasterDataCache = merged;
      setInternalMaster(merged);
    }).catch(err => {
      console.warn('HistorySnapshotViewer: error fetching master data', err);
    });
  }, [masterData]);

  // Combined masterData
  const activeMasterData = useMemo(() => ({
    ...internalMaster,
    ...masterData
  }), [internalMaster, masterData]);

  // Parse snapshots
  const parsedOld = useMemo(() => parseSnapshot(oldData), [oldData]);
  const parsedNew = useMemo(() => parseSnapshot(newData), [newData]);

  // Extract value by key or aliases
  const extractVal = (obj, def) => {
    if (!obj || typeof obj !== 'object') return undefined;
    if (obj[def.key] !== undefined) return obj[def.key];
    if (def.aliases) {
      for (const alias of def.aliases) {
        if (obj[alias] !== undefined) return obj[alias];
      }
    }
    return undefined;
  };

  // Build processed comparison items
  const processedItems = useMemo(() => {
    const items = [];
    const matchedKeys = new Set();

    FIELD_DEFINITIONS.forEach(def => {
      const rawOld = extractVal(parsedOld, def);
      const rawNew = extractVal(parsedNew, def);

      matchedKeys.add(def.key);
      if (def.aliases) def.aliases.forEach(a => matchedKeys.add(a));

      const oldLabel = resolveValueLabel(rawOld, def, activeMasterData);
      const newLabel = resolveValueLabel(rawNew, def, activeMasterData);

      const hasOld = rawOld !== undefined && rawOld !== null && rawOld !== '';
      const hasNew = rawNew !== undefined && rawNew !== null && rawNew !== '';

      if (!hasOld && !hasNew) return; // Skip completely empty fields

      const isChanged = oldLabel !== newLabel && (hasOld || hasNew);

      items.push({
        key: def.key,
        label: def.label,
        category: def.category,
        rawOld,
        rawNew,
        oldLabel,
        newLabel,
        isChanged,
        isNew: !hasOld && hasNew,
        isDeleted: hasOld && !hasNew
      });
    });

    // Check for any extra custom keys
    const allKeys = new Set([...Object.keys(parsedOld), ...Object.keys(parsedNew)]);
    allKeys.forEach(k => {
      if (!matchedKeys.has(k) && !matchedKeys.has(k.toLowerCase()) && !matchedKeys.has(k.charAt(0).toUpperCase() + k.slice(1))) {
        const rawOld = parsedOld[k];
        const rawNew = parsedNew[k];
        const oldLabel = decodeUnicode(typeof rawOld === 'object' ? JSON.stringify(rawOld) : String(rawOld ?? '-'));
        const newLabel = decodeUnicode(typeof rawNew === 'object' ? JSON.stringify(rawNew) : String(rawNew ?? '-'));
        if (oldLabel === '-' && newLabel === '-') return;

        items.push({
          key: k,
          label: k,
          category: 'other',
          rawOld,
          rawNew,
          oldLabel,
          newLabel,
          isChanged: oldLabel !== newLabel,
          isNew: rawOld === undefined && rawNew !== undefined,
          isDeleted: rawOld !== undefined && rawNew === undefined
        });
      }
    });

    return items;
  }, [parsedOld, parsedNew, activeMasterData]);

  // Changed items count
  const changedCount = useMemo(() => {
    return processedItems.filter(i => i.isChanged).length;
  }, [processedItems]);

  // Filtered items based on viewMode and search
  const filteredItems = useMemo(() => {
    return processedItems.filter(item => {
      // View mode filter
      if (viewMode === 'diff' && changedCount > 0 && !item.isChanged) return false;
      
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inLabel = item.label.toLowerCase().includes(q);
        const inOld = String(item.oldLabel).toLowerCase().includes(q);
        const inNew = String(item.newLabel).toLowerCase().includes(q);
        return inLabel || inOld || inNew;
      }

      return true;
    });
  }, [processedItems, viewMode, changedCount, searchQuery]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = {};
    filteredItems.forEach(item => {
      const cat = item.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredItems]);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col ${className}`}>
      {/* Header bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
          {changedCount > 0 ? (
            <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              มีการเปลี่ยนแปลง {changedCount} รายการ
            </span>
          ) : (
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              ข้อมูลปัจจุบัน (Snapshot)
            </span>
          )}
        </div>

        {/* Action Toggles */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('diff')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'diff' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เฉพาะที่แก้ไข ({changedCount})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'all' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แสดงทั้งหมด ({processedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                viewMode === 'raw' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Search Input for Non-Raw mode */}
      {viewMode !== 'raw' && (
        <div className="px-4 py-2 border-b border-slate-100 bg-white flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาข้อมูล หรือหัวข้อ..."
            className="w-full text-xs text-slate-700 bg-transparent focus:outline-none placeholder-slate-400"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1"
            >
              ล้าง
            </button>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="p-4 overflow-y-auto max-h-[550px] space-y-4">
        {viewMode === 'raw' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="bg-slate-900 rounded-xl p-3 text-slate-200">
              <div className="text-amber-400 font-bold mb-2 pb-1 border-b border-slate-800 flex items-center justify-between">
                <span>Old Data (ก่อนแก้)</span>
                <span className="text-[10px] text-slate-500 font-normal">Decoded JSON</span>
              </div>
              <pre className="text-[11px] whitespace-pre-wrap overflow-x-auto text-amber-200/80">
                {JSON.stringify(parsedOld, null, 2)}
              </pre>
            </div>
            <div className="bg-slate-900 rounded-xl p-3 text-slate-200">
              <div className="text-emerald-400 font-bold mb-2 pb-1 border-b border-slate-800 flex items-center justify-between">
                <span>New Data (หลังแก้)</span>
                <span className="text-[10px] text-slate-500 font-normal">Decoded JSON</span>
              </div>
              <pre className="text-[11px] whitespace-pre-wrap overflow-x-auto text-emerald-200/80">
                {JSON.stringify(parsedNew, null, 2)}
              </pre>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            {viewMode === 'diff' 
              ? 'ไม่พบข้อมูลที่มีการเปลี่ยนแปลง (ข้อมูลก่อนแก้และหลังแก้ตรงกัน)' 
              : 'ไม่พบข้อมูลที่ตรงกับการค้นหา'}
          </div>
        ) : (
          Object.keys(groupedItems).map(catKey => {
            const catInfo = CATEGORY_INFO[catKey] || { title: catKey, icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50' };
            const Icon = catInfo.icon;
            const items = groupedItems[catKey];

            return (
              <div key={catKey} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                {/* Category Header */}
                <div className={`px-4 py-2.5 ${catInfo.bg} border-b border-slate-200 flex items-center gap-2 font-bold text-xs ${catInfo.color}`}>
                  <Icon className="w-4 h-4" />
                  <span>{catInfo.title}</span>
                  <span className="ml-auto bg-white/80 px-2 py-0.5 rounded-full text-[10px] text-slate-600 font-semibold border border-slate-200/50">
                    {items.length} รายการ
                  </span>
                </div>

                {/* Items Table / Cards */}
                <div className="divide-y divide-slate-100">
                  {items.map(item => (
                    <div 
                      key={item.key} 
                      className={`p-3 text-xs transition-colors flex flex-col md:flex-row md:items-center justify-between gap-2 ${
                        item.isChanged ? 'bg-amber-50/40 hover:bg-amber-50/80' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Field Label */}
                      <div className="md:w-1/3 flex items-center gap-1.5 font-semibold text-slate-700">
                        {item.isChanged ? (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="มีการเปลี่ยนแปลง" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                        )}
                        <span>{item.label}</span>
                      </div>

                      {/* Values Comparison */}
                      <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {/* Old Value */}
                        <div className="bg-red-50/70 border border-red-100/80 rounded-lg p-2 text-slate-700">
                          <div className="text-[10px] font-bold text-red-600 mb-0.5">ก่อนแก้ (Old):</div>
                          <div className="font-medium break-words text-slate-800">
                            {item.oldLabel || '-'}
                          </div>
                        </div>

                        {/* New Value */}
                        <div className={`rounded-lg p-2 border ${
                          item.isChanged 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-bold' 
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <div className="text-[10px] font-bold text-emerald-600 mb-0.5 flex items-center justify-between">
                            <span>หลังแก้ (New):</span>
                            {item.isChanged && (
                              <span className="text-[9px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-extrabold uppercase">
                                CHANGED
                              </span>
                            )}
                          </div>
                          <div className="break-words">
                            {item.newLabel || '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
