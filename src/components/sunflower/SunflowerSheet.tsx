'use client';

import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SunflowerStage } from './SunflowerStage';
import { TodayWaterStatus } from './TodayWaterStatus';
import { StreakStats } from './StreakStats';
import { StreakCalendar } from './StreakCalendar';
import { DailyActivity, CoupleStreak } from '@/types';

interface SunflowerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  streakData: CoupleStreak;
  myActivity: DailyActivity | null;
  partnerActivity: DailyActivity | null;
  pastActivities: DailyActivity[];
}

export function SunflowerSheet({
  isOpen,
  onClose,
  streakData,
  myActivity,
  partnerActivity,
  pastActivities,
}: SunflowerSheetProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', stiffness: 350, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-b from-[#FFFDF7] via-[#FFF8EE] to-[#FFF5ED] dark:from-charcoal-800 dark:via-charcoal-800 dark:to-charcoal-900 rounded-t-[32px] sm:rounded-[32px] w-full max-w-[480px] max-h-[90dvh] flex flex-col shadow-2xl border-t border-amber-200/80 overflow-hidden"
        >
          {/* Drag Handle */}
          <div className="w-12 h-1.5 bg-amber-200/80 dark:bg-amber-900/40 rounded-full mx-auto my-3 shrink-0" />

          {/* Header */}
          <div className="px-5 pb-3 flex items-center justify-between border-b border-amber-100/60 dark:border-amber-900/20 shrink-0">
            <div>
              <h3 className="text-base font-extrabold text-[#302A2C] dark:text-cream-50 flex items-center gap-1.5">
                Chuỗi Hướng Dương 🌻
              </h3>
              <p className="text-[11px] text-[#81727B] font-medium">
                Cùng nhau chăm hoa, cùng nhau lớn lên ♡
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full active:scale-95 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-none">
            {/* Hero Sunflower Growth Stage */}
            <div className="py-2 text-center space-y-3">
              <SunflowerStage streak={streakData.current_streak} size="md" animated />

              {/* Streak Counter */}
              <div>
                <h2 className="text-3xl font-extrabold text-[#302A2C] dark:text-cream-50">
                  {streakData.current_streak} ngày liên tiếp
                </h2>
                <p className="text-xs text-[#81727B] font-medium mt-1">
                  Hai đứa đã cùng chăm bông hoa này suốt {streakData.current_streak} ngày 💛
                </p>
              </div>
            </div>

            {/* Today Water Status */}
            <TodayWaterStatus
              myActivity={myActivity}
              partnerActivity={partnerActivity}
              onCloseSheet={onClose}
            />

            {/* Streak Stats */}
            <StreakStats
              maxStreak={streakData.max_streak || streakData.current_streak}
              waterTokens={streakData.water_tokens}
            />

            {/* 30-Day Journey Calendar */}
            <StreakCalendar pastActivities={pastActivities} />

            {/* Bottom Footer Quote */}
            <div className="text-center py-2 pb-4">
              <p className="text-xs font-serif italic text-[#EC6F91]">
                Mỗi ngày bên nhau, là một cánh hoa được nở thêm ♡
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
