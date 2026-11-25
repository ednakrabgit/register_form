import { API_BASE_URL } from '../../config/api';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function EnquiryPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialId = searchParams.get('citizen_id') || searchParams.get('national_id') || '';

  const [nationalId, setNationalId] = useState(initialId.replace(/\D/g, ''));
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const fetchEnquiry = async (idToSearch) => {
    const cleanId = (idToSearch || '').replace(/\D/g, '');
    if (!cleanId || cleanId.length !== 13) {
      setError("กรุณากรอกเลขบัตรประชาชน 13 หลัก");
      return;
    }

    setIsSearching(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/Enquiry/${cleanId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'ไม่พบข้อมูลการอบรมของท่าน');
        return;
      }

      setResult(data);
      // Update URL without refresh
      const newUrl = `${window.location.pathname}?citizen_id=${cleanId}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (initialId && initialId.replace(/\D/g, '').length === 13) {
      fetchEnquiry(initialId);
    }
  }, [initialId]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchEnquiry(nationalId);
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
              ข้อมูลทางด้านขวาของท่าน คือ รายละเอียดที่ท่านได้แจ้งในการลงทะเบียนอบรม กรุณาตรวจสอบความถูกต้องทั้งหมด หากท่านพบว่าข้อมูลของท่านไม่ถูกต้อง กรุณา email พร้อมแจ้งรายละเอียดที่ต้องการแก้ไขได้ที่{' '}
              <a href="mailto:iptc.ops@viriyah.co.th" className="text-[#0b3d91] font-bold hover:underline">
                iptc.ops@viriyah.co.th
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
                <label className="block text-sm font-bold text-gray-900 mb-1.5">
                  เลขบัตรประชาชน
                </label>
                <input
                  type="text"
                  maxLength="13"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 text-sm sm:text-base font-mono transition-all"
                  placeholder="ตัวเลข 13 หลัก"
                />
                <p className="text-xs text-gray-500 mt-1.5">* กรอกเฉพาะตัวเลข 13 หลัก</p>
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
              <div className="mt-4 border-t border-dashed border-gray-200 pt-4">
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
                    <div className="text-slate-800 whitespace-pre-line leading-relaxed text-xs sm:text-sm pl-2 border-l-2 border-amber-300 mt-1">
                      {result.wantCourses || 'ไม่มีข้อมูล'}
                    </div>
                  </div>

                  {result.stampedResults && result.stampedResults.length > 0 && (
                    <div className="py-3 bg-slate-50 -mx-6 px-6 border-t border-slate-200 mt-2">
                      <div className="font-bold text-[#0b3d91] text-xs sm:text-sm flex items-center gap-1.5 mb-2">
                        <i className="fas fa-certificate text-emerald-600"></i> ผลการอบรมจริงที่ประทับผลแล้ว (Training Results)
                      </div>
                      <div className="space-y-2">
                        {result.stampedResults.map((item, idx) => (
                          <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                            <div className="font-semibold text-slate-800">{item.subjectNames || item.courseName}</div>
                            <div className="flex justify-between text-slate-500 mt-1">
                              <span>รอบวันที่: {item.trainingDate || '-'}</span>
                              <span className={`font-bold ${
                                item.status && (item.status.includes('ผ่าน') || item.status.includes('อนุมัติ'))
                                  ? 'text-emerald-700' : 'text-red-600'
                              }`}>
                                {item.status || '-'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
