import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInDays, differenceInYears, differenceInMonths, subYears, subMonths, format, parseISO } from 'date-fns';
import confetti from 'canvas-confetti';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface LoveDuration {
  totalDays: number;
  years: number;
  months: number;
  days: number;
}

/**
 * Safely parses date-only string (YYYY-MM-DD) into local date without UTC shift
 */
export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Handle ISO string format or YYYY-MM-DD format
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);

  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Calculates days together accurately in local timezone
 */
export function getDaysTogether(startDateStr: string | null | undefined): number {
  const startDate = parseLocalDate(startDateStr);
  if (!startDate) return 0;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (startDate > today) return 0;

  // Add +1 so day 1 of relationship is day 1 or calculate exact difference
  const diff = differenceInDays(today, startDate);
  return diff >= 0 ? diff : 0;
}

export function calculateLoveDuration(startDateStr: string | null | undefined): LoveDuration {
  const startDate = parseLocalDate(startDateStr);
  if (!startDate) {
    return { totalDays: 0, years: 0, months: 0, days: 0 };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (startDate > today) {
    return { totalDays: 0, years: 0, months: 0, days: 0 };
  }

  const totalDays = differenceInDays(today, startDate);
  const years = differenceInYears(today, startDate);
  const afterYears = subYears(today, years);
  const months = differenceInMonths(afterYears, startDate);
  const afterMonths = subMonths(afterYears, months);
  const days = differenceInDays(afterMonths, startDate);

  return { totalDays, years, months, days };
}

export function formatDateVietnamese(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr) || parseISO(dateStr);
  try {
    return format(d, 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}

export function triggerHeartConfetti() {
  const count = 30;
  const defaults = {
    origin: { y: 0.7 },
    colors: ['#E8A0BF', '#D47A9D', '#FF6B8B', '#F8BBD0'],
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });

  fire(0.2, {
    spread: 60,
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Chưa cập nhật';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (isNaN(diffMs)) return 'Chưa cập nhật';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return format(d, 'dd/MM/yyyy');
  } catch {
    return 'Chưa cập nhật';
  }
}

/**
 * Returns YYYY-MM-DD date string in Vietnam timezone (Asia/Ho_Chi_Minh)
 */
export function getVietnamDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}


