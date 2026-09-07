'use client';

import React, { useState, useEffect } from 'react';
import { useCouple } from '@/context/CoupleContext';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { getDaysTogether, formatDateVietnamese } from '@/lib/utils';
import { Heart, Smile, Sparkles, ChevronRight } from 'lucide-react';
import { useSunflowerStreak } from '@/hooks/useSunflowerStreak';
import { SunflowerSheet } from '@/components/sunflower/SunflowerSheet';

export function RightPanel() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { userProfile, partnerProfile, couple, partnerMood } = useCouple();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    streakData,
    myActivityToday,
    partnerActivityToday,
    past30DaysActivities,
    stage,
    loading: streakLoading,
  } = useSunflowerStreak();

  if (!mounted || ['/login', '/onboarding'].includes(pathname)) {
    return null;
  }

  const daysTogether = getDaysTogether(couple?.start_date);
  const streakCount = streakData?.current_streak || 0;

  const myInitial = (userProfile?.display_name?.[0] || 'U').toUpperCase();
  const partnerInitial = (partnerProfile?.display_name?.[0] || 'P').toUpperCase();

  return (
    <>
      <aside className="hidden lg:flex flex-col w-80 shrink-0 h-screen sticky top-0 p-4 space-y-4 border-l border-rose-100 dark:border-rose-950/30 bg-cream-50/50 dark:bg-charcoal-900/50 overflow-y-auto">
        {/* Couple Header Card */}
        <Card className="text-center py-5 bg-gradient-to-b from-rose-100/70 to-cream-50 dark:from-rose-950/40 dark:to-charcoal-900 border-rose-200/60 shadow-soft-sm space-y-3">
          <div className="flex items-center justify-center -space-x-3">
            <div className="w-14 h-14 rounded-full border-2 border-white dark:border-charcoal-800 bg-rose-200 overflow-hidden flex items-center justify-center font-bold text-rose-600 shadow-soft-sm">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Me" className="w-full h-full object-cover" />
              ) : (
                myInitial
              )}
            </div>
            <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center z-10 text-xs shadow-soft-sm">
              ❤️
            </div>
            <div className="w-14 h-14 rounded-full border-2 border-white dark:border-charcoal-800 bg-lavender-200 overflow-hidden flex items-center justify-center font-bold text-purple-600 shadow-soft-sm">
              {partnerProfile?.avatar_url ? (
                <img src={partnerProfile.avatar_url} alt="Partner" className="w-full h-full object-cover" />
              ) : (
                partnerInitial
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-charcoal-800 dark:text-cream-50">
              {couple?.name || 'Thế Giới Của Hai Ta'}
            </h2>
            <p className="text-xs text-rose-500 font-semibold mt-0.5">
              {userProfile?.display_name || 'Bạn'} & {partnerProfile?.display_name || 'Người ấy'}
            </p>
          </div>

          <div className="pt-2 border-t border-rose-200/50">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
              Cùng nhau được
            </p>
            <div className="text-2xl font-extrabold text-rose-500 my-1 drop-shadow-sm">
              ❤️ {daysTogether} ngày
            </div>
            <p className="text-[11px] text-gray-400">
              Từ {formatDateVietnamese(couple?.start_date)}
            </p>
          </div>
        </Card>

        {/* 🌻 Sunflower Streak Widget */}
        <Card
          onClick={() => setIsSheetOpen(true)}
          className="p-4 cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-colors bg-gradient-to-br from-[#FFFDF5] to-[#FFF7E8] dark:from-charcoal-800 dark:to-amber-950/20 border-amber-200/70 shadow-soft-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{stage?.emoji || '🌱'}</span>
              <div>
                <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Chuỗi Hướng Dương 🌻
                </h3>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                  {stage?.title || 'Mới bắt đầu'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-amber-600 text-xs font-bold">
              <span>{streakLoading ? '...' : `${streakCount} ngày`}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Today Status Mini Row */}
          <div className="p-2.5 bg-white/80 dark:bg-charcoal-900/80 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-charcoal-700 dark:text-cream-100">
              <span className="text-xs">Bạn:</span>
              <span className={myActivityToday ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                {myActivityToday ? '✓ Đã tưới' : '⏳ Đang chờ'}
              </span>
            </div>

            <div className="w-px h-4 bg-amber-200/50" />

            <div className="flex items-center gap-1.5 font-semibold text-charcoal-700 dark:text-cream-100">
              <span className="text-xs">Người ấy:</span>
              <span className={partnerActivityToday ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                {partnerActivityToday ? '✓ Đã tưới' : '⏳ Đang chờ'}
              </span>
            </div>
          </div>
        </Card>

        {/* Partner Daily Mood Widget */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Smile className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Tâm trạng người ấy
            </h3>
          </div>

          <div className="flex items-center gap-3 p-3 bg-lavender-50/60 dark:bg-lavender-950/30 rounded-2xl border border-lavender-200/50">
            <span className="text-3xl">{partnerMood ? partnerMood.mood : '❓'}</span>
            <div>
              <p className="text-xs font-semibold text-charcoal-800 dark:text-cream-50">
                {partnerMood ? partnerMood.mood : 'Chưa cập nhật'}
              </p>
              {partnerMood?.note ? (
                <p className="text-[11px] text-gray-500 italic">"{partnerMood.note}"</p>
              ) : (
                <p className="text-[11px] text-gray-400">Chưa có ghi chú</p>
              )}
            </div>
          </div>
        </Card>

        {/* Quick Reminder Widget */}
        <Card className="p-4 space-y-2 text-center bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30">
          <Sparkles className="w-6 h-6 mx-auto text-rose-400 animate-pulse" />
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">
            Mỗi ngày bên nhau là một ngày đong đầy yêu thương ✨
          </p>
        </Card>
      </aside>

      {/* Sunflower Bottom Sheet for Desktop Click */}
      <SunflowerSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        streakData={streakData}
        myActivity={myActivityToday}
        partnerActivity={partnerActivityToday}
        pastActivities={past30DaysActivities}
      />
    </>
  );
}
