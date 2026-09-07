'use client';

import React from 'react';
import { useCouple } from '@/context/CoupleContext';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { getDaysTogether, formatDateVietnamese } from '@/lib/utils';
import { Heart, Smile, Sparkles } from 'lucide-react';

export function RightPanel() {
  const pathname = usePathname();
  const { userProfile, partnerProfile, couple, partnerMood, loading } = useCouple();

  if (['/login', '/onboarding'].includes(pathname)) {
    return null;
  }

  const daysTogether = getDaysTogether(couple?.start_date);

  return (
    <aside className="hidden lg:flex flex-col w-80 shrink-0 h-screen sticky top-0 p-4 space-y-4 border-l border-rose-100 dark:border-rose-950/30 bg-cream-50/50 dark:bg-charcoal-900/50 overflow-y-auto">
      {/* Couple Header Card */}
      <Card className="text-center py-6 bg-gradient-to-b from-rose-100/70 to-cream-50 dark:from-rose-950/40 dark:to-charcoal-900 border-rose-200/60 shadow-soft-sm space-y-3">
        <div className="flex items-center justify-center -space-x-3">
          <div className="w-14 h-14 rounded-full border-2 border-white dark:border-charcoal-800 bg-rose-200 overflow-hidden flex items-center justify-center font-bold text-rose-600 shadow-soft-sm">
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} alt="Me" className="w-full h-full object-cover" />
            ) : (
              userProfile?.display_name?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center z-10 text-xs shadow-soft-sm">
            ❤️
          </div>
          <div className="w-14 h-14 rounded-full border-2 border-white dark:border-charcoal-800 bg-lavender-200 overflow-hidden flex items-center justify-center font-bold text-purple-600 shadow-soft-sm">
            {partnerProfile?.avatar_url ? (
              <img src={partnerProfile.avatar_url} alt="Partner" className="w-full h-full object-cover" />
            ) : (
              partnerProfile?.display_name?.charAt(0).toUpperCase() || 'P'
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-charcoal-800 dark:text-cream-50">
            {couple?.name || 'Thế Giới Của Hai Ta'}
          </h2>
          <p className="text-xs text-rose-500 font-semibold mt-0.5">
            {userProfile?.display_name} & {partnerProfile?.display_name || 'Người ấy'}
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
  );
}
