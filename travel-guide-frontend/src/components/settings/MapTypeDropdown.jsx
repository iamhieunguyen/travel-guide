import React, { useState, useRef, useEffect } from 'react';
import { Map, Navigation, ChevronDown } from 'lucide-react';

export default function MapTypeDropdown({ value, onChange, language = 'vi' }) {
  const isEn = language === 'en';
  // Chỉ còn 2 loại: bản đồ đường & vệ tinh, đa ngôn ngữ
  const mapTypes = isEn
    ? [
        { value: 'roadmap', label: 'Roadmap', description: 'Default street map, easy to read', icon: Map },
        { value: 'satellite', label: 'Satellite', description: 'High‑detail satellite imagery', icon: Navigation },
      ]
    : [
        { value: 'roadmap', label: 'Bản đồ đường', description: 'Kiểu bản đồ mặc định, dễ đọc', icon: Map },
        { value: 'satellite', label: 'Vệ tinh', description: 'Ảnh vệ tinh chi tiết của khu vực', icon: Navigation },
      ];
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const parent = containerRef.current?.closest('.setting-item');
    if (!parent) return;
    if (open) {
      parent.classList.add('dropdown-open');
    } else {
      parent.classList.remove('dropdown-open');
    }
    return () => parent.classList.remove('dropdown-open');
  }, [open]);

  const keepOpen = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      closeTimeoutRef.current = null;
    }, 200);
  };

  const selectedType = mapTypes.find((type) => type.value === value) || mapTypes[0];
  const SelectedIcon = selectedType.icon || Map;

  const handleSelect = (typeValue) => {
    onChange(typeValue);
    setOpen(false);
  };

  return (
    <div
      className={`fancy-dropdown ${open ? 'open' : ''}`}
      ref={containerRef}
      onMouseEnter={keepOpen}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={`fancy-dropdown-trigger ${open ? 'open' : ''}`}
        onFocus={keepOpen}
      >
        <div className="fancy-dropdown-label">
          <SelectedIcon className="w-4 h-4" />
          <span>{selectedType.label}</span>
        </div>
        <ChevronDown className={`chevron ${open ? 'rotate-180' : ''}`} size={16} />
      </button>

      {open && (
        <div className="fancy-dropdown-menu" onMouseEnter={keepOpen} onMouseLeave={scheduleClose}>
          {mapTypes.map((type) => {
            const Icon = type.icon || Map;
            const isActive = type.value === value;
            return (
              <button
                key={type.value}
                type="button"
                className={`fancy-dropdown-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelect(type.value)}
              >
                <Icon className="w-4 h-4" />
                <div className="item-text">
                  <span>{type.label}</span>
                  <small>{type.description}</small>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

