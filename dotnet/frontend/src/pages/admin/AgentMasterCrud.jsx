import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const API_BASE = API_BASE_URL;

export default function AgentMasterCrud({ type: propType }) {
  const { type: paramType } = useParams();
  const type = propType || paramType;

  const [data, setData] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchData();
    if (type === 'agent-branches') {
      fetchRegions();
    }
  }, [type]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const endpoint = type === 'agent-regions' ? 'regions' : 'branches';
      const res = await fetch(`${API_BASE}/AgentMaster/${endpoint}?all=true`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const res = await fetch(`${API_BASE}/AgentMaster/regions?all=true`);
      if (res.ok) {
        setRegions(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeTitle = () => {
    if (type === 'agent-regions') return 'จัดการภูมิภาค (ตัวแทน)';
    if (type === 'agent-branches') return 'จัดการสาขา (ตัวแทน)';
    return 'จัดการข้อมูล';
  };

  const openAddModal = () => {
    setEditItem(null);
    setFormData(type === 'agent-branches' ? { 
      name: '', 
      regionId: '',
      isActiveBackend: true,
      isActiveFrontend: true,
      startActiveDatetime: '',
      endActiveDatetime: ''
    } : { 
      name: '',
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
      ...item,
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
      const endpoint = type === 'agent-regions' ? 'regions' : 'branches';
      const url = editItem 
        ? `${API_BASE}/AgentMaster/${endpoint}/${editItem.id}`
        : `${API_BASE}/AgentMaster/${endpoint}`;
        
      const payload = {
        ...formData,
        startActiveDatetime: formData.startActiveDatetime || null,
        endActiveDatetime: formData.endActiveDatetime || null
      };

      const res = await fetch(url, {
        method: editItem ? 'PUT' : 'POST',
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
      const endpoint = type === 'agent-regions' ? 'regions' : 'branches';
      const res = await fetch(`${API_BASE}/AgentMaster/${endpoint}/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to delete');
      }
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 border-b-2 border-primary pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-2">{getTypeTitle()}</h2>
          <p className="text-gray-500 text-sm">เพิ่ม ลบ หรือแก้ไขข้อมูล</p>
        </div>
        <Link to="/admin/master-data" className="px-4 py-2 border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors">
          <i className="fas fa-arrow-left mr-2"></i> กลับหน้ารวม Master Data
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-end mb-4">
          <button onClick={openAddModal} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
            <i className="fas fa-plus mr-2"></i> เพิ่มข้อมูล
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10"><i className="fas fa-spinner fa-spin text-3xl text-primary"></i></div>
        ) : error ? (
          <div className="text-red-600 text-center py-5">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="p-3 border-b w-20 text-center">ID</th>
                  <th className="p-3 border-b">ชื่อ</th>
                  {type === 'agent-branches' && <th className="p-3 border-b">ภูมิภาค</th>}
                  <th className="p-3 border-b text-center w-24">Backend</th>
                  <th className="p-3 border-b text-center w-24">Frontend</th>
                  <th className="p-3 border-b">ช่วงเวลาเปิดใช้งาน (Frontend)</th>
                  <th className="p-3 border-b text-center w-24">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-center text-gray-500">#{item.id}</td>
                    <td className="p-3 font-medium text-gray-800">{item.name}</td>
                    {type === 'agent-branches' && (
                      <td className="p-3 text-gray-600">
                        {regions.find(r => r.id === item.regionId)?.name || `Region ID: ${item.regionId}`}
                      </td>
                    )}
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.isActiveBackend !== false ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>
                        {item.isActiveBackend !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.isActiveFrontend !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {item.isActiveFrontend !== false ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-600">
                      {item.startActiveDatetime || item.endActiveDatetime ? (
                        <div className="flex flex-col gap-0.5">
                          {item.startActiveDatetime && <span><span className="text-gray-400">เริ่ม:</span> {new Date(item.startActiveDatetime).toLocaleString('th-TH')}</span>}
                          {item.endActiveDatetime && <span><span className="text-gray-400">สิ้นสุด:</span> {new Date(item.endActiveDatetime).toLocaleString('th-TH')}</span>}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">ไม่จำกัดเวลา</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 mx-1" title="แก้ไข">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 mx-1" title="ลบ">
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={type === 'agent-branches' ? 7 : 6} className="text-center p-8 text-gray-500">ไม่มีข้อมูล</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-primary">{editItem ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล'}</h3>
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
                <input type="text" required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none" />
              </div>

              {type === 'agent-branches' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ภูมิภาค</label>
                  <select required value={formData.regionId || ''} onChange={e => setFormData({...formData, regionId: parseInt(e.target.value)})} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none">
                    <option value="" disabled>เลือกภูมิภาค...</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dual Active Flags */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-semibold text-sm text-gray-700 mb-2">การควบคุมการมองเห็น (Visibility Control)</div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isActiveBackend !== false} 
                      onChange={e => setFormData({...formData, isActiveBackend: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="ml-2 text-sm text-gray-700">เปิดใช้งานในระบบ Admin/Backend</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isActiveFrontend !== false} 
                      onChange={e => setFormData({...formData, isActiveFrontend: e.target.checked})}
                      className="rounded border-gray-300 text-emerald-600 shadow-sm focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="ml-2 text-sm text-gray-700">เปิดให้ผู้สมัครมองเห็นที่หน้าสมัคร (Frontend Active)</span>
                  </label>
                </div>
              </div>

              {/* Active Datetime Range for Frontend */}
              <div className="mb-6 p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
                <div className="font-semibold text-sm text-emerald-900 mb-2">
                  <i className="fas fa-calendar-alt mr-1"></i> ช่วงเวลากำหนดเปิดให้เห็นในหน้าสมัคร (Frontend)
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">เริ่มเปิดใช้งาน (Start Datetime)</label>
                    <input 
                      type="datetime-local" 
                      value={formData.startActiveDatetime || ''} 
                      onChange={e => setFormData({...formData, startActiveDatetime: e.target.value})}
                      className="w-full border rounded p-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">สิ้นสุดการเปิดใช้งาน (End Datetime)</label>
                    <input 
                      type="datetime-local" 
                      value={formData.endActiveDatetime || ''} 
                      onChange={e => setFormData({...formData, endActiveDatetime: e.target.value})}
                      className="w-full border rounded p-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">* หากไม่ระบุ จะเปิดใช้งานตลอดเวลา (ตาม Flag ด้านบน)</p>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
