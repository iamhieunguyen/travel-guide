import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import './DateRangePicker.css';

const TRANSLATIONS = {
  vi: {
    daysOfWeek: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    months: [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ],
    shortMonths: [
      'Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6',
      'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12'
    ],
    timeLabel: 'Thời gian',
    hint: 'Chọn ngày bắt đầu và kết thúc',
  },
  en: {
    daysOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    shortMonths: [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ],
    timeLabel: 'Time',
    hint: 'Select start and end dates',
  },
};

export default function DateRangePicker({ selected, onSelect, language = 'vi' }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // View Mode: 'date' (ngày), 'month' (tháng), 'year' (năm)
  const [viewMode, setViewMode] = useState('date'); 
  const [currentDate, setCurrentDate] = useState(new Date()); 
  
  const containerRef = useRef(null);
  const [tempRange, setTempRange] = useState(selected || { from: null, to: null });

  // --- EFFECTS ---
  useEffect(() => {
    if (isOpen) {
      setTempRange(selected || { from: null, to: null });
      setViewMode('date'); // Reset về xem ngày khi mở lại
    }
  }, [isOpen, selected]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- NAVIGATION LOGIC ---
  const handlePrev = (e) => {
    e.stopPropagation();
    if (viewMode === 'date') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
    } else if (viewMode === 'year') {
      setCurrentDate(new Date(currentDate.getFullYear() - 12, currentDate.getMonth(), 1));
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (viewMode === 'date') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
    } else if (viewMode === 'year') {
      setCurrentDate(new Date(currentDate.getFullYear() + 12, currentDate.getMonth(), 1));
    }
  };

  const handleHeaderClick = (e) => {
    e.stopPropagation();
    if (viewMode === 'date') setViewMode('month');
    else if (viewMode === 'month') setViewMode('year');
  };

  // --- SELECTION LOGIC ---
  const handleYearClick = (year) => {
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
    setViewMode('month');
  };

  const handleMonthClick = (monthIndex) => {
    setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1));
    setViewMode('date');
  };

  const handleDateClick = (day) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    let newRange = { ...tempRange };
    const parseDate = (d) => d ? new Date(d) : null;
    const currentFrom = parseDate(newRange.from);

    if (!currentFrom || (newRange.from && newRange.to)) {
      newRange = { from: clickedDate, to: null };
    } else {
      if (clickedDate < currentFrom) {
        newRange.to = currentFrom;
        newRange.from = clickedDate;
      } else {
        newRange.from = currentFrom;
        newRange.to = clickedDate;
      }
    }

    setTempRange(newRange);
    
    if (newRange.from && newRange.to) {
      onSelect({
        from: newRange.from.toISOString(),
        to: newRange.to.toISOString()
      });
      setTimeout(() => setIsOpen(false), 300); 
    } else {
      onSelect({
        from: newRange.from.toISOString(),
        to: null
      });
    }
  };

  const locale = language === 'en' ? 'en-GB' : 'vi-VN';
  const t = TRANSLATIONS[language] || TRANSLATIONS.vi;

  // --- RENDER HELPERS ---
  const renderHeaderLabel = () => {
    if (viewMode === 'date') return `${t.months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (viewMode === 'month') return `${currentDate.getFullYear()}`;
    if (viewMode === 'year') {
      const startYear = Math.floor(currentDate.getFullYear() / 12) * 12;
      return `${startYear} - ${startYear + 11}`;
    }
  };

  const renderYears = () => {
    const currentYear = currentDate.getFullYear();
    const startYear = Math.floor(currentYear / 12) * 12;
    const years = [];
    for (let i = 0; i < 12; i++) {
      const year = startYear + i;
      years.push(
        <button
          key={year}
          className={`calendar-cell ${year === new Date().getFullYear() ? 'current' : ''} ${year === currentYear ? 'selected' : ''}`}
          onClick={(e) => { e.stopPropagation(); handleYearClick(year); }}
        >
          {year}
        </button>
      );
    }
    return <div className="calendar-grid-large">{years}</div>;
  };

  const renderMonths = () => {
    return (
      <div className="calendar-grid-large">
        {t.shortMonths.map((month, index) => (
          <button
            key={month}
            className={`calendar-cell ${index === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear() ? 'current' : ''} ${index === currentDate.getMonth() ? 'selected' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleMonthClick(index); }}
          >
            {month}
          </button>
        ))}
      </div>
    );
  };

  const renderDates = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const days = [];

    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);

    for (let i = 1; i <= daysInMonth; i++) {
      const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const parseDate = (d) => d ? new Date(d) : null;
      const fromDate = parseDate(tempRange.from);
      const toDate = parseDate(tempRange.to);

      const isSelected = (fromDate && dateToCheck.getTime() === fromDate.getTime()) || 
                         (toDate && dateToCheck.getTime() === toDate.getTime());
      
      let isInRange = false;
      if (fromDate && toDate) {
        isInRange = dateToCheck > fromDate && dateToCheck < toDate;
      }

      const isToday = dateToCheck.toDateString() === new Date().toDateString();

      let className = "calendar-day";
      if (isSelected) className += " selected";
      if (isInRange) className += " in-range";
      if (isToday) className += " today";

      days.push(
        <button 
          key={i} className={className}
          onClick={(e) => { e.stopPropagation(); handleDateClick(i); }}
        >
          {i}
        </button>
      );
    }

    return (
      <>
        <div className="calendar-weekdays">
          {t.daysOfWeek.map(day => <div key={day} className="weekday">{day}</div>)}
        </div>
        <div className="calendar-grid">{days}</div>
      </>
    );
  };

  const formatDateDisplay = () => {
    const label = t.timeLabel;

    if (!selected?.from) return label;
    const from = new Date(selected.from).toLocaleDateString(locale, {day: '2-digit', month: '2-digit', year: '2-digit'});
    if (!selected.to) return `${from} - ...`;
    const to = new Date(selected.to).toLocaleDateString(locale, {day: '2-digit', month: '2-digit', year: '2-digit'});
    return `${from} - ${to}`;
  };

  const clearDate = (e) => {
    e.stopPropagation();
    onSelect(null);
    setTempRange({ from: null, to: null });
    setIsOpen(false);
  };

  return (
    <div className="date-range-picker" ref={containerRef}>
      <button 
        className={`picker-trigger ${isOpen ? 'active' : ''} ${selected?.from ? 'has-value' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon className="w-4 h-4" />
        <span className="truncate">{formatDateDisplay()}</span>
        {selected?.from && (
          <div className="clear-btn" onClick={clearDate}><X className="w-3 h-3" /></div>
        )}
      </button>

      {isOpen && (
        <div className="picker-dropdown animate-in">
          <div className="calendar-header">
            <button className="nav-btn" onClick={handlePrev}><ChevronLeft size={16} /></button>
            <button className="header-title-btn" onClick={handleHeaderClick}>
              {renderHeaderLabel()}
              <ChevronDown size={14} className={`transition-transform ${viewMode !== 'date' ? 'rotate-180' : ''}`} />
            </button>
            <button className="nav-btn" onClick={handleNext}><ChevronRight size={16} /></button>
          </div>

          <div className="calendar-body">
            {viewMode === 'year' && renderYears()}
            {viewMode === 'month' && renderMonths()}
            {viewMode === 'date' && renderDates()}
          </div>
          
          <div className="mt-3 border-t pt-2 text-center">
             <p className="text-xs text-gray-400">
              {t.hint}
             </p>
          </div>
        </div>
      )}
    </div>
  );
}