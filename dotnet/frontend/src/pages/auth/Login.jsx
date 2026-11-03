import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, User, ArrowRight, ShieldCheck, UserCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;
  const isAdminLogin = location.pathname.startsWith('/admin');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(username, password);
      
      if (from && from !== '/login' && from !== '/admin/login') {
        navigate(from, { replace: true });
      } else if (isAdminLogin) {
        if (user?.role === 'Applicant') {
          navigate('/admin/trainees', { replace: true });
        } else {
          navigate('/admin', { replace: true });
        }
      } else {
        if (user?.role && user.role !== 'Applicant') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-100 flex items-center gap-3">
            <img src="/logo.jpg" alt="Viriyah Logo" className="h-10 w-auto" />
            <div className="border-l border-slate-200 pl-3">
              <div className="font-bold text-primary text-base leading-tight">วิริยะประกันภัย</div>
              <div className="text-xs text-textMuted font-light">ระบบลงทะเบียนอบรมออนไลน์</div>
            </div>
          </div>
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-800">
          {isAdminLogin ? 'เข้าสู่ระบบจัดการ (Admin Login)' : 'เข้าสู่ระบบ (Sign In)'}
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          {isAdminLogin 
            ? 'เข้าสู่ระบบสำหรับเจ้าหน้าที่และผู้สมัครเพื่อจัดการข้อมูล' 
            : 'กรุณาเข้าสู่ระบบด้วยอีเมล หรือรหัสบัตรประชาชนเพื่อเริ่มทำรายการ'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                อีเมล หรือ รหัสบัตรประชาชน (Email / Citizen ID)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น user@email.com หรือ เลขบัตร ปชช. 13 หลัก"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                รหัสผ่าน (Password)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน"
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                * สำหรับผู้เข้าอบรม: รหัสผ่านเริ่มต้นคือ <span className="font-semibold text-primary">เลขบัตรประชาชน 5 หลักสุดท้าย</span>
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-primary hover:bg-[#002882] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50"
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-sm text-slate-600">
              ยังไม่มีบัญชีผู้สมัครเข้าอบรม?{' '}
              <Link to="/register" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
                สมัครสมาชิกที่นี่
              </Link>
            </p>
          </div>

          {/* Quick Mock Roles Selector for Easy Testing */}
          <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              บัญชีทดสอบทุก Role (Quick Test Switcher):
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('1100200314511', '14511')}
                className="p-2 bg-white border border-blue-200 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50/50 transition-colors shadow-sm"
              >
                <div className="font-bold text-blue-700 flex items-center gap-1">
                  👤 ผู้สมัคร (Applicant)
                </div>
                <div className="text-[11px] text-slate-500 truncate">1100200314511 / 14511</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'password123')}
                className="p-2 bg-white border border-amber-200 rounded-lg text-left hover:border-amber-500 hover:bg-amber-50/50 transition-colors shadow-sm"
              >
                <div className="font-bold text-amber-700 flex items-center gap-1">
                  🛡️ แอดมิน (Admin)
                </div>
                <div className="text-[11px] text-slate-500">admin / password123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('superadmin', 'password123')}
                className="p-2 bg-white border border-purple-200 rounded-lg text-left hover:border-purple-500 hover:bg-purple-50/50 transition-colors shadow-sm"
              >
                <div className="font-bold text-purple-700 flex items-center gap-1">
                  👑 ซูเปอร์แอดมิน
                </div>
                <div className="text-[11px] text-slate-500">superadmin / password123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('viewer', 'password123')}
                className="p-2 bg-white border border-emerald-200 rounded-lg text-left hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors shadow-sm"
              >
                <div className="font-bold text-emerald-700 flex items-center gap-1">
                  👁️ สาขา (Viewer)
                </div>
                <div className="text-[11px] text-slate-500">viewer / password123</div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
