import React, { useState, useRef, useEffect } from 'react';
import { Globe, Lock, ChevronDown } from 'lucide-react';

export default function PrivacyDropdown({ value, onChange, language = 'vi' }) {
  const isEn = language === 'en';
  const options = isEn
    ? [
        { value: 'public', label: 'Public', description: 'Visible to everyone', icon: Globe },
        { value: 'private', label: 'Private', description: 'Only you can see this', icon: Lock },
      ]
    : [
        { value: 'public', label: 'Công khai', description: 'Ai cũng xem được', icon: Globe },
        { value: 'private', label: 'Riêng tư', description: 'Chỉ mình bạn', icon: Lock },
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

  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const SelectedIcon = selectedOption.icon;

  const handleSelect = (optionValue) => {
    onChange(optionValue);
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
          <span>{selectedOption.label}</span>
        </div>
        <ChevronDown className={`chevron ${open ? 'rotate-180' : ''}`} size={16} />
      </button>

      {open && (
        <div className="fancy-dropdown-menu" onMouseEnter={keepOpen} onMouseLeave={scheduleClose}>
          {options.map((option) => {
            const Icon = option.icon;
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={`fancy-dropdown-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                <Icon className="w-4 h-4" />
                <div className="item-text">
                  <span>{option.label}</span>
                  <small>{option.description}</small>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

