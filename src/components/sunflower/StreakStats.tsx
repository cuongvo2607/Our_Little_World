'use client';

import React from 'react';

interface StreakStatsProps {
  maxStreak: number;
  waterTokens: number;
}

export function StreakStats({ maxStreak, waterTokens }: StreakStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Max Streak Card */}
      <div className="p-3 bg-[#FFFDF5] dark:bg-amber-950/20 rounded-[20px] border border-amber-100 dark:border-amber-900/30 shadow-soft-sm flex items-center gap-2.5">
        <span className="text-2xl">🔥</span>
        <div>
          <h5 className="text-xs font-bold text-[#302A2C] dark:text-cream-50">{maxStreak} ngày</h5>
          <p className="text-[10px] text-gray-500 font-medium">Kỷ lục của hai đứa</p>
        </div>
      </div>

      {/* Rescue Water Card */}
      <div className="p-3 bg-[#F0F7FF] dark:bg-blue-950/20 rounded-[20px] border border-blue-100 dark:border-blue-900/30 shadow-soft-sm flex items-center gap-2.5">
        <span className="text-2xl">💧</span>
        <div>
          <h5 className="text-xs font-bold text-[#302A2C] dark:text-cream-50">{waterTokens}</h5>
          <p className="text-[10px] text-gray-500 font-medium">Giọt nước cứu chuỗi</p>
        </div>
      </div>
    </div>
  );
}
