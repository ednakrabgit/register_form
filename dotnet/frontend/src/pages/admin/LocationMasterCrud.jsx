import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function LocationMasterCrud({ type: propType }) {
  const { type: paramType } = useParams();
  const type = propType || paramType;

  const [data, setData] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [modalProvinceId, setModalProvinceId] = useState('');

  const getTypeTitle = () => {
    switch (type) {
      case 'provinces': return 'จัดการจังหวัด (Provinces)';
      case 'districts': return 'จัดการอำเภอ (Districts)';
      case 'subdistricts': return 'จัดการตำบล (SubDistricts)';
      default: return 'จัดการข้อมูลสถานที่';
    }
  };

  const getDopaSummaryBadge = () => {
    switch (type) {
      case 'provinces':
        return {
          title: 'มาตรฐานกรมการปกครอง (DOPA)',
          count: '77 จังหวัด',
          detail: 'ครอบคลุม 76 จังหวัด และกรุงเทพมหานคร ครบถ้วน 100%'
        };
      case 'districts':
        return {
          title: 'มาตรฐานกรมการปกครอง (DOPA)',
          count: '928 อำเภอ/เขต',
          detail: 'ครอบคลุม 878 อำเภอ และ 50 เขตใน กทม. สัมพันธ์กับ 77 จังหวัด'
        };
      case 'subdistricts':
        return {
          title: 'มาตรฐานกรมการปกครอง (DOPA)',
          count: '7,442 ตำบล/แขวง',
          detail: 'สัมพันธ์กับ 928 อำเภอ/เขต พร้อมรหัสไปรษณีย์ครบถ้วน 100%'
        };
      default:
        return null;
    }
  };

  useEffect(() => {
    setSearchTerm('');
    setSelectedProvinceId('');
    setSelectedDistrictId('');
    setPage(1);
    fetchData();
  }, [type]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load primary location data
      let url = `${API_BASE_URL}/Location/${type}?all=true`;
      if (type === 'subdistricts') {
        url = `${API_BASE_URL}/Location/subdistricts/all?all=true`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(Array.isArray(json) ? json : (json.data || []));

      // Load reference provinces & districts for relation mapping
      if (type === 'districts' || type === 'subdistricts') {
        const pRes = await fetch(`${API_BASE_URL}/Location/provinces?all=true`);
        if (pRes.ok) setProvinces(await pRes.json());
      }
      if (type === 'subdistricts') {
        const dRes = await fetch(`${API_BASE_URL}/Location/districts?all=true`);
        if (dRes.ok) setDistricts(await dRes.json());
      }

    } catch (err) {
      console.error(err);
      setError('ไม่สามารถโหลดข้อมูลได้: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Lookup maps
  const provinceMap = useMemo(() => {
    const map = {};
    for (const p of provinces) {
      map[p.provinceId] = p;
    }
    return map;
  }, [provinces]);

  const districtMap = useMemo(() => {
    const map = {};
    for (const d of districts) {
      map[d.districtId] = d;
    }
    return map;
  }, [districts]);

  // Districts available under selected province filter
  const availableDistrictsForFilter = useMemo(() => {
    if (!selectedProvinceId) return districts;
    return districts.filter(d => d.provinceId === Number(selectedProvinceId));
  }, [districts, selectedProvinceId]);

  // Reset district filter if province changes and district no longer belongs
  const handleProvinceFilterChange = (provId) => {
    setSelectedProvinceId(provId);
    setSelectedDistrictId('');
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();

    return data.filter(item => {
      // 1. Province filter
      if (selectedProvinceId) {
        const pIdNum = Number(selectedProvinceId);
        if (type === 'districts' && item.provinceId !== pIdNum) return false;
        if (type === 'subdistricts') {
          const dist = districtMap[item.districtId];
          if (!dist || dist.provinceId !== pIdNum) return false;
        }
      }

      // 2. District filter (subdistricts only)
      if (selectedDistrictId && type === 'subdistricts') {
        if (item.districtId !== Number(selectedDistrictId)) return false;
      }

      // 3. Search query
      if (s) {
        const th = (item.provinceThai || item.districtThai || item.subDistrictThai || '').toLowerCase();
        const en = (item.provinceEng || item.districtEng || item.subDistrictEng || '').toLowerCase();
        const zip = (item.zipcode || '').toLowerCase();
        const refId = String(item.provinceId || item.districtId || item.subDistrictId || item.id || '');

        // Also search by parent district/province name
        let parentMatch = false;
        if (type === 'districts') {
          const prov = provinceMap[item.provinceId];
          if (prov && (prov.provinceThai.toLowerCase().includes(s) || (prov.provinceEng && prov.provinceEng.toLowerCase().includes(s)))) {
            parentMatch = true;
          }
        } else if (type === 'subdistricts') {
          const dist = districtMap[item.districtId];
          if (dist) {
            if (dist.districtThai.toLowerCase().includes(s) || (dist.districtEng && dist.districtEng.toLowerCase().includes(s))) {
              parentMatch = true;
            }
            const prov = provinceMap[dist.provinceId];
            if (prov && (prov.provinceThai.toLowerCase().includes(s) || (prov.provinceEng && prov.provinceEng.toLowerCase().includes(s)))) {
              parentMatch = true;
            }
          }
        }

        if (!th.includes(s) && !en.includes(s) && !zip.includes(s) && !refId.includes(s) && !parentMatch) {
          return false;
        }
      }

      return true;
    });
  }, [data, type, selectedProvinceId, selectedDistrictId, searchTerm, districtMap, provinceMap]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedProvinceId, selectedDistrictId, searchTerm, pageSize]);

  // Paginated data
  const totalItems = filteredData.length;
  const totalPages = pageSize === 'All' ? 1 : Math.max(1, Math.ceil(totalItems / (Number(pageSize) || 50)));
  const paginatedData = useMemo(() => {
    if (pageSize === 'All') return filteredData;
    const size = Number(pageSize) || 50;
    const start = (page - 1) * size;
    return filteredData.slice(start, start + size);
  }, [filteredData, page, pageSize]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = editItem ? 'PUT' : 'POST';
      const url = editItem 
        ? `${API_BASE_URL}/Location/${type}/${editItem.id}` 
        : `${API_BASE_URL}/Location/${type}`;

      const payload = {
        ...formData,
        startActiveDatetime: formData.startActiveDatetime || null,
        endActiveDatetime: formData.endActiveDatetime || null
      };

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed');
      
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/Location/${type}/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      fetchData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const openAddModal = () => {
    setEditItem(null);
    let initial = {
      isActiveBackend: true,
      isActiveFrontend: true,
      startActiveDatetime: '',
      endActiveDatetime: ''
    };

    if (type === 'provinces') {
      const nextId = data.length > 0 ? Math.max(...data.map(p => p.provinceId || 0)) + 1 : 1;
      initial = { ...initial, provinceId: nextId, provinceThai: '', provinceEng: '' };
      setModalProvinceId('');
    } else if (type === 'districts') {
      const nextId = data.length > 0 ? Math.max(...data.map(d => d.districtId || 0)) + 1 : 1;
      initial = { ...initial, districtId: nextId, districtThai: '', districtEng: '', provinceId: selectedProvinceId ? Number(selectedProvinceId) : (provinces[0]?.provinceId || 1) };
      setModalProvinceId(selectedProvinceId || String(provinces[0]?.provinceId || '1'));
    } else if (type === 'subdistricts') {
      const nextId = data.length > 0 ? Math.max(...data.map(s => s.subDistrictId || 0)) + 1 : 1;
      const initialDistId = selectedDistrictId ? Number(selectedDistrictId) : (districts[0]?.districtId || 1);
      const parentDist = districtMap[initialDistId];
      const initialProvId = parentDist ? String(parentDist.provinceId) : (selectedProvinceId || String(provinces[0]?.provinceId || '1'));

      initial = { 
        ...initial, 
        subDistrictId: nextId, 
        subDistrictThai: '', 
        subDistrictEng: '', 
        districtId: initialDistId, 
        zipcode: '' 
      };
      setModalProvinceId(initialProvId);
    }

    setFormData(initial);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditItem(item);
    if (type === 'districts') {
      setModalProvinceId(String(item.provinceId || ''));
    } else if (type === 'subdistricts') {
      const parentDist = districtMap[item.districtId];
      setModalProvinceId(parentDist ? String(parentDist.provinceId) : '');
    }

    setFormData({ 
      ...item,
      isActiveBackend: item.isActiveBackend !== false,
      isActiveFrontend: item.isActiveFrontend !== false,
      startActiveDatetime: item.startActiveDatetime ? item.startActiveDatetime.slice(0, 16) : '',
      endActiveDatetime: item.endActiveDatetime ? item.endActiveDatetime.slice(0, 16) : ''
    });
    setShowModal(true);
  };

  // Districts for modal based on modalProvinceId
  const modalAvailableDistricts = useMemo(() => {
    if (!modalProvinceId) return districts;
    return districts.filter(d => d.provinceId === Number(modalProvinceId));
  }, [districts, modalProvinceId]);

  const badge = getDopaSummaryBadge();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="mb-6 border-b-2 border-primary/20 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-primary">{getTypeTitle()}</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-200">
              {badge?.count}
            </span>
          </div>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            {badge?.detail} (ฐานข้อมูลมาตรฐานระดับองค์กร สัมพันธ์กัน 100%)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link 
            to="/admin/master-data" 
            className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium flex items-center"
          >
            <i className="fas fa-arrow-left mr-2 text-gray-500"></i> กลับหน้ารวม Master Data
          </Link>
          <button 
            onClick={openAddModal} 
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-sm hover:bg-emerald-700 transition font-medium text-sm flex items-center"
          >
            <i className="fas fa-plus mr-2"></i> เพิ่มข้อมูล
          </button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-xl border transition-all ${type === 'provinces' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">จังหวัด (Provinces)</div>
              <div className="text-2xl font-bold text-blue-700 mt-1">
                {type === 'provinces' ? data.length : provinces.length || 77}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">ครบถ้วน 76 จังหวัด + กทม.</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl">
              <i className="fas fa-map-location-dot"></i>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-all ${type === 'districts' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">อำเภอ / เขต (Districts)</div>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                {type === 'districts' ? data.length : districts.length || 928}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">878 อำเภอ + 50 เขต (สัมพันธ์ 77 จว.)</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl">
              <i className="fas fa-map"></i>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-all ${type === 'subdistricts' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">ตำบล / แขวง (SubDistricts)</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {type === 'subdistricts' ? data.length : 7442}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">เชื่อมโยงทุกอำเภอ + รหัสไปรษณีย์ครบถ้วน</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
              <i className="fas fa-location-crosshairs"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Text Search */}
          <div className="relative flex-1 w-full">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input 
              type="text"
              placeholder={`ค้นหาชื่อ ${type === 'provinces' ? 'จังหวัด' : type === 'districts' ? 'อำเภอ' : 'ตำบล, รหัสไปรษณีย์'} (ไทย/อังกฤษ/ID)...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                <i className="fas fa-times-circle"></i>
              </button>
            )}
          </div>

          {/* Province Filter Dropdown */}
          {(type === 'districts' || type === 'subdistricts') && (
            <div className="w-full md:w-64">
              <select
                value={selectedProvinceId}
                onChange={(e) => handleProvinceFilterChange(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">ทุกจังหวัด (77 จังหวัด)</option>
                {provinces.map(p => (
                  <option key={p.provinceId} value={p.provinceId}>
                    {p.provinceThai} ({p.provinceEng || ''})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* District Filter Dropdown (Subdistricts only) */}
          {type === 'subdistricts' && (
            <div className="w-full md:w-64">
              <select
                value={selectedDistrictId}
                onChange={(e) => setSelectedDistrictId(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">ทุกอำเภอ ({availableDistrictsForFilter.length} อำเภอ)</option>
                {availableDistrictsForFilter.map(d => {
                  const provName = provinceMap[d.provinceId]?.provinceThai;
                  return (
                    <option key={d.districtId} value={d.districtId}>
                      {d.districtThai} {!selectedProvinceId && provName ? `(จ.${provName})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Rows per page selector */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
            <span className="text-xs text-gray-500 whitespace-nowrap">แถว:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              className="py-2 px-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value="All">ทั้งหมด</option>
            </select>

            {(searchTerm || selectedProvinceId || selectedDistrictId) && (
              <button 
                onClick={() => { setSearchTerm(''); setSelectedProvinceId(''); setSelectedDistrictId(''); }}
                className="px-3 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition whitespace-nowrap"
                title="ล้างตัวกรองทั้งหมด"
              >
                <i className="fas fa-undo mr-1"></i> รีเซ็ต
              </button>
            )}
          </div>
        </div>

        {/* Filter Stats */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap justify-between items-center text-xs text-gray-600">
          <div>
            พบข้อมูล <span className="font-bold text-primary">{totalItems.toLocaleString()}</span> รายการ
            {totalItems !== data.length && (
              <span className="text-gray-400 ml-1">(กรองจากทั้งหมด {data.length.toLocaleString()} รายการ)</span>
            )}
          </div>
          {pageSize !== 'All' && totalPages > 1 && (
            <div>
              หน้า <span className="font-semibold">{page}</span> จาก <span className="font-semibold">{totalPages}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <i className="fas fa-spinner fa-spin text-4xl text-primary mb-3"></i>
            <div className="text-gray-500 text-sm">กำลังโหลดข้อมูลสถานที่...</div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 bg-red-50">{error}</div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-gray-200 z-10 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 text-center w-16">ลำดับ</th>
                  <th className="p-3.5 w-24">รหัสอ้างอิง</th>
                  <th className="p-3.5">ชื่อ (ภาษาไทย)</th>
                  <th className="p-3.5">ชื่อ (English)</th>
                  {type === 'districts' && <th className="p-3.5">จังหวัดที่สังกัด</th>}
                  {type === 'subdistricts' && <th className="p-3.5">อำเภอที่สังกัด</th>}
                  {type === 'subdistricts' && <th className="p-3.5">จังหวัด</th>}
                  {type === 'subdistricts' && <th className="p-3.5 text-center">รหัสไปรษณีย์</th>}
                  <th className="p-3.5 text-center">Backend</th>
                  <th className="p-3.5 text-center">Frontend</th>
                  <th className="p-3.5 text-center w-24">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item, idx) => {
                  const dist = type === 'subdistricts' ? districtMap[item.districtId] : null;
                  const provForDist = type === 'districts' ? provinceMap[item.provinceId] : null;
                  const provForSub = dist ? provinceMap[dist.provinceId] : null;

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="p-3.5 text-center text-gray-400 text-xs">
                        {pageSize === 'All' ? idx + 1 : ((page - 1) * Number(pageSize)) + idx + 1}
                      </td>
                      <td className="p-3.5 font-mono text-xs text-gray-600">
                        {type === 'provinces' && item.provinceId}
                        {type === 'districts' && item.districtId}
                        {type === 'subdistricts' && item.subDistrictId}
                      </td>
                      <td className="p-3.5 font-medium text-gray-900">
                        {type === 'provinces' && item.provinceThai}
                        {type === 'districts' && item.districtThai}
                        {type === 'subdistricts' && item.subDistrictThai}
                      </td>
                      <td className="p-3.5 text-gray-600">
                        {type === 'provinces' && (item.provinceEng || '-')}
                        {type === 'districts' && (item.districtEng || '-')}
                        {type === 'subdistricts' && (item.subDistrictEng || '-')}
                      </td>
                      {type === 'districts' && (
                        <td className="p-3.5 font-medium text-blue-800">
                          {provForDist ? provForDist.provinceThai : `จ.ID #${item.provinceId}`}
                        </td>
                      )}
                      {type === 'subdistricts' && (
                        <td className="p-3.5 text-gray-800">
                          {dist ? dist.districtThai : `อ.ID #${item.districtId}`}
                        </td>
                      )}
                      {type === 'subdistricts' && (
                        <td className="p-3.5 font-medium text-blue-800">
                          {provForSub ? provForSub.provinceThai : '-'}
                        </td>
                      )}
                      {type === 'subdistricts' && (
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded font-mono text-xs font-semibold">
                            {item.zipcode || '-'}
                          </span>
                        </td>
                      )}
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${item.isActiveBackend !== false ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>
                          {item.isActiveBackend !== false ? 'Active' : 'Off'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${item.isActiveFrontend !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {item.isActiveFrontend !== false ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <button 
                          onClick={() => openEditModal(item)} 
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition" 
                          title="แก้ไข"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)} 
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition ml-1" 
                          title="ลบ"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-gray-500">
                      <i className="fas fa-inbox text-3xl text-gray-300 mb-2"></i>
                      <div>ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && pageSize !== 'All' && totalPages > 1 && (
          <div className="p-3.5 bg-slate-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs text-gray-600">
              กำลังแสดงแถวที่ <span className="font-semibold">{((page - 1) * Number(pageSize)) + 1}</span> ถึง{' '}
              <span className="font-semibold">{Math.min(page * Number(pageSize), totalItems)}</span> จาก{' '}
              <span className="font-bold text-gray-900">{totalItems.toLocaleString()}</span> รายการ
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1 text-xs border rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="หน้าแรก"
              >
                <i className="fas fa-angle-double-left"></i>
              </button>
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-2.5 py-1 text-xs border rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="ก่อนหน้า"
              >
                <i className="fas fa-angle-left mr-1"></i> ก่อนหน้า
              </button>

              <span className="px-3 py-1 text-xs font-semibold text-primary bg-blue-50 border border-blue-200 rounded">
                หน้า {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-2.5 py-1 text-xs border rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="ถัดไป"
              >
                ถัดไป <i className="fas fa-angle-right ml-1"></i>
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2.5 py-1 text-xs border rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="หน้าสุดท้าย"
              >
                <i className="fas fa-angle-double-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 pb-3 border-b">
              <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                <i className={`fas ${editItem ? 'fa-edit text-blue-600' : 'fa-plus-circle text-emerald-600'}`}></i>
                {editItem ? `แก้ไขข้อมูล: ${formData.provinceThai || formData.districtThai || formData.subDistrictThai}` : 'เพิ่มข้อมูลใหม่'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  รหัสอ้างอิง (ID / Code) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  required 
                  value={
                    type === 'provinces' ? formData.provinceId :
                    type === 'districts' ? formData.districtId :
                    formData.subDistrictId
                  } 
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    if (type === 'provinces') setFormData({...formData, provinceId: val});
                    if (type === 'districts') setFormData({...formData, districtId: val});
                    if (type === 'subdistricts') setFormData({...formData, subDistrictId: val});
                  }} 
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  ชื่อ (ภาษาไทย) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="เช่น พระนคร, บางรัก, ศรีวิไล..."
                  value={
                    type === 'provinces' ? formData.provinceThai || '' :
                    type === 'districts' ? formData.districtThai || '' :
                    formData.subDistrictThai || ''
                  } 
                  onChange={e => {
                    const val = e.target.value;
                    if (type === 'provinces') setFormData({...formData, provinceThai: val});
                    if (type === 'districts') setFormData({...formData, districtThai: val});
                    if (type === 'subdistricts') setFormData({...formData, subDistrictThai: val});
                  }} 
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  ชื่อ (ภาษาอังกฤษ)
                </label>
                <input 
                  type="text" 
                  placeholder="เช่น Phra Nakhon, Bang Rak..."
                  value={
                    type === 'provinces' ? formData.provinceEng || '' :
                    type === 'districts' ? formData.districtEng || '' :
                    formData.subDistrictEng || ''
                  } 
                  onChange={e => {
                    const val = e.target.value;
                    if (type === 'provinces') setFormData({...formData, provinceEng: val});
                    if (type === 'districts') setFormData({...formData, districtEng: val});
                    if (type === 'subdistricts') setFormData({...formData, subDistrictEng: val});
                  }} 
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none" 
                />
              </div>

              {/* District: Select Province */}
              {type === 'districts' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    จังหวัดที่สังกัด <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required 
                    value={formData.provinceId || ''} 
                    onChange={e => setFormData({...formData, provinceId: parseInt(e.target.value)})} 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none bg-white"
                  >
                    <option value="" disabled>-- เลือกจังหวัด --</option>
                    {provinces.map(p => (
                      <option key={p.provinceId} value={p.provinceId}>
                        {p.provinceThai} ({p.provinceEng || ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* SubDistrict: Cascading Province -> District */}
              {type === 'subdistricts' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      1. เลือกจังหวัด <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={modalProvinceId}
                      onChange={(e) => {
                        const newProvId = e.target.value;
                        setModalProvinceId(newProvId);
                        const firstDist = districts.find(d => d.provinceId === Number(newProvId));
                        setFormData({
                          ...formData,
                          districtId: firstDist ? firstDist.districtId : 0
                        });
                      }}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none bg-white"
                      required
                    >
                      <option value="" disabled>-- เลือกจังหวัด --</option>
                      {provinces.map(p => (
                        <option key={p.provinceId} value={p.provinceId}>
                          {p.provinceThai} ({p.provinceEng || ''})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      2. เลือกอำเภอ/เขตที่สังกัด <span className="text-red-500">*</span>
                    </label>
                    <select 
                      required 
                      value={formData.districtId || ''} 
                      onChange={e => setFormData({...formData, districtId: parseInt(e.target.value)})} 
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none bg-white"
                    >
                      <option value="" disabled>-- เลือกอำเภอ --</option>
                      {modalAvailableDistricts.map(d => (
                        <option key={d.districtId} value={d.districtId}>
                          {d.districtThai} ({d.districtEng || ''})
                        </option>
                      ))}
                    </select>
                    {modalAvailableDistricts.length === 0 && modalProvinceId && (
                      <p className="text-xs text-red-500 mt-1">ไม่พบอำเภอในจังหวัดนี้</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      รหัสไปรษณีย์ (Postal Code) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="เช่น 10200, 38000..."
                      maxLength={5}
                      value={formData.zipcode || ''} 
                      onChange={e => setFormData({...formData, zipcode: e.target.value})} 
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-primary/30 outline-none" 
                    />
                  </div>
                </>
              )}

              {/* Visibility Control */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <div className="font-semibold text-xs text-gray-700 uppercase tracking-wider">การควบคุมการมองเห็น (Visibility)</div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isActiveBackend !== false} 
                      onChange={e => setFormData({...formData, isActiveBackend: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="ml-2 text-xs text-gray-700 font-medium">เปิดใช้งานในระบบ Admin / Backend</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isActiveFrontend !== false} 
                      onChange={e => setFormData({...formData, isActiveFrontend: e.target.checked})}
                      className="rounded border-gray-300 text-emerald-600 shadow-sm focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="ml-2 text-xs text-gray-700 font-medium">เปิดใช้งานในหน้าลงทะเบียน (Frontend Active)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition font-medium"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition shadow-sm"
                >
                  <i className="fas fa-save mr-1.5"></i> บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
