import React from 'react';
import { Ruler } from 'lucide-react';

export default function MapUnitDropdown({ value, onChange }) {
  const units = [
    { value: 'metric', label: 'Hệ mét (km, m)' },
    { value: 'imperial', label: 'Hệ Anh (mi, ft)' }
  ];

  const selectedUnit = units.find(unit => unit.value === value);

  return (
    <div className="dropdown-wrapper">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="map-unit-dropdown"
      >
        {units.map(unit => (
          <option key={unit.value} value={unit.value}>
            {unit.label}
          </option>
        ))}
      </select>
      <div className="dropdown-display">
        <Ruler className="w-4 h-4" />
        <span>{selectedUnit?.label || 'Hệ mét (km, m)'}</span>
      </div>
    </div>
  );
}

