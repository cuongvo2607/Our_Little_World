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
  const [mounted, setMounted] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  const [isMissedModalOpen, setIsMissedModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Hide floating sunflower until mounted or on login/onboarding
  if (!mounted || ['/login', '/onboarding'].includes(pathname)) {
    return null;
  }

  const streakCount = streakData?.current_streak || 0;
  const isMilestone = [7, 14, 30, 50, 100, 365].includes(streakCount) && isTodayCompleted;

  const isDraggingRef = React.useRef(false);

  return (
    <>
      {/* Floating Sunflower Button (Draggable) */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDragEnd={() => {
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 150);
        }}
        whileDrag={{ scale: 1.12 }}
        className="fixed right-4 z-40 touch-none flex justify-end cursor-grab active:cursor-grabbing select-none"
        style={{
          bottom:
            pathname === '/messages'
              ? 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 12px) + 80px)'
              : 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 12px) + 16px)',
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (!isDraggingRef.current) {
              setIsSheetOpen(true);
            }
          }}
          className="w-[58px] h-[58px] rounded-full bg-gradient-to-tr from-[#FFFDF5] to-[#FFF8E7] dark:from-charcoal-800 dark:to-charcoal-900 border-2 border-amber-200/80 shadow-[0_8px_25px_rgba(245,166,35,0.25)] flex items-center justify-center relative group active:scale-95 transition-transform"
        >
          {/* Sunflower Emoji */}
          <span className="text-3xl select-none">🌻</span>

          {/* Badge Streak Count */}
          <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[#F5A623] to-amber-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full border-2 border-white dark:border-charcoal-900 shadow-md pointer-events-none">
            {loading ? '...' : streakCount}
          </div>

          {/* Notification Red/Gold Dot if today not completed */}
          {!isTodayCompleted && !loading && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white dark:border-charcoal-900 animate-pulse pointer-events-none" />
          )}
        </button>
      </motion.div>

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
        waterTokens={streakData?.water_tokens ?? 1}
        onUseWater={consumeRescueWater}
        onClose={() => setIsMissedModalOpen(false)}
      />
    </>
  );
}
