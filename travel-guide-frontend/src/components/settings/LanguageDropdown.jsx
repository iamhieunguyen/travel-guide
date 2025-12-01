import React, { useState, useRef, useEffect } from 'react';
import { Globe2, ChevronDown } from 'lucide-react';

export default function LanguageDropdown({ value, onChange }) {
  const languages = [
    { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', description: 'Giao diện tiếng Việt' },
    { value: 'en', label: 'English', flag: '🇺🇸', description: 'Interface in English' },
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

  const selectedLang = languages.find((lang) => lang.value === value) || languages[0];

  const handleSelect = (langValue) => {
    onChange(langValue);
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
          <Globe2 className="w-4 h-4" />
          <span className="flag-emoji" style={{ marginLeft: 4 }}>{selectedLang.flag}</span>
          <span>{selectedLang.label}</span>
        </div>
        <ChevronDown className={`chevron ${open ? 'rotate-180' : ''}`} size={16} />
      </button>

      {open && (
        <div className="fancy-dropdown-menu" onMouseEnter={keepOpen} onMouseLeave={scheduleClose}>
          {languages.map((lang) => (
            <button
              key={lang.value}
              type="button"
              className={`fancy-dropdown-item ${lang.value === value ? 'active' : ''}`}
              onClick={() => handleSelect(lang.value)}
            >
              <span className="flag-emoji">{lang.flag}</span>
              <div className="item-text">
                <span>{lang.label}</span>
                <small>{lang.description}</small>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

