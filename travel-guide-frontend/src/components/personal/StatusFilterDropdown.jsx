import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Globe, Lock, Layers } from 'lucide-react';

export default function StatusFilterDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: 'all', label: 'Tất cả', icon: Layers },
    { value: 'public', label: 'Công khai', icon: Globe },
    { value: 'private', label: 'Riêng tư', icon: Lock },
  ];

  const selectedOption = options.find(opt => opt.value === value) || options[0];
  const SelectedIcon = selectedOption.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 min-w-[160px] justify-between"
      >
        <div className="flex items-center gap-2 text-gray-700">
          <SelectedIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{selectedOption.label}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors duration-200 ${
                  value === option.value ? 'text-cyan-600 bg-cyan-50' : 'text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

