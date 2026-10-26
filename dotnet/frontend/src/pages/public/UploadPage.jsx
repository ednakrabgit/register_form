import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/Button';

export default function UploadPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  
  const rawNationalId = searchParams.get('national_id') || '';
  const rawPhone = searchParams.get('phone') || '';
  
  const [nationalId, setNationalId] = useState(rawNationalId.replace(/\D/g, ''));
  const [phone, setPhone] = useState(rawPhone.replace(/\D/g, ''));
  const [files, setFiles] = useState({
    profile: null,
    idCardWithFace: null,
    idCard: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const handleFileChange = (e, type) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({
        ...prev,
        [type]: e.target.files[0]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!nationalId || nationalId.length !== 13) {
      alert("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
      return;
    }

    if (!files.profile && !files.idCardWithFace && !files.idCard) {
      alert("กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์เพื่ออัปโหลด");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('nationalId', nationalId);
      formData.append('phone', phone);
      
      if (files.profile) formData.append('Profile', files.profile);
      if (files.idCardWithFace) formData.append('IDCardFace', files.idCardWithFace);
      if (files.idCard) formData.append('IDCard', files.idCard);

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('อัปโหลดไม่สำเร็จ หรือไม่พบข้อมูลการลงทะเบียน');
      }

      alert("อัปโหลดเอกสารเรียบร้อยแล้ว");
      navigate('/enquiry?national_id=' + nationalId);

    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full mx-auto animate-[fadeIn_0.5s]">
      <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-xl overflow-hidden">
        
        {/* Left Side - Info */}
        <div className="md:w-[45%] bg-[#F9F7F1] p-6 md:p-8 border-r border-gray-200">
          <div className="mb-6">
            <img src="/icon/logo-vonlinelearning.jpg" alt="V Online Learning" className="max-h-[80px] w-auto" />
          </div>
          
          <h3 className="text-[#1C3672] font-bold text-lg mb-6">ศูนย์ฝึกอบรมและพัฒนานักประกันภัย<br/>บริษัท วิริยะประกันภัย จำกัด (มหาชน)</h3>
          
          <div className="bg-[#EBE2B2] p-5 rounded-md text-sm text-gray-800 mb-6">
            <h4 className="font-bold mb-3 text-center">* ขั้นตอนการลงทะเบียนอบรมปี 2569 *</h4>
            
            <p className="mb-2"><strong>1.ตรวจสอบประวัติการฝึกอบรมของท่านที่ระบบ e-Licensing ของ คปภ.</strong> โดยกด link ด้านล่าง เพื่อดูข้อมูลวิชาที่ท่านอบรมผ่านมาแล้ว<br/>
            <a href="#" className="text-blue-700 underline">https://smart.oic.or.th/E_Licensing_Entry/Login</a></p>
            <p className="text-xs text-gray-600 mb-3">
              สำหรับปัญหาการใช้งานระบบ e-Licensing<br/>
              - ปัญหาเรื่องกระบวนการต่ออายุ 025153999 ต่อ 6503 หรือ 6302<br/>
              - ปัญหาเรื่องการเข้าใช้งาน 093-301-9738, 093-301-8768<br/>
              - ปัญหาการยืนยันตัวตนผ่านระบบ คปภ. รอบรู้ <a href="https://oicconnect-incident-report.paperform.co/" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-semibold">[กดที่นี่]</a><br/>
              หลังจากตรวจสอบข้อมูลประวัติการฝึกอบรมของท่านแล้ว ให้
            </p>
            
            <p className="mb-3"><strong>2. กรอกข้อมูลตาม Link</strong> <a href="#" className="text-blue-700 underline">https://iptc.viriyah.co.th/form2</a></p>
            
            <p className="mb-3"><strong>3. upload ภาพ</strong><br/>เพื่อใช้เป็นหลักฐานประกอบในการลงทะเบียนอบรมกับศูนย์ฝึกอบรมฯ ทางด้านขวาของหน้านี้</p>
            
            <p className="mb-3 text-red-600 font-medium">ถ้าท่านดำเนินการครบ 3 ขั้นตอน ถือว่าดำเนินการครบถ้วนแล้ว ศูนย์ฝึกอบรมฯ จะประกาศรายชื่อผู้เข้าอบรมให้ท่านทราบอีกครั้งหนึ่ง</p>
            
            <p className="mb-3">หรือตรวจสอบข้อมูลที่ท่านลงทะเบียนได้ที่<br/>
            <a href="https://iptc.xn--z3cbl2brb.com/form2/enquiry.corse.php" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">https://iptc.xn--z3cbl2brb.com/form2/enquiry.corse.php</a></p>
            
            <p className="mb-3 font-medium text-[#1C3672]">วิชาที่ท่านผ่านการอบรมแล้ว จะไม่จัดท่านเข้าอบรมหลักสูตรนั้นอีก</p>
            
            <p className="mb-0">หากท่านมีข้อสงสัยหรือต้องการสอบถามเพิ่มเติม กรุณาติดต่อ ผ่าน<br/>
            Line Official Account : <span className="text-blue-700 font-medium">@viriyahiptc</span> หรือ <a href="https://lin.ee/4k6FJ6g" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">https://lin.ee/4k6FJ6g</a></p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="md:w-[55%] p-6 md:p-8">

          
          <p className="text-gray-700 font-medium mb-6">กรอกรหัสประชาชน/หมายเลขโทรศัพท์มือถือ และ upload ภาพ</p>
          
          {/* Media Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Video Card */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-gray-50 py-2 px-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                  <i className="fas fa-video mr-2 text-[#1C3672]"></i> Video แนะนำการลงทะเบียน
                </h3>
              </div>
              <div className="aspect-video bg-gray-900 relative">
                <video 
                  className="w-full h-full object-cover"
                  controls
                  poster="/icon/video-thumb.jpg"
                >
                  <source src="/icon/clip-register.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>

            {/* Infographic Card */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-gray-50 py-2 px-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                  <i className="fas fa-image mr-2 text-[#1C3672]"></i> ขั้นตอนการลงทะเบียน
                </h3>
              </div>
              <div className="aspect-video bg-gray-50 flex items-center justify-center p-2 relative group cursor-pointer" onClick={() => setPreviewImage('/icon/infographic2569.png')}>
                <img 
                  src="/icon/infographic2569.png" 
                  alt="ขั้นตอนการลงทะเบียน" 
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="bg-white text-gray-800 text-xs font-bold py-1.5 px-3 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    <i className="fas fa-search-plus mr-1"></i> ขยายรูปภาพ
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประชาชน</label>
              <input
                type="text"
                maxLength="13"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3672] border-gray-300"
                placeholder="ตัวเลข 13 หลัก"
                required
              />
              <p className="text-xs text-gray-500 mt-1">ตัวเลข 13 หลัก และมีการตรวจสอบความถูกต้องของรหัส</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">หมายเลขโทรศัพท์มือถือ</label>
              <input
                type="text"
                maxLength="10"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3672] border-gray-300"
                placeholder="ตัวเลข 10 หลัก"
              />
              <p className="text-xs text-gray-500 mt-1">ตัวเลข 10 หลัก</p>
            </div>
            
            {/* File 1 */}
            <div className="pt-2 border-t border-gray-200">
              <label className="block text-sm font-bold text-gray-800 mb-1">
                ไฟล์ภาพที่ 1 <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-2 border border-blue-200 cursor-pointer" onClick={() => setPreviewImage('/icon/sample1.png')}>กดเพื่อดูตัวอย่างภาพที่ถูกต้อง</span>
              </label>
              <p className="text-sm text-gray-600 mb-2">(ภาพถ่ายหน้าตรง ไม่สวมหมวก แว่นกันแดด และหน้ากาก)</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={(e) => handleFileChange(e, 'profile')}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-400 mt-1">รองรับ JPG/PNG/GIF ขนาดไม่เกิน 6 MB</p>
            </div>

            {/* File 2 */}
            <div className="pt-2 border-t border-gray-200">
              <label className="block text-sm font-bold text-gray-800 mb-1">
                ไฟล์ภาพที่ 2 <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-2 border border-blue-200 cursor-pointer" onClick={() => setPreviewImage('/icon/sample2.png')}>กดเพื่อดูตัวอย่างภาพที่ถูกต้อง</span>
              </label>
              <p className="text-sm text-gray-600 mb-2">(ภาพถ่ายคู่กับบัตรประชาชนที่ยังไม่หมดอายุก่อนวันอบรม)</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={(e) => handleFileChange(e, 'idCardWithFace')}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-400 mt-1">รองรับ JPG/PNG/GIF ขนาดไม่เกิน 6 MB</p>
            </div>

            {/* File 3 */}
            <div className="pt-2 border-t border-gray-200">
              <label className="block text-sm font-bold text-gray-800 mb-1">
                ไฟล์ภาพที่ 3 <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-2 border border-blue-200 cursor-pointer" onClick={() => setPreviewImage('/icon/sample3.png')}>กดเพื่อดูตัวอย่างภาพที่ถูกต้อง</span>
              </label>
              <p className="text-sm text-gray-600 mb-2">(ภาพถ่ายบัตรประชาชนที่ยังไม่หมดอายุก่อนวันอบรม)</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={(e) => handleFileChange(e, 'idCard')}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-400 mt-1">รองรับ JPG/PNG/GIF ขนาดไม่เกิน 6 MB</p>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 rounded-md text-gray-800 font-bold text-lg transition-colors shadow-sm ${isSubmitting ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#E3C565] hover:bg-[#d6b750]'}`}
              >
                {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูล'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal for Image Preview */}
      {previewImage && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black/80 z-[100] p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center">
            <button 
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-3xl font-bold focus:outline-none"
              onClick={() => setPreviewImage(null)}
            >
              &times;
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
