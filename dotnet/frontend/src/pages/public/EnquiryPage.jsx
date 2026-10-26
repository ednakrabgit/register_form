import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function EnquiryPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialId = searchParams.get('national_id') || '';

  const [nationalId, setNationalId] = useState(initialId);
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Automatically search if initialId is provided
  useEffect(() => {
    if (initialId && initialId.length === 13) {
      handleSearch();
    }
  }, [initialId]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    
    if (!nationalId || nationalId.length !== 13) {
      setError("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
      return;
    }

    setIsSearching(true);
    setError('');
    setResult(null);

    try {
      // Use the existing Person API to fetch data
      const cleanId = nationalId.replace(/\D/g, '');
      const res = await fetch(`${API_BASE_URL}/person/${cleanId}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          setError('ไม่พบข้อมูลการอบรมของท่าน');
        } else {
          throw new Error('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
        }
        return;
      }

      const data = await res.json();
      setResult(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-10 animate-[fadeIn_0.5s]">
      <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-xl overflow-hidden">
        
        {/* Left Side - Info */}
        <div className="md:w-1/2 bg-[#F9F7F1] p-8 border-r border-gray-200 flex flex-col">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1C3672] rounded flex items-center justify-center text-white text-xl">
              <i className="fas fa-check-square"></i>
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Online Learning</h2>
              <p className="text-xs text-gray-500">by The Viriyah Insurance</p>
            </div>
          </div>
          
          <h3 className="text-[#1C3672] font-bold text-lg mb-6">ศูนย์ฝึกอบรมและพัฒนานักประกันภัย<br/>บริษัท วิริยะประกันภัย จำกัด (มหาชน)</h3>
          
          <div className="bg-[#EBE2B2] p-5 rounded-md text-sm text-gray-800 mb-6 flex-1">
            <h4 className="font-bold mb-4 text-[#1C3672] text-lg">ศูนย์ฝึกอบรมและพัฒนานักประกันภัย<br/>ขอบคุณทุกท่านที่ลงทะเบียนอบรมปี 2569</h4>
            
            <p className="mb-4">ข้อมูลทางด้านขวาของท่าน คือ รายละเอียดที่ท่านได้แจ้งในการลงทะเบียนอบรม กรุณาตรวจสอบความถูกต้องทั้งหมด หากท่านพบว่าข้อมูลของท่านไม่ถูกต้อง กรุณา email พร้อมแจ้งรายละเอียดที่ต้องการแก้ไขได้ที่ iptc.ops@viriyah.co.th</p>
            
            <p className="mb-4">หากว่าข้อมูลทุกอย่างถูกต้อง<br/>ท่านจะได้รับ e-mail เพื่อเข้าอบรมก่อนวันอบรมจริง 15 วัน เพื่อตั้ง password<br/>และจะได้รับ email ยืนยันก่อนเข้ารอบอบรมจริง 7 วัน</p>
            
            <p className="mb-4">หากท่านมีข้อสงสัยหรือต้องการสอบถามเพิ่มเติม กรุณาติดต่อ ผ่าน<br/>Line Official Account : <strong>@viriyahiptc</strong> หรือ <a href="#" className="text-blue-700 underline">https://lin.ee/4k6FJ6g</a></p>
            
            <p className="mb-4">ถ้ามีข้อสงสัยเกี่ยวกับระบบ V Online Learning ติดต่อสอบถาม<br/>ทีมบริการและสนับสนุนผู้ใช้ระบบ V Online Learning<br/>จะสอบถามข้อมูลส่วนตัว เพื่อให้ได้คำแนะนำที่ถูกต้องเฉพาะตัวท่านเองได้ที่</p>
            
            <p><strong>โทร: 02-821-6729</strong><br/>วันจันทร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์ เวลา 9:00 - 17:00 น.</p>
          </div>
        </div>

        {/* Right Side - Search & Results */}
        <div className="md:w-1/2 bg-[#1C3672] p-8">
          
          <div className="bg-white rounded-lg p-6 shadow-md mb-6 animate-[slideUp_0.4s]">
            <h2 className="text-[#1C3672] text-xl font-bold mb-4">ค้นหารายละเอียดข้อมูลการอบรม</h2>
            
            <form onSubmit={handleSearch}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประชาชน</label>
                <input
                  type="text"
                  maxLength="13"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3672] border-gray-300"
                  placeholder="ตัวเลข 13 หลัก"
                />
                <p className="text-xs text-gray-500 mt-1">* กรอกเฉพาะตัวเลข 13 หลัก</p>
              </div>
              
              <button
                type="submit"
                disabled={isSearching}
                className={`w-full py-2.5 rounded-md text-gray-800 font-bold text-base transition-colors ${isSearching ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#E3C565] hover:bg-[#d6b750]'}`}
              >
                {isSearching ? 'กำลังค้นหา...' : 'ค้นหา'}
              </button>
            </form>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm text-center font-medium animate-[fadeIn_0.3s]">
                {error}
              </div>
            )}
          </div>

          {/* Results */}
          {result && !error && (
            <div className="bg-white rounded-lg p-6 shadow-md animate-[slideUp_0.4s]">
              <h3 className="font-bold text-lg text-gray-800 mb-4 border-b pb-2">ข้อมูลผู้ลงทะเบียน</h3>
              <div className="space-y-3 text-sm">
                <div className="flex">
                  <span className="w-1/3 text-gray-500">ชื่อ-นามสกุล</span>
                  <span className="w-2/3 text-gray-900 font-medium">
                    {result.titleThName || (result.titleTh === '1' ? 'นาย' : result.titleTh === '2' ? 'นาง' : result.titleTh === '3' ? 'นางสาว' : result.titleTh || '')} {result.firstNameTh} {result.lastNameTh}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-gray-500">เบอร์โทรศัพท์</span>
                  <span className="w-2/3 text-gray-900 font-medium">{result.phone || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-gray-500">อีเมล</span>
                  <span className="w-2/3 text-gray-900 font-medium">{result.email || '-'}</span>
                </div>
                {/* Normally we'd show the Course here, but we need to fetch master data or decode it. For now showing IDs. */}
                <div className="flex border-t pt-3 mt-2">
                  <span className="w-1/3 text-gray-500">สถานะเอกสาร</span>
                  <span className="w-2/3 text-green-600 font-bold">
                    <i className="fas fa-check-circle mr-1"></i> ได้รับข้อมูลแล้ว
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
