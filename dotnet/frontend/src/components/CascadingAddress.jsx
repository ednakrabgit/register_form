import { API_BASE_URL, API_ORIGIN } from '../config/api';
import { useState, useEffect } from 'react';
import Select from 'react-select';
import { useRegistration } from '../context/RegistrationContext';

export default function CascadingAddress({ prefix = "", errors = {} }) {
  const { formData, updateData, masterData } = useRegistration();

  const [districts, setDistricts] = useState([]);
  const [subDistricts, setSubDistricts] = useState([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingSubDistricts, setLoadingSubDistricts] = useState(false);

  const provinceField = `${prefix}province`;
  const districtField = `${prefix}district`;
  const subDistrictField = `${prefix}subDistrict`;
  const zipcodeField = `${prefix}zipcode`;

  const provinceIdField = `${prefix}provinceId`;
  const districtIdField = `${prefix}districtId`;
  const subDistrictIdField = `${prefix}subDistrictId`;

  const provinceOptions = masterData.provinces?.map(p => ({ 
    value: p.provinceId, 
    label: p.provinceThai 
  })) || [];

  // Fetch districts when province changes
  useEffect(() => {
    const provinceId = formData[provinceIdField];
    if (provinceId) {
      setLoadingDistricts(true);
      fetch(`${API_BASE_URL}/masterdata/districts/${provinceId}`)
        .then(res => res.json())
        .then(data => {
          setDistricts(data.map(d => ({ value: d.districtId, label: d.districtThai })));
          setLoadingDistricts(false);
        })
        .catch(() => setLoadingDistricts(false));
    } else {
      setDistricts([]);
    }
  }, [formData[provinceIdField]]);

  // Fetch sub-districts when district changes
  useEffect(() => {
    const districtId = formData[districtIdField];
    if (districtId) {
      setLoadingSubDistricts(true);
      fetch(`${API_BASE_URL}/masterdata/subdistricts/${districtId}`)
        .then(res => res.json())
        .then(data => {
          setSubDistricts(data.map(s => ({ value: s.subDistrictId, label: s.subDistrictThai, zipcode: s.zipcode })));
          setLoadingSubDistricts(false);
        })
        .catch(() => setLoadingSubDistricts(false));
    } else {
      setSubDistricts([]);
    }
  }, [formData[districtIdField]]);

  const handleProvinceChange = (selected) => {
    updateData({
      [provinceField]: selected ? selected.label : '',
      [provinceIdField]: selected ? selected.value : null,
      [districtField]: '',
      [districtIdField]: null,
      [subDistrictField]: '',
      [subDistrictIdField]: null,
      [zipcodeField]: ''
    });
  };

  const handleDistrictChange = (selected) => {
    updateData({
      [districtField]: selected ? selected.label : '',
      [districtIdField]: selected ? selected.value : null,
      [subDistrictField]: '',
      [subDistrictIdField]: null,
      [zipcodeField]: ''
    });
  };

  const handleSubDistrictChange = (selected) => {
    updateData({
      [subDistrictField]: selected ? selected.label : '',
      [subDistrictIdField]: selected ? selected.value : null,
      [zipcodeField]: selected ? selected.zipcode : ''
    });
  };

  const getCustomStyles = (hasError) => ({
    control: (provided, state) => ({
      ...provided,
      padding: '0.4rem',
      borderRadius: '0.375rem',
      borderColor: hasError ? '#ef4444' : (state.isFocused ? '#1d4ed8' : '#e5e7eb'),
      boxShadow: state.isFocused ? '0 0 0 4px rgba(29, 78, 216, 0.1)' : 'none',
      '&:hover': {
        borderColor: hasError ? '#ef4444' : '#1d4ed8'
      }
    }),
    option: (provided, state) => ({
      ...provided,
      fontFamily: 'Sarabun, sans-serif'
    }),
    singleValue: (provided) => ({
      ...provided,
      fontFamily: 'Sarabun, sans-serif'
    }),
    menuPortal: base => ({ ...base, zIndex: 9999 })
  });

  return (
    <>
      <div className="mb-5" id={provinceIdField}>
        <label className="block mb-2 font-medium text-textMain">
          จังหวัด <span className="text-red-500 font-bold ml-1">*</span>
        </label>
        <Select
          options={provinceOptions}
          value={provinceOptions.find(o => String(o.value) === String(formData[provinceIdField])) || null}
          onChange={handleProvinceChange}
          placeholder="-- ค้นหา/เลือกจังหวัด --"
          isClearable
          styles={getCustomStyles(!!errors[provinceIdField])}
          menuPortalTarget={document.body}
        />
        {errors[provinceIdField] && <p className="text-error text-sm mt-1">{errors[provinceIdField]}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <div className="mb-5" id={districtIdField}>
          <label className="block mb-2 font-medium text-textMain">
            อำเภอ/เขต <span className="text-red-500 font-bold ml-1">*</span>
          </label>
          <Select
            options={districts}
            value={districts.find(o => String(o.value) === String(formData[districtIdField])) || null}
            onChange={handleDistrictChange}
            placeholder="-- ค้นหา/เลือกอำเภอ --"
            isDisabled={!formData[provinceIdField]}
            isLoading={loadingDistricts}
            isClearable
            styles={getCustomStyles(!!errors[districtIdField])}
            menuPortalTarget={document.body}
          />
          {errors[districtIdField] && <p className="text-error text-sm mt-1">{errors[districtIdField]}</p>}
        </div>
        <div className="mb-5" id={subDistrictIdField}>
          <label className="block mb-2 font-medium text-textMain">
            ตำบล/แขวง <span className="text-red-500 font-bold ml-1">*</span>
          </label>
          <Select
            options={subDistricts}
            value={subDistricts.find(o => String(o.value) === String(formData[subDistrictIdField])) || null}
            onChange={handleSubDistrictChange}
            placeholder="-- ค้นหา/เลือกตำบล --"
            isDisabled={!formData[districtIdField]}
            isLoading={loadingSubDistricts}
            isClearable
            styles={getCustomStyles(!!errors[subDistrictIdField])}
            menuPortalTarget={document.body}
          />
          {errors[subDistrictIdField] && <p className="text-error text-sm mt-1">{errors[subDistrictIdField]}</p>}
        </div>
        <div className="mb-5">
          <label className="block mb-2 font-medium text-textMain">
            รหัสไปรษณีย์ <span className="text-red-500 font-bold ml-1">*</span>
          </label>
          <input
            id={zipcodeField}
            type="text"
            readOnly
            className="w-full px-4 py-3 border rounded-md font-sarabun text-[15px] transition-colors border-border bg-gray-50 focus:outline-none"
            value={formData[zipcodeField] || ''}
          />
        </div>
      </div>
    </>
  );
}
