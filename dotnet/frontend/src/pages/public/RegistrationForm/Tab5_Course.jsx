import { API_BASE_URL, API_ORIGIN } from '../../../config/api';
import { useState, useEffect } from 'react';
import { useRegistration } from '../../../context/RegistrationContext';
import Button from '../../../components/Button';
import Select from '../../../components/Select';

export default function Tab5Course() {
  const { nextStep, prevStep, formData, updateData } = useRegistration();
  const [errors, setErrors] = useState({});

  const handleCheckboxChange = (name, value, isChecked) => {
    const currentArray = formData[name] || [];
    let newArray;
    if (isChecked) {
      newArray = [...currentArray, value.toString()];
    } else {
      newArray = currentArray.filter(item => {
        if (item.toString() === value.toString()) return false;
        if (name === 'selectedSubjects') {
          const match = renewOtherOptions.find(o => o.id.toString() === value.toString());
          if (match && (match.name === item || match.name.includes(item.toString().trim()))) return false;
        }
        if (name === 'previousCourses') {
          const match = renewCourseCheckboxes.find(o => o.id.toString() === value.toString());
          if (match && (match.name === item || match.name.includes(item.toString().trim()))) return false;
        }
        return true;
      });
    }
    updateData({ [name]: newArray });
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.courseType) {
      newErrors.courseType = 'กรุณาเลือกระดับคอร์สที่ต้องการอบรม';
    }

    const selectedCourseObj = courseOptions.find(c => c.id?.toString() === formData.courseType);
    const isComplex = selectedCourseObj && selectedCourseObj.dateId === null;

    if (formData.courseType && !isComplex && !formData.trainingDate) {
      newErrors.trainingDate = 'กรุณาเลือกรอบวันอบรม';
    }

    if (isComplex) {
      const validSelected = (formData.selectedSubjects || []).filter(val => {
        const cleanVal = val.toString().trim();
        return renewOtherOptions.some(opt => opt.id.toString() === cleanVal || opt.name === cleanVal || opt.name.includes(cleanVal));
      });
      if (validSelected.length === 0) {
        newErrors.selectedSubjects = 'กรุณาเลือกวิชาที่ประสงค์จะเข้าอบรมอย่างน้อย 1 วิชา';
      }
    }

    if ((formData.deductionPrivilege || []).includes('MasterDegree') && !formData.masterDegreeStatus) {
      newErrors.masterDegreeStatus = 'กรุณาระบุสถานะการยื่นเอกสาร';
    }

    // We check if it is a renewal course (IDs 2, 3, 4, 9 for agent, and 6, 7, 8, 10 for broker)
    if (['2', '3', '4', '9', '6', '7', '8', '10'].includes(formData.courseType)) {
      if (!formData.licenseNo?.trim() || !formData.licenseExpire) {
        newErrors.courseType = 'กรุณาย้อนกลับไปกรอก "เลขที่ใบอนุญาต" และ "วันที่บัตรหมดอายุ" ในส่วนที่ 4';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Optional: scroll to the first error
      const firstErrorId = Object.keys(newErrors)[0];
      document.getElementById(firstErrorId)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    nextStep();
  };

  const [courseOptions, setCourseOptions] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [renewCourseCheckboxes, setRenewCourseCheckboxes] = useState([]);
  const [renewOtherOptions, setRenewOtherOptions] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoadingCourses(true);
        const agentType = formData.agentType || 'agent'; // Default to agent if not set
        const res = await fetch(`${API_BASE_URL}/masterdata/renew-courses?agentType=${agentType}`);
        if (res.ok) {
          const data = await res.json();
          setCourseOptions(data);
        }
      } catch (err) {
        console.error("Failed to load courses", err);
      } finally {
        setIsLoadingCourses(false);
      }
    };
    
    fetchCourses();
  }, [formData.agentType]);

  useEffect(() => {
    const fetchRenewCheckboxes = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/masterdata/renewcourse`);
        if (res.ok) {
          const data = await res.json();
          setRenewCourseCheckboxes(data.map(item => ({ id: item.id.toString(), name: item.name })));
        }
      } catch (err) {
        console.error("Failed to load renew courses", err);
      }
    };
    fetchRenewCheckboxes();
  }, []);

  useEffect(() => {
    const fetchRenewOtherOptions = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/masterdata/renew-other-courses`);
        if (res.ok) {
          const data = await res.json();
          setRenewOtherOptions(data.map(item => ({ id: item.id.toString(), name: item.displayName })));
        }
      } catch (err) {
        console.error("Failed to load renew other courses", err);
      }
    };
    fetchRenewOtherOptions();
    }, []);

  // Auto-normalize array fields matching by name
  useEffect(() => {
    let updates = {};
    if (courseOptions?.length > 0 && formData.courseType) {
      const found = courseOptions.find(c => c.id?.toString() === formData.courseType || c.courseName === formData.courseType);
      if (found) {
        if (found.id?.toString() !== formData.courseType) {
          updates.courseType = found.id.toString();
        }
        // Normalize trainingDate if it matches dateDisplay
        if (formData.trainingDate && found.dateDisplay && formData.trainingDate === found.dateDisplay) {
            updates.trainingDate = found.dateId.toString();
        } else if (formData.trainingDate && found.dateId && formData.trainingDate === found.dateId.toString()) {
          // Do nothing
        }
      }
    }
    if (renewCourseCheckboxes?.length > 0 && formData.previousCourses?.length > 0) {
      const normalized = formData.previousCourses.map(val => {
        const cleanVal = val.toString().trim();
        const isNum = /^\d+$/.test(cleanVal);
        const found = renewCourseCheckboxes.find(t => t.id.toString() === cleanVal || t.name === cleanVal || (!isNum && t.name.includes(cleanVal)));
        return found ? found.id.toString() : cleanVal;
      });
      if (JSON.stringify(normalized) !== JSON.stringify(formData.previousCourses)) {
        updates.previousCourses = normalized;
      }
    }
    if (renewOtherOptions?.length > 0 && formData.selectedSubjects?.length > 0) {
      const normalized = formData.selectedSubjects.map(val => {
        const cleanVal = val.toString().trim();
        const isNum = /^\d+$/.test(cleanVal);
        const found = renewOtherOptions.find(t => t.id.toString() === cleanVal || t.name === cleanVal || (!isNum && t.name.includes(cleanVal)));
        return found ? found.id.toString() : cleanVal;
      });
      if (JSON.stringify(normalized) !== JSON.stringify(formData.selectedSubjects)) {
        updates.selectedSubjects = normalized;
      }
    }
    if (Object.keys(updates).length > 0) {
      updateData(updates);
    }
  }, [formData.courseType, formData.trainingDate, formData.previousCourses, formData.selectedSubjects, courseOptions, renewCourseCheckboxes, renewOtherOptions]);

  const selectedCourseObj = courseOptions.find(c => c.id?.toString() === formData.courseType);
  const isComplexCourse = selectedCourseObj && selectedCourseObj.dateId === null;
  const showDeductionPrivilege = formData.courseType === '9' || formData.courseType === '10';

  console.log("Tab5 Render! selectedSubjects:", formData.selectedSubjects);
  console.log("Tab5 Render! renewOtherOptions:", renewOtherOptions.map(o => ({id: o.id, name: o.name})));

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-border">
      <h3 className="text-xl font-semibold mb-6 text-primary border-b pb-2">
        <i className="fa-solid fa-chalkboard-user"></i> 5. หลักสูตรที่ประสงค์เข้าอบรม
      </h3>
      
      <form onSubmit={handleNext} noValidate>
        <div className="mb-6">
          <label className="block mb-2 font-medium text-textMain">ระดับคอร์ส <span className="text-red-500 font-bold">*</span></label>
          <div className="flex flex-col gap-3">
            {courseOptions.map((course, idx) => (
              <label key={idx} className={`flex items-center gap-3 cursor-pointer p-3 border rounded-md transition-colors bg-white ${errors.courseType ? 'border-error' : 'hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="courseType"
                  className="w-4 h-4 accent-primary"
                  value={course.id?.toString()}
                  checked={formData.courseType === course.id?.toString()}
                  onChange={() => {
                    updateData({ courseType: course.id?.toString(), trainingDate: '', previousCourses: [], selectedSubjects: [] });
                    if (errors.courseType) setErrors(prev => ({ ...prev, courseType: '' }));
                  }}
                />
                {course.courseName}
              </label>
            ))}
          </div>
          {errors.courseType && <p className="text-error text-sm mt-2">{errors.courseType}</p>}
        </div>

        {isComplexCourse && (
          <div className="mb-6 animate-[fadeIn_0.3s]">
            
            <label className="block mb-2 font-medium text-textMain mt-2">
              หากท่านถือใบอนุญาตเป็นตัวแทนหรือนายหน้าประกันวินาศภัยที่ต่ออายุครั้งที่ 4 เป็นต้นไป โปรดระบุวิชาที่ท่านเคยเข้าอบรมในรอบการสะสมชั่วโมงอบรมปัจจุบัน (5 ปี)<br/>
              <span className="text-error text-sm font-normal">* สำคัญ * : เพื่อท่านจะต้องไม่อบรมวิชาที่เคยเข้าอบรมซ้ำอีก ตามข้อกำหนดของ สำนักงาน คปภ.</span>
            </label>
            <div className="p-4 border border-border rounded-md bg-gray-50 flex flex-col gap-3 mb-6">
              {renewCourseCheckboxes.map((course, idx) => (
                <label key={idx} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="previousCourses"
                    className="mt-1 w-4 h-4 accent-primary cursor-pointer"
                    value={course.id}
                    checked={(formData.previousCourses || []).some(val => {
                      const strVal = val.toString().trim();
                      if (strVal === course.id.toString()) return true;
                      if (course.name === strVal) return true;
                      // Only do substring match if it's NOT a numeric ID
                      if (!/^\d+$/.test(strVal) && course.name.includes(strVal)) return true;
                      return false;
                    })}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      handleCheckboxChange('previousCourses', course.id, isChecked);
                      // Reset selectedSubjects if they overlap?
                      // The overlap check in the old logic relied on names. For IDs, we check if they are the same ID (if they match).
                      // However, previousCourses (renewCourse) and selectedSubjects (renewOtherOptions) might not share the same ID space.
                      // Wait, renewOtherOptions has `course.id` which is `id` of `PersonTraining5y`? No, renewOtherOptions are from `renew-other-courses` which are `MstRenewOther` IDs.
                      // The old logic disabled selectedSubjects if `course.includes(prev)`. Since they are IDs, this might be tricky if the IDs don't match.
                      // We will let the next block handle it based on names for disable logic.
                    }}
                  />
                  <span className="text-sm">{course.name}</span>
                </label>
              ))}
            </div>

            <label className="block mb-3 font-medium text-primary text-lg">{selectedCourseObj.courseName} <span className="text-red-500 font-bold">*</span></label>
            <div className="mb-4">
              <span className="text-error text-sm block mb-1">* เลือกได้มากกว่า 1 วิชา *</span>
              <span className="text-error text-sm block mb-2">* หากเลือกวิชาที่เคยอบรม จะไม่นับรวมรอบปัจจุบัน (5 ปี) *</span>
              <div className="flex flex-col gap-3">
                {renewOtherOptions.map((otherCourse, idx) => {
                  // Replicate the previous string-based includes check to disable options
                  const prevCourseNames = (formData.previousCourses || []).map(pId => renewCourseCheckboxes.find(c => c.id === pId)?.name || '');
                  const isDisabled = prevCourseNames.some(prevName => prevName && otherCourse.name.includes(prevName));
                  return (
                    <label key={idx} className={`flex items-start gap-3 p-3 border rounded-md ${isDisabled ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'bg-white hover:bg-gray-50 cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        name="selectedSubjects"
                        className={`mt-1 w-4 h-4 ${isDisabled ? '' : 'accent-primary cursor-pointer'}`}
                        value={otherCourse.id}
                        checked={(formData.selectedSubjects || []).some(val => {
                          const strVal = val.toString().trim();
                          if (strVal === otherCourse.id.toString()) return true;
                          if (otherCourse.name === strVal) return true;
                          // Only do substring match if it's NOT a numeric ID, to prevent '6' matching year '2569'
                          if (!/^\d+$/.test(strVal) && otherCourse.name.includes(strVal)) return true;
                          return false;
                        })}
                        disabled={isDisabled}
                        onChange={(e) => handleCheckboxChange('selectedSubjects', otherCourse.id, e.target.checked)}
                      />
                      <span className="text-sm">{otherCourse.name}</span>
                    </label>
                  );
                })}
              </div>
              {errors.selectedSubjects && <p className="text-error text-sm mt-2">{errors.selectedSubjects}</p>}
            </div>

          </div>
        )}

        {formData.courseType && !isComplexCourse && selectedCourseObj?.dateDisplay && (
          <div className="mb-6 animate-[fadeIn_0.3s]" id="trainingDate">
            <label className="block mb-3 font-medium text-primary text-lg">{selectedCourseObj.courseName} <span className="text-red-500 font-bold">*</span></label>
            <div className="flex flex-col gap-3">
              <label className={`flex items-center gap-3 cursor-pointer p-3 border rounded-md bg-white ${errors.trainingDate ? 'border-error' : 'hover:bg-gray-50'}`}>
                <input type="radio" name="trainingDate" className="w-4 h-4 accent-primary" value={selectedCourseObj.dateId?.toString()} checked={formData.trainingDate === selectedCourseObj.dateId?.toString()} onChange={(e) => { updateData({ trainingDate: e.target.value }); if (errors.trainingDate) setErrors(prev => ({ ...prev, trainingDate: '' })); }} />
                {selectedCourseObj.dateDisplay}
              </label>
            </div>
            {errors.trainingDate && <p className="text-error text-sm mt-2">{errors.trainingDate}</p>}
          </div>
        )}

        {showDeductionPrivilege && (
          <>
            <hr className="border-t border-border my-8" />
            <div className="mb-6 animate-[fadeIn_0.3s]">
              <label className="block mb-3 font-medium text-textMain">สำเร็จการศึกษาตั้งแต่ระดับปริญญาโทขึ้นไป หรือ ไม่ <span className="text-red-500 font-bold">*</span></label>
              <div className="flex flex-col gap-3 p-4 border border-border rounded-md bg-white">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="deductionPrivilege"
                    className="w-4 h-4 accent-primary"
                    value="MasterDegree"
                    checked={(formData.deductionPrivilege || []).includes('MasterDegree')}
                    onChange={(e) => {
                      updateData({ deductionPrivilege: ['MasterDegree'] });
                    }}
                  />
                  <span>ใช่ (สำเร็จการศึกษาตั้งแต่ระดับปริญญาโทขึ้นไป)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="deductionPrivilege"
                    className="w-4 h-4 accent-primary"
                    value="None"
                    checked={!(formData.deductionPrivilege || []).includes('MasterDegree')}
                    onChange={(e) => {
                      updateData({ deductionPrivilege: [], masterDegreeStatus: '' });
                    }}
                  />
                  <span>ไม่ใช่</span>
                </label>
              </div>

              {(formData.deductionPrivilege || []).includes('MasterDegree') && (
                <div className="mt-6 animate-[fadeIn_0.3s]" id="masterDegreeStatus">
                  <label className="block mb-1 font-medium text-textMain">สถานะการยื่นเอกสาร <span className="text-red-500 font-bold">*</span></label>
                  <span className="text-error text-sm block mb-4">* หากท่านเคยยื่นเอกสารและบันทึกในระบบของสำนักงาน คปภ. แล้วไม่ต้องยื่นซ้ำ</span>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-md bg-white hover:bg-gray-50">
                      <input type="radio" name="masterDegreeStatus" className="w-4 h-4 accent-primary" value="เคยยื่นเอกสาร" checked={formData.masterDegreeStatus === "เคยยื่นเอกสาร" || formData.masterDegreeStatus === "เคยยื่นเอกสารลดหย่อนก่อนหน้านี้แล้ว"} onChange={(e) => { updateData({ masterDegreeStatus: "เคยยื่นเอกสาร" }); if (errors.masterDegreeStatus) setErrors(prev => ({ ...prev, masterDegreeStatus: '' })); }} />
                      เคยยื่นเอกสาร
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-md bg-white hover:bg-gray-50">
                      <input type="radio" name="masterDegreeStatus" className="w-4 h-4 accent-primary" value="ไม่เคยยื่นเอกสาร" checked={formData.masterDegreeStatus === "ไม่เคยยื่นเอกสาร" || formData.masterDegreeStatus === "ไม่เคยยื่นเอกสารลดหย่อนก่อนหน้านี้แล้ว"} onChange={(e) => { updateData({ masterDegreeStatus: "ไม่เคยยื่นเอกสาร" }); if (errors.masterDegreeStatus) setErrors(prev => ({ ...prev, masterDegreeStatus: '' })); }} />
                      ไม่เคยยื่นเอกสาร
                    </label>
                  </div>
                  {errors.masterDegreeStatus && <p className="text-error text-sm mt-2">{errors.masterDegreeStatus}</p>}
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex justify-between mt-10 pt-5 border-t border-border">
          <Button type="button" variant="secondary" onClick={prevStep}><i className="fas fa-arrow-left"></i> ย้อนกลับ</Button>
          <Button type="submit">ถัดไป <i className="fas fa-arrow-right"></i></Button>
        </div>
      </form>
    </div>
  );
}
