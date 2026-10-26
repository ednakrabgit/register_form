import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';



export default function ExportDataReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [idRanges, setIdRanges] = useState('');

  const [searchResults, setSearchResults] = useState([]);
  const [selectedPersons, setSelectedPersons] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [courses, setCourses] = useState([]);
  const [groupedCourses, setGroupedCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState({});

  const [exportType, setExportType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [courseTypeFilter, setCourseTypeFilter] = useState('ทั้งหมด');

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/masterdata/renew-courses?all=true`).then(res => res.json()),
      fetch(`${API_BASE_URL}/masterdata/renew-other-courses?all=true`).then(res => res.json())
    ])
      .then(([coursesData, otherCoursesData]) => {
        const groups = {};
        coursesData.forEach(item => {
          if (!groups[item.courseName]) {
            groups[item.courseName] = {
              courseId: item.id,
              courseName: item.courseName,
              dates: []
            };
          }
          if (item.dateId && item.dateDisplay) {
            if (!groups[item.courseName].dates.find(d => d.dateId === item.dateId)) {
              groups[item.courseName].dates.push({ dateId: item.dateId, display: item.dateDisplay });
            }
          }
        });

        const tor4Name = "ขอต่อใบอนุญาตเป็นตัวแทน/นายหน้าประกันวินาศภัย 4 เป็นต้นไป";
        if (groups[tor4Name]) {
          groups[tor4Name].dates = otherCoursesData.map(o => ({ dateId: o.id, display: o.displayName }));
        }

        setGroupedCourses(Object.values(groups));
      })
      .catch(err => console.error('Failed to fetch courses:', err));
  }, []);

  const handleCourseCheck = (courseId, checked) => {
    if (checked) {
      const course = groupedCourses.find(c => c.courseId === courseId);
      setSelectedCourses(prev => ({
        ...prev,
        [courseId]: course.dates.map(d => d.dateId)
      }));
    } else {
      const newSelected = { ...selectedCourses };
      delete newSelected[courseId];
      setSelectedCourses(newSelected);
    }
  };

  const handleDateCheck = (courseId, dateId, checked) => {
    setSelectedCourses(prev => {
      const courseDates = prev[courseId] || [];
      if (checked) {
        return { ...prev, [courseId]: [...courseDates, dateId] };
      } else {
        const newDates = courseDates.filter(d => d !== dateId);
        if (newDates.length === 0) {
          const newSelected = { ...prev };
          delete newSelected[courseId];
          return newSelected;
        }
        return { ...prev, [courseId]: newDates };
      }
    });
  };

  const toggleCourseExpand = (courseId) => {
    setExpandedCourses(prev => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  const formatDateToDDMMYYYY = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const parts = str.substring(0, 10).split('-');
      const y = parseInt(parts[0], 10);
      const yearStr = y < 2400 ? String(y + 543) : String(y);
      return `${parts[2]}/${parts[1]}/${yearStr}`;
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      let year = d.getFullYear();
      if (year < 2400) year += 543;
      return `${day}/${month}/${year}`;
    }
    return val;
  };

  const formatGender = (g) => {
    if (!g) return 'UNSPECIFIC';
    const s = String(g).trim().toLowerCase();
    if (s === '1' || s === 'ชาย' || s === 'male' || s === 'm') return 'MALE';
    if (s === '2' || s === 'หญิง' || s === 'female' || s === 'f') return 'FEMALE';
    return 'UNSPECIFIC';
  };

  const getFilteredColumns = (data) => {
    if (!data || data.length === 0) return [];

    if (exportType === 'bulk_lms') {
      return data.map(r => {
        let deductVal = '';
        if (r.deductionPrivilege) {
          if (Array.isArray(r.deductionPrivilege)) {
            if (r.deductionPrivilege.includes('MasterDegree')) deductVal = 'ปริญญาโท';
          } else if (typeof r.deductionPrivilege === 'string' && r.deductionPrivilege.includes('MasterDegree')) {
            deductVal = 'ปริญญาโท';
          }
        }

        return {
          'username*': r.nationalId || '',
          'email*': r.email || '',
          'salute*': r.title || '',
          'firstname*': r.firstName || '',
          'middlename': r.middleNameTh || '',
          'lastname*': r.lastName || '',
          'citizenId': r.nationalId || '',
          'phone_no': r.phone || '',
          'oic_license_nonlife': r.licenseNo || '',
          'oic_startdate_nonlife_(DD/MM/YYYY)': formatDateToDDMMYYYY(r.licenseIssueDate),
          'oic_enddate_nonlife_(DD/MM/YYYY)': formatDateToDDMMYYYY(r.licenseExpiryDate),
          'gender_(FEMALE/MALE/UNSPECIFIC)': formatGender(r.gender),
          'date_of_birth_(DD/MM/YYYY)': formatDateToDDMMYYYY(r.birthDate),
          'partner_name': '',
          'onboard_date': '',
          'sales_id': r.affiliation_ViriyahAgentCode || '',
          'region_description': r.region || '',
          'branch_name': r.branch || '',
          'branch_code': '',
          'qualification1': '',
          'qualification2': '',
          'educational_qualification': '',
          'remark1': '',
          'remark2': '',
          'employment_group': '',
          'next_renewal_time': '',
          'oic_deduct': deductVal,
          'upline': ''
        };
      });
    }

    if (exportType === 'main') {
      return data.map(r => ({
        Id: r.id,
        Title: r.title,
        FirstName: r.firstName,
        LastName: r.lastName,
        Email: r.email,
        NationalId: r.nationalId,
        Phone: r.phone,
        LicenseNo: r.licenseNo,
        LicenseIssueDate: r.licenseIssueDate,
        LicenseExpiryDate: r.licenseExpiryDate,
        CourseType: r.courseType,
        MergedSubjects: r.mergedSubjects
      }));
    }

    return data;
  };

  const handleSearchPerson = async () => {
    if (!searchTerm && !idRanges) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = { page: 1, pageSize: 50 };
      if (searchTerm) params.search = searchTerm;
      if (idRanges) params.idRanges = idRanges;

      const qs = new URLSearchParams(params);
      const response = await fetch(`${API_BASE_URL}/admin/trainees?${qs.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const res = await response.json();
        const data = res.data || res;
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Failed to fetch trainees', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExport = async (format) => {
    setLoading(true);
    try {
      const payload = {
        searchTerm: searchTerm || null,
        idRanges: idRanges || null,
        selectedNationalIds: selectedPersons.map(p => p.nationalId),
        selectedCourses: Object.entries(selectedCourses).map(([cid, dids]) => ({
          courseId: parseInt(cid),
          dateIds: dids
        })),
        allColumns: exportType === 'all',
        mainInfoOnly: exportType === 'main',
        customColumns: exportType === 'custom'
      };

      const res = await fetch(`${API_BASE_URL}/reports/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to export data');

      const rawData = await res.json();
      const exportData = getFilteredColumns(rawData);

      if (exportData.length === 0) {
        alert('ไม่พบข้อมูลตามเงื่อนไขที่ระบุ');
        setLoading(false);
        return;
      }

      const dataByCourse = {};
      rawData.forEach(row => {
        const cType = row.courseType || 'Unknown';
        if (!dataByCourse[cType]) dataByCourse[cType] = [];
        dataByCourse[cType].push(row);
      });

      const keys = Object.keys(dataByCourse);
      const extension = format === 'csv' ? '.csv' : (format === 'xls' ? '.xls' : '.xlsx');

      const pad = (n) => n.toString().padStart(2, '0');
      const d = new Date();
      const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
      const filePrefix = exportType === 'bulk_lms' ? 'Export_Course_LMS_' : 'Export_Course_';

      if (keys.length === 1) {
        const cType = keys[0];
        const rows = getFilteredColumns(dataByCourse[cType]);
        const ws = XLSX.utils.json_to_sheet(rows);
        const fileName = `${filePrefix}${cType}_${dateStr}${extension}`;

        if (format === 'csv') {
          const csv = XLSX.utils.sheet_to_csv(ws);
          const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: "text/csv;charset=utf-8;" });
          saveAs(blob, fileName);
        } else {
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Data");
          const excelBuffer = XLSX.write(wb, { bookType: format === 'xls' ? 'biff8' : 'xlsx', type: 'array' });
          const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
          saveAs(blob, fileName);
        }
      } else {
        const zip = new JSZip();
        keys.forEach(cType => {
          const rows = getFilteredColumns(dataByCourse[cType]);
          const ws = XLSX.utils.json_to_sheet(rows);

          if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(ws);
            zip.file(`${filePrefix}${cType}_${dateStr}${extension}`, "\uFEFF" + csv);
          } else {
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data");
            const excelBuffer = XLSX.write(wb, { bookType: format === 'xls' ? 'biff8' : 'xlsx', type: 'array' });
            zip.file(`${filePrefix}${cType}_${dateStr}${extension}`, excelBuffer);
          }
        });

        const zipContent = await zip.generateAsync({ type: 'blob' });
        saveAs(zipContent, `ExportData_${dateStr}.zip`);
      }

    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการ Export Data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <Link to="/admin/reports" className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 text-sm">
          <i className="fas fa-arrow-left mr-2"></i> กลับหน้ารายงาน
        </Link>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-primary mb-2">ระบบส่งออกข้อมูล (Export Data)</h2>
        <p className="text-sm text-gray-500">
          กรุณาเลือกรูปแบบที่ต้องการเพื่อดาวน์โหลดข้อมูลการลงทะเบียนล่าสุด ระบบจะทำการรวบรวมข้อมูลจากฐานข้อมูลให้โดยอัตโนมัติ
        </p>
      </div>

      <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-100 mb-8">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">
          <i className="fas fa-search mr-2"></i> ค้นหาและระบุตัวบุคคล
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          หากเลือกระบุบุคคลในส่วนนี้ ระบบจะทำการส่งออกเฉพาะบุคคลที่อยู่ในรายชื่อ (ข้ามการกรองตามหลักสูตร)<br />
          <span className="font-semibold">สามารถค้นหาได้จาก:</span> ชื่อ (เช่น สมชาย), นามสกุล (เช่น ใจดี), บัตรประชาชน (เช่น 1111111111111), เลขใบอนุญาต (เช่น 6304000000), เพศ (เช่น ชาย), ภาค (เช่น ภาค 1 (ภาคเหนือ)), สาขา (เช่น ชลบุรี), ช่วงอายุ (เช่น 20-30)
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="ค้นหา ชื่อ, นามสกุล, บัตรฯ, ใบอนุญาต, เพศ, ภาค, สาขา, ช่วงอายุ (เช่น 20-30)..."
            className="flex-1 border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchPerson()}
          />
          <button
            type="button"
            onClick={handleSearchPerson}
            disabled={isSearching}
            className="px-4 py-2 border border-primary text-primary rounded hover:bg-primary hover:text-white transition-colors"
          >
            {isSearching ? 'กำลังค้นหา...' : 'ค้นหา'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-4 max-h-40 overflow-y-auto border border-gray-200 bg-white rounded p-2">
            {searchResults.map(person => (
              <div key={person.id} className="flex justify-between items-center py-2 border-b last:border-b-0 text-sm">
                <div>
                  <span className="font-medium">{person.firstNameTh} {person.lastNameTh}</span>
                  <span className="text-gray-500 ml-2">บัตรประชาชน: {person.nationId}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedPersons.find(p => p.nationalId === person.nationId)) {
                      setSelectedPersons([...selectedPersons, { nationalId: person.nationId, firstNameTh: person.firstNameTh, lastNameTh: person.lastNameTh }]);
                    }
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  + เพิ่ม
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Selected Persons */}
        {selectedPersons.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">รายชื่อที่ถูกเลือก:</h4>
            <div className="max-h-40 overflow-y-auto border border-blue-200 rounded p-2 bg-blue-100/50">
              {selectedPersons.map(person => (
                <div key={person.nationalId} className="flex justify-between items-center py-2 border-b border-blue-200 last:border-b-0 text-sm">
                  <div>
                    <span className="font-medium">{person.firstNameTh} {person.lastNameTh}</span>
                    <span className="text-gray-500 ml-2">บัตรประชาชน: {person.nationalId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPersons(selectedPersons.filter(p => p.nationalId !== person.nationalId))}
                    className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  >
                    - ลบ
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">ช่วง ID (เช่น 50-100, 150-200)</label>
          <input
            type="text"
            placeholder="{50-100},{150-200}"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            value={idRanges}
            onChange={(e) => setIdRanges(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchPerson()}
          />
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-3">เลือกระดับและวันที่ (ส่งออกแยกไฟล์หากเลือกหลายรายการ)</label>

        <div className="flex gap-4 mb-4">
          <label className="flex items-center cursor-pointer">
            <input type="radio" value="ทั้งหมด" checked={courseTypeFilter === 'ทั้งหมด'} onChange={(e) => setCourseTypeFilter(e.target.value)} className="w-4 h-4 mr-2 accent-primary" />
            <span className="text-sm text-gray-700">ทั้งหมด</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input type="radio" value="ตัวแทน" checked={courseTypeFilter === 'ตัวแทน'} onChange={(e) => setCourseTypeFilter(e.target.value)} className="w-4 h-4 mr-2 accent-primary" />
            <span className="text-sm text-gray-700">ตัวแทน</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input type="radio" value="นายหน้า" checked={courseTypeFilter === 'นายหน้า'} onChange={(e) => setCourseTypeFilter(e.target.value)} className="w-4 h-4 mr-2 accent-primary" />
            <span className="text-sm text-gray-700">นายหน้า</span>
          </label>
        </div>

        <div className="bg-white border border-gray-300 rounded mb-6">
          {groupedCourses
            .filter(c => {
              if (courseTypeFilter === 'ทั้งหมด') return true;
              return c.courseName.includes(courseTypeFilter);
            })
            .map((c) => (
              <div key={c.courseId} className="border-b last:border-b-0">
                <div className="flex items-center p-3 hover:bg-gray-50">
                  <button
                    type="button"
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 mr-2 focus:outline-none"
                    onClick={() => toggleCourseExpand(c.courseId)}
                  >
                    <i className={`fas fa-${expandedCourses[c.courseId] ? 'minus' : 'plus'}`}></i>
                  </button>
                  <input
                    type="checkbox"
                    className="w-4 h-4 mr-3 accent-primary"
                    checked={selectedCourses[c.courseId]?.length === c.dates.length && c.dates.length > 0}
                    ref={el => {
                      if (el) {
                        const selectedCount = selectedCourses[c.courseId]?.length || 0;
                        el.indeterminate = selectedCount > 0 && selectedCount < c.dates.length;
                      }
                    }}
                    onChange={(e) => handleCourseCheck(c.courseId, e.target.checked)}
                  />
                  <span className="text-sm text-gray-800">{c.courseName} ({c.dates.length} รอบ)</span>
                </div>

                {expandedCourses[c.courseId] && (
                  <div className="pl-12 pr-4 pb-2 bg-gray-50/50">
                    {c.dates.map(d => (
                      <div key={d.dateId} className="flex items-center py-2 border-b last:border-0 border-gray-100">
                        <input
                          type="checkbox"
                          className="w-4 h-4 mr-3 accent-primary"
                          checked={(selectedCourses[c.courseId] || []).includes(d.dateId)}
                          onChange={(e) => handleDateCheck(c.courseId, d.dateId, e.target.checked)}
                        />
                        <span className="text-sm text-gray-600">{d.display}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>

        <div className="space-y-2 mb-6">
          <label className="flex items-center">
            <input
              type="radio"
              name="exportType"
              value="all"
              checked={exportType === 'all'}
              onChange={() => setExportType('all')}
              className="w-4 h-4 mr-3 accent-primary"
            />
            <span className="text-sm text-gray-700">แสดงทั้งหมด (ทุกคอลัมน์)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="exportType"
              value="main"
              checked={exportType === 'main'}
              onChange={() => setExportType('main')}
              className="w-4 h-4 mr-3 accent-primary"
            />
            <span className="text-sm text-gray-700">แสดงเฉพาะข้อมูลหลัก (คำนำหน้า, ชื่อ, นามสกุล, อีเมล, บัตรประชาชน, เบอร์โทร, เลขใบอนุญาต)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="exportType"
              value="bulk_lms"
              checked={exportType === 'bulk_lms'}
              onChange={() => setExportType('bulk_lms')}
              className="w-4 h-4 mr-3 accent-primary"
            />
            <span className="text-sm text-gray-700">
              Template LMS (Add Users)
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleExport('csv')}
            className={`flex items-center px-6 py-2 rounded text-white font-medium ${loading ? 'bg-gray-400' : 'bg-yellow-500 hover:bg-yellow-600'}`}
          >
            <i className="fas fa-file-csv mr-2"></i> Export to CSV
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleExport('xls')}
            className={`flex items-center px-6 py-2 rounded text-white font-medium ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <i className="fas fa-file-excel mr-2"></i> Export to Excel (.xls)
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleExport('xlsx')}
            className={`flex items-center px-6 py-2 rounded text-white font-medium ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
          >
            <i className="fas fa-file-excel mr-2"></i> Export to Excel (.xlsx)
          </button>
        </div>
      </div>
    </div>
  );
}
