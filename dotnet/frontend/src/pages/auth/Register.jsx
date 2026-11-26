import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, User, Phone, CreditCard, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nationId: '',
    fullName: '',
    phone: '',
    acceptPdpa: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Validate Thai National ID Checksum
  const validateThaiID = (id) => {
    const cleanId = id.replace(/\D/g, '');
    if (cleanId.length !== 13) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += Number.parseInt(cleanId.charAt(i), 10) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === Number.parseInt(cleanId.charAt(12), 10);
  };

  const isIdValid = formData.nationId.replace(/\D/g, '').length === 13 && validateThaiID(formData.nationId);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (!validateThaiID(formData.nationId)) {
      setError('เลขประจำตัวประชาชน 13 หลักไม่ถูกต้องตามหลักการคำนวณของราชการ');
      return;
    }

    if (!formData.acceptPdpa) {
      setError('กรุณากดยินยอมข้อกำหนดการคุ้มครองข้อมูลส่วนบุคคล (PDPA)');
      return;
    }

    setLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        nationId: formData.nationId.replace(/\D/g, ''),
        fullName: formData.fullName,
        phone: formData.phone
      });

      // Navigate to registration form immediately
      void navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
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
          สมัครสมาชิกผู้เข้าอบรม (Applicant Sign Up)
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          สร้างบัญชีผู้ใช้งานเพื่อเริ่มกรอกฟอร์มลงทะเบียนและติดตามสถานะใบสมัคร
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                อีเมล (Email) <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>

            {/* National ID with Live Checksum */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">
                  เลขประจำตัวประชาชน 13 หลัก <span className="text-red-500">*</span>
                </label>
                {formData.nationId && (
                  <span className={`text-xs flex items-center gap-1 font-medium ${isIdValid ? 'text-green-600' : 'text-red-500'}`}>
                    {isIdValid ? <><CheckCircle2 className="w-3.5 h-3.5" /> เลขบัตรถูกต้อง</> : 'เลขบัตรไม่ถูกต้อง'}
                  </span>
                )}
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  maxLength={13}
                  name="nationId"
                  value={formData.nationId}
                  onChange={handleChange}
                  placeholder="กรอกเลขบัตรประชาชน 13 หลัก"
                  className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary text-sm ${
                    formData.nationId.length === 13 
                      ? (isIdValid ? 'border-green-400 bg-green-50/20' : 'border-red-400 bg-red-50/20')
                      : 'border-slate-300'
                  }`}
                />
              </div>
            </div>

            {/* Full Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ชื่อ-นามสกุล ภาษาไทย <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    required
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="นายสมชาย ใจดี"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  เบอร์โทรศัพท์มือถือ <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0812345678"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  รหัสผ่าน (Password) <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="block w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>
              </div>
            </div>

            {/* PDPA Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  name="acceptPdpa"
                  checked={formData.acceptPdpa}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  ข้าพเจ้ายินยอมให้บริษัท วิริยะประกันภัย จำกัด (มหาชน) จัดเก็บและประมวลผลข้อมูลส่วนบุคคลเพื่อการลงทะเบียนอบรมตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                </span>
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading || !isIdValid || !formData.acceptPdpa}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-primary hover:bg-[#002882] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50"
              >
                {loading ? 'กำลังสร้างบัญชี...' : 'ยืนยันการสมัครสมาชิก'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-sm text-slate-600">
              มีบัญชีผู้ใช้งานอยู่แล้ว?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
                เข้าสู่ระบบที่นี่
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
