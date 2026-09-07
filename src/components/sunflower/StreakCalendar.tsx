'use client';

import React from 'react';
import { DailyActivity } from '@/types';
import { getVietnamDateString } from '@/lib/utils';

interface StreakCalendarProps {
  pastActivities?: DailyActivity[];
}

export function StreakCalendar({ pastActivities = [] }: StreakCalendarProps) {
  const todayStr = getVietnamDateString();

  // Generate last 28 days array (4 full weeks)
  const generateCalendarDays = () => {
    const days: { dateStr: string; status: 'completed' | 'single' | 'missed'; isToday: boolean }[] = [];
    const today = new Date();
    const safeActs = pastActivities || [];

    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = getVietnamDateString(d);

      const dayActs = safeActs.filter((a) => a && a.activity_date === dateStr);
      const uniqueUsers = new Set(dayActs.map((a) => a.user_id));

      let status: 'completed' | 'single' | 'missed' = 'missed';
      if (uniqueUsers.size >= 2) {
        status = 'completed';
      } else if (uniqueUsers.size === 1) {
        status = 'single';
      }

      days.push({
        dateStr,
        status,
        isToday: dateStr === todayStr,
      });
    }
    return days;
  };

  const days = generateCalendarDays();
  const weekHeader = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="bg-[#FFFDF7] dark:bg-charcoal-800/80 rounded-[24px] p-4 border border-amber-100 dark:border-amber-900/30 shadow-soft-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-[#302A2C] dark:text-cream-50">
          Hành trình 30 ngày qua
        </h4>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-start gap-3 text-[10px] text-gray-500 font-medium pb-1 border-b border-amber-100/50 dark:border-amber-900/20">
        <span className="flex items-center gap-1">🌻 Hoàn thành</span>
        <span className="flex items-center gap-1">🌱 Chỉ một người</span>
        <span className="flex items-center gap-1">・ Bỏ lỡ</span>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#81727B] dark:text-gray-400">
        {weekHeader.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {days.map((day) => (
          <div
            key={day.dateStr}
            className={`h-9 rounded-xl flex items-center justify-center text-sm transition-all ${
              day.isToday ? 'ring-2 ring-[#F5A623] bg-amber-50 dark:bg-amber-950/40' : 'bg-white/60 dark:bg-charcoal-700/40'
            }`}
            title={day.dateStr}
          >
            {day.status === 'completed' && <span>🌻</span>}
            {day.status === 'single' && <span>🌱</span>}
            {day.status === 'missed' && <span className="text-gray-300 dark:text-gray-600 font-bold">•</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
