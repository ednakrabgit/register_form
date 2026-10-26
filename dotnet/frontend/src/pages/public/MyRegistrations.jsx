import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { User, Calendar, BookOpen, Clock, CheckCircle2, FileText, Upload, PlusCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function MyRegistrations() {
  const { user } = useAuth();
  const [personData, setPersonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTraineeHistory = async () => {
      if (!user?.nationId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/person/${user.nationId}`);
        if (res.ok) {
          const data = await res.json();
          setPersonData(data);
        }
      } catch (err) {
        console.error("Failed to load applicant history", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTraineeHistory();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header Profile Card */}
      <div className="bg-gradient-to-r from-primary to-[#004B87] text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white border-2 border-white/40 shadow-inner">
            <User className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{user?.fullName || user?.username}</h2>
              <span className="bg-amber-400 text-slate-900 text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                ผู้เข้าอบรม (Applicant)
              </span>
            </div>
            <p className="text-white/80 text-sm mt-0.5">
              เลขประจำตัวประชาชน: <span className="font-mono">{user?.nationId || '-'}</span> | อีเมล: {user?.email}
            </p>
          </div>
        </div>

        <Link
          to="/"
          className="flex items-center gap-2 bg-secondary hover:bg-secondaryHover text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow-md transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          ลงทะเบียนอบรมหลักสูตรใหม่
        </Link>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            ประวัติและสถานะการลงทะเบียนของท่าน
          </h3>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-slate-500 hover:text-primary flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            รีเฟรชข้อมูล
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : personData ? (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl p-5 hover:border-primary/50 transition-colors shadow-sm bg-slate-50/50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">
                    {personData.courseType || 'หลักสูตรอบรม'}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> บันทึกล่าสุด: {personData.completionTime ? new Date(personData.completionTime).toLocaleDateString('th-TH') : 'บันทึกในระบบ'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                  {personData.confirmed ? 'ยืนยันการลงทะเบียนแล้ว' : 'บันทึกข้อมูลเรียบร้อย'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm text-slate-700 mt-4 bg-white p-4 rounded-xl border border-slate-100">
                <div>
                  <div className="text-xs text-slate-400">ชื่อ-นามสกุล ผู้สมัคร</div>
                  <div className="font-semibold text-slate-800">
                    {personData.titleTh} {personData.firstNameTh} {personData.lastNameTh}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400">ประเภทและเลขที่ใบอนุญาต</div>
                  <div className="font-semibold text-slate-800">
                    {personData.licenseType || '-'} {personData.licenseNo ? `(${personData.licenseNo})` : ''}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400">สังกัดสาขา / รหัสตัวแทน</div>
                  <div className="font-semibold text-slate-800">
                    {personData.agentBranch || '-'} {personData.viriyahAgentCode ? `[${personData.viriyahAgentCode}]` : ''}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-200/60 justify-end">
                <Link
                  to="/upload"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:border-primary px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  อัปโหลด / ตรวจสอบเอกสารรูปถ่าย
                </Link>

                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-primary hover:bg-[#002882] px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  เข้าสู่แบบฟอร์มลงทะเบียน
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-700 mb-1">ยังไม่มีประวัติการลงทะเบียนในระบบ</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              ท่านสามารถเริ่มกรอกแบบฟอร์มลงทะเบียนเพื่อสมัครเข้ารับการอบรมได้ทันที
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-primary hover:bg-[#002882] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              เริ่มลงทะเบียนอบรมทันที
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
