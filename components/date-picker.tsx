"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface DatePickerProps {
  /** Ngày hiện tại ở dạng "DD Mon YYYY" (ví dụ: "23 Jan 2026") */
  value: string;
  /** Callback khi user chọn ngày mới, trả về "DD Mon YYYY" */
  onChange: (dateStr: string) => void;
}

function parseDisplayDate(dateStr: string): Date {
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const mIdx = MONTHS.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
    const y = parseInt(parts[2], 10);
    if (!isNaN(d) && mIdx !== -1 && !isNaN(y)) {
      return new Date(y, mIdx, d);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDisplayDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Trả về ngày trong tuần (0=Mon, 6=Sun) cho ngày đầu tiên của tháng */
function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Chuyển Sun=0 → 6, Mon=1 → 0
}

type ViewMode = "days" | "months" | "years";

export function DatePicker({ value, onChange }: DatePickerProps) {
  const selectedDate = parseDisplayDate(value);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("days");
  const containerRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setViewMode("days");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Sync view khi value thay đổi từ bên ngoài
  useEffect(() => {
    const d = parseDisplayDate(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const handleSelectDay = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    onChange(formatDisplayDate(newDate));
    setIsOpen(false);
    setViewMode("days");
  };

  const handleSelectMonth = (month: number) => {
    setViewMonth(month);
    setViewMode("days");
  };

  const handleSelectYear = (year: number) => {
    setViewYear(year);
    setViewMode("months");
  };

  const handlePrev = () => {
    if (viewMode === "days") {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(viewYear - 1);
      } else {
        setViewMonth(viewMonth - 1);
      }
    } else if (viewMode === "months") {
      setViewYear(viewYear - 1);
    } else {
      setViewYear(viewYear - 12);
    }
  };

  const handleNext = () => {
    if (viewMode === "days") {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(viewYear + 1);
      } else {
        setViewMonth(viewMonth + 1);
      }
    } else if (viewMode === "months") {
      setViewYear(viewYear + 1);
    } else {
      setViewYear(viewYear + 12);
    }
  };

  const handleHeaderClick = () => {
    if (viewMode === "days") setViewMode("months");
    else if (viewMode === "months") setViewMode("years");
  };

  // ─── Render helpers ───

  const renderDays = () => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
    const daysInPrevMonth = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);
    const cells: React.ReactNode[] = [];

    // Trailing days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push(
        <button key={`prev-${i}`} type="button" className="h-7 w-7 text-[10px] text-[#567] rounded select-none cursor-default" disabled>
          {daysInPrevMonth - i}
        </button>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        day === selectedDate.getDate() &&
        viewMonth === selectedDate.getMonth() &&
        viewYear === selectedDate.getFullYear();
      const isToday = `${viewYear}-${viewMonth}-${day}` === todayStr;

      cells.push(
        <button
          key={day}
          type="button"
          onClick={() => handleSelectDay(day)}
          className={`h-7 w-7 text-[11px] font-semibold rounded-full transition-all duration-150 select-none
            ${isSelected
              ? "bg-[#00e054] text-[#14181c] shadow-md shadow-[#00e054]/30"
              : isToday
                ? "bg-[#567]/40 text-white ring-1 ring-[#00e054]/50"
                : "text-[#cde] hover:bg-[#567]/50 hover:text-white"
            }`}
        >
          {day}
        </button>
      );
    }

    // Leading days from next month
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push(
        <button key={`next-${i}`} type="button" className="h-7 w-7 text-[10px] text-[#567] rounded select-none cursor-default" disabled>
          {i}
        </button>
      );
    }

    return cells;
  };

  const renderMonths = () => {
    return MONTH_NAMES.map((name, idx) => {
      const isSelected = idx === selectedDate.getMonth() && viewYear === selectedDate.getFullYear();
      const isCurrent = idx === today.getMonth() && viewYear === today.getFullYear();
      return (
        <button
          key={idx}
          type="button"
          onClick={() => handleSelectMonth(idx)}
          className={`px-2 py-2 text-[11px] font-semibold rounded-md transition-all duration-150 select-none
            ${isSelected
              ? "bg-[#00e054] text-[#14181c] shadow-md shadow-[#00e054]/30"
              : isCurrent
                ? "bg-[#567]/40 text-white ring-1 ring-[#00e054]/50"
                : "text-[#cde] hover:bg-[#567]/50 hover:text-white"
            }`}
        >
          {name.substring(0, 3)}
        </button>
      );
    });
  };

  const renderYears = () => {
    const startYear = viewYear - (viewYear % 12);
    const years: React.ReactNode[] = [];
    for (let y = startYear; y < startYear + 12; y++) {
      const isSelected = y === selectedDate.getFullYear();
      const isCurrent = y === today.getFullYear();
      years.push(
        <button
          key={y}
          type="button"
          onClick={() => handleSelectYear(y)}
          className={`px-2 py-2 text-[11px] font-semibold rounded-md transition-all duration-150 select-none
            ${isSelected
              ? "bg-[#00e054] text-[#14181c] shadow-md shadow-[#00e054]/30"
              : isCurrent
                ? "bg-[#567]/40 text-white ring-1 ring-[#00e054]/50"
                : "text-[#cde] hover:bg-[#567]/50 hover:text-white"
            }`}
        >
          {y}
        </button>
      );
    }
    return years;
  };

  const getHeaderLabel = () => {
    if (viewMode === "days") return `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    if (viewMode === "months") return `${viewYear}`;
    const startYear = viewYear - (viewYear % 12);
    return `${startYear} – ${startYear + 11}`;
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setViewMode("days");
        }}
        className="flex items-center gap-2 rounded bg-[#567] px-2.5 py-1 text-sm text-white hover:bg-[#678] focus:outline-none focus:ring-1 focus:ring-[#00e054] transition-colors cursor-pointer"
      >
        <Calendar className="h-3.5 w-3.5 text-[#9ab]" />
        <span className="tabular-nums">{value}</span>
      </button>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-[9999] w-[270px] rounded-lg border border-[#567]/60 bg-[#2c3440] shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Navigation Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#567]/40">
            <button
              type="button"
              onClick={handlePrev}
              className="h-7 w-7 flex items-center justify-center rounded-full text-[#9ab] hover:bg-[#567]/50 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleHeaderClick}
              className="text-xs font-bold text-white hover:text-[#00e054] transition-colors uppercase tracking-wider select-none cursor-pointer"
            >
              {getHeaderLabel()}
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="h-7 w-7 flex items-center justify-center rounded-full text-[#9ab] hover:bg-[#567]/50 hover:text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar Body */}
          <div className="p-2.5">
            {viewMode === "days" && (
              <>
                {/* Day of week headers */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {DAY_LABELS.map(d => (
                    <div key={d} className="h-6 flex items-center justify-center text-[9px] font-bold text-[#678] uppercase tracking-widest select-none">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-0.5">
                  {renderDays()}
                </div>
              </>
            )}

            {viewMode === "months" && (
              <div className="grid grid-cols-4 gap-1.5 py-1">
                {renderMonths()}
              </div>
            )}

            {viewMode === "years" && (
              <div className="grid grid-cols-4 gap-1.5 py-1">
                {renderYears()}
              </div>
            )}
          </div>

          {/* Footer — Today shortcut */}
          <div className="border-t border-[#567]/40 px-3 py-2 flex justify-center">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
                onChange(formatDisplayDate(now));
                setIsOpen(false);
                setViewMode("days");
              }}
              className="text-[10px] font-bold text-[#00e054] hover:text-[#00ff5e] uppercase tracking-widest transition-colors select-none"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
