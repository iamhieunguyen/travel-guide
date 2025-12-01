import React from 'react';
import { Globe, Lock, Users } from 'lucide-react';

export default function PrivacyDropdown({ value, onChange }) {
  const options = [
    { value: 'public', label: 'Công khai', icon: Globe },
    { value: 'friends', label: 'Bạn bè', icon: Users },
    { value: 'private', label: 'Riêng tư', icon: Lock }
  ];

  const selectedOption = options.find(opt => opt.value === value);
  const Icon = selectedOption?.icon || Globe;

  return (
    <div className="dropdown-wrapper">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="privacy-dropdown"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="dropdown-display">
        <Icon className="w-4 h-4" />
        <span>{selectedOption?.label || 'Công khai'}</span>
      </div>
    </div>
  );
}

