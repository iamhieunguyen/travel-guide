import React from 'react';
import { Map } from 'lucide-react';

export default function MapTypeDropdown({ value, onChange }) {
  const mapTypes = [
    { value: 'roadmap', label: 'Bản đồ đường' },
    { value: 'satellite', label: 'Vệ tinh' },
    { value: 'terrain', label: 'Địa hình' },
    { value: 'hybrid', label: 'Lai' }
  ];

  const selectedType = mapTypes.find(type => type.value === value);

  return (
    <div className="dropdown-wrapper">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="map-type-dropdown"
      >
        {mapTypes.map(type => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      <div className="dropdown-display">
        <Map className="w-4 h-4" />
        <span>{selectedType?.label || 'Bản đồ đường'}</span>
      </div>
    </div>
  );
}

