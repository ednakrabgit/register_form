import { useRegistration } from '../context/RegistrationContext';

export default function StepIndicator() {
  const { currentStep, setStep } = useRegistration();
  const totalSteps = 6;

  return (
    <div className="flex justify-between mb-10 relative">
      <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-border -translate-y-1/2 z-[1]"></div>
      
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === stepNum;
        const isFinish = currentStep > stepNum;
        
        let circleClass = "w-[35px] h-[35px] rounded-full border-[3px] flex items-center justify-center font-semibold relative z-[2] transition-all duration-300";
        
        if (isActive) {
          circleClass += " border-primary bg-primary text-white shadow-[0_0_0_4px_rgba(0,90,156,0.2)]";
        } else if (isFinish) {
          circleClass += " border-secondary bg-secondary text-white cursor-pointer";
        } else {
          circleClass += " border-border bg-white text-gray-500 opacity-50"; 
        }

        return (
          <button 
            type="button"
            key={stepNum} 
            className={circleClass}
            onClick={() => {
              if (isFinish || isActive) setStep(stepNum);
            }}
          >
            {isFinish ? <i className="fas fa-check"></i> : stepNum}
          </button>
        );
      })}
    </div>
  );
}
