import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect, useRef, useMemo } from 'react';
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

  // Unified Course & Round Training Analytics States
  const [analyticsGroupingMode, setAnalyticsGroupingMode] = useState('yearMonth'); // 'yearMonth' (1: ปี/เดือน) | 'course' (2: group หลักสูตร)
  const [analyticsSearchQuery, setAnalyticsSearchQuery] = useState('');
  const [analyticsPassFilter, setAnalyticsPassFilter] = useState('all'); // 'all', '100pct', 'hasFailed'
  const [expandedCourses, setExpandedCourses] = useState({}); // { [courseName]: boolean }
  const [collapsedYears, setCollapsedYears] = useState({});
  const [collapsedMonths, setCollapsedMonths] = useState({});

  // Training Search & Filter States
  const [traineeQuery, setTraineeQuery] = useState('');
  const [traineeResults, setTraineeResults] = useState([]);
  const [isSearchingTrainee, setIsSearchingTrainee] = useState(false);

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

  // Filter Course Date Matrix (สำหรับโหมด 1: แยกตาม ปี / เดือน)
  const filteredCourseDates = useMemo(() => {
    return (stats?.courseDateCompletion || []).filter(item => {
      const q = (analyticsSearchQuery || '').toLowerCase().trim();
      const matchesSearch = !q || 
        (item.courseCode && item.courseCode.toLowerCase().includes(q)) ||
        (item.courseName && item.courseName.toLowerCase().includes(q)) ||
        (item.trainingDate && item.trainingDate.toLowerCase().includes(q)) ||
        (item.yearDisplay && item.yearDisplay.toLowerCase().includes(q)) ||
        (item.monthDisplay && item.monthDisplay.toLowerCase().includes(q));
      
      if (!matchesSearch) return false;
      if (analyticsPassFilter === '100pct') return item.passRatePercent === 100;
      if (analyticsPassFilter === 'hasFailed') return item.failedCount > 0;
      return true;
    });
  }, [stats?.courseDateCompletion, analyticsSearchQuery, analyticsPassFilter]);

  const thaiMonthNames = [
    '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Group Course Dates by Year > Month Hierarchy
  const groupedCourseDateHierarchy = useMemo(() => {
    const yearMap = new Map();

    filteredCourseDates.forEach(item => {
      let yearKey = item.yearDisplay || '';
      let monthKey = item.monthDisplay || '';
      let yearNum = item.yearNum || 0;
      let monthNum = item.monthNum || 0;
      let dayNum = item.dayNum || 0;

      if (!yearKey || yearKey === 'ไม่ระบุปี' || !monthKey || monthKey === 'ไม่ระบุเดือน') {
        const dStr = (item.trainingDate || '').trim();
        if (dStr.includes('/')) {
          const parts = dStr.split('/');
          if (parts.length === 3) {
            dayNum = parseInt(parts[0], 10) || 0;
            monthNum = parseInt(parts[1], 10) || 0;
            yearNum = parseInt(parts[2], 10) || 0;
            yearKey = yearNum > 0 ? (yearNum > 2400 ? `พ.ศ. ${yearNum}` : `ค.ศ. ${yearNum}`) : 'ไม่ระบุปี';
            monthKey = (monthNum >= 1 && monthNum <= 12) ? thaiMonthNames[monthNum] : (parts[1] ? `เดือน ${parts[1]}` : 'ไม่ระบุเดือน');
          }
        } else if (dStr.includes('-')) {
          const parts = dStr.split('-');
          if (parts.length === 3) {
            yearNum = parseInt(parts[0], 10) || 0;
            monthNum = parseInt(parts[1], 10) || 0;
            dayNum = parseInt(parts[2], 10) || 0;
            yearKey = yearNum > 0 ? (yearNum > 2400 ? `พ.ศ. ${yearNum}` : `ค.ศ. ${yearNum}`) : 'ไม่ระบุปี';
            monthKey = (monthNum >= 1 && monthNum <= 12) ? thaiMonthNames[monthNum] : (parts[1] ? `เดือน ${parts[1]}` : 'ไม่ระบุเดือน');
          }
        }
      }

      if (!yearKey) yearKey = 'ไม่ระบุปี';
      if (!monthKey) monthKey = 'ไม่ระบุเดือน';

      if (!yearMap.has(yearKey)) {
        yearMap.set(yearKey, {
          yearKey,
          yearNum,
          totalEnrolled: 0,
          passedCount: 0,
          failedCount: 0,
          totalRounds: 0,
          monthMap: new Map()
        });
      }

      const yObj = yearMap.get(yearKey);
      yObj.totalEnrolled += item.totalEnrolled || 0;
      yObj.passedCount += item.passedCount || 0;
      yObj.failedCount += item.failedCount || 0;
      yObj.totalRounds += 1;

      const fullMonthKey = `${yearKey}_${monthKey}`;
      if (!yObj.monthMap.has(fullMonthKey)) {
        yObj.monthMap.set(fullMonthKey, {
          monthKey: fullMonthKey,
          monthDisplay: monthKey,
          monthNum,
          yearKey,
          totalEnrolled: 0,
          passedCount: 0,
          failedCount: 0,
          totalRounds: 0,
          items: []
        });
      }

      const mObj = yObj.monthMap.get(fullMonthKey);
      mObj.totalEnrolled += item.totalEnrolled || 0;
      mObj.passedCount += item.passedCount || 0;
      mObj.failedCount += item.failedCount || 0;
      mObj.totalRounds += 1;
      mObj.items.push(item);
    });

    const sortedYears = Array.from(yearMap.values()).map(y => {
      const sortedMonths = Array.from(y.monthMap.values()).map(m => {
        m.items.sort((a, b) => (b.dateSortKey || 0) - (a.dateSortKey || 0));
        m.passRatePercent = m.totalEnrolled > 0 ? Math.round((m.passedCount * 100) / m.totalEnrolled) : 0;
        return m;
      }).sort((a, b) => b.monthNum - a.monthNum);

      y.months = sortedMonths;
      y.passRatePercent = y.totalEnrolled > 0 ? Math.round((y.passedCount * 100) / y.totalEnrolled) : 0;
      return y;
    }).sort((a, b) => b.yearNum - a.yearNum);

    return sortedYears;
  }, [filteredCourseDates]);

  // Filter 2-Perspective Course Hierarchy (สำหรับโหมด 2: Group ตามหลักสูตร)
  const filteredCourseHierarchy = useMemo(() => {
    return (stats?.courseHierarchyAnalytics || []).filter(course => {
      const q = (analyticsSearchQuery || '').toLowerCase().trim();
      const matchesSearch = !q ||
        (course.courseName && course.courseName.toLowerCase().includes(q)) ||
        (course.courseCode && course.courseCode.toLowerCase().includes(q)) ||
        (course.trainingDateDisplay && course.trainingDateDisplay.toLowerCase().includes(q)) ||
        (course.rounds && course.rounds.some(r => r.roundDate && r.roundDate.toLowerCase().includes(q)));
      
      if (!matchesSearch) return false;
      if (analyticsPassFilter === '100pct') return course.overallPassRate === 100;
      if (analyticsPassFilter === 'hasFailed') return course.totalFailed > 0;
      return true;
    });
  }, [stats?.courseHierarchyAnalytics, analyticsSearchQuery, analyticsPassFilter]);

  // Toggle Collapse/Expand Handlers
  const toggleYearCollapse = (yKey) => {
    setCollapsedYears(prev => ({
      ...prev,
      [yKey]: !prev[yKey]
    }));
  };

  const toggleMonthCollapse = (mKey) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [mKey]: !prev[mKey]
    }));
  };

  const toggleCourseExpand = (cName) => {
    setExpandedCourses(prev => ({
      ...prev,
      [cName]: !prev[cName]
    }));
  };

  const handleExpandAll = () => {
    if (analyticsGroupingMode === 'yearMonth') {
      setCollapsedYears({});
      setCollapsedMonths({});
    } else {
      const all = {};
      (stats?.courseHierarchyAnalytics || []).forEach(c => {
        all[c.courseName] = true;
      });
      setExpandedCourses(all);
    }
  };

  const handleCollapseAll = () => {
    if (analyticsGroupingMode === 'yearMonth') {
      const allY = {};
      const allM = {};
      groupedCourseDateHierarchy.forEach(y => {
        allY[y.yearKey] = true;
        y.months.forEach(m => { allM[m.monthKey] = true; });
      });
      setCollapsedYears(allY);
      setCollapsedMonths(allM);
    } else {
      setExpandedCourses({});
    }
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

      {/* UNIFIED COURSE & ROUND TRAINING ANALYTICS: แยกตาม ปี/เดือน หรือ Group ตามหลักสูตร */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        {/* Header with Title and Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 flex-wrap">
                <span>สถิติวิเคราะห์รายวิชา & การเปิดรอบอบรม (Course & Multi-Round Analytics)</span>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {analyticsGroupingMode === 'yearMonth' ? 'โหมด: 1) ปี / เดือน / รอบ' : 'โหมด: 2) จัดกลุ่มตามหลักสูตร'}
                </span>
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {analyticsGroupingMode === 'yearMonth' 
                    ? `${filteredCourseDates.length} รอบอบรม` 
                    : `${filteredCourseHierarchy.length} หลักสูตร`}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {analyticsGroupingMode === 'yearMonth'
                  ? 'จำแนกลำดับชั้นตาม ปี > เดือน > และรอบการอบรมที่จัดในแต่ละเดือน เพื่อการวิเคราะห์ระยะยาว'
                  : 'จัดกลุ่มตามหลักสูตร/วิชา เพื่อดูภาพรวมยอดคนเข้าอบรมและเจาะลึกแต่ละรอบ'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Toggle Pill */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 shadow-inner self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setAnalyticsGroupingMode('yearMonth')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                analyticsGroupingMode === 'yearMonth'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>1) แยกตาม ปี / เดือน</span>
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsGroupingMode('course')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                analyticsGroupingMode === 'course'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>2) Group ตามหลักสูตร</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Filter, Expand/Collapse Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                analyticsGroupingMode === 'yearMonth'
                  ? 'ค้นหารหัสวิชา, ชื่อวิชา, วันที่ (เช่น 19/05/2569), หรือเดือน...'
                  : 'ค้นหาชื่อหลักสูตร, รหัสวิชา, หรือวันที่รอบอบรม...'
              }
              value={analyticsSearchQuery}
              onChange={(e) => setAnalyticsSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary w-full shadow-xs"
            />
            {analyticsSearchQuery && (
              <button
                type="button"
                onClick={() => setAnalyticsSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs shadow-xs">
              <button
                type="button"
                onClick={() => setAnalyticsPassFilter('all')}
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                  analyticsPassFilter === 'all'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsPassFilter('100pct')}
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer flex items-center gap-1 ${
                  analyticsPassFilter === '100pct'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>ผ่าน 100%</span>
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsPassFilter('hasFailed')}
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer flex items-center gap-1 ${
                  analyticsPassFilter === 'hasFailed'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                <XCircle className="w-3 h-3" />
                <span>มีไม่ผ่าน</span>
              </button>
            </div>

            {/* Global Expand / Collapse */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition shadow-xs"
                title="ขยายทุกระดับชั้น"
              >
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                <span>ขยายทั้งหมด</span>
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition shadow-xs"
                title="ยุบทุกระดับชั้น"
              >
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                <span>ยุบทั้งหมด</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VIEW MODE 1: แยกตาม ปี > เดือน > รอบอบรมในเดือนนั้นๆ      */}
        {/* ========================================================= */}
        {analyticsGroupingMode === 'yearMonth' && (
          <div className="space-y-4">
            {groupedCourseDateHierarchy.length > 0 ? (
              groupedCourseDateHierarchy.map((yearGroup) => {
                const isYearCollapsed = !!collapsedYears[yearGroup.yearKey];
                const yPassPct = yearGroup.passRatePercent;

                return (
                  <div
                    key={yearGroup.yearKey}
                    className="border border-indigo-200/80 rounded-xl overflow-hidden bg-white shadow-xs transition-all"
                  >
                    {/* LEVEL 1: แถบหัวข้อปี (Year Header) */}
                    <div
                      onClick={() => toggleYearCollapse(yearGroup.yearKey)}
                      className="w-full flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-white hover:from-indigo-100/70 border-b border-indigo-100 transition cursor-pointer select-none gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs">
                          {isYearCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-base text-indigo-950 font-mono tracking-tight">
                            📅 {yearGroup.yearKey}
                          </span>
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                            {yearGroup.months.length} เดือน
                          </span>
                          <span className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                            {yearGroup.totalRounds} รอบอบรม
                          </span>
                        </div>
                      </div>

                      {/* Year Summary Stats */}
                      <div className="flex items-center gap-4 text-xs ml-8 md:ml-0 flex-wrap">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="text-slate-400">ผู้เข้าอบรม:</span>
                          <span className="font-bold text-slate-800">
                            {yearGroup.totalEnrolled.toLocaleString()} คน
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>ผ่าน:</span>
                          <span className="font-bold">
                            {yearGroup.passedCount.toLocaleString()} คน ({yPassPct}%)
                          </span>
                        </div>

                        {yearGroup.failedCount > 0 && (
                          <div className="flex items-center gap-1.5 text-rose-600">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>ไม่ผ่าน:</span>
                            <span className="font-bold">
                              {yearGroup.failedCount.toLocaleString()} คน
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* LEVEL 2: รายการเดือนภายในปี (Months in Year) */}
                    {!isYearCollapsed && (
                      <div className="p-3.5 space-y-3 bg-slate-50/50">
                        {yearGroup.months.map((monthGroup) => {
                          const isMonthCollapsed = !!collapsedMonths[monthGroup.monthKey];
                          const mPassPct = monthGroup.passRatePercent;

                          return (
                            <div
                              key={monthGroup.monthKey}
                              className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs"
                            >
                              {/* แถบหัวข้อเดือน (Month Header) */}
                              <div
                                onClick={() => toggleMonthCollapse(monthGroup.monthKey)}
                                className="w-full flex flex-col md:flex-row md:items-center justify-between p-3 bg-slate-100/70 hover:bg-slate-200/60 transition cursor-pointer select-none border-b border-slate-200/80 gap-2"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="p-1 text-slate-500 hover:text-slate-800">
                                    {isMonthCollapsed ? (
                                      <ChevronRight className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 text-sm">
                                      🗓️ {monthGroup.monthDisplay} {yearGroup.yearKey}
                                    </span>
                                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                      {monthGroup.totalRounds} รอบอบรม
                                    </span>
                                  </div>
                                </div>

                                {/* Month Stats */}
                                <div className="flex items-center gap-3.5 text-xs ml-6 md:ml-0 flex-wrap">
                                  <span className="text-slate-600">
                                    ผู้เรียน: <strong className="text-slate-800">{monthGroup.totalEnrolled.toLocaleString()}</strong> คน
                                  </span>
                                  <span className="text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    ผ่าน: <strong className="font-bold">{monthGroup.passedCount.toLocaleString()}</strong> คน ({mPassPct}%)
                                  </span>
                                  {monthGroup.failedCount > 0 && (
                                    <span className="text-rose-600 flex items-center gap-1">
                                      <XCircle className="w-3 h-3 text-rose-500" />
                                      ไม่ผ่าน: <strong className="font-bold">{monthGroup.failedCount.toLocaleString()}</strong> คน
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* LEVEL 3: ตารางรอบอบรมในเดือนนั้น (Training rounds in month) */}
                              {!isMonthCollapsed && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                        <th className="py-2.5 px-3 font-semibold w-12 text-center">#</th>
                                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap">วันที่จัดอบรม</th>
                                        <th className="py-2.5 px-3 font-semibold">รหัส / วิชา</th>
                                        <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">ผู้เข้าอบรม</th>
                                        <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">ผ่านแล้ว</th>
                                        <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">ไม่ผ่าน</th>
                                        <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap w-36">อัตราผ่าน</th>
                                        <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">ประทับผลล่าสุด</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {monthGroup.items.map((item, idx) => {
                                        const passPct = item.passRatePercent ?? 0;
                                        const is100 = passPct === 100;
                                        const hasFailed = (item.failedCount || 0) > 0;

                                        return (
                                          <tr
                                            key={`${item.courseCode || ''}_${item.trainingDate || ''}_${idx}`}
                                            className="hover:bg-indigo-50/30 transition-colors"
                                          >
                                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                                              {idx + 1}
                                            </td>
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                              <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200 font-mono">
                                                <Calendar className="w-3 h-3 text-slate-500" />
                                                {item.trainingDate}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3">
                                              <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="font-bold text-slate-800 hover:text-indigo-600 transition">
                                                    {item.courseName || '-'}
                                                  </span>
                                                  {item.courseCode && (
                                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                                                      {item.courseCode}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                                              {(item.totalEnrolled || 0).toLocaleString()} คน
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                                              {(item.passedCount || 0).toLocaleString()} คน
                                            </td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                              {hasFailed ? (
                                                <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                                  {item.failedCount.toLocaleString()} คน
                                                </span>
                                              ) : (
                                                <span className="text-slate-400">-</span>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                              <div className="flex items-center gap-2 justify-center">
                                                <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                                                  <div
                                                    className={`h-2 rounded-full transition-all duration-300 ${
                                                      is100 ? 'bg-emerald-500' : hasFailed ? 'bg-amber-500' : 'bg-blue-500'
                                                    }`}
                                                    style={{ width: `${Math.max(passPct, 3)}%` }}
                                                  ></div>
                                                </div>
                                                <span
                                                  className={`font-mono text-[11px] font-bold ${
                                                    is100 ? 'text-emerald-600' : hasFailed ? 'text-amber-600' : 'text-blue-600'
                                                  }`}
                                                >
                                                  {passPct}%
                                                </span>
                                              </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-400 font-mono text-[11px]">
                                              {item.lastStampDate || '-'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
                {analyticsSearchQuery
                  ? 'ไม่พบข้อมูลรอบอบรมตามคำค้นหาที่ระบุ'
                  : 'ยังไม่มีข้อมูลผลการอบรมในระบบ'}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW MODE 2: Group ตามหลักสูตร (วิเคราะห์ระดับหลักสูตร)    */}
        {/* ========================================================= */}
        {analyticsGroupingMode === 'course' && (
          <div className="space-y-3">
            {filteredCourseHierarchy.length > 0 ? (
              filteredCourseHierarchy.map((course, idx) => {
                const isExpanded = !!expandedCourses[course.courseName];
                const isFull = course.overallPassRate === 100;
                const hasFailed = course.totalFailed > 0;

                return (
                  <div
                    key={`${course.courseName}_${idx}`}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs transition hover:border-slate-300"
                  >
                    {/* Course Summary Card Header */}
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mt-0.5 shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-800 text-sm truncate" title={course.courseName}>
                              {course.courseName}
                            </h4>
                            {course.courseCode && (
                              <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                                รหัส: {course.courseCode}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 flex-wrap">
                            {course.trainingDateDisplay && (
                              <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                วันที่อบรม: {course.trainingDateDisplay}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-medium border border-indigo-100">
                              <Layers className="w-3 h-3" />
                              เปิดทั้งหมด {course.totalRounds} รอบ
                            </span>
                            <span className="text-slate-400">•</span>
                            <span>ผู้เข้าอบรมรวม {course.totalEnrolled.toLocaleString()} คน</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Pass Rate and Expand Button */}
                      <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-400">คนที่ผ่านวิชานี้ทั้งหมด</div>
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`font-bold text-sm ${isFull ? 'text-emerald-600' : hasFailed ? 'text-amber-600' : 'text-blue-600'}`}>
                              {course.totalPassed.toLocaleString()} / {course.totalEnrolled.toLocaleString()} คน ({course.overallPassRate}%)
                            </span>
                            {isFull && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleCourseExpand(course.courseName)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                            isExpanded
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                          }`}
                        >
                          <span>ดูเจาะลึก {course.totalRounds} รอบ</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Rounds for this Course */}
                    {isExpanded && (
                      <div className="bg-slate-50/70 border-t border-slate-200 p-4 space-y-3">
                        <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                          <span>รอบการจัดอบรมของวิชานี้ ({course.rounds?.length || 0} รอบ)</span>
                          <span className="text-[11px] font-normal text-slate-500">
                            เรียงตามวันที่จัดอบรมล่าสุด
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(course.rounds || []).map((round, rIdx) => {
                            const rPassPct = round.passRatePercent ?? 0;
                            const rIsFull = rPassPct === 100;
                            const rHasFailed = (round.failedCount || 0) > 0;

                            return (
                              <div
                                key={`${round.roundDate}_${rIdx}`}
                                className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 shadow-xs hover:border-indigo-300 transition"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>{round.roundDate}</span>
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      rIsFull
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : rHasFailed
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}
                                  >
                                    {rIsFull ? 'ผ่าน 100%' : `ผ่าน ${rPassPct}%`}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                                  <div className="bg-slate-50 p-2 rounded-lg">
                                    <div className="text-[11px] text-slate-400">ผู้เข้าอบรม</div>
                                    <div className="font-bold text-slate-700">
                                      {round.enrolledCount} คน
                                    </div>
                                  </div>
                                  <div
                                    className={`p-2 rounded-lg ${
                                      rIsFull ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                                    }`}
                                  >
                                    <div className="text-[11px] opacity-80">คนที่ผ่าน</div>
                                    <div className="font-bold text-sm flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>{round.passedCount} คน</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500">อัตราผ่าน</span>
                                    <span
                                      className={`font-bold ${
                                        rIsFull ? 'text-emerald-600' : rHasFailed ? 'text-amber-600' : 'text-blue-600'
                                      }`}
                                    >
                                      {rPassPct}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-1.5 rounded-full transition-all duration-300 ${
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
                                  Stamp: {round.lastStampDate || '-'}
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
                {analyticsSearchQuery
                  ? 'ไม่พบหลักสูตรตามคำค้นหาที่ระบุ'
                  : 'ยังไม่มีข้อมูลผลการอบรมในระบบ'}
              </div>
            )}
          </div>
        )}
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
                      {trainee.totalResults > 0 && trainee.totalPassed >= trainee.totalResults ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ผ่านครบแล้ว {trainee.totalPassed} / {trainee.totalResults} วิชา
                        </span>
                      ) : trainee.totalPassed > 0 ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          ผ่านแล้ว {trainee.totalPassed} / {trainee.totalResults || trainee.registeredCourses?.length || 0} วิชา (ยังไม่ครบ)
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          ยังไม่ผ่านการอบรม (0 / {trainee.totalResults || trainee.registeredCourses?.length || 0} วิชา)
                        </span>
                      )}
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
                            <div key={rIdx} className={`p-2.5 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                              rc.isPassed 
                                ? 'bg-emerald-50/70 border-emerald-200' 
                                : 'bg-slate-50 border-slate-200'
                            }`}>
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                {rc.isPassed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                )}
                                <span className={`font-medium text-xs ${rc.isPassed ? 'text-emerald-950 font-semibold' : 'text-slate-700'}`}>
                                  {rc.courseName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                                <span className="text-slate-500 font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                                  รอบ: {rc.courseDateDisplay}
                                </span>
                                {rc.isPassed ? (
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    ผ่านแล้ว
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-500" />
                                    รอยืนยันผล
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400 py-2">ไม่มีข้อมูลวิชาที่ลงทะเบียน</div>
                      )}
                    </div>

                    {/* Right: Actual Training Results (trn_training_result + persontraining5y) */}
                    <div className="bg-white rounded-lg p-3.5 border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-700 flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-emerald-600" />
                          <span>ผลการอบรมจริงที่ประทับผลแล้ว (Training Results)</span>
                        </div>
                        {trainee.trainingResults && trainee.trainingResults.length > 0 && (
                          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                            {trainee.trainingResults.length} รายการ
                          </span>
                        )}
                      </div>
                      {trainee.trainingResults && trainee.trainingResults.length > 0 ? (
                        <div className="space-y-2">
                          {trainee.trainingResults.map((tr, tIdx) => {
                            const is5Year = tr.source === '5year' || tr.is5YearHistory;
                            return (
                              <div key={tIdx} className={`p-2.5 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                                is5Year
                                  ? 'bg-blue-50/70 border-blue-200'
                                  : tr.isPassed 
                                    ? 'bg-emerald-50/60 border-emerald-200' 
                                    : 'bg-rose-50/60 border-rose-200'
                              }`}>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-start gap-1.5 flex-wrap">
                                    <span className={`font-mono px-1 py-0.5 rounded border text-xs shrink-0 font-bold ${
                                      is5Year
                                        ? 'text-blue-700 bg-blue-100/80 border-blue-300'
                                        : 'text-primary bg-blue-50 border-blue-200'
                                    }`}>
                                      [{tr.courseCode}]
                                    </span>
                                    {tr.subjectNames ? (
                                      <span className={`font-bold leading-snug ${
                                        is5Year ? 'text-blue-950' : 'text-emerald-950'
                                      }`}>
                                        <span className={`font-semibold mr-1 ${
                                          is5Year ? 'text-blue-800' : 'text-emerald-700'
                                        }`}>วิชา:</span>
                                        {tr.subjectNames}
                                      </span>
                                    ) : (
                                      <span>{tr.courseName}</span>
                                    )}
                                  </div>
                                  {tr.subjectNames && tr.courseName && tr.courseName !== tr.subjectNames && (
                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-mono">
                                      <span className="text-slate-400">
                                        {is5Year ? 'ประเภท:' : 'รอบ/รุ่น:'}
                                      </span>
                                      <span className="text-slate-700">{tr.courseName}</span>
                                    </div>
                                  )}
                                  <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                                    {is5Year ? (
                                      <>
                                        <span>แหล่งข้อมูล: <b>ประวัติสะสม 5 ปี (คปภ.)</b></span>
                                        <span>•</span>
                                        <span className="text-blue-700 font-bold bg-blue-100/60 px-1.5 py-0.2 rounded border border-blue-200">
                                          ผ่านเกณฑ์สะสม
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span>รอบวันที่: <b>{tr.trainingDate}</b></span>
                                        {tr.scorePercent && tr.scorePercent !== '-' && (
                                          <>
                                            <span>•</span>
                                            <span className="text-emerald-700 font-bold bg-emerald-100/60 px-1.5 py-0.2 rounded border border-emerald-200">
                                              ผลสอบ: {tr.scorePercent}
                                            </span>
                                          </>
                                        )}
                                        <span>•</span>
                                        <span>บันทึกเมื่อ: {tr.stampDate}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="self-start sm:self-auto shrink-0">
                                  {is5Year ? (
                                    <span className="px-2.5 py-1 rounded-full font-bold text-xs bg-blue-600 text-white flex items-center gap-1 shadow-xs">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      ผ่านแล้ว (สะสม 5 ปี)
                                    </span>
                                  ) : tr.isPassed ? (
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
                            );
                          })}
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
