import { API_BASE_URL, API_ORIGIN } from '../config/api';
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const RegistrationContext = createContext();

const formatNationalId = (id) => {
  if (!id) return '';
  const val = id.replace(/\D/g, '');
  let formatted = val;
  if (val.length > 1) formatted = formatted.slice(0, 1) + '-' + formatted.slice(1);
  if (val.length > 5) formatted = formatted.slice(0, 6) + '-' + formatted.slice(6);
  if (val.length > 10) formatted = formatted.slice(0, 12) + '-' + formatted.slice(12);
  if (val.length > 12) formatted = formatted.slice(0, 15) + '-' + formatted.slice(15);
  return formatted;
};

export function RegistrationProvider({ children }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [masterData, setMasterData] = useState({
    provinces: [],
    titles: [],
    blood: [],
    gender: [],
    religion: [],
    agentBranches: [],
    territories: [],
    expertises: [],
    companies: []
  });
  const [sysConfig, setSysConfig] = useState({});
  const [formData, setFormData] = useState({
    pdpaConsent: false,
    nationalId: user?.nationId ? formatNationalId(user.nationId) : '',
    idCard: user?.nationId || '',
    email: user?.email || '',
    phone: user?.phone || '',
    firstNameTh: '',
    lastNameTh: '',
    // ... other fields
  });

  useEffect(() => {
    if (user?.nationId) {
      const formatted = formatNationalId(user.nationId);
      setFormData(prev => ({
        ...prev,
        nationalId: formatted,
        idCard: user.nationId,
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    // Fetch master data on load
    const fetchMasterData = async () => {
      try {
        const [provRes, titlesRes, bloodRes, genderRes, religionRes, branchesRes, territoriesRes, expertisesRes, companiesRes, configRes] = await Promise.all([
          fetch(`${API_BASE_URL}/masterdata/provinces`),
          fetch(`${API_BASE_URL}/masterdata/titles`),
          fetch(`${API_BASE_URL}/masterdata/blood`),
          fetch(`${API_BASE_URL}/masterdata/gender`),
          fetch(`${API_BASE_URL}/masterdata/religion`),
          fetch(`${API_BASE_URL}/masterdata/agent-branches`),
          fetch(`${API_BASE_URL}/masterdata/territory`),
          fetch(`${API_BASE_URL}/masterdata/expertise`),
          fetch(`${API_BASE_URL}/masterdata/company`),
          fetch(`${API_BASE_URL}/config`)
        ]);
        
        const safeJson = async (res) => {
          if (!res || !res.ok) return [];
          try {
            const data = await res.json();
            return Array.isArray(data) ? data : [];
          } catch {
            return [];
          }
        };

        const provinces = await safeJson(provRes);
        const titles = await safeJson(titlesRes);
        const blood = await safeJson(bloodRes);
        const gender = await safeJson(genderRes);
        const religion = await safeJson(religionRes);
        const agentBranches = await safeJson(branchesRes);
        const territories = await safeJson(territoriesRes);
        const expertises = await safeJson(expertisesRes);
        const companies = await safeJson(companiesRes);
        const configArray = configRes.ok ? await configRes.json().catch(() => []) : [];
        const configData = {};
        if (Array.isArray(configArray)) {
          configArray.forEach(item => {
            configData[item.key] = item.value;
          });
        } else if (configArray && typeof configArray === 'object') {
          Object.assign(configData, configArray); // Fallback in case backend is changed
        }
        
        setMasterData(prev => ({ ...prev, provinces, titles, blood, gender, religion, agentBranches, territories, expertises, companies }));
        setSysConfig(configData);

        // Set Tab 4 default values if not already present
        setFormData(prev => {
          let updates = {};
          if (!prev.agentBranch && configData['tab4_default_branch']) updates.agentBranch = configData['tab4_default_branch'];
          if (!prev.viriyahCode && configData['tab4_default_agentcode']) updates.viriyahCode = configData['tab4_default_agentcode'];
          
          if (configData['tab4_allowed_agent_types'] === 'agent' && prev.agentType !== 'agent') updates.agentType = 'agent';
          if (configData['tab4_allowed_agent_types'] === 'broker' && prev.agentType !== 'broker') updates.agentType = 'broker';
          
          return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
        });
      } catch (err) {
        console.error("Failed to load master data", err);
      }
    };
    
    fetchMasterData();
  }, []);

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 6));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const updateData = (newData) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  return (
    <RegistrationContext.Provider value={{ currentStep, formData, updateData, nextStep, prevStep, setStep: setCurrentStep, masterData, sysConfig }}>
      {children}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  return useContext(RegistrationContext);
}
