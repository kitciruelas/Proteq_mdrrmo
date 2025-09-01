import React from 'react';

interface SelectProps {
  label?: string;
  name?: string;
  id?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function Select({
  label,
  name,
  id,
  value,
  onChange,
  options,
  error,
  required = false,
  disabled = false,
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:outline-none transition-all duration-200 ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
            : 'border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-100'
        } ${
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
        }`}
      >
        <option value="" disabled>
          Select an option
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <i className="ri-error-warning-line"></i>
          {error}
        </p>
      )}
    </div>
  );
}
