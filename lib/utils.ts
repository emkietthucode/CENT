import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Phân tích cú pháp chuỗi ngày tháng cực kỳ thông minh để xử lý nhiều định dạng khác nhau:
 * - DD Mon YYYY (23 Jan 2026)
 * - ISO (YYYY-MM-DD, YYYY-MM-DD HH:mm:ss, YYYY/MM/DD)
 * - VN/EU (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
 * - US (MM/DD/YYYY, MM-DD-YYYY)
 * - Milliseconds / Seconds Timestamps
 */
export function robustParseDate(rawDateStr: string): Date | null {
  if (!rawDateStr) return null;
  const cleaned = rawDateStr.trim();
  if (!cleaned) return null;

  // 1. Kiểm tra định dạng "DD Mon YYYY" (ví dụ: "23 Jan 2026")
  const words = cleaned.split(/\s+/);
  if (words.length === 3) {
    const d = parseInt(words[0], 10);
    const mStr = words[1];
    const y = parseInt(words[2], 10);
    const mIdx = MONTHS_SHORT.findIndex(m => m.toLowerCase() === mStr.toLowerCase());
    if (!isNaN(d) && mIdx !== -1 && !isNaN(y)) {
      return new Date(y, mIdx, d);
    }
  }

  // 2. Kiểm tra định dạng số thuần túy (Timestamp)
  if (/^\d{10}$/.test(cleaned)) {
    // Unix timestamp (giây)
    return new Date(parseInt(cleaned, 10) * 1000);
  }
  if (/^\d{13}$/.test(cleaned)) {
    // Milliseconds timestamp
    return new Date(parseInt(cleaned, 10));
  }

  // 3. Phân tách bằng dấu gạch chéo (/), gạch ngang (-), hoặc chấm (.)
  const parts = cleaned.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      // Trường hợp 3.1: YYYY-MM-DD (phần 1 có 4 chữ số)
      if (parts[0].length === 4 && p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 31) {
        return new Date(p0, p1 - 1, p2);
      }
      
      // Trường hợp 3.2: DD-MM-YYYY hoặc MM-DD-YYYY (phần 3 có 4 chữ số)
      if (parts[2].length === 4) {
        let day = p0;
        let month = p1;
        let year = p2;
        
        if (month > 12 && day <= 12) {
          // Định dạng MM/DD/YYYY
          day = p1;
          month = p0;
        }
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return new Date(year, month - 1, day);
        }
      }
    }
  }

  // 4. Fallback cuối cùng: dùng native Date.parse
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/** Định dạng Date object thành chuỗi "DD Mon YYYY" */
export function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** Chuyển chuỗi "DD Mon YYYY" thành ISO "YYYY-MM-DD" */
export function parseDateStringToISO(dateStr: string): string {
  const parsed = robustParseDate(dateStr);
  if (parsed) {
    const y = parsed.getFullYear();
    const m = parsed.getMonth() + 1;
    const d = parsed.getDate();
    return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
  }

  // Trả về ngày hiện tại làm fallback cuối cùng
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
}

/** Chuyển chuỗi ISO "YYYY-MM-DD" thành "DD Mon YYYY" */
export function formatISOToDateString(isoStr: string): string {
  const parsed = robustParseDate(isoStr);
  if (parsed) {
    return formatDate(parsed);
  }
  return isoStr;
}
