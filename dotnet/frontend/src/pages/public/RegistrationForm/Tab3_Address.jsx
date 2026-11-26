import { useState } from 'react';
import { useRegistration } from '../../../context/RegistrationContext';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import CascadingAddress from '../../../components/CascadingAddress';

export default function Tab3Address() {
  const { nextStep, prevStep, formData, updateData } = useRegistration();
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    updateData({ [e.target.id]: e.target.value });
    if (errors[e.target.id]) {
      setErrors(prev => ({ ...prev, [e.target.id]: '' }));
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate main address
    if (!formData.houseNo?.trim()) newErrors.houseNo = 'กรุณากรอกบ้านเลขที่';
    if (!formData.provinceId) newErrors.provinceId = 'กรุณาเลือกจังหวัด';
    if (!formData.districtId) newErrors.districtId = 'กรุณาเลือกอำเภอ';
    if (!formData.subDistrictId) newErrors.subDistrictId = 'กรุณาเลือกตำบล';

    // Validate shipping address if not same
    if (formData.sameAddress === false) {
      if (!formData.shipHouseNo?.trim()) newErrors.shipHouseNo = 'กรุณากรอกบ้านเลขที่ (จัดส่ง)';
      if (!formData.shipprovinceId) newErrors.shipprovinceId = 'กรุณาเลือกจังหวัด (จัดส่ง)';
      if (!formData.shipdistrictId) newErrors.shipdistrictId = 'กรุณาเลือกอำเภอ (จัดส่ง)';
      if (!formData.shipsubDistrictId) newErrors.shipsubDistrictId = 'กรุณาเลือกตำบล (จัดส่ง)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Optional: scroll to the first error
      const firstErrorId = Object.keys(newErrors)[0];
      document.getElementById(firstErrorId)?.focus();
      return;
    }

    nextStep();
  };

  return (
    <div className="animate-[fadeIn_0.5s]">
      <h3 className="text-xl font-semibold mb-6 text-primary border-b pb-2">
        <i className="fa-solid fa-map-location-dot"></i> 3. ข้อมูลที่อยู่
      </h3>
      
      <form onSubmit={handleNext} noValidate>
        <div className="border border-border rounded-md overflow-hidden mb-6 bg-white">
          <div className="bg-[#243d7c] text-white p-3 font-medium flex items-center gap-2">
            <i className="fas fa-home"></i> ที่อยู่ตามบัตรประชาชน
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="บ้านเลขที่" id="houseNo" required value={formData.houseNo || ''} onChange={handleChange} error={errors.houseNo} placeholder="5555" />
              <Input label="หมู่" id="moo" value={formData.moo || ''} onChange={handleChange} placeholder="เช่น 5" />
              <Input label="หมู่บ้าน/อาคาร" id="village" value={formData.village || ''} onChange={handleChange} placeholder="เช่น หมู่บ้านสุขสันต์" />
              <Input label="ซอย" id="soi" value={formData.soi || ''} onChange={handleChange} placeholder="เช่น ซอย 10" />
            </div>

            <div className="grid grid-cols-1 gap-4 mt-2 mb-4">
              <Input label="ถนน" id="road" value={formData.road || ''} onChange={handleChange} placeholder="เช่น สุขุมวิท" />
            </div>
            
            <CascadingAddress prefix="" errors={errors} />
          </div>
        </div>

        <div className="mb-6">
          <span className="block mb-2 font-medium text-textMain">ที่อยู่สำหรับจัดส่งเอกสาร</span>
          <div className="flex flex-col gap-3">
            <label className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${formData.sameAddress !== false ? 'border-primary bg-white text-primary' : 'border-border bg-white'}`}>
              <input 
                type="radio" 
                name="addressChoice"
                className="w-4 h-4 accent-primary"
                checked={formData.sameAddress !== false}
                onChange={() => updateData({ sameAddress: true })}
              />
              <span className="font-medium">ใช้ที่อยู่เดียวกันกับทะเบียนบ้าน</span>
            </label>
            <label className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${formData.sameAddress === false ? 'border-primary bg-white text-primary' : 'border-border bg-white'}`}>
              <input 
                type="radio" 
                name="addressChoice"
                className="w-4 h-4 accent-primary"
                checked={formData.sameAddress === false}
                onChange={() => updateData({ sameAddress: false })}
              />
              <span className="font-medium">ระบุที่อยู่ใหม่</span>
            </label>
          </div>
        </div>

        {formData.sameAddress === false && (
          <div className="p-4 border border-border bg-gray-50 rounded-lg animate-[fadeIn_0.3s]">
            <h4 className="font-semibold mb-4 text-textMain">ที่อยู่สำหรับจัดส่งเอกสาร</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="บ้านเลขที่" id="shipHouseNo" required value={formData.shipHouseNo || ''} onChange={handleChange} error={errors.shipHouseNo} />
              <Input label="หมู่" id="shipMoo" value={formData.shipMoo || ''} onChange={handleChange} />
              <Input label="หมู่บ้าน/อาคาร" id="shipVillage" value={formData.shipVillage || ''} onChange={handleChange} />
              <Input label="ซอย" id="shipSoi" value={formData.shipSoi || ''} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 gap-4 mt-2 mb-4">
              <Input label="ถนน" id="shipRoad" value={formData.shipRoad || ''} onChange={handleChange} />
            </div>

            <CascadingAddress prefix="ship" errors={errors} />
          </div>
        )}

        <div className="flex justify-between mt-10 pt-5 border-t border-border">
          <Button type="button" variant="secondary" onClick={prevStep}><i className="fas fa-arrow-left"></i> ย้อนกลับ</Button>
          <Button type="submit">ถัดไป <i className="fas fa-arrow-right"></i></Button>
        </div>
      </form>
    </div>
  );
}
