import { API_BASE_URL } from '../../config/api';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function EnquiryPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('code') || searchParams.get('token') || searchParams.get('citizen_id') || searchParams.get('national_id') || '';

  const [nationalId, setNationalId] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchEnquiry = async (idToSearch) => {
    const rawVal = (idToSearch || '').trim();
    if (!rawVal) {
      setError("กรุณากรอกเลขบัตรประชาชน 13 หลัก หรือรหัสที่ปลอดภัย");
      return;
    }

    setIsSearching(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/Enquiry?code=${encodeURIComponent(rawVal)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'ไม่พบข้อมูลการอบรมของท่าน');
        return;
      }

      setResult(data);
      // Mask the ID in the input box so plain citizen ID is hidden
      if (data.maskedCitizenId) {
        setNationalId(data.maskedCitizenId);
      }

      // Update URL with secure code (hides the plain citizen ID completely)
      if (data.secureCode || data.code) {
        const secureParam = data.secureCode || data.code;
        const newUrl = `${window.location.pathname}?code=${encodeURIComponent(secureParam)}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      void fetchEnquiry(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    void fetchEnquiry(nationalId);
  };

  const copyShareLink = () => {
    const code = result?.secureCode || result?.code;
    const url = code 
      ? `${window.location.origin}/enquiry/?code=${encodeURIComponent(code)}`
      : window.location.href;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] py-8 px-4 font-sans text-[#0f172a]">
      <div className="max-w-[1180px] mx-auto bg-white rounded-[18px] shadow-[0_10px_30px_rgba(2,6,23,0.10)] overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Side - Info */}
        <div className="lg:w-[52%] p-8 sm:p-9 bg-white flex flex-col">
          <img 
            src="/logo-vonlinelearning.jpg" 
            onError={(e) => { e.target.onerror = null; e.target.src = '/icon/logo-vonlinelearning.jpg'; }}
            alt="Viriyah Online Learning Logo"
            className="w-[90%] max-w-[520px] mx-auto mb-2 block h-auto"
          />
          <h1 className="text-[#002c6a] font-bold text-xl sm:text-2xl leading-tight mb-4">
            ศูนย์ฝึกอบรมและพัฒนานักประกันภัย<br/>
            บริษัท วิริยะประกันภัย จำกัด (มหาชน)
          </h1>

          <div className="mt-4 bg-[#ffe6a3] text-[#7a4a00] p-5 rounded-[16px] text-sm font-medium leading-relaxed">
            <div className="text-lg sm:text-xl font-black mb-3">
              ศูนย์ฝึกอบรมและพัฒนานักประกันภัย <br/>
              ขอบคุณทุกท่านที่ลงทะเบียนอบรมปี 2569
            </div>
            <p className="mb-4">
              ข้อมูลทางด้านขวาของท่าน คือ รายละเอียดที่ท่านได้แจ้งในการลงทะเบียนอบรม กรุณาตรวจสอบความถูกต้องทั้งหมด<br/>
              ข้อมูลบางส่วนของท่าน สามารถแก้ไขได้ โดยเข้าระบบที่{' '}
              <a href="https://agentportal.xn--z3cbl2brb.com/" target="_blank" rel="noopener noreferrer" className="text-[#0b3d91] font-bold hover:underline">
                https://agentportal.วิริยะ.com/
              </a>
            </p>
            <p className="mb-4">
              หากว่าข้อมูลทุกอย่างถูกต้อง<br/>
              ท่านจะได้รับ e-mail เพื่อเข้าอบรมก่อนวันอบรมจริง 15 วัน เพื่อตั้ง password<br/>
              และจะได้รับ email ยืนยันก่อนเข้ารอบอบรมจริง 7 วัน
            </p>
            <p className="mb-4">
              หากท่านมีข้อสงสัยหรือต้องการสอบถามเพิ่มเติม กรุณาติดต่อ ผ่าน<br/>
              Line Official Account :{' '}
              <a href="https://lin.ee/4k6FJ6g" target="_blank" rel="noopener noreferrer" className="text-[#0b3d91] font-bold hover:underline">
                @viriyahiptc
              </a>{' '}
              หรือ{' '}
              <a href="https://lin.ee/4k6FJ6g" target="_blank" rel="noopener noreferrer" className="text-[#0b3d91] font-bold hover:underline">
                https://lin.ee/4k6FJ6g
              </a>
            </p>
            <p className="mb-3">
              ถ้ามีข้อสงสัยเกี่ยวกับระบบ V Online Learning ติดต่อสอบถาม<br/>
              ทีมบริการและสนับสนุนผู้ใช้ระบบ V Online Learning<br/>
              จะสอบถามข้อมูลส่วนตัว เพื่อให้ได้คำแนะนำที่ถูกต้องเฉพาะตัวท่านเองได้ที่
            </p>
            <p className="mb-3">
              <strong>โทร: 02-821-6729</strong><br/>
              วันจันทร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์ เวลา 9:00 - 17:00 น.
            </p>
            <p>
              LINE: @IPTC.LMS<br/>
              Email: iptc.support.vol@viriyah.co.th<br/>
              วันจันทร์ - ศุกร์ เวลา 9:00 - 20:00 น.<br/>
              วันเสาร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์ เวลา 9:00 - 17:00 น.
            </p>
          </div>
        </div>

        {/* Right Side - Search & Results */}
        <div className="lg:w-[48%] bg-[#0b3d91] p-6 sm:p-8 flex items-start justify-center">
          <div className="w-full max-w-[520px] bg-white rounded-[18px] p-6 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
            <h2 className="text-[#0b3d91] text-xl sm:text-2xl font-extrabold mb-4">
              ค้นหารายละเอียดข้อมูลการอบรม
            </h2>

            <form onSubmit={handleSearch}>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-bold text-gray-900">
                    เลขบัตรประชาชน
                  </label>
                  {result?.maskedCitizenId && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <i className="fas fa-shield-alt text-emerald-600 text-[10px]"></i> ซ่อนข้อมูลส่วนบุคคลแล้ว
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={nationalId}
                    onFocus={() => {
                      if (nationalId.startsWith('X')) {
                        setNationalId('');
                      }
                    }}
                    onChange={(e) => setNationalId(e.target.value.trim())}
                    className="w-full pl-3.5 pr-8 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 text-sm sm:text-base font-mono transition-all"
                    placeholder="กรอกเลขบัตร 13 หลัก หรือรหัสอ้างอิง"
                  />
                  {nationalId && (
                    <button
                      type="button"
                      onClick={() => setNationalId('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded"
                      title="ล้างข้อความ"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">* กรอกเลขบัตร ปชช. 13 หลัก หรือรหัสอ้างอิงที่ได้รับ</p>
                <p className="text-xs text-gray-500 mt-0.5">* ถ้าท่านลงทะเบียนมากกว่า 1 ครั้ง ศูนย์ฝึกฯ จะใช้ข้อมูลที่ท่านลงทะเบียนเข้ามาครั้งล่าสุด</p>
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className={`w-full py-3 rounded-full text-gray-900 font-extrabold text-base transition-all shadow-sm ${
                  isSearching ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#f6c343] hover:bg-[#eab308] active:scale-[0.99]'
                }`}
              >
                {isSearching ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i> กำลังค้นหา...
                  </span>
                ) : (
                  'ค้นหา'
                )}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
                <i className="fas fa-exclamation-circle mr-1.5"></i> {error}
              </div>
            )}

            {result && !error && (
              <div className="mt-5 border-t border-dashed border-gray-200 pt-5">
                {/* Secure Shareable Link Card */}
                <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <i className="fas fa-shield-alt text-base"></i>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <span>ลิงก์ที่ปลอดภัย (แปลงรหัสแล้ว)</span>
                        <span className="text-[10px] bg-emerald-200/70 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">ส่งต่อได้</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 truncate">
                        ซ่อนเลขบัตรประชาชน ปลอดภัยสำหรับการส่งต่อ
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="shrink-0 px-3 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <i className={`fas ${copied ? 'fa-check' : 'fa-link'}`}></i>
                    <span>{copied ? 'คัดลอกเรียบร้อย!' : 'คัดลอกลิงก์ส่งต่อ'}</span>
                  </button>
                </div>

                <div className="mb-3 p-3 bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-xl text-xs sm:text-sm">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs mr-2">
                    พบข้อมูล
                  </span>
                  ข้อมูลที่ท่านลงทะเบียนด้วยตนเองในวันที่ <b>{result.registrationDate || 'ไม่ทราบวันที่'}</b>
                </div>

                <div className="divide-y divide-gray-100 text-xs sm:text-sm">
                  <div className="flex justify-between py-2.5 gap-3">
                    <span className="w-[44%] font-bold text-slate-700">ชื่อ - นามสกุล</span>
                    <span className="w-[56%] text-slate-900 text-right font-medium">{result.fullName || 'ไม่มีข้อมูล'}</span>
                  </div>
                  <div className="flex justify-between py-2.5 gap-3">
                    <span className="w-[44%] font-bold text-slate-700">รหัสบัตรประชาชน</span>
                    <span className="w-[56%] text-slate-900 text-right font-mono font-medium">{result.maskedCitizenId || result.citizenId}</span>
                  </div>
                  <div className="flex justify-between py-2.5 gap-3">
                    <span className="w-[44%] font-bold text-slate-700">อีเมล</span>
                    <span className="w-[56%] text-slate-900 text-right break-all">{result.email || 'ไม่มีข้อมูล'}</span>
                  </div>
                  <div className="flex justify-between py-2.5 gap-3">
                    <span className="w-[44%] font-bold text-slate-700">สาขาที่สังกัด</span>
                    <span className="w-[56%] text-slate-900 text-right">{result.branch || 'ไม่มีข้อมูล'}</span>
                  </div>
                  <div className="flex justify-between py-2.5 gap-3">
                    <span className="w-[44%] font-bold text-slate-700">รหัสตัวแทน/นายหน้า</span>
                    <span className="w-[56%] text-slate-900 text-right font-mono">{result.agentCode || 'ไม่มีข้อมูล'}</span>
                  </div>
                  <div className="flex justify-between py-2.5 gap-3">
                    <span className="w-[44%] font-bold text-slate-700">เลขที่ใบอนุญาต</span>
                    <span className="w-[56%] text-slate-900 text-right font-mono font-semibold text-blue-900">{result.licenseNo || 'ไม่มีข้อมูล'}</span>
                  </div>
                  <div className="flex justify-between py-2.5 gap-3">
                    <span className="w-[44%] font-bold text-slate-700">วันใบอนุญาตหมดอายุ</span>
                    <span className="w-[56%] text-slate-900 text-right">{result.licenseExpiryDate || 'ไม่มีข้อมูล'}</span>
                  </div>
                  <div className="flex justify-between py-2.5 gap-3">
                    <span className="w-[44%] font-bold text-slate-700">ประเภทใบอนุญาต</span>
                    <span className="w-[56%] text-slate-900 text-right font-medium">{result.courseType || 'ไม่มีข้อมูล'}</span>
                  </div>
                  <div className="flex justify-between py-2.5 gap-3">
                    <span className="w-[44%] font-bold text-slate-700">หลักสูตรที่ท่านต้องอบรมคือ</span>
                    <span className="w-[56%] text-slate-900 text-right font-semibold text-emerald-800">{result.renewLevel || 'ไม่มีข้อมูล'}</span>
                  </div>

                  <div className="py-2.5">
                    <div className="font-bold text-slate-700 mb-1">
                      วิชาที่ท่านแจ้งว่าผ่านการอบรมแล้ว<br/>
                      <span className="text-red-600 font-normal text-xs">
                        วิชาที่ท่านผ่านการอบรมแล้ว จะไม่จัดท่านเข้าอบรมหลักสูตรนั้นอีก
                      </span>
                    </div>
                    <div className="text-slate-800 whitespace-pre-line leading-relaxed text-xs sm:text-sm pl-2 border-l-2 border-gray-200 mt-1">
                      {result.pastCourses || 'ไม่มีข้อมูล'}
                    </div>
                  </div>

                  <div className="py-2.5">
                    <div className="font-bold text-slate-700 mb-1">
                      วิชาที่ท่านลงทะเบียนเพื่ออบรมในปี 2569
                    </div>
                    {result.wantCoursesList && result.wantCoursesList.length > 0 ? (
                      <div className="space-y-3 pl-2 border-l-2 border-amber-300 mt-1">
                        {result.wantCoursesList.map((c, i) => (
                          <div key={i} className="text-xs sm:text-sm leading-relaxed">
                            <div className={c.isPassed ? "font-bold text-slate-900" : "text-slate-700"}>
                              {c.index ? `${c.index}. ` : ''}{c.header ? `${c.header}:` : ''}
                            </div>
                            <div className={c.isPassed ? "font-bold text-emerald-800" : "text-slate-800"}>
                              {c.courseName} {c.isPassed && <span className="font-bold text-emerald-700">(ผ่านการอบรมแล้ว)</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-800 whitespace-pre-line leading-relaxed text-xs sm:text-sm pl-2 border-l-2 border-amber-300 mt-1">
                        {result.wantCourses || 'ไม่มีข้อมูล'}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
