import React from 'react';

export default function LanguageDropdown({ value, onChange }) {
  const languages = [
    { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { value: 'en', label: 'English', flag: '🇺🇸' }
  ];

  const selectedLang = languages.find(lang => lang.value === value);

  return (
    <div className="dropdown-wrapper">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="language-dropdown"
      >
        {languages.map(lang => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
      <div className="dropdown-display">
        <span className="flag-emoji">{selectedLang?.flag || '🇻🇳'}</span>
        <span>{selectedLang?.label || 'Tiếng Việt'}</span>
      </div>
    </div>
  );
}

