import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, Calendar, TrendingUp, CheckCircle, Clock, 
  Briefcase, UserCheck, RefreshCw, BarChart3, PieChart, 
  ArrowRight, ShieldCheck, FileSpreadsheet, Settings, Database, Activity,
  Filter, RotateCcw, ChevronLeft, ChevronRight, Award, GraduationCap,
  CheckCircle2, XCircle, AlertTriangle, Search, FileCheck2, Sparkles,
  BookOpen, CalendarDays, ExternalLink, HelpCircle, ChevronDown, ChevronUp,
  Layers, ListFilter, CheckSquare
} from 'lucide-react';



const formatDateForInput = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function Dashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [hoveredBar, setHoveredBar] = useState(null);

  // 2-Perspective Course Hierarchy States
  const [courseHierarchySearch, setCourseHierarchySearch] = useState('');
  const [expandedCourses, setExpandedCourses] = useState({}); // { [courseName]: boolean }

  // Training Search & Filter States
  const [traineeQuery, setTraineeQuery] = useState('');
  const [traineeResults, setTraineeResults] = useState([]);
  const [isSearchingTrainee, setIsSearchingTrainee] = useState(false);
  const [courseDateQuery, setCourseDateQuery] = useState('');
  const [courseDateFilter, setCourseDateFilter] = useState('all'); // 'all', '100pct', 'hasFailed'

  // Trend Controls
  const [trendPreset, setTrendPreset] = useState('30'); // '7', '14', '30', '60', 'custom'
  const [trendStartDate, setTrendStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return formatDateForInput(d);
  });
  const [trendEndDate, setTrendEndDate] = useState(() => formatDateForInput(new Date()));

  // Course Filter Controls
  const [coursePreset, setCoursePreset] = useState('all'); // 'all', 'today', 'thisMonth', 'custom'
  const [courseStartDate, setCourseStartDate] = useState('');
  const [courseEndDate, setCourseEndDate] = useState('');

  const trendScrollRef = useRef(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (trendStartDate) params.append('trendStartDate', trendStartDate);
      if (trendEndDate) params.append('trendEndDate', trendEndDate);
      if (courseStartDate) params.append('courseStartDate', courseStartDate);
      if (courseEndDate) params.append('courseEndDate', courseEndDate);

      const res = await fetch(`${API_BASE_URL}/admin/dashboard-stats?${params.toString()}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token, trendStartDate, trendEndDate, courseStartDate, courseEndDate]);

  // Trainee Training Status Search Effect
  useEffect(() => {
    if (!traineeQuery.trim()) {
      setTraineeResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingTrainee(true);
      try {
        const res = await fetch(`${API_BASE_URL}/admin/trainee-training-status?search=${encodeURIComponent(traineeQuery.trim())}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        if (res.ok) {
          const data = await res.json();
          setTraineeResults(data);
        }
      } catch (e) {
        console.error('Failed to search trainee training status:', e);
      } finally {
        setIsSearchingTrainee(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [traineeQuery, token]);

  // Filter Course Date Matrix
  const filteredCourseDates = (stats?.courseDateCompletion || []).filter(item => {
    const q = courseDateQuery.toLowerCase();
    const matchesSearch = !q || 
      (item.courseCode && item.courseCode.toLowerCase().includes(q)) ||
      (item.courseName && item.courseName.toLowerCase().includes(q)) ||
      (item.trainingDate && item.trainingDate.toLowerCase().includes(q));
    
    if (!matchesSearch) return false;
    if (courseDateFilter === '100pct') return item.passRatePercent === 100;
    if (courseDateFilter === 'hasFailed') return item.failedCount > 0;
    return true;
  });

  // Filter 2-Perspective Course Hierarchy (มุมมองรายวิชา & รายรอบ)
  const filteredCourseHierarchy = (stats?.courseHierarchyAnalytics || []).filter(course => {
    const q = courseHierarchySearch.toLowerCase();
    if (!q) return true;
    return (
      (course.courseName && course.courseName.toLowerCase().includes(q)) ||
      (course.courseCode && course.courseCode.toLowerCase().includes(q)) ||
      (course.rounds && course.rounds.some(r => r.roundDate && r.roundDate.toLowerCase().includes(q)))
    );
  });

  // Toggle Course Accordion
  const toggleCourseExpand = (cName) => {
    setExpandedCourses(prev => ({
      ...prev,
      [cName]: !prev[cName]
    }));
  };

  const expandAllCourses = () => {
    const all = {};
    (stats?.courseHierarchyAnalytics || []).forEach(c => {
      all[c.courseName] = true;
    });
    setExpandedCourses(all);
  };

  const collapseAllCourses = () => {
    setExpandedCourses({});
  };

  // Scroll to rightmost (most recent date) when dailyTrend changes
  useEffect(() => {
    if (trendScrollRef.current) {
      trendScrollRef.current.scrollLeft = trendScrollRef.current.scrollWidth;
    }
  }, [stats?.dailyTrend]);

  // Trend Preset Click
  const handleTrendPreset = (days) => {
    setTrendPreset(days.toString());
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setTrendStartDate(formatDateForInput(start));
    setTrendEndDate(formatDateForInput(end));
  };

  // Course Preset Click
  const handleCoursePreset = (preset) => {
    setCoursePreset(preset);
    const today = new Date();
    if (preset === 'all') {
      setCourseStartDate('');
      setCourseEndDate('');
    } else if (preset === 'today') {
      const dStr = formatDateForInput(today);
      setCourseStartDate(dStr);
      setCourseEndDate(dStr);
    } else if (preset === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setCourseStartDate(formatDateForInput(start));
      setCourseEndDate(formatDateForInput(today));
    }
  };

  const maxDailyCount = stats?.dailyTrend?.reduce((max, d) => Math.max(max, d.count), 0) || 1;

  // Distinct vibrant colors for courses
  const courseColors = [
    'bg-blue-500 text-blue-600 border-blue-200',
    'bg-emerald-500 text-emerald-600 border-emerald-200',
    'bg-amber-500 text-amber-600 border-amber-200',
    'bg-purple-500 text-purple-600 border-purple-200',
    'bg-rose-500 text-rose-600 border-rose-200',
    'bg-indigo-500 text-indigo-600 border-indigo-200',
    'bg-cyan-500 text-cyan-600 border-cyan-200',
    'bg-orange-500 text-orange-600 border-orange-200',
    'bg-teal-500 text-teal-600 border-teal-200',
    'bg-pink-500 text-pink-600 border-pink-200',
  ];

  const scrollTrend = (direction) => {
    if (trendScrollRef.current) {
      trendScrollRef.current.scrollBy({ left: direction * 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide uppercase mb-1">
            <Activity className="w-4 h-4 animate-pulse text-[#ffc107]" />
            <span>Executive Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            ระบบรายงานและสถิติผู้สมัครอบรม
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            แสดงสถิติ Real-time ยอดผู้สมัครรวม, ยอดสมัครวันนี้, สัดส่วนแยกตามหลักสูตร และแนวโน้มการสมัคร
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="text-right text-xs text-slate-500 hidden sm:block">
            <div>อัปเดตล่าสุด</div>
            <div className="font-semibold text-slate-700">
              {lastUpdated.toLocaleTimeString('th-TH')}
            </div>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition shadow-sm font-medium text-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <span className="text-blue-100 text-xs font-semibold uppercase tracking-wider">ยอดผู้สมัครรวมทั้งหมด</span>
            <div className="p-2 bg-white/15 rounded-lg backdrop-blur-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold">
              {stats?.totalApplicants?.toLocaleString() ?? 0}
              <span className="text-sm font-normal text-blue-200 ml-1.5">คน</span>
            </div>
            <div className="mt-2 text-xs text-blue-100 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>ข้อมูลทั้งหมดในฐานข้อมูล</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <span className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">ยอดสมัครวันนี้</span>
            <div className="p-2 bg-white/15 rounded-lg backdrop-blur-sm">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold">
              {stats?.todayApplicants?.toLocaleString() ?? 0}
              <span className="text-sm font-normal text-emerald-200 ml-1.5">คน</span>
            </div>
            <div className="mt-2 text-xs text-emerald-100 flex items-center justify-between">
              <span>ประจำวันที่ {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] font-bold">วันนี้</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <span className="text-amber-100 text-xs font-semibold uppercase tracking-wider">ยอดสมัครเดือนนี้</span>
            <div className="p-2 bg-white/15 rounded-lg backdrop-blur-sm">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold">
              {stats?.thisMonthApplicants?.toLocaleString() ?? 0}
              <span className="text-sm font-normal text-amber-200 ml-1.5">คน</span>
            </div>
            <div className="mt-2 text-xs text-amber-100">
              <span>ประจำเดือน {new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-violet-800 text-white rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <span className="text-purple-100 text-xs font-semibold uppercase tracking-wider">สัดส่วนประเภทใบอนุญาต</span>
            <div className="p-2 bg-white/15 rounded-lg backdrop-blur-sm">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-purple-200">ตัวแทนประกัน</div>
              <div className="text-xl font-bold">{stats?.agentCount ?? 0} <span className="text-xs font-normal">คน</span></div>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div>
              <div className="text-xs text-purple-200">นายหน้าประกัน</div>
              <div className="text-xl font-bold">{stats?.brokerCount ?? 0} <span className="text-xs font-normal">คน</span></div>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-purple-200 bg-white/10 rounded px-2 py-1 flex justify-between items-center">
            <span>ยืนยันข้อมูลแล้ว: <b>{stats?.confirmedCount ?? 0}</b></span>
            <span>รอยืนยัน: <b>{stats?.pendingCount ?? 0}</b></span>
          </div>
        </div>
      </div>

      {/* Training Results Performance KPI Row */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-indigo-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 text-amber-400 rounded-xl border border-amber-400/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>สรุปผลการอบรม & การประทับสถานะ (Training Results & Pass Rate)</span>
                <span className="text-[11px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30 font-normal">
                  Live Stamp Sync
                </span>
              </h2>
              <p className="text-xs text-indigo-200/80">
                ข้อมูลสถานะการผ่านอบรมจริงจากไฟล์ Excel และการจับคู่กับผู้สมัครในระบบ
              </p>
            </div>
          </div>
          <Link
            to="/admin/training-import"
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>นำเข้าผลอบรม Excel เพิ่มเติม</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Passed */}
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-4 border border-emerald-500/30 transition">
            <div className="flex justify-between items-start">
              <span className="text-emerald-300 text-xs font-semibold">ผ่านการอบรมแล้ว (Passed)</span>
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {stats?.trainingOverview?.totalPassedCount?.toLocaleString() ?? 0}
                <span className="text-xs font-normal text-emerald-200 ml-1.5">รายการ</span>
              </div>
              <div className="mt-1.5 text-[11px] text-emerald-200/90 flex items-center gap-1">
                <span>ผู้เรียนที่ผ่าน: <b>{stats?.trainingOverview?.totalUniquePassedTrainees ?? 0}</b> คน</span>
              </div>
            </div>
          </div>

          {/* Failed / Pending */}
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-4 border border-rose-500/30 transition">
            <div className="flex justify-between items-start">
              <span className="text-rose-300 text-xs font-semibold">ไม่ผ่านการอบรม (Failed)</span>
              <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {stats?.trainingOverview?.totalFailedCount?.toLocaleString() ?? 0}
                <span className="text-xs font-normal text-rose-200 ml-1.5">รายการ</span>
              </div>
              <div className="mt-1.5 text-[11px] text-rose-200/90">
                <span>ต้องลงทะเบียนสอบซ่อม/อบรมใหม่</span>
              </div>
            </div>
          </div>

          {/* Pass Rate % */}
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-4 border border-blue-500/30 transition">
            <div className="flex justify-between items-start">
              <span className="text-blue-300 text-xs font-semibold">อัตราผ่านการอบรม (Pass Rate)</span>
              <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {stats?.trainingOverview?.overallPassRate ?? 0}%
              </div>
              <div className="mt-1.5 text-[11px] text-blue-200/90">
                <span>จากผลนำเข้าทั้งหมด {stats?.trainingOverview?.totalTrainingRecords ?? 0} รายการ</span>
              </div>
            </div>
          </div>

          {/* Course Rounds & Mismatches */}
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-4 border border-amber-500/30 transition">
            <div className="flex justify-between items-start">
              <span className="text-amber-300 text-xs font-semibold">รอบอบรมที่ประทับผล</span>
              <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {stats?.trainingOverview?.totalCourseDateRounds ?? 0}
                <span className="text-xs font-normal text-amber-200 ml-1.5">รอบอบรม</span>
              </div>
              <div className="mt-1.5 text-[11px] text-amber-200/90 flex items-center justify-between">
                <span>ข้อมูลต่าง (Mismatch):</span>
                <span className={`px-1.5 py-0.2 rounded font-bold ${(stats?.trainingOverview?.mismatchCount ?? 0) > 0 ? 'bg-amber-400/30 text-amber-300' : 'text-slate-300'}`}>
                  {stats?.trainingOverview?.mismatchCount ?? 0} รายการ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Horizontal Scrollable Registration Trend (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                  กราฟแนวโน้มการสมัคร
                </h3>
              </div>

              {/* Quick Presets & Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: '7 วัน', val: 7 },
                  { label: '14 วัน', val: 14 },
                  { label: '30 วัน', val: 30 },
                  { label: '60 วัน', val: 60 },
                ].map(p => (
                  <button
                    key={p.val}
                    onClick={() => handleTrendPreset(p.val)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                      trendPreset === p.val.toString()
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range Picker for Trend */}
            <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200 mb-3">
              <span className="text-slate-500 font-medium">ช่วงวันที่:</span>
              <input
                type="date"
                value={trendStartDate}
                onChange={(e) => {
                  setTrendPreset('custom');
                  setTrendStartDate(e.target.value);
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:ring-1 focus:ring-primary focus:border-primary"
              />
              <span className="text-slate-400">ถึง</span>
              <input
                type="date"
                value={trendEndDate}
                onChange={(e) => {
                  setTrendPreset('custom');
                  setTrendEndDate(e.target.value);
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:ring-1 focus:ring-primary focus:border-primary"
              />
              <span className="text-slate-400 text-[11px] ml-auto">
                (เลื่อนซ้าย-ขวา เพื่อดูวันย้อนหลัง)
              </span>
            </div>
          </div>

          {/* Scrollable Container with navigation buttons */}
          <div className="relative pt-2 pb-2">
            {/* Scroll Left/Right Helper Buttons */}
            <div className="flex justify-end gap-1 mb-2">
              <button
                onClick={() => scrollTrend(-1)}
                title="เลื่อนไปทางซ้าย"
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollTrend(1)}
                title="เลื่อนไปทางขวา"
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Bar Area */}
            <div 
              ref={trendScrollRef}
              className="overflow-x-auto pb-3 pt-4 custom-scrollbar scroll-smooth"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div 
                className="flex items-end gap-2 h-48 sm:h-56 border-b border-slate-200 px-2"
                style={{ minWidth: `${Math.max((stats?.dailyTrend?.length || 0) * 38, 420)}px` }}
              >
                {stats?.dailyTrend?.map((item, idx) => {
                  const heightPercent = maxDailyCount > 0 ? (item.count / maxDailyCount) * 100 : 0;
                  const isHovered = hoveredBar === idx;
                  const isToday = idx === stats.dailyTrend.length - 1;

                  return (
                    <div
                      key={idx}
                      className="flex-1 min-w-[32px] max-w-[48px] flex flex-col items-center h-full justify-end group cursor-pointer relative"
                      onMouseEnter={() => setHoveredBar(idx)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Tooltip on Hover */}
                      {isHovered && (
                        <div className="absolute -top-12 z-20 bg-slate-800 text-white text-xs rounded-md py-1 px-2.5 shadow-lg whitespace-nowrap pointer-events-none transition-all">
                          <div className="font-bold">{item.label}</div>
                          <div className="text-emerald-300 font-semibold">{item.count} คน</div>
                        </div>
                      )}

                      {/* Bar */}
                      <div className="w-full flex items-end justify-center h-full pb-1">
                        <div
                          style={{ height: `${Math.max(heightPercent, 4)}%` }}
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            isToday
                              ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-md shadow-emerald-200'
                              : isHovered
                              ? 'bg-gradient-to-t from-primary to-blue-400 shadow-md'
                              : item.count > 0
                              ? 'bg-gradient-to-t from-[#243c84] to-blue-500 opacity-90'
                              : 'bg-slate-200'
                          }`}
                        >
                          {item.count > 0 && (
                            <div className="text-[10px] text-center font-bold text-white pt-0.5">
                              {item.count}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* X-axis Label */}
                      <span className={`text-[10px] mt-2 truncate w-full text-center ${
                        isToday ? 'font-bold text-emerald-700' : 'text-slate-500'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Chart Legend */}
            <div className="flex items-center justify-between text-xs text-slate-500 mt-3 px-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#243c84]"></span>
                  <span>วันก่อนหน้า</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
                  <span>วันนี้</span>
                </div>
              </div>
              <div>รวมช่วงนี้: <b>{stats?.dailyTrend?.reduce((sum, d) => sum + d.count, 0) ?? 0} คน</b> ({stats?.dailyTrend?.length ?? 0} วัน)</div>
            </div>
          </div>
        </div>

        {/* Right Column: Course Distribution (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                  สัดส่วนแยกตามวิชา / หลักสูตร
                </h3>
              </div>
              <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                {stats?.courseDistribution?.length ?? 0} รายการ
              </span>
            </div>

            {/* Course Filter Controls */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg mb-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-slate-600 font-semibold">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <span>กรองตามช่วงวันที่:</span>
                </div>

                <div className="flex items-center gap-1">
                  {[
                    { key: 'all', label: 'ทั้งหมด' },
                    { key: 'today', label: 'วันนี้' },
                    { key: 'thisMonth', label: 'เดือนนี้' }
                  ].map(btn => (
                    <button
                      key={btn.key}
                      onClick={() => handleCoursePreset(btn.key)}
                      className={`px-2 py-0.5 text-[11px] rounded font-medium transition cursor-pointer ${
                        coursePreset === btn.key && !courseStartDate
                          ? 'bg-primary text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={courseStartDate}
                  onChange={(e) => {
                    setCoursePreset('custom');
                    setCourseStartDate(e.target.value);
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 w-full focus:ring-1 focus:ring-primary focus:border-primary"
                />
                <span className="text-slate-400">ถึง</span>
                <input
                  type="date"
                  value={courseEndDate}
                  onChange={(e) => {
                    setCoursePreset('custom');
                    setCourseEndDate(e.target.value);
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 w-full focus:ring-1 focus:ring-primary focus:border-primary"
                />
                {(courseStartDate || courseEndDate) && (
                  <button
                    onClick={() => handleCoursePreset('all')}
                    title="ล้างตัวกรอง"
                    className="p-1 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Course List with Visual Progress Bars */}
            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {stats?.courseDistribution && stats.courseDistribution.length > 0 ? (
                stats.courseDistribution.map((c, idx) => {
                  const colorClass = courseColors[idx % courseColors.length];
                  const cName = c.courseName || c.CourseName || 'ไม่ระบุวิชา';
                  const cCount = c.count ?? c.Count ?? 0;
                  const cPct = c.percentage ?? c.Percentage ?? 0;
                  const cId = c.courseId || c.CourseId || idx;

                  return (
                    <div key={cId} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-slate-700">
                        <span className="truncate pr-2 font-semibold" title={cName}>
                          <span className="text-slate-400 mr-1.5">#{idx + 1}</span>
                          {cName}
                        </span>
                        <span className="shrink-0 text-slate-600 font-bold">
                          {cCount} คน <span className="text-slate-400 font-normal">({cPct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${colorClass.split(' ')[0]}`}
                          style={{ width: `${Math.max(cPct, 2)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  {courseStartDate || courseEndDate 
                    ? 'ไม่พบข้อมูลผู้สมัครในช่วงวันที่ที่เลือก' 
                    : 'ยังไม่มีข้อมูลผู้สมัครตามวิชา'}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>รวมทั้งหมดตามวิชา</span>
            <span className="font-bold text-slate-800">
              {stats?.courseDistribution?.reduce((sum, c) => sum + (c.count ?? c.Count ?? 0), 0) ?? 0} คน/รายการ
            </span>
          </div>
        </div>
      </div>

      {/* 2-PERSPECTIVE COURSE ANALYTICS: สรุปภาพรวมรายวิชา & เจาะลึกรายรอบ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <span>สถิติวิเคราะห์รายวิชา & การเปิดรอบอบรม (Course & Multi-Round Analytics)</span>
                <span className="text-xs font-normal text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  วิเคราะห์ 2 มุมมอง
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                มุมที่ 1: สรุปภาพรวมระดับวิชา (เปิดกี่รอบ, ยอดเข้าอบรม, คนผ่านทั้งหมด) • มุมที่ 2: เจาะลึกรายรอบ (วันที่จัด, คนผ่านในแต่ละรอบ)
              </p>
            </div>
          </div>

          {/* Search & Global Expand Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อวิชา เช่น วางแผนเพื่อวัยเกษียณ, นว2..."
                value={courseHierarchySearch}
                onChange={(e) => setCourseHierarchySearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary w-full sm:w-64"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={expandAllCourses}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition"
                title="ขยายดูรายละเอียดทุกวิชา"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>ขยายทุกวิชา</span>
              </button>
              <button
                onClick={collapseAllCourses}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition"
                title="ยุบทุกวิชา"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>ยุบทั้งหมด</span>
              </button>
            </div>
          </div>
        </div>

        {/* Course Hierarchy Accordion Cards */}
        <div className="space-y-3.5">
          {filteredCourseHierarchy.length > 0 ? (
            filteredCourseHierarchy.map((course, idx) => {
              const isExpanded = !!expandedCourses[course.courseName];
              const isFullPass = course.overallPassRate === 100;
              const hasFailed = course.totalFailed > 0;

              return (
                <div
                  key={idx}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isExpanded 
                      ? 'bg-slate-50/50 border-indigo-300 shadow-sm ring-1 ring-indigo-200/50' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Perspective 1: Course Summary Header Card */}
                  <div
                    onClick={() => toggleCourseExpand(course.courseName)}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/80 transition"
                  >
                    {/* Left: Course Name & Codes */}
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-base">
                            {course.courseName}
                          </h4>
                          {course.courseCode && (
                            <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 font-semibold">
                              รหัส: {course.courseCode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            <CalendarDays className="w-3.5 h-3.5" />
                            เปิดทั้งหมด {course.totalRounds} รอบ
                          </span>
                          <span>•</span>
                          <span>ผู้เข้าอบรมรวม <b>{course.totalEnrolled}</b> คน</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Pass Statistics & Expand Button */}
                    <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      {/* Metrics */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-400">คนที่ผ่านวิชานี้ทั้งหมด</div>
                          <div className="font-bold text-emerald-700 text-sm sm:text-base flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>{course.totalPassed} / {course.totalEnrolled} คน</span>
                            <span className="text-xs font-normal text-emerald-600">({course.overallPassRate}%)</span>
                          </div>
                        </div>

                        {course.totalFailed > 0 && (
                          <div className="text-right pl-3 border-l border-slate-200 hidden sm:block">
                            <div className="text-[11px] text-slate-400">ไม่ผ่าน</div>
                            <div className="font-bold text-rose-600 text-sm flex items-center justify-end gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{course.totalFailed} คน</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Toggle Button */}
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary px-3 py-1.5 bg-primary/5 hover:bg-primary/10 rounded-lg transition">
                        <span>{isExpanded ? 'ปิดรายรอบ' : `ดูเจาะลึก ${course.totalRounds} รอบ`}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Perspective 2: Per-Round Detailed Breakdown (เมื่อคลิกขยาย) */}
                  {isExpanded && (
                    <div className="px-4 pb-5 sm:px-6 pt-1 border-t border-slate-200/80 bg-slate-50/80 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-2">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          <span>รายละเอียดผลการอบรมในแต่ละรอบ ({course.totalRounds} รอบที่เปิดจัด):</span>
                        </span>
                        <span className="text-slate-400 font-normal">
                          คลิกแถบเพื่อยุบเก็บ
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {course.rounds && course.rounds.map((round, rIdx) => {
                          const rPassPct = round.passRatePercent ?? 0;
                          const rIsFull = rPassPct === 100;
                          const rHasFailed = round.failedCount > 0;

                          return (
                            <div
                              key={rIdx}
                              className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2.5 hover:border-indigo-300 transition"
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="font-bold text-xs text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                                  <span>🚩 รอบที่ {rIdx + 1}</span>
                                </span>
                                <span className="font-mono text-xs font-semibold text-slate-700 flex items-center gap-1">
                                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                                  {round.roundDate}
                                </span>
                              </div>

                              {/* Round Stats */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-50 p-2 rounded-lg">
                                  <div className="text-[11px] text-slate-400">เข้าอบรม</div>
                                  <div className="font-bold text-slate-800 text-sm">
                                    {round.enrolledCount} <span className="text-xs font-normal text-slate-500">คน</span>
                                  </div>
                                </div>
                                <div className={`p-2 rounded-lg ${rIsFull ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'}`}>
                                  <div className="text-[11px] opacity-80">คนที่ผ่านรอบนี้</div>
                                  <div className="font-bold text-sm flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{round.passedCount} คน</span>
                                  </div>
                                </div>
                              </div>

                              {/* Progress Bar for Round */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-500">อัตราผ่านในรอบนี้</span>
                                  <span className={`font-bold ${rIsFull ? 'text-emerald-600' : rHasFailed ? 'text-amber-600' : 'text-blue-600'}`}>
                                    {rPassPct}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-500 ${
                                      rIsFull ? 'bg-emerald-500' : rHasFailed ? 'bg-amber-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.max(rPassPct, 4)}%` }}
                                  ></div>
                                </div>
                              </div>

                              {round.failedCount > 0 && (
                                <div className="text-[11px] text-rose-600 flex items-center gap-1 pt-1 border-t border-slate-100">
                                  <XCircle className="w-3 h-3" />
                                  <span>ไม่ผ่านในรอบนี้ {round.failedCount} คน</span>
                                </div>
                              )}

                              <div className="text-[10px] text-slate-400 font-mono text-right pt-0.5">
                                Stamp: {round.lastStampDate}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
              {courseHierarchySearch ? 'ไม่พบวิชาที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลผลการอบรมในระบบ'}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: วิชาไหนที่ลงวันไหนผ่าน (Course & Training Date Completion Summary) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <span>วิชาไหนที่ลงวันไหนผ่าน (Course & Date Completion Summary)</span>
                <span className="text-xs font-normal text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {filteredCourseDates.length} รอบอบรม
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                สรุปภาพรวมยอดผู้เข้าอบรม ยอดคนผ่าน และอัตราความสำเร็จแยกตามรายวิชาและรอบวันที่จัดอบรม
              </p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหารหัสวิชา / ชื่อวิชา / วันที่..."
                value={courseDateQuery}
                onChange={(e) => setCourseDateQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary w-full sm:w-64"
              />
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setCourseDateFilter('all')}
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                  courseDateFilter === 'all' ? 'bg-white text-slate-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setCourseDateFilter('100pct')}
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                  courseDateFilter === '100pct' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                ผ่าน 100%
              </button>
              <button
                onClick={() => setCourseDateFilter('hasFailed')}
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                  courseDateFilter === 'hasFailed' ? 'bg-white text-rose-700 shadow-xs font-bold' : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                มีไม่ผ่าน
              </button>
            </div>
          </div>
        </div>

        {/* Course-Date Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">รหัสวิชา</th>
                <th className="py-3 px-3.5">ชื่อวิชา / หลักสูตร</th>
                <th className="py-3 px-3.5">วันที่จัดอบรม</th>
                <th className="py-3 px-3.5 text-center">ยอดอบรม</th>
                <th className="py-3 px-3.5 text-center">ผ่าน (คน)</th>
                <th className="py-3 px-3.5 text-center">ไม่ผ่าน (คน)</th>
                <th className="py-3 px-3.5">อัตราความสำเร็จ (% ผ่าน)</th>
                <th className="py-3 px-3.5 text-slate-400 text-right">Stamp ล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredCourseDates.length > 0 ? (
                filteredCourseDates.map((item, idx) => {
                  const passPct = item.passRatePercent ?? 0;
                  const isFullPass = passPct === 100;
                  const hasFailed = item.failedCount > 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-primary">
                        {item.courseCode}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-800">
                        <div className="max-w-[280px] truncate" title={item.courseName}>
                          {item.courseName}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 font-mono text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {item.trainingDate}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold text-slate-700">
                        {item.totalEnrolled}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          {item.passedCount}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {item.failedCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            {item.failedCount}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 min-w-[170px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className={`font-bold ${isFullPass ? 'text-emerald-600' : hasFailed ? 'text-amber-600' : 'text-blue-600'}`}>
                              {passPct}%
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {item.passedCount}/{item.totalEnrolled} คน
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                isFullPass 
                                  ? 'bg-emerald-500' 
                                  : hasFailed 
                                  ? 'bg-amber-500' 
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.max(passPct, 3)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {item.lastStampDate || '-'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    {courseDateQuery 
                      ? 'ไม่พบข้อมูลรอบอบรมที่ตรงกับคำค้นหา' 
                      : 'ยังไม่มีข้อมูลผลการอบรมที่ประทับสถานะ'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: คนเรียน วิชาไหนผ่าน (Trainee Course Pass Inspector) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <span>คนเรียน วิชาไหนผ่าน (Trainee Course & Pass Inspector)</span>
                <span className="text-xs font-normal text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  ตรวจสอบรายบุคคล
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                สืบค้นผู้เรียนเพื่อตรวจสอบว่า ลงทะเบียนวิชาอะไรบ้าง และวิชาไหนผ่านแล้วในรอบวันที่ใด
              </p>
            </div>
          </div>
        </div>

        {/* Trainee Search Input */}
        <div className="relative max-w-2xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="พิมพ์เลขบัตรประชาชน 13 หลัก, ชื่อ-สกุล หรือเลขที่ใบอนุญาต..."
            value={traineeQuery}
            onChange={(e) => setTraineeQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
          {traineeQuery && (
            <button
              onClick={() => setTraineeQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Trainee Search Results Cards */}
        {isSearchingTrainee ? (
          <div className="text-center py-8 text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            <span>กำลังสืบค้นข้อมูลผู้เรียนและผลการอบรม...</span>
          </div>
        ) : traineeResults.length > 0 ? (
          <div className="space-y-4">
            <div className="text-xs text-slate-500">
              พบผู้สมัครที่ตรงกับคำค้นหา <b>{traineeResults.length}</b> ท่าน:
            </div>

            <div className="grid grid-cols-1 gap-4">
              {traineeResults.map((trainee, idx) => (
                <div key={idx} className="bg-slate-50/70 rounded-xl border border-slate-200 p-5 space-y-4 hover:border-blue-300 transition">
                  {/* Trainee Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                        {trainee.fullName?.[0] || 'T'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base">
                          {trainee.fullName}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5">
                          <span>เลข ปชช: <b>{trainee.nationId}</b></span>
                          <span>•</span>
                          <span>เลขใบอนุญาต: <b>{trainee.licenseNo}</b></span>
                          <span>•</span>
                          <span>โทร: {trainee.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ผ่านแล้ว {trainee.totalPassed} / {trainee.totalResults || trainee.registeredCourses?.length || 0} วิชา
                      </span>
                    </div>
                  </div>

                  {/* Registered Courses vs Training Results Comparison */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                    {/* Left: Registered Courses in system */}
                    <div className="bg-white rounded-lg p-3.5 border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-700 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span>วิชาที่ลงทะเบียนไว้ในระบบ (Registration)</span>
                      </div>
                      {trainee.registeredCourses && trainee.registeredCourses.length > 0 ? (
                        <div className="space-y-2">
                          {trainee.registeredCourses.map((rc, rIdx) => (
                            <div key={rIdx} className="p-2 rounded bg-slate-50 border border-slate-100 flex justify-between items-center">
                              <span className="font-medium text-slate-800">{rc.courseName}</span>
                              <span className="text-slate-500 font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                                รอบ: {rc.courseDateDisplay}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400 py-2">ไม่มีข้อมูลวิชาที่ลงทะเบียน</div>
                      )}
                    </div>

                    {/* Right: Actual Training Results (trn_training_result) */}
                    <div className="bg-white rounded-lg p-3.5 border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-700 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                        <Award className="w-4 h-4 text-emerald-600" />
                        <span>ผลการอบรมจริงที่ประทับผลแล้ว (Training Results)</span>
                      </div>
                      {trainee.trainingResults && trainee.trainingResults.length > 0 ? (
                        <div className="space-y-2">
                          {trainee.trainingResults.map((tr, tIdx) => (
                            <div key={tIdx} className={`p-2.5 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              tr.isPassed 
                                ? 'bg-emerald-50/60 border-emerald-200' 
                                : 'bg-rose-50/60 border-rose-200'
                            }`}>
                              <div>
                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <span className="font-mono text-primary">[{tr.courseCode}]</span>
                                  <span>{tr.courseName}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  รอบวันที่: {tr.trainingDate} | บันทึกเมื่อ: {tr.stampDate}
                                </div>
                              </div>
                              <div className="self-start sm:self-auto shrink-0">
                                {tr.isPassed ? (
                                  <span className="px-2.5 py-1 rounded-full font-bold text-xs bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    ผ่านการอบรม ({tr.status})
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full font-bold text-xs bg-rose-600 text-white flex items-center gap-1 shadow-xs">
                                    <XCircle className="w-3.5 h-3.5" />
                                    {tr.status || 'ไม่ผ่าน'}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-amber-600 bg-amber-50 p-3 rounded border border-amber-200 text-xs flex items-center gap-2">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>ยังไม่มีข้อมูลผลการอบรมที่ประทับสถานะจากไฟล์ Excel</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : traineeQuery.trim() ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 border border-slate-200">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="font-semibold text-slate-700">ไม่พบข้อมูลผู้เรียนที่ตรงกับ "{traineeQuery}"</div>
            <div className="text-xs text-slate-400 mt-1">โปรดตรวจสอบเลขบัตรประชาชน 13 หลัก, ชื่อ-นามสกุล หรือเลขที่ใบอนุญาตอีกครั้ง</div>
          </div>
        ) : (
          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 text-xs text-slate-600 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <span>
              <b>คำแนะนำ:</b> สามารถพิมพ์เลขบัตรประชาชน 13 หลัก หรือพิมพ์ชื่อเพื่อดูว่า <b>ผู้เรียนคนนั้นลงวิชาไหนไว้บ้าง และวิชาไหนผ่านแล้วในรอบวันที่ใด</b> พร้อมสถานะการประทับผลแบบ Real-time
            </span>
          </div>
        )}
      </div>

      {/* Bottom Row: Recent Registrations & System Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Registrations Table (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                ผู้สมัครล่าสุด (Recent Registrations)
              </h3>
            </div>
            <Link
              to="/admin/trainees"
              className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
            >
              <span>ดูทั้งหมด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">ชื่อ - นามสกุล</th>
                  <th className="py-3 px-3">หลักสูตร</th>
                  <th className="py-3 px-3">วันที่สมัคร</th>
                  <th className="py-3 px-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {stats?.recentRegistrations && stats.recentRegistrations.length > 0 ? (
                  stats.recentRegistrations.map((trainee, idx) => {
                    const tName = trainee.name || trainee.Name || '-';
                    const tNationId = trainee.nationId || trainee.NationId || '';
                    const tCourse = trainee.courseName || trainee.CourseName || '-';
                    const tDate = trainee.date || trainee.Date || '-';
                    const tConfirmed = trainee.confirmed ?? trainee.Confirmed ?? false;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          <div>{tName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{tNationId}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="inline-block max-w-[220px] truncate" title={tCourse}>
                            {tCourse}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                          {tDate}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {tConfirmed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                              <CheckCircle className="w-3 h-3" /> ยืนยันแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                              <Clock className="w-3 h-3" /> รอยืนยัน
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                      ยังไม่มีรายการผู้สมัครล่าสุด
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Shortcuts & Tools (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>ทางลัดเมนูหลัก (Shortcuts)</span>
            </h3>

            <div className="space-y-2.5">
              <Link
                to="/admin/trainees"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary hover:bg-blue-50/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-md group-hover:bg-primary group-hover:text-white transition">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">ข้อมูลผู้สมัคร/ผู้อบรม</div>
                    <div className="text-xs text-slate-500">จัดการ ค้นหา และแก้ไขข้อมูล</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/admin/reports/export"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md group-hover:bg-emerald-600 group-hover:text-white transition">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">ส่งออกรายงาน (Export)</div>
                    <div className="text-xs text-slate-500">ดาวน์โหลด Excel / CSV</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/admin/master-data"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-md group-hover:bg-amber-500 group-hover:text-white transition">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">จัดการข้อมูล (Master Data)</div>
                    <div className="text-xs text-slate-500">หลักสูตร วันอบรม สาขา</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/admin/config"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-purple-500 hover:bg-purple-50/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-md group-hover:bg-purple-600 group-hover:text-white transition">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">ตั้งค่าระบบ (System Config)</div>
                    <div className="text-xs text-slate-500">เปิด-ปิดระบบ และแบบฟอร์ม</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-400">
            ระบบจัดการ Viriyah Registration Portal
          </div>
        </div>
      </div>
    </div>
  );
}
