import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useRegistration } from '../context/RegistrationContext';
import { useAuth } from '../context/AuthContext';
import SystemClosed from '../pages/public/SystemClosed';
import { User, LogOut, FileText, CheckCircle2, LogIn } from 'lucide-react';
import { useState } from 'react';

export default function PublicLayout() {
  const { sysConfig } = useRegistration();
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  // Check system status
  let isSystemOpen = true;
  
  if (sysConfig) {
    if (sysConfig['SYSTEM_IS_ONLINE'] === 'false') {
      isSystemOpen = false;
    } else if (sysConfig['SYSTEM_OPEN_PERIODS']) {
      try {
        const periods = JSON.parse(sysConfig['SYSTEM_OPEN_PERIODS']);
        if (Array.isArray(periods) && periods.length > 0) {
          const now = new Date();
          let withinPeriod = false;
          
          for (const period of periods) {
            const openTime = period.open ? new Date(period.open) : null;
            const closeTime = period.close ? new Date(period.close) : null;
            
            if (openTime && closeTime) {
              if (now >= openTime && now <= closeTime) withinPeriod = true;
            } else if (openTime && !closeTime) {
              if (now >= openTime) withinPeriod = true;
            } else if (!openTime && closeTime) {
              if (now <= closeTime) withinPeriod = true;
            }
          }
          
          isSystemOpen = withinPeriod;
        }
      } catch (e) {
        console.error("Invalid SYSTEM_OPEN_PERIODS JSON", e);
      }
    }
  }

  if (!isSystemOpen) {
    return <SystemClosed />;
  }

  const handleLogout = () => {
    logout();
    void navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Notification / User Nav Bar */}
      <div className="bg-[#002868] text-white/90 text-xs py-2 px-5 border-b border-white/10">
        <div className="max-w-[1100px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span>ระบบลงทะเบียนและบริการข้อมูลผู้เข้าอบรมออนไลน์</span>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-secondary" />
                  <span className="font-medium text-white">{user?.fullName || user?.username}</span>
                  <span className="text-[10px] bg-secondary text-slate-900 px-1.5 py-0.2 rounded font-bold">
                    {user?.role}
                  </span>
                </button>

                {dropdownOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="ปิดเมนู"
                      className="fixed inset-0 z-40 bg-transparent border-0 cursor-default"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div 
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2 z-50 text-slate-700 border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-150"
                    >
                      <div className="px-4 py-2 border-b border-slate-100 text-xs">
                        <div className="font-bold text-slate-900">{user?.fullName || user?.username}</div>
                        <div className="text-slate-400 text-[11px] truncate">{user?.email || user?.username}</div>
                      </div>

                      <Link 
                        to="/my-registrations" 
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-slate-50 text-slate-700"
                      >
                        <FileText className="w-4 h-4 text-primary" />
                        ประวัติการสมัครของฉัน
                      </Link>

                      <Link 
                        to="/" 
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-slate-50 text-slate-700"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        แบบฟอร์มลงทะเบียน
                      </Link>

                      {['Superadmin', 'Admin', 'Viewer'].includes(user?.role) && (
                        <Link 
                          to="/admin" 
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-slate-50 text-purple-700 font-bold border-t border-slate-100"
                        >
                          🛡️ ไปยังหน้าแอดมิน (Admin Portal)
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 text-left border-t border-slate-100 mt-1"
                      >
                        <LogOut className="w-4 h-4" />
                        ออกจากระบบ
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="hover:text-secondary flex items-center gap-1">
                  <LogIn className="w-3.5 h-3.5" /> เข้าสู่ระบบ
                </Link>
                <span>|</span>
                <Link to="/register" className="hover:text-secondary font-bold">
                  สมัครสมาชิก
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <header className="relative bg-gradient-to-br from-primary to-[#003B6F] text-white py-10 px-5 text-center shadow-md border-b-[5px] border-secondary">
        <div className="absolute left-8 top-1/2 -translate-y-1/2 max-h-[60px] bg-white px-4 py-2 rounded-lg shadow-lg hidden sm:block">
          <img src="/logo.jpg" alt="V Online Learning" className="h-[40px] w-auto" />
        </div>
        <h1 className="text-[28px] font-semibold mb-2">ลงทะเบียนอบรมวิริยะประกันภัย</h1>
        <p className="font-light opacity-90">ฟอร์มลงทะเบียนตัวแทนและนายหน้า (ระบบออนไลน์)</p>
      </header>
      
      <main className="flex-1">
        <div className="max-w-[1100px] mx-auto -mt-[30px] mb-[50px] bg-white p-6 md:p-10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] relative z-10">
          <Outlet />
        </div>
      </main>

      <footer className="text-center py-6 text-textMuted text-sm">
        &copy; {new Date().getFullYear()} Viriyah Insurance. All rights reserved.
      </footer>
    </div>
  );
}

