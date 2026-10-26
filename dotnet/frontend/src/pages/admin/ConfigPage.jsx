import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Settings, Server, Calendar, Clock, ShieldCheck, ShieldAlert,
  Save, RotateCcw, Plus, Trash2, CheckCircle2, AlertTriangle,
  Code2, Eye, RefreshCw, Layers, FileText, Info, HelpCircle
} from 'lucide-react';

const API_BASE = API_BASE_URL;

// Format date string for datetime-local input
const toDateTimeLocal = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return dateStr;
  }
};

// Format from datetime-local back to standardized SQL-friendly string "YYYY-MM-DD HH:mm:ss"
const toSqlDateTime = (val) => {
  if (!val) return '';
  const clean = val.replace('T', ' ');
  if (clean.length === 16) return `${clean}:00`;
  return clean;
};

export default function ConfigPage() {
  const { canEditMenu } = useAuth();
  const canEdit = canEditMenu ? canEditMenu('config') : true;

  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'tab4' | 'system'
  const [configs, setConfigs] = useState({});
  const [defaultConfigs, setDefaultConfigs] = useState({});
  const [systemInfo, setSystemInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Period management states
  const [periodsList, setPeriodsList] = useState([]);
  const [isRawJsonMode, setIsRawJsonMode] = useState(false);
  const [jsonError, setJsonError] = useState('');

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [configRes, infoRes] = await Promise.all([
        fetch(`${API_BASE}/config`),
        fetch(`${API_BASE}/config/system-info`)
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        const mapped = {};
        const defaults = {};
        data.forEach(item => {
          mapped[item.key] = item.value;
          defaults[item.key] = item.defaultValue ?? item.value;
        });
        setConfigs(mapped);
        setDefaultConfigs(defaults);

        // Parse periods list
        try {
          const parsed = JSON.parse(mapped['SYSTEM_OPEN_PERIODS'] || '[]');
          if (Array.isArray(parsed)) {
            setPeriodsList(parsed);
          } else {
            setPeriodsList([]);
          }
        } catch {
          setPeriodsList([]);
        }
      }

      if (infoRes.ok) {
        const info = await infoRes.json();
        setSystemInfo(info);
      }
    } catch (err) {
      console.error("Failed to load config data:", err);
      setFeedback({ type: 'error', message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อดึงข้อมูลการตั้งค่าได้' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleChange = (key, value) => {
    setConfigs(prev => ({ ...prev, [key]: value }));
  };

  const handleResetField = (key) => {
    if (defaultConfigs[key] !== undefined) {
      handleChange(key, defaultConfigs[key]);
      if (key === 'SYSTEM_OPEN_PERIODS') {
        try {
          const parsed = JSON.parse(defaultConfigs[key] || '[]');
          setPeriodsList(Array.isArray(parsed) ? parsed : []);
        } catch {
          setPeriodsList([]);
        }
      }
    }
  };

  // Sync periods list changes to configs['SYSTEM_OPEN_PERIODS']
  const updatePeriodsList = (newList) => {
    setPeriodsList(newList);
    const jsonStr = JSON.stringify(newList, null, 2);
    handleChange('SYSTEM_OPEN_PERIODS', jsonStr);
    setJsonError('');
  };

  const handleAddPeriod = () => {
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const newPeriod = {
      open: toSqlDateTime(toDateTimeLocal(now.toISOString())),
      close: toSqlDateTime(toDateTimeLocal(oneWeekLater.toISOString()))
    };
    updatePeriodsList([...periodsList, newPeriod]);
  };

  const handleRemovePeriod = (index) => {
    const updated = periodsList.filter((_, idx) => idx !== index);
    updatePeriodsList(updated);
  };

  const handlePeriodChange = (index, field, value) => {
    const updated = [...periodsList];
    updated[index] = {
      ...updated[index],
      [field]: toSqlDateTime(value)
    };
    updatePeriodsList(updated);
  };

  const handleRawJsonChange = (rawText) => {
    handleChange('SYSTEM_OPEN_PERIODS', rawText);
    try {
      const parsed = JSON.parse(rawText || '[]');
      if (Array.isArray(parsed)) {
        setPeriodsList(parsed);
        setJsonError('');
      } else {
        setJsonError('รูปแบบ JSON ต้องเป็น Array e.g. [{"open": "...", "close": "..."}]');
      }
    } catch (e) {
      setJsonError(`JSON Syntax ผิดพลาด: ${e.message}`);
    }
  };

  const handleSave = async () => {
    if (!canEdit) return;

    // Check JSON error
    if (jsonError) {
      setFeedback({ type: 'error', message: 'กรุณาแก้ไขข้อผิดพลาดของรูปแบบช่วงเวลา JSON ก่อนบันทึก' });
      return;
    }

    setIsSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await fetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify(configs)
      });

      const resData = await response.json();
      if (response.ok) {
        setFeedback({ type: 'success', message: resData.message || 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว' });
        // Refresh system info
        const infoRes = await fetch(`${API_BASE}/config/system-info`);
        if (infoRes.ok) setSystemInfo(await infoRes.json());
      } else {
        setFeedback({ type: 'error', message: resData.message || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' });
      }
    } catch (err) {
      console.error("Save config error:", err);
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setFeedback(prev => (prev.type === 'success' ? { type: '', message: '' } : prev));
      }, 5000);
    }
  };

  const handleResetAllToDefaults = async () => {
    if (!canEdit) return;
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการคืนค่าการตั้งค่าทั้งหมดกลับเป็น "ค่ามาตรฐานเริ่มต้น (System Defaults)"?')) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/config/reset-defaults`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('admin_token') || ''}`
        }
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'คืนค่ามาตรฐานของระบบเรียบร้อยแล้ว' });
        await fetchAllData();
      } else {
        setFeedback({ type: 'error', message: 'ไม่สามารถคืนค่ามาตรฐานได้' });
      }
    } catch (err) {
      console.error("Reset defaults error:", err);
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to get status of a period item
  const getPeriodStatus = (period) => {
    if (!period.open && !period.close) return { text: 'เปิดตลอดเวลา', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    const now = new Date();
    const openTime = period.open ? new Date(period.open) : null;
    const closeTime = period.close ? new Date(period.close) : null;

    if (openTime && isNaN(openTime.getTime())) return { text: 'รูปแบบวันที่ไม่ถูกต้อง', color: 'bg-red-100 text-red-800 border-red-300' };
    if (closeTime && isNaN(closeTime.getTime())) return { text: 'รูปแบบวันที่ไม่ถูกต้อง', color: 'bg-red-100 text-red-800 border-red-300' };

    if (openTime && closeTime) {
      if (now >= openTime && now <= closeTime) return { text: '🟢 กำลังเปิดรับสมัคร', color: 'bg-green-100 text-green-800 border-green-300 font-semibold' };
      if (now < openTime) return { text: '🟡 ยังไม่ถึงเวลา', color: 'bg-amber-100 text-amber-800 border-amber-300 font-medium' };
      return { text: '⚪ สิ้นสุดแล้ว', color: 'bg-gray-100 text-gray-600 border-gray-300' };
    } else if (openTime) {
      if (now >= openTime) return { text: '🟢 กำลังเปิดรับสมัคร (ไม่มีวันปิด)', color: 'bg-green-100 text-green-800 border-green-300 font-semibold' };
      return { text: '🟡 ยังไม่ถึงเวลา', color: 'bg-amber-100 text-amber-800 border-amber-300 font-medium' };
    } else if (closeTime) {
      if (now <= closeTime) return { text: '🟢 กำลังเปิดรับสมัคร (จนถึงวันปิด)', color: 'bg-green-100 text-green-800 border-green-300 font-semibold' };
      return { text: '⚪ สิ้นสุดแล้ว', color: 'bg-gray-100 text-gray-600 border-gray-300' };
    }
    return { text: 'ไม่ระบุ', color: 'bg-gray-100 text-gray-600 border-gray-300' };
  };

  const isOnline = configs['SYSTEM_IS_ONLINE'] === 'true';
  const sessionSeconds = parseInt(configs['SESSION_TIMEOUT'] || '3600', 10);
  const sessionMinutes = Math.floor(sessionSeconds / 60);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
        <p className="text-slate-600 font-medium">กำลังโหลดข้อมูลการตั้งค่าระบบ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#002868] to-[#004b99] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl">
              <Settings className="w-6 h-6 text-[#ffc107]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ตั้งค่าระบบ (System Configuration)</h1>
              <p className="text-white/80 text-sm">จัดการสถานะการเปิดรับสมัคร, ค่าเริ่มต้นแบบฟอร์ม และสภาพแวดล้อมระบบ (.NET Core API)</p>
            </div>
          </div>
        </div>

        {/* Live System Status Widget */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 px-4 flex items-center gap-4 text-xs">
          <div>
            <div className="text-white/70 mb-0.5">สถานะระบบปัจจุบัน</div>
            <div className="flex items-center gap-1.5 font-bold text-sm">
              {systemInfo?.isRegistrationOpen ? (
                <span className="flex items-center gap-1.5 text-green-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>
                  เปิดรับสมัครตามปกติ
                </span>
              ) : !isOnline ? (
                <span className="flex items-center gap-1.5 text-rose-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                  ปิดปรับปรุงระบบ
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  นอกช่วงเวลารับสมัคร
                </span>
              )}
            </div>
          </div>
          <div className="h-8 w-px bg-white/20"></div>
          <div>
            <div className="text-white/70 mb-0.5">เวลาเซิร์ฟเวอร์ (Server Time)</div>
            <div className="font-mono font-medium text-white/95">{systemInfo?.serverLocalTime || new Date().toLocaleTimeString()}</div>
          </div>
          <button 
            onClick={fetchAllData} 
            title="รีเฟรชข้อมูล"
            className="p-2 hover:bg-white/20 rounded-lg transition text-white/80 hover:text-white ml-1"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Read-Only Notice if no edit permission */}
      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800 text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">สิทธิ์การเข้าถึง: ดูอย่างเดียว (Read-Only)</div>
            <div>บัญชีของคุณมีสิทธิ์เข้าชมการตั้งค่าระบบเท่านั้น ไม่สามารถแก้ไขหรือบันทึกการเปลี่ยนแปลงได้</div>
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {feedback.message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium flex-1">{feedback.message}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-2xl shadow-sm gap-2">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`py-3.5 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'schedule'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          1. การเปิด-ปิดระบบ & ช่วงเวลารับสมัคร
        </button>

        <button
          onClick={() => setActiveTab('tab4')}
          className={`py-3.5 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'tab4'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          2. ค่าเริ่มต้นแบบฟอร์ม (ส่วนที่ 4 ข้อมูลใบอนุญาต)
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`py-3.5 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'system'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Server className="w-4 h-4" />
          3. สภาพแวดล้อมและความปลอดภัย (.NET & Security)
        </button>
      </div>

      {/* Tab Content Container */}
      <div className="bg-white rounded-b-2xl shadow-sm border border-slate-200 border-t-0 p-6 md:p-8 space-y-6">
        
        {/* ======================================================== */}
        {/* TAB 1: SCHEDULE & AVAILABILITY */}
        {/* ======================================================== */}
        {activeTab === 'schedule' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Master Online Switch */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className={`inline-block w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-rose-500'}`}></span>
                  <label htmlFor="sysOnlineToggle" className="font-bold text-slate-900 text-base cursor-pointer">
                    เปิดใช้งานระบบลงทะเบียน (SYSTEM_IS_ONLINE)
                  </label>
                </div>
                <p className="text-slate-500 text-sm">
                  หากปิดสวิตช์นี้ ผู้ใช้งานทั่วไปจะไม่สามารถเข้าหน้าฟอร์มลงทะเบียนได้เลย และจะเห็นหน้าต่างแจ้งเตือนระบบปิดปรับปรุงชั่วคราว (Maintenance Mode)
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  isOnline ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {isOnline ? '🟢 ระบบออนไลน์' : '🔴 ปิดระบบชั่วคราว'}
                </span>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="sysOnlineToggle"
                    disabled={!canEdit}
                    checked={isOnline}
                    onChange={(e) => handleChange('SYSTEM_IS_ONLINE', e.target.checked ? 'true' : 'false')}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Scheduled Open Periods */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <h3 className="text-base font-bold text-slate-900">ช่วงเวลาเปิดรับสมัครตามกำหนดการ (SYSTEM_OPEN_PERIODS)</h3>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    กำหนดช่วงวันและเวลาที่อนุญาตให้ผู้สมัครเข้าใช้งาน หากปล่อยว่างไว้ (ไม่มีรายการ) ระบบจะเปิดรับสมัครตลอดเวลา
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRawJsonMode(!isRawJsonMode)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
                  >
                    {isRawJsonMode ? <Eye className="w-3.5 h-3.5 text-primary" /> : <Code2 className="w-3.5 h-3.5 text-primary" />}
                    {isRawJsonMode ? 'มุมมองตาราง (UI View)' : 'แก้ไข JSON โดยตรง (Raw JSON)'}
                  </button>

                  {!isRawJsonMode && canEdit && (
                    <button
                      type="button"
                      onClick={handleAddPeriod}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-primary hover:bg-[#002868] text-white flex items-center gap-1.5 transition shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      เพิ่มช่วงเวลา
                    </button>
                  )}
                </div>
              </div>

              {/* View 1: Visual Interactive Table */}
              {!isRawJsonMode && (
                <div className="space-y-4">
                  {periodsList.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-3">
                      <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
                      <div>
                        <div className="font-bold text-slate-700 text-sm">ไม่มีการจำกัดช่วงเวลา (เปิดรับสมัครตลอด 24 ชั่วโมง)</div>
                        <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                          ระบบจะเปิดให้ลงทะเบียนได้ตลอดเวลาตราบใดที่สวิตช์ระบบออนไลน์เปิดอยู่ คุณสามารถกด &quot;เพิ่มช่วงเวลา&quot; เพื่อกำหนดวันเปิด-ปิดที่แน่นอนได้
                        </p>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={handleAddPeriod}
                          className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 inline-flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-4 h-4" />
                          เพิ่มช่วงเวลาเปิดรับสมัคร
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase bg-slate-50/70">
                              <th className="py-2.5 px-4 font-semibold w-12 text-center">ลำดับ</th>
                              <th className="py-2.5 px-4 font-semibold">วัน-เวลาเปิดรับสมัคร (Open)</th>
                              <th className="py-2.5 px-4 font-semibold">วัน-เวลาปิดรับสมัคร (Close)</th>
                              <th className="py-2.5 px-4 font-semibold text-center w-48">สถานะช่วงเวลานี้</th>
                              {canEdit && <th className="py-2.5 px-4 font-semibold text-center w-20">จัดการ</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {periodsList.map((period, idx) => {
                              const status = getPeriodStatus(period);
                              return (
                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-4 text-center font-bold text-slate-400 text-xs">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-4">
                                    <input
                                      type="datetime-local"
                                      disabled={!canEdit}
                                      value={toDateTimeLocal(period.open)}
                                      onChange={(e) => handlePeriodChange(idx, 'open', e.target.value)}
                                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full max-w-[220px]"
                                    />
                                  </td>
                                  <td className="py-3 px-4">
                                    <input
                                      type="datetime-local"
                                      disabled={!canEdit}
                                      value={toDateTimeLocal(period.close)}
                                      onChange={(e) => handlePeriodChange(idx, 'close', e.target.value)}
                                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full max-w-[220px]"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs border ${status.color}`}>
                                      {status.text}
                                    </span>
                                  </td>
                                  {canEdit && (
                                    <td className="py-3 px-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePeriod(idx)}
                                        title="ลบช่วงเวลานี้"
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {canEdit && (
                        <div className="flex justify-between items-center pt-2">
                          <button
                            type="button"
                            onClick={() => updatePeriodsList([])}
                            className="text-xs text-rose-600 hover:underline font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> ล้างช่วงเวลาทั้งหมด (ให้เปิดตลอดเวลา)
                          </button>
                          <span className="text-xs text-slate-400">
                            ทั้งหมด {periodsList.length} ช่วงเวลา
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* View 2: Raw JSON Editor */}
              {isRawJsonMode && (
                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      rows={7}
                      disabled={!canEdit}
                      value={configs['SYSTEM_OPEN_PERIODS'] || '[]'}
                      onChange={(e) => handleRawJsonChange(e.target.value)}
                      className="w-full p-4 font-mono text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-slate-900 text-emerald-400 leading-relaxed"
                      placeholder='[{"open": "2026-06-01 08:00:00", "close": "2026-06-15 23:59:59"}]'
                    />
                  </div>

                  {jsonError ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{jsonError}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>รูปแบบ JSON ถูกต้อง</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Training Date Expiry Advance Settings */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      วันหมดอายุการเปิดรับสมัครวิชาอบรมล่วงหน้า (RENEW_COURSE_EXPIRY_DAYS_ADVANCE)
                    </h3>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    กำหนดจำนวนวันปิดรับสมัครล่วงหน้าก่อนถึงวันเปิดอบรมจริง สำหรับหน้าผู้สมัคร (Frontend) เช่น 30 วัน หรือ 7 วัน เมื่อถึงกำหนดเวลา ระบบจะซ่อนวันอบรมนั้นที่หน้าสมัครโดยอัตโนมัติ (แต่ในหน้า Admin ยังคงเห็นครบถ้วน)
                  </p>
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleResetField('RENEW_COURSE_EXPIRY_DAYS_ADVANCE')}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" /> คืนค่ามาตรฐาน (30 วัน)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1.5">
                      จำนวนวันปิดรับสมัครล่วงหน้า (วัน / Days)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="365"
                        disabled={!canEdit}
                        value={configs['RENEW_COURSE_EXPIRY_DAYS_ADVANCE'] ?? '30'}
                        onChange={(e) => handleChange('RENEW_COURSE_EXPIRY_DAYS_ADVANCE', e.target.value)}
                        className="w-32 px-3.5 py-2 text-base font-bold text-center rounded-xl border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white shadow-sm"
                      />
                      <span className="text-sm font-semibold text-slate-600">วัน ก่อนถึงวันเปิดอบรม</span>
                    </div>
                  </div>

                  {/* Preset Buttons */}
                  {canEdit && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-slate-500 font-medium">เลือกค่าที่ใช้บ่อย (Quick Presets):</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { days: '30', label: '30 วัน (มาตรฐาน)' },
                          { days: '14', label: '14 วัน (2 สัปดาห์)' },
                          { days: '7', label: '7 วัน (1 สัปดาห์)' },
                          { days: '3', label: '3 วัน' },
                          { days: '0', label: '0 วัน (ปิดในวันอบรม)' }
                        ].map((preset) => (
                          <button
                            key={preset.days}
                            type="button"
                            onClick={() => handleChange('RENEW_COURSE_EXPIRY_DAYS_ADVANCE', preset.days)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                              String(configs['RENEW_COURSE_EXPIRY_DAYS_ADVANCE'] ?? '30') === preset.days
                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Simulation / Calculation Card */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2.5 text-xs text-amber-900">
                  <div className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600" />
                    การคำนวณและจำลองผลลัพธ์ (Live Simulation)
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between py-1 border-b border-amber-200/60">
                      <span className="text-amber-800">วันที่ปัจจุบัน (Today):</span>
                      <span className="font-bold">{new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-amber-200/60">
                      <span className="text-amber-800">วันอบรมเร็วที่สุดที่มองเห็นได้:</span>
                      <span className="font-bold text-emerald-800">
                        {(() => {
                          const days = parseInt(configs['RENEW_COURSE_EXPIRY_DAYS_ADVANCE'] || '30', 10) || 0;
                          const d = new Date();
                          d.setDate(d.getDate() + days);
                          return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
                        })()}
                      </span>
                    </div>
                    <div className="pt-1 text-[11px] text-amber-800/90 leading-relaxed">
                      💡 <strong>หลักการทำงาน:</strong> หากวันเปิดอบรมใดเหลือเวลาน้อยกว่า <strong>{configs['RENEW_COURSE_EXPIRY_DAYS_ADVANCE'] || 30} วัน</strong> ระบบจะถือว่าหมดเขตรับสมัคร และปิดการแสดงผลที่หน้าสมัครของผู้ใช้ทันที
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: FORM DEFAULTS & TAB 4 HINTS */}
        {/* ======================================================== */}
        {activeTab === 'tab4' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Allowed Agent Types */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    1. ประเภทใบอนุญาตที่เปิดรับสมัคร (tab4_allowed_agent_types)
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    กำหนดให้แบบฟอร์มเปิดรับสมัครสำหรับ ตัวแทน, นายหน้า หรือให้ผู้สมัครเลือกได้ทั้งสองประเภท
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleResetField('tab4_allowed_agent_types')}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" /> ค่าเริ่มต้น
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {[
                  { value: 'both', label: 'แสดงทั้งคู่ (เลือกได้อย่างใดอย่างหนึ่ง)', desc: 'ผู้สมัครสามารถเลือกเป็นตัวแทนหรือนายหน้าก็ได้' },
                  { value: 'agent', label: 'เฉพาะ ตัวแทนประกันวินาศภัย', desc: 'ล็อคแบบฟอร์มให้เลือกเฉพาะตัวแทนเท่านั้น' },
                  { value: 'broker', label: 'เฉพาะ นายหน้าประกันวินาศภัย', desc: 'ล็อคแบบฟอร์มให้เลือกเฉพาะนายหน้าเท่านั้น' }
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`border rounded-xl p-4 cursor-pointer flex flex-col justify-between transition ${
                      configs['tab4_allowed_agent_types'] === opt.value
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-slate-800">{opt.label}</span>
                        <input
                          type="radio"
                          name="tab4_allowed_agent_types"
                          disabled={!canEdit}
                          checked={configs['tab4_allowed_agent_types'] === opt.value}
                          onChange={() => handleChange('tab4_allowed_agent_types', opt.value)}
                          className="accent-primary w-4 h-4"
                        />
                      </div>
                      <p className="text-xs text-slate-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Branch & Region Settings */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-6">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                2. ข้อมูลสังกัดสาขาและภาค (Branch & Region Configuration)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Branch Label */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">ข้อความหัวข้อ สาขา (tab4_label_branch)</label>
                    {canEdit && (
                      <button type="button" onClick={() => handleResetField('tab4_label_branch')} className="text-[11px] text-slate-400 hover:text-primary">
                        Default: &quot;สาขา *&quot;
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={configs['tab4_label_branch'] || ''}
                    onChange={(e) => handleChange('tab4_label_branch', e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Branch Hint */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">ข้อความแนะนำ สาขา (tab4_hint_branch)</label>
                    {canEdit && (
                      <button type="button" onClick={() => handleResetField('tab4_hint_branch')} className="text-[11px] text-slate-400 hover:text-primary">
                        Default: &quot;พิมพ์เพื่อค้นหาสาขา&quot;
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={configs['tab4_hint_branch'] || ''}
                    onChange={(e) => handleChange('tab4_hint_branch', e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Default Branch */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">สาขาเริ่มต้น (tab4_default_branch)</label>
                    <span className="text-[11px] text-slate-400">เว้นว่างไว้หากไม่ต้องการเติมอัตโนมัติ</span>
                  </div>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={configs['tab4_default_branch'] || ''}
                    onChange={(e) => handleChange('tab4_default_branch', e.target.value)}
                    placeholder="เช่น สาขาสำนักงานใหญ่"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Region Label */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">ข้อความหัวข้อ ภาค (tab4_label_region)</label>
                    {canEdit && (
                      <button type="button" onClick={() => handleResetField('tab4_label_region')} className="text-[11px] text-slate-400 hover:text-primary">
                        Default: &quot;ภาค *&quot;
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={configs['tab4_label_region'] || ''}
                    onChange={(e) => handleChange('tab4_label_region', e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Region Hint */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">ข้อความแนะนำ ภาค (tab4_hint_region)</label>
                    {canEdit && (
                      <button type="button" onClick={() => handleResetField('tab4_hint_region')} className="text-[11px] text-slate-400 hover:text-primary">
                        Default: &quot;ระบบจะเติมให้อัตโนมัติ&quot;
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={configs['tab4_hint_region'] || ''}
                    onChange={(e) => handleChange('tab4_hint_region', e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Viriyah Agent Code Settings */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-6">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                3. ข้อมูลรหัสสัญญา บมจ.วิริยะประกันภัย (Agent Code Configuration)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Agent Code Label */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">ข้อความหัวข้อ รหัสตัวแทน (tab4_label_agentcode)</label>
                    {canEdit && (
                      <button type="button" onClick={() => handleResetField('tab4_label_agentcode')} className="text-[11px] text-slate-400 hover:text-primary">
                        Default
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={configs['tab4_label_agentcode'] || ''}
                    onChange={(e) => handleChange('tab4_label_agentcode', e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Default Agent Code */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">รหัสตัวแทนเริ่มต้น (tab4_default_agentcode)</label>
                    <span className="text-[11px] text-slate-400">เว้นว่างไว้หากให้ผู้สมัครกรอกเอง</span>
                  </div>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={configs['tab4_default_agentcode'] || ''}
                    onChange={(e) => handleChange('tab4_default_agentcode', e.target.value)}
                    placeholder="เช่น 00000"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Agent Code Hint */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">คำแนะนำ: รหัสตัวแทน (tab4_hint_agentcode)</label>
                    {canEdit && (
                      <button type="button" onClick={() => handleResetField('tab4_hint_agentcode')} className="text-[11px] text-slate-400 hover:text-primary">
                        Default
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    disabled={!canEdit}
                    value={configs['tab4_hint_agentcode'] || ''}
                    onChange={(e) => handleChange('tab4_hint_agentcode', e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SYSTEM ENVIRONMENT & SECURITY */}
        {/* ======================================================== */}
        {activeTab === 'system' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* System Runtime Configuration */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-6">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                การตั้งค่าระบบและสภาพแวดล้อม (System Environment)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* APP_ENV */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    โหมดสภาพแวดล้อม (APP_ENV)
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" title="เลือกสภาพแวดล้อมการทำงานของระบบ" />
                  </label>
                  <select
                    disabled={!canEdit}
                    value={configs['APP_ENV'] || 'prd'}
                    onChange={(e) => handleChange('APP_ENV', e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                  >
                    <option value="prd">Production (prd) - ระบบจริงสำหรับใช้งานทั่วไป</option>
                    <option value="uat">UAT (uat) - ระบบทดสอบการใช้งาน</option>
                    <option value="dev">Development (dev) - สภาพแวดล้อมสำหรับพัฒนา</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    ระบุโหมดการทำงานของแอพพลิเคชันเพื่อใช้แยกแยะบริบทการทำงาน
                  </p>
                </div>

                {/* Session Timeout */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">Session Timeout (วินาที)</label>
                    <span className="text-xs font-semibold text-primary">
                      {sessionMinutes} นาที ({sessionSeconds} วินาที)
                    </span>
                  </div>
                  <input
                    type="number"
                    min={60}
                    step={60}
                    disabled={!canEdit}
                    value={configs['SESSION_TIMEOUT'] || '3600'}
                    onChange={(e) => handleChange('SESSION_TIMEOUT', e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[11px] text-slate-500">
                    เช่น 3600 คือ 1 ชั่วโมง, 7200 คือ 2 ชั่วโมง (ค่าขั้นต่ำ 60 วินาที)
                  </p>
                </div>
              </div>
            </div>

            {/* Server Runtime & Diagnostics Info Card */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/70 space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                ข้อมูลสภาพแวดล้อมระบบ .NET (Server & Runtime Info)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="text-slate-400 text-[11px] mb-1">.NET Runtime Framework</div>
                  <div className="font-bold text-slate-800 text-sm font-mono">{systemInfo?.dotnetVersion || '.NET 8.0'}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="text-slate-400 text-[11px] mb-1">Operating System & Arch</div>
                  <div className="font-bold text-slate-800 truncate" title={systemInfo?.osDescription}>
                    {systemInfo?.osDescription || 'Linux Container'} ({systemInfo?.processArchitecture || 'X64'})
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="text-slate-400 text-[11px] mb-1">Database Provider</div>
                  <div className="font-bold text-slate-800 font-mono">{systemInfo?.databaseProvider || 'Microsoft.EntityFrameworkCore.SqlServer'}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="text-slate-400 text-[11px] mb-1">ASP.NET Core Environment</div>
                  <div className="font-bold text-slate-800">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                      {systemInfo?.environment || 'Production'}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="text-slate-400 text-[11px] mb-1">Server Local Time</div>
                  <div className="font-bold text-slate-800 font-mono">{systemInfo?.serverLocalTime || '-'}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="text-slate-400 text-[11px] mb-1">Server UTC Time</div>
                  <div className="font-bold text-slate-800 font-mono">{systemInfo?.serverUtcTime || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer Bar */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={handleResetAllToDefaults}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              คืนค่ามาตรฐานทั้งหมด (Reset All Defaults)
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={fetchAllData}
            disabled={isSaving}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> ยกเลิกการแก้ไข
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 py-2.5 text-xs font-bold rounded-xl text-white shadow-md flex items-center gap-2 transition ${
                isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-[#002868]'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  กำลังบันทึกข้อมูล...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  บันทึกการตั้งค่าทั้งหมด
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

