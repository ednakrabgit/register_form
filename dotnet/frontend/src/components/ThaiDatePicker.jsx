import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import th from 'date-fns/locale/th';
import { renderLabelWithAsterisk } from './Input';

registerLocale('th', th);

const months = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export default function ThaiDatePicker({ 
  label, 
  id, 
  name,
  required, 
  error, 
  value, 
  onChange, 
  disabled = false,
  className = "", 
  inputClassName = "", 
  ...props 
}) {

  // Convert "YYYY-MM-DD" or ISO string to Date object
  let selectedDate = null;
  if (value) {
    const rawStr = typeof value === 'string' ? value.split('T')[0] : value;
    const d = new Date(rawStr);
    if (!Number.isNaN(d.getTime())) {
      selectedDate = d;
    }
  }

  const handleDateChange = (date) => {
    if (disabled) return;
    const targetName = name || id;
    if (!date) {
      onChange({ target: { id, name: targetName, value: '' } });
      return;
    }
    
    // Format to YYYY-MM-DD for native value compatibility
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    onChange({ target: { id, name: targetName, value: `${year}-${month}-${day}` } });
  };

  // Custom Input component to inject styles
  const CustomInput = React.forwardRef(({ value, onClick, onChange: onInputChange, placeholder, disabled: customDisabled }, ref) => {
    // Modify display value to +543
    let displayValue = value;
    if (value && value.length === 10) { // Assuming DD/MM/YYYY
      const parts = value.split('/');
      if (parts.length === 3) {
        const d = parts[0];
        const m = parts[1];
        const y = Number.parseInt(parts[2], 10) + 543;
        displayValue = `${d}/${m}/${y}`;
      }
    }

    const isInputDisabled = disabled || customDisabled;

    return (
      <input
        ref={ref}
        id={id}
        onClick={isInputDisabled ? undefined : onClick}
        onChange={onInputChange}
        value={displayValue}
        placeholder="วว/ดด/ปปปป"
        disabled={isInputDisabled}
        className={`w-full px-4 py-3 border rounded-md font-sarabun text-[15px] transition-colors focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 ${
          error ? "border-error bg-red-50" : isInputDisabled ? "border-gray-200 bg-gray-100 text-gray-800 cursor-not-allowed" : "border-border bg-white"
        } ${inputClassName}`}
        readOnly // Prevent typing manually to avoid format parsing issues
      />
    );
  });

  return (
    <div className={`mb-5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block mb-2 font-medium text-textMain">
          {renderLabelWithAsterisk(label, required)}
        </label>
      )}
      <div className="w-full">
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          locale="th"
          dateFormat="dd/MM/yyyy"
          disabled={disabled}
          customInput={<CustomInput />}
          renderCustomHeader={({
            date,
            changeYear,
            changeMonth,
            decreaseMonth,
            increaseMonth,
            prevMonthButtonDisabled,
            nextMonthButtonDisabled,
          }) => (
            <div className="flex justify-center items-center px-2 py-2 gap-2">
              <button
                type="button"
                onClick={decreaseMonth}
                disabled={prevMonthButtonDisabled}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {"<"}
              </button>
              
              <select
                value={months[date.getMonth()]}
                onChange={({ target: { value } }) =>
                  changeMonth(months.indexOf(value))
                }
                className="border-none bg-transparent font-medium"
              >
                {months.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              
              <select
                value={date.getFullYear()}
                onChange={({ target: { value } }) => changeYear(Number.parseInt(value))}
                className="border-none bg-transparent font-medium"
              >
                {Array.from({ length: 150 }, (_, i) => new Date().getFullYear() - 100 + i).map(year => (
                  <option key={year} value={year}>
                    {year + 543}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={increaseMonth}
                disabled={nextMonthButtonDisabled}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {">"}
              </button>
            </div>
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
}
