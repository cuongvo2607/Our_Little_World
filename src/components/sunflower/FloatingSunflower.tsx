'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSunflowerStreak } from '@/hooks/useSunflowerStreak';
import { SunflowerSheet } from './SunflowerSheet';
import { MilestoneModal } from './MilestoneModal';
import { MissedDayModal } from './MissedDayModal';

export function FloatingSunflower() {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  const [isMissedModalOpen, setIsMissedModalOpen] = useState(false);

  const {
    streakData,
    myActivityToday,
    partnerActivityToday,
    past30DaysActivities,
    isTodayCompleted,
    isYesterdayMissed,
    consumeRescueWater,
    loading,
  } = useSunflowerStreak();

  // Hide floating sunflower on login / onboarding
  if (['/login', '/onboarding'].includes(pathname)) {
    return null;
  }

  const streakCount = streakData.current_streak || 0;
  const isMilestone = [7, 14, 30, 50, 100, 365].includes(streakCount) && isTodayCompleted;

  return (
    <>
      {/* Floating Sunflower Button */}
      <div className="fixed right-4 z-40 pointer-events-none flex justify-end" style={{ bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 12px) + 12px)' }}>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          animate={{
            y: [0, -3, 0],
            rotate: [0, 1.5, -1.5, 0],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          onClick={() => setIsSheetOpen(true)}
          className="pointer-events-auto w-[58px] h-[58px] rounded-full bg-gradient-to-tr from-[#FFFDF5] to-[#FFF8E7] dark:from-charcoal-800 dark:to-charcoal-900 border-2 border-amber-200/80 shadow-[0_8px_25px_rgba(245,166,35,0.25)] flex items-center justify-center relative group"
        >
          {/* Sunflower Emoji */}
          <span className="text-3xl select-none group-active:scale-90 transition-transform">🌻</span>

          {/* Badge Streak Count */}
          <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[#F5A623] to-amber-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full border-2 border-white dark:border-charcoal-900 shadow-md">
            {loading ? '...' : streakCount}
          </div>

          {/* Notification Red/Gold Dot if today not completed */}
          {!isTodayCompleted && !loading && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white dark:border-charcoal-900 animate-pulse" />
          )}
        </motion.button>
      </div>

      {/* Sunflower Bottom Sheet */}
      <SunflowerSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        streakData={streakData}
        myActivity={myActivityToday}
        partnerActivity={partnerActivityToday}
        pastActivities={past30DaysActivities}
      />

      {/* Milestone Celebration Modal */}
      <MilestoneModal
        isOpen={isMilestoneOpen || isMilestone}
        streakDays={streakCount}
        onClose={() => setIsMilestoneOpen(false)}
      />

      {/* Missed Day Rescue Water Modal */}
      <MissedDayModal
        isOpen={isYesterdayMissed && !isSheetOpen}
        streakDays={streakCount}
        waterTokens={streakData.water_tokens}
        onUseWater={consumeRescueWater}
        onClose={() => setIsMissedModalOpen(false)}
      />
    </>
  );
}
