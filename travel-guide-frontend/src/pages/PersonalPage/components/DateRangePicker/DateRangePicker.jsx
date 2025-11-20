import React, { useState, useEffect, useRef } from 'react';
import { DayPicker } from 'react-day-picker';
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import 'react-day-picker/dist/style.css';
import './DateRangePicker.css';

export default function DateRangePicker({ selected, onSelect, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);

  // Tính toán vị trí popup khi mở
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupHeight = 400;
      const popupWidth = 350;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      let top = rect.bottom + 8;
      if (top + popupHeight > viewportHeight - 20) {
        top = rect.top - popupHeight - 8;
        if (top < 20) {
          top = Math.max(20, (viewportHeight - popupHeight) / 2);
        }
      }
      
      let left = rect.left;
      if (left + popupWidth > viewportWidth - 20) {
        left = viewportWidth - popupWidth - 20;
      }
      if (left < 20) {
        left = 20;
      }
      
      setPopupPosition({
        top: Math.max(20, top),
        left: Math.max(20, left)
      });
    }
  }, [isOpen]);

  // Đóng popup khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatDateRange = (range) => {
    if (!range || !range.from) return 'Chọn khoảng thời gian';
    if (range.from && !range.to) {
      return `${range.from.toLocaleDateString('vi-VN')} - ...`;
    }
    if (range.from && range.to) {
      return `${range.from.toLocaleDateString('vi-VN')} - ${range.to.toLocaleDateString('vi-VN')}`;
    }
    return 'Chọn khoảng thời gian';
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(undefined);
    setIsOpen(false);
  };

  // Tạo danh sách năm (từ 2020 đến năm hiện tại + 1)
  const currentYearNum = new Date().getFullYear();
  const years = [];
  for (let year = 2020; year <= currentYearNum + 1; year++) {
    years.push(year);
  }
  
  // Danh sách tháng
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();

  const handleMonthChange = (e, monthIndex) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentMonth((prevMonth) => {
      const newDate = new Date(prevMonth.getFullYear(), monthIndex, 1);
      return newDate;
    });
  };

  const handleYearChange = (e, year) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentMonth((prevMonth) => {
      const newDate = new Date(year, prevMonth.getMonth(), 1);
      return newDate;
    });
  };

  const goToPreviousMonth = (e) => {
    e.stopPropagation();
    const newDate = new Date(currentYear, currentMonthIndex - 1);
    setCurrentMonth(newDate);
  };

  const goToNextMonth = (e) => {
    e.stopPropagation();
    const newDate = new Date(currentYear, currentMonthIndex + 1);
    setCurrentMonth(newDate);
  };


  return (
    <div ref={wrapperRef} className={`date-range-picker-wrapper ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="date-range-picker-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon className="w-4 h-4" />
        <span className="date-range-text">{formatDateRange(selected)}</span>
        {selected?.from && (
          <button
            type="button"
            className="date-range-clear"
            onClick={handleClear}
            aria-label="Xóa lựa chọn"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="date-range-overlay"
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="date-range-calendar-popup"
            style={{
              top: `${popupPosition.top}px`,
              left: `${popupPosition.left}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calendar-with-dropdown">
              <div className="custom-caption" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="caption-nav-btn"
                  onClick={goToPreviousMonth}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="caption-selectors">
                  <DropdownMenu open={monthDropdownOpen} onOpenChange={setMonthDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="caption-dropdown-btn"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {months[currentMonthIndex]}
                        <ChevronDown className="w-4 h-4 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      side="bottom" 
                      align="start"
                      className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {months.map((month, index) => (
                        <DropdownMenuItem
                          key={index}
                          onSelect={(e) => {
                            e.preventDefault();
                            handleMonthChange(e, index);
                            setTimeout(() => setMonthDropdownOpen(false), 100);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMonthChange(e, index);
                            setTimeout(() => setMonthDropdownOpen(false), 100);
                          }}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          {month}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu open={yearDropdownOpen} onOpenChange={setYearDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="caption-dropdown-btn"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {currentYear}
                        <ChevronDown className="w-4 h-4 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      side="bottom" 
                      align="start"
                      className="min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {years.map((year) => (
                        <DropdownMenuItem
                          key={year}
                          onSelect={(e) => {
                            e.preventDefault();
                            handleYearChange(e, year);
                            setTimeout(() => setYearDropdownOpen(false), 100);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleYearChange(e, year);
                            setTimeout(() => setYearDropdownOpen(false), 100);
                          }}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          {year}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <button
                  type="button"
                  className="caption-nav-btn"
                  onClick={goToNextMonth}
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <DayPicker
                mode="range"
                selected={selected}
                onSelect={(range) => {
                  onSelect(range);
                  // Đóng popup khi đã chọn đủ range
                  if (range?.from && range?.to) {
                    setTimeout(() => setIsOpen(false), 100);
                  }
                }}
                month={currentMonth}
                onMonthChange={(date) => {
                  setCurrentMonth(date);
                }}
                numberOfMonths={1}
                className="date-range-calendar"
                components={{
                  Caption: () => null
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

