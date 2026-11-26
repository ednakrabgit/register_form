import { useRegistration } from '../../../context/RegistrationContext';
import Button from '../../../components/Button';
import Input, { renderLabelWithAsterisk } from '../../../components/Input';
import ThaiDatePicker from '../../../components/ThaiDatePicker';
import { useEffect, useState } from 'react';
import Select from 'react-select';

export default function Tab4License() {
  const { nextStep, prevStep, formData, updateData, masterData, sysConfig } = useRegistration();
  const [errors, setErrors] = useState({});

  const branchOptions = (masterData?.agentBranches || []).map(b => ({
    value: b.branchId?.toString(),
    label: b.branchName,
    regionId: b.regionId?.toString(),
    regionName: b.regionName
  }));

  const selectedBranch = branchOptions.find(o => o.value === formData.agentBranch || o.label === formData.agentBranch) || null;
  const isRenewal = formData.courseType && formData.courseType.includes('ต่อใบอนุญาต');

  const handleBranchChange = (selectedOption) => {
    updateData({ 
      agentBranch: selectedOption ? selectedOption.value : '',
      agentRegion: selectedOption ? selectedOption.regionId : '',
      agentRegionName: selectedOption ? selectedOption.regionName : ''
    });
    if (errors.agentBranch) {
      setErrors(prev => ({ ...prev, agentBranch: '' }));
    }
  };

  useEffect(() => {
    // Parse URL query parameters similar to legacy appconfig.php
    const params = new URLSearchParams(window.location.search);
    
    // Initialize default values if not already set in formData
    const updates = {};
    if (!formData.agentType && params.get('agent_type')) {
      updates.agentType = params.get('agent_type') === 'broker' ? 'broker' : 'agent';
    }
    if (!formData.agentBranch && params.get('agent_branch')) {
      updates.agentBranch = params.get('agent_branch');
    }
    if (!formData.viriyaContractCode && params.get('viriyah_code')) {
      updates.viriyaContractCode = params.get('viriyah_code');
    }
    
    if (Object.keys(updates).length > 0) {
      updateData(updates);
    }
  }, []); // Run once on mount

  // Auto-fill region and fix branch ID if branch is pre-selected (e.g. from OIC mock data matching by name)
  useEffect(() => {
    if (selectedBranch) {
      let updates = {};
      if (formData.agentBranch !== selectedBranch.value) {
        updates.agentBranch = selectedBranch.value;
      }
      if (!formData.agentRegion || !formData.agentRegionName) {
        updates.agentRegion = selectedBranch.regionId;
        updates.agentRegionName = selectedBranch.regionName;
      }
      if (Object.keys(updates).length > 0) {
        updateData(updates);
      }
    }
  }, [selectedBranch, formData.agentBranch, formData.agentRegion, formData.agentRegionName]);

  const handleChange = (e) => {
    let value = e.target.value;
    
    // Force digits only and enforce length manually for these fields
    if (e.target.id === 'viriyaContractCode') {
      value = value.replace(/\D/g, '').slice(0, 5);
      e.target.value = value; // Force DOM update for React controlled component edge case
    } else if (e.target.id === 'licenseNo') {
      value = value.replace(/\D/g, '').slice(0, 10);
      e.target.value = value; // Force DOM update for React controlled component edge case
    }

    updateData({ [e.target.id]: value });
    if (errors[e.target.id]) {
      setErrors(prev => ({ ...prev, [e.target.id]: '' }));
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.agentType) newErrors.agentType = 'กรุณาเลือกประเภทใบอนุญาต';
    
    if (formData.agentType === 'broker' && !formData.brokerType) {
      newErrors.brokerType = 'กรุณาเลือกประเภทนายหน้า';
    }

    if (!formData.agentBranch?.trim()) newErrors.agentBranch = 'กรุณาระบุสาขา';
    
    if (!formData.viriyaContractCode?.trim()) {
      newErrors.viriyaContractCode = 'กรุณาระบุรหัสที่มีสัญญากับ บมจ.วิริยะประกันภัย';
    } else if (formData.viriyaContractCode?.trim() && !/^\d{5}$/.test(formData.viriyaContractCode)) {
      newErrors.viriyaContractCode = 'กรุณาระบุตัวเลข 5 หลัก';
    }

    if (isRenewal) {
      if (!formData.licenseNo?.trim()) {
        newErrors.licenseNo = 'กรุณาระบุเลขที่ใบอนุญาต';
      } else if (!/^\d{10}$/.test(formData.licenseNo)) {
        newErrors.licenseNo = 'กรุณาระบุตัวเลข 10 หลัก';
      } else if (!/^\d{2}(02|04|06)\d{6}$/.test(formData.licenseNo)) {
        newErrors.licenseNo = 'เลขที่ใบอนุญาตในหลักที่ 3 และ 4 ต้องเป็น 02, 04 หรือ 06 เท่านั้น';
      }
      if (!formData.licenseExpire) {
        newErrors.licenseExpire = 'กรุณาระบุวันที่บัตรหมดอายุ';
      } else {
        const expireDate = new Date(formData.licenseExpire);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expireDate <= today) {
          newErrors.licenseExpire = 'วันที่บัตรหมดอายุต้องมากกว่าวันปัจจุบัน';
        }
      }
    } else {
      // If they filled licenseNo voluntarily, still validate its format
      if (formData.licenseNo?.trim()) {
        if (!/^\d{10}$/.test(formData.licenseNo)) {
          newErrors.licenseNo = 'กรุณาระบุตัวเลข 10 หลัก';
        } else if (!/^\d{2}(02|04|06)\d{6}$/.test(formData.licenseNo)) {
          newErrors.licenseNo = 'เลขที่ใบอนุญาตในหลักที่ 3 และ 4 ต้องเป็น 02, 04 หรือ 06 เท่านั้น';
        }
        if (!formData.licenseExpire) {
          newErrors.licenseExpire = 'กรุณาระบุวันที่บัตรหมดอายุเมื่อกรอกเลขที่ใบอนุญาต';
        }
      }
      
      if (formData.licenseExpire) {
        const expireDate = new Date(formData.licenseExpire);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expireDate <= today) {
          newErrors.licenseExpire = 'วันที่บัตรหมดอายุต้องมากกว่าวันปัจจุบัน';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorId = Object.keys(newErrors)[0];
      // special handling for radio buttons
      const errorElement = document.getElementById(firstErrorId) || document.getElementsByName(firstErrorId)[0];
      errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    nextStep();
  };

  return (
    <div className="animate-[fadeIn_0.5s]">
      <h3 className="text-xl font-semibold mb-6 text-primary border-b pb-2">
        <i className="fa-solid fa-id-card"></i> 4. ข้อมูลใบอนุญาตตัวแทน/นายหน้า
      </h3>
      
      <form onSubmit={handleNext} noValidate>
        <div className="mb-6">
          <label className="block mb-2 font-medium text-textMain">ประเภทใบอนุญาต <span className="text-red-500 font-bold">*</span></label>
          
          <div className="border border-border rounded-md p-3 mb-2 flex items-center gap-3 bg-white hover:bg-gray-50 cursor-pointer" onClick={() => updateData({ agentType: 'agent', brokerType: '' })}>
            <input 
              type="radio" 
              name="agentType" 
              id="agentType_agent" 
              className="w-5 h-5 accent-primary" 
              checked={formData.agentType === 'agent'}
              onChange={() => updateData({ agentType: 'agent', brokerType: '' })}
            />
            <label htmlFor="agentType_agent" className="cursor-pointer font-medium">ตัวแทนประกันวินาศภัย</label>
          </div>

          <div className={`border rounded-md p-3 flex flex-col gap-3 bg-white transition-all ${formData.agentType === 'broker' ? 'border-primary' : 'border-border'}`}>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => updateData({ agentType: 'broker' })}>
              <input 
                type="radio" 
                name="agentType" 
                id="agentType_broker" 
                className="w-5 h-5 accent-primary" 
                checked={formData.agentType === 'broker'}
                onChange={() => updateData({ agentType: 'broker' })}
              />
              <label htmlFor="agentType_broker" className="cursor-pointer font-medium">นายหน้าประกันวินาศภัย</label>
            </div>

              {formData.agentType === 'broker' && (
              <div className="pl-8 pt-3 pb-2 border-t border-gray-100 flex flex-col gap-4 animate-[fadeIn_0.3s]">
                <label className="block font-medium text-textMain">ประเภทนายหน้า <span className="text-red-500 font-bold">*</span></label>
                
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => { updateData({ brokerType: 'individual' }); if (errors.brokerType) setErrors(prev => ({...prev, brokerType: ''})) }}>
                  <input 
                    type="radio" 
                    name="brokerType" 
                    id="brokerType_ind" 
                    className="w-4 h-4 accent-primary" 
                    checked={formData.brokerType === 'individual'}
                    onChange={() => { updateData({ brokerType: 'individual' }); if (errors.brokerType) setErrors(prev => ({...prev, brokerType: ''})) }}
                  />
                  <label htmlFor="brokerType_ind" className="cursor-pointer">นายหน้าบุคคล</label>
                </div>

                <div className="flex items-center gap-3 cursor-pointer" onClick={() => { updateData({ brokerType: 'corporate' }); if (errors.brokerType) setErrors(prev => ({...prev, brokerType: ''})) }}>
                  <input 
                    type="radio" 
                    name="brokerType" 
                    id="brokerType_corp" 
                    className="w-4 h-4 accent-primary" 
                    checked={formData.brokerType === 'corporate'}
                    onChange={() => { updateData({ brokerType: 'corporate' }); if (errors.brokerType) setErrors(prev => ({...prev, brokerType: ''})) }}
                  />
                  <label htmlFor="brokerType_corp" className="cursor-pointer">นายหน้านิติบุคคล</label>
                </div>
                {errors.brokerType && <p className="text-error text-sm mt-1">{errors.brokerType}</p>}
              </div>
            )}
          </div>
          {errors.agentType && <p className="text-error text-sm mt-2">{errors.agentType}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div id="agentBranch">
            <label htmlFor="agentBranch" className="block text-sm font-medium text-textMain mb-1">
              {renderLabelWithAsterisk(sysConfig?.tab4_label_branch || 'สาขา', true)}
            </label>
            <p className="text-[13px] text-gray-500 mb-2 mt-[-4px]">{sysConfig?.tab4_hint_branch || 'พิมพ์เพื่อค้นหาสาขา'}</p>
            <Select
              options={branchOptions}
              value={selectedBranch}
              onChange={handleBranchChange}
              placeholder="พิมพ์ค้นหาสาขา"
              isClearable
              className={`react-select-container ${errors.agentBranch ? 'border-error rounded-md' : ''}`}
              classNamePrefix="react-select"
              menuPortalTarget={document.body}
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: errors.agentBranch ? '#ef4444' : '#d1d5db',
                  padding: '4px',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#1e3a8a'
                  }
                }),
                menuPortal: base => ({ ...base, zIndex: 9999 })
              }}
            />
            {errors.agentBranch && <p className="text-error text-sm mt-1">{errors.agentBranch}</p>}
          </div>
          
          <div>
            <label htmlFor="agentRegion" className="block text-sm font-medium text-textMain mb-1">
              {renderLabelWithAsterisk(sysConfig?.tab4_label_region || 'ภาค', true)}
            </label>
            <p className="text-[13px] text-gray-500 mb-2 mt-[-4px]">{sysConfig?.tab4_hint_region || 'ระบบจะเติมให้อัตโนมัติ'}</p>
            <input
              type="text"
              id="agentRegion"
              className="w-full px-4 py-[11px] border border-border rounded-md bg-gray-100 cursor-not-allowed text-gray-600 focus:outline-none h-[42px] mt-[1px]"
              placeholder="ระบบจะเติมให้อัตโนมัติ"
              value={selectedBranch ? selectedBranch.regionName : (formData.agentRegionName || '')}
              readOnly
              required
            />
          </div>
        </div>

        <div className="mt-4 mb-6">
          <label htmlFor="viriyaContractCode" className="block mb-1 font-medium text-textMain">
            {renderLabelWithAsterisk(sysConfig?.tab4_label_agentcode || 'รหัสที่มีสัญญากับ บมจ.วิริยะประกันภัย', true)}
          </label>
          <span className="text-sm text-gray-500 block mb-2">{sysConfig?.tab4_hint_agentcode || 'ถ้าไม่ทราบ สอบถามสาขา หรือตัวแทน/นายหน้าที่ท่านสังกัด, ถ้าเป็นขอรับใบอนุญาต และยังไม่มีรหัส ให้กรอก 00000'}</span>
          <input 
            type="text"
            id="viriyaContractCode"
            placeholder="(ระบบบังคับ 5 หลัก)"
            maxLength={5}
            onKeyDown={(e) => {
              if (e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                if (!/[0-9]/.test(e.key) || (e.target.value && e.target.value.length >= 5)) {
                  e.preventDefault();
                }
              }
            }}
            className={`w-full px-4 py-3 border rounded-md font-sarabun text-[15px] focus:outline-none focus:ring-4 transition-colors ${errors.viriyaContractCode ? 'border-error focus:border-error focus:ring-error/10' : 'border-border focus:border-primary focus:ring-primary/10'}`}
            value={formData.viriyaContractCode || ''}
            onChange={handleChange}
          />
          {errors.viriyaContractCode && <p className="text-error text-sm mt-1">{errors.viriyaContractCode}</p>}
        </div>

        {formData.agentType === 'broker' && formData.brokerType === 'corporate' && (
          <div className="border border-border rounded-md overflow-hidden mb-6 bg-white animate-[fadeIn_0.3s]">
            <div className="bg-[#243d7c] text-white p-3 font-medium flex items-center gap-2">
              <i className="fa-solid fa-building"></i> ข้อมูลสังกัด
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="ข้อมูลสังกัดบริษัทโบรกเกอร์" 
                id="brokerAffiliation" 
                placeholder="ถ้ามีกรุณาระบุชื่อ" 
                value={formData.brokerAffiliation || ''} 
                onChange={handleChange} 
              />
              <Input 
                label="สาขาของบริษัทนายหน้าที่สังกัด (ถ้ามี)" 
                id="branchRecommender" 
                placeholder="ใส่คำตอบ" 
                value={formData.branchRecommender || ''} 
                onChange={handleChange} 
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            label="เลขที่ใบอนุญาต" 
            id="licenseNo" 
            placeholder="(บังคับ 10 หลัก)" 
            required={isRenewal} 
            maxLength={10} 
            value={formData.licenseNo || ''} 
            onChange={handleChange} 
            error={errors.licenseNo} 
            onKeyDown={(e) => {
              if (e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                if (!/[0-9]/.test(e.key) || (e.target.value && e.target.value.length >= 10)) {
                  e.preventDefault();
                }
              }
            }}
          />
          <ThaiDatePicker 
            label="วันที่ออกใบอนุญาต" 
            id="licenseIssue" 
            value={formData.licenseIssue || ''} 
            onChange={handleChange} 
          />
          <ThaiDatePicker 
            label="วันที่บัตรหมดอายุ" 
            id="licenseExpire" 
            required={isRenewal}
            error={errors.licenseExpire}
            value={formData.licenseExpire || ''} 
            onChange={handleChange} 
          />
        </div>

        <div className="flex justify-between mt-10 pt-5 border-t border-border">
          <Button type="button" variant="secondary" onClick={prevStep}><i className="fas fa-arrow-left"></i> ย้อนกลับ</Button>
          <Button type="submit">ถัดไป <i className="fas fa-arrow-right"></i></Button>
        </div>
      </form>
    </div>
  );
}
