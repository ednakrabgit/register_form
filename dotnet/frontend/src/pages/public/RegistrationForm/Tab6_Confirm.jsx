import { API_BASE_URL, API_ORIGIN } from '../../../config/api';
import { useState, useEffect } from 'react';
import { useRegistration } from '../../../context/RegistrationContext';
import Button from '../../../components/Button';
import { useNavigate } from 'react-router-dom';

export default function Tab6Confirm() {
  const { prevStep, formData, updateData, masterData } = useRegistration();
  const [errors, setErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    updateData({ [e.target.id]: e.target.value });
    if (errors[e.target.id]) {
      setErrors(prev => ({ ...prev, [e.target.id]: '' }));
    }
  };

  const handleCheckboxChange = (name, value, isChecked) => {
    const currentArray = formData[name] || [];
    let newArray;
    if (isChecked) {
      newArray = [...currentArray, value];
    } else {
      newArray = currentArray.filter(item => item !== value);
    }
    updateData({ [name]: newArray });
  };

  // Auto-normalize array fields matching by name
  useEffect(() => {
    let updates = {};
    if (masterData?.territories && formData.salesTerritories?.length > 0) {
      const normalized = formData.salesTerritories.map(val => {
        const found = masterData.territories.find(t => t.id.toString() === val || t.name === val);
        return found ? found.id.toString() : val;
      });
      if (JSON.stringify(normalized) !== JSON.stringify(formData.salesTerritories)) {
        updates.salesTerritories = normalized;
      }
    }
    if (masterData?.expertises && formData.insuranceSpecialty?.length > 0) {
      const normalized = formData.insuranceSpecialty.map(val => {
        const found = masterData.expertises.find(t => t.id.toString() === val || t.name === val);
        return found ? found.id.toString() : val;
      });
      if (JSON.stringify(normalized) !== JSON.stringify(formData.insuranceSpecialty)) {
        updates.insuranceSpecialty = normalized;
      }
    }
    if (masterData?.companies && formData.otherInsuranceCompanies?.length > 0) {
      const normalized = formData.otherInsuranceCompanies.map(val => {
        const found = masterData.companies.find(t => t.id.toString() === val || t.name === val);
        return found ? found.id.toString() : val;
      });
      if (JSON.stringify(normalized) !== JSON.stringify(formData.otherInsuranceCompanies)) {
        updates.otherInsuranceCompanies = normalized;
      }
    }
    if (Object.keys(updates).length > 0) {
      updateData(updates);
    }
  }, [formData.salesTerritories, formData.insuranceSpecialty, formData.otherInsuranceCompanies, masterData]);

  const openModal = (e) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    try {
      console.log('Submitting data to backend:', formData);
      
      const payload = { ...formData };
      
      // Convert arrays to comma-separated strings of IDs
      // Convert all array fields to comma-separated strings to match backend string fields and avoid 400 Bad Request
      const arrayFields = [
        'salesTerritories',
        'insuranceSpecialty',
        'otherInsuranceCompanies',
        'previousCourses',
        'selectedSubjects',
        'deductionPrivilege'
      ];
      
      arrayFields.forEach(field => {
        if (Array.isArray(payload[field])) {
          if (field === 'salesTerritories') {
            payload.salesArea = payload[field].join(',');
          } else {
            payload[field] = payload[field].join(',');
          }
        }
      });
      
      // Convert empty strings to null for backend validation
      // and booleans to string representations
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          payload[key] = null;
        } else if (typeof payload[key] === 'boolean') {
          payload[key] = payload[key] ? 'true' : 'false';
        }
      });
      
      
      const res = await fetch(`${API_BASE_URL}/registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        console.error('API Error Details:', errData);
        alert('Validation Error: ' + JSON.stringify(errData.errors || errData));
        throw new Error('API Error');
      }
      
      setShowConfirmModal(false);
      navigate(`/success?national_id=${formData.nationalId}&phone=${formData.phone || formData.phoneOtp}`);
    } catch (error) {
      if (error.message !== 'API Error') {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
      }
    }
  };

  const getAgentTypeName = () => {
    if (formData.courseType == '9' || formData.courseType == '10') {
      return formData.agentType === 'ตัวแทน' ? 'ตัวแทนประกันวินาศภัย' : 'นายหน้าประกันวินาศภัย';
    }
    return formData.courseType === '1' ? 'ตัวแทนประกันวินาศภัย' : 'นายหน้าประกันวินาศภัย';
  };

  const territories = masterData?.territories || [];
  const specialties = masterData?.expertises || [];
  const companies = masterData?.companies || [];

  return (
    <div className="animate-[fadeIn_0.5s]">
      <h3 className="text-xl font-semibold mb-6 text-primary border-b pb-2">
        <i className="fa-solid fa-paperclip"></i> 6. แนบไฟล์เอกสาร
      </h3>
      
      <form onSubmit={openModal} noValidate>
        <div className="mb-6">
          <label htmlFor="mainBusiness" className="block text-sm font-medium text-textMain mb-1">ธุรกิจอื่นที่ท่านทำ</label>
          <p className="text-[13px] text-gray-500 mb-2 mt-[-4px]">กรุณาระบุประเภทธุรกิจ</p>
          <input
            id="mainBusiness"
            type="text"
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-4 transition-colors border-border focus:border-primary focus:ring-primary/10"
            placeholder="กรุณาระบุ"
            value={formData.mainBusiness || ''}
            onChange={handleChange}
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="insuranceExperienceYears" className="block text-sm font-medium text-textMain mb-1">ประสบการณ์ในธุรกิจประกันภัย</label>
          <p className="text-[13px] text-gray-500 mb-2 mt-[-4px]">จำนวนปี เช่น 3</p>
          <input
            id="insuranceExperienceYears"
            type="number"
            min="0"
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-4 transition-colors border-border focus:border-primary focus:ring-primary/10"
            placeholder="ต้องระบุเป็นตัวเลข"
            value={formData.insuranceExperienceYears || ''}
            onChange={handleChange}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-textMain mb-2">เขตพื้นที่ขาย</label>
          <div className="flex flex-wrap gap-4">
            {territories.map((territory, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="salesTerritories"
                  className="w-4 h-4 accent-primary"
                  value={territory.id}
                  checked={(formData.salesTerritories || []).includes(territory.id.toString())}
                  onChange={(e) => handleCheckboxChange('salesTerritories', territory.id.toString(), e.target.checked)}
                />
                <span>{territory.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-textMain mb-2">ความเชี่ยวชาญประกันภัย</label>
          <div className="flex flex-col gap-3">
            {specialties.map((specialty, idx) => (
              <label key={idx} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="insuranceSpecialty"
                  className="w-4 h-4 accent-primary"
                  value={specialty.id}
                  checked={(formData.insuranceSpecialty || []).includes(specialty.id.toString())}
                  onChange={(e) => handleCheckboxChange('insuranceSpecialty', specialty.id.toString(), e.target.checked)}
                />
                <span>{specialty.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-textMain mb-2">บริษัทประกันภัยอื่นที่ท่านส่งงานในปัจจุบัน</label>
          <div className="max-h-60 overflow-y-auto p-4 border border-border rounded-md bg-gray-50 flex flex-col gap-3">
            {companies.map((company, idx) => (
              <label key={idx} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="otherInsuranceCompanies"
                  className="w-4 h-4 accent-primary"
                  value={company.id}
                  checked={(formData.otherInsuranceCompanies || []).includes(company.id.toString())}
                  onChange={(e) => handleCheckboxChange('otherInsuranceCompanies', company.id.toString(), e.target.checked)}
                />
                <span>{company.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-between mt-10 pt-5 border-t border-border">
          <Button type="button" variant="secondary" onClick={prevStep}><i className="fas fa-arrow-left"></i> ย้อนกลับ</Button>
          <Button type="submit">
            ตรวจสอบข้อมูลและส่ง <i className="fas fa-search"></i>
          </Button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.3s]">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-[slideUp_0.3s]">
            <div className="bg-[#1C3672] text-white py-4 px-6 text-center">
              <h2 className="text-xl font-bold">กรุณาตรวจสอบข้อมูลด้านล่างให้ถูกต้องก่อนยืนยัน</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4 text-sm">
                <div className="flex border-b border-gray-100 pb-3">
                  <span className="w-1/3 text-gray-500 font-medium">คำนำหน้า + ชื่อ-นามสกุล</span>
                  <span className="w-2/3 text-gray-900">{masterData?.titles?.find(t => t.id.toString() === formData.titleTh)?.name || ''} {formData.firstNameTh} {formData.lastNameTh}</span>
                </div>
                <div className="flex border-b border-gray-100 pb-3">
                  <span className="w-1/3 text-gray-500 font-medium">เลขบัตรประชาชน</span>
                  <span className="w-2/3 text-gray-900">{formData.nationalId?.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</span>
                </div>
                <div className="flex border-b border-gray-100 pb-3">
                  <span className="w-1/3 text-gray-500 font-medium">หมายเลขโทรศัพท์</span>
                  <span className="w-2/3 text-gray-900">{formData.phone || formData.phoneOtp}</span>
                </div>
                <div className="flex border-b border-gray-100 pb-3">
                  <span className="w-1/3 text-gray-500 font-medium">อีเมล</span>
                  <span className="w-2/3 text-gray-900">{formData.email}</span>
                </div>
                <div className="flex border-b border-gray-100 pb-3">
                  <span className="w-1/3 text-gray-500 font-medium">ประเภทใบอนุญาต</span>
                  <span className="w-2/3 text-gray-900">{getAgentTypeName()}</span>
                </div>
                <div className="flex pb-3">
                  <span className="w-1/3 text-gray-500 font-medium">หลักสูตร</span>
                  <span className="w-2/3 text-gray-900">{masterData?.renewCourses?.find(c => c.id.toString() === formData.courseType)?.name || formData.courseType}</span>
                </div>
              </div>

              <div className="mt-6 text-center text-red-500 text-sm font-semibold">
                <i className="fas fa-exclamation-triangle"></i> ข้อมูลยังไม่ถูกส่ง! กรุณากดปุ่ม "ยืนยันส่งข้อมูล" ด้านล่าง
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex gap-4 justify-between border-t border-gray-200">
              <button 
                type="button" 
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors flex-1 text-center"
              >
                <i className="fas fa-arrow-left mr-2"></i> ย้อนกลับแก้ไข
              </button>
              <button 
                type="button" 
                onClick={confirmSubmit}
                className="px-5 py-2.5 bg-[#3B66D6] hover:bg-[#2C4FA6] text-white rounded-md font-medium transition-colors flex-1 text-center shadow-md"
              >
                <i className="fas fa-paper-plane mr-2"></i> ยืนยันส่งข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
