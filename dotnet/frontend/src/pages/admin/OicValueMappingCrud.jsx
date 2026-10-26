import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';



export default function OicValueMappingCrud() {
  const [data, setData] = useState([]);
  const [fieldMappings, setFieldMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };
  
  // For the modal
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ 
    targetFieldName: '', 
    sourceWord: '', 
    targetWord: '', 
    description: '',
    isActive: true 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [valueRes, fieldRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/oic/value-mappings`),
        fetch(`${API_BASE_URL}/admin/oic/field-mappings`)
      ]);
      
      if (!valueRes.ok || !fieldRes.ok) throw new Error('Failed to fetch data');
      
      const valueData = await valueRes.json();
      const fieldData = await fieldRes.json();
      
      setData(valueData);
      // Get unique target field names for autocomplete
      const uniqueFields = [...new Set(fieldData.map(item => item.targetFieldName))].filter(Boolean);
      setFieldMappings(uniqueFields);
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
      const method = editItem ? 'PUT' : 'POST';
      const url = editItem 
        ? `${API_BASE_URL}/admin/oic/value-mappings/${editItem.valMappingId}` 
        : `${API_BASE_URL}/admin/oic/value-mappings`;

      const payload = {
        ...formData,
        valMappingId: editItem ? editItem.valMappingId : 0
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
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณต้องการลบข้อมูลนี้ถาวรใช่หรือไม่?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/oic/value-mappings/${id}`, {
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
    setFormData({ targetFieldName: '', sourceWord: '', targetWord: '', description: '', isActive: true });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditItem(item);
    setFormData({ 
      targetFieldName: item.targetFieldName, 
      sourceWord: item.sourceWord, 
      targetWord: item.targetWord, 
      description: item.description || '', 
      isActive: item.isActive 
    });
    setShowModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 border-b-2 border-red-600 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-red-600 mb-2">OIC Value Mapping</h2>
          <p className="text-gray-500 text-sm">ตั้งค่าการแปลงค่าข้อมูล (เช่น &quot;น.ส.&quot; -&gt; &quot;นางสาว&quot;)</p>
        </div>
        <div className="flex gap-4">
          <Link to="/admin/master-data" className="px-4 py-2 border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors">
            <i className="fas fa-arrow-left mr-2"></i> กลับหน้า Master Data
          </Link>
          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            <i className="fas fa-plus mr-2"></i> เพิ่ม Value Mapping
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Field</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Word (จาก OIC)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Word (ที่จะแปลง)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">กำลังโหลด...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">ไม่พบข้อมูล</td></tr>
            ) : (
              data.map((item) => (
                <React.Fragment key={item.valMappingId}>
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRow(item.valMappingId)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <i className={`fas fa-chevron-${expandedRows.has(item.valMappingId) ? 'up' : 'down'} mr-2 text-gray-400`}></i>
                      {item.valMappingId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono text-primary">{item.targetFieldName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-gray-100 font-mono">{item.sourceWord}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-green-50 font-mono">{item.targetWord}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEditModal(item)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                        แก้ไข
                      </button>
                      <button onClick={() => handleDelete(item.valMappingId)} className="text-red-600 hover:text-red-900">
                        ลบ
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(item.valMappingId) && (
                    <tr className="bg-blue-50 border-t-0">
                      <td colSpan="6" className="px-6 py-4 text-sm text-gray-700 whitespace-normal">
                        <strong>คำอธิบาย / หน้าจอ:</strong> {item.description || '-'}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editItem ? 'แก้ไขการแมปค่า' : 'เพิ่มการแมปค่าใหม่'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Field *</label>
                  <input
                    type="text"
                    required
                    list="target-field-list"
                    className="w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none font-mono text-sm"
                    value={formData.targetFieldName}
                    onChange={(e) => setFormData({...formData, targetFieldName: e.target.value})}
                    placeholder="e.g. TitleName"
                  />
                  <datalist id="target-field-list">
                    {fieldMappings.map((field, idx) => (
                      <option key={idx} value={field} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Word (คำที่รับมา) *</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none text-sm bg-gray-50"
                    value={formData.sourceWord}
                    onChange={(e) => setFormData({...formData, sourceWord: e.target.value})}
                    placeholder="e.g. น.ส."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Word (คำที่จะบันทึก) *</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none text-sm bg-green-50"
                    value={formData.targetWord}
                    onChange={(e) => setFormData({...formData, targetWord: e.target.value})}
                    placeholder="e.g. นางสาว"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย / จุดที่ใช้บนหน้าจอ Frontend</label>
                  <textarea
                    className="w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-red-600 outline-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="เช่น คำนำหน้าชื่อ (Dropdown หน้าแรก)"
                    rows="2"
                  ></textarea>
                </div>
                <div className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    id="isActive"
                    className="h-4 w-4 text-red-600 focus:ring-red-600 border-gray-300 rounded"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    เปิดใช้งาน (Active)
                  </label>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
