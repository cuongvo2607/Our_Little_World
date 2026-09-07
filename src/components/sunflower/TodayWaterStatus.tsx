'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCouple } from '@/context/CoupleContext';
import { DailyActivity } from '@/types';
import { CheckCircle2, Clock, MessageCircle, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface TodayWaterStatusProps {
  myActivity: DailyActivity | null;
  partnerActivity: DailyActivity | null;
  onCloseSheet?: () => void;
}

export function TodayWaterStatus({ myActivity, partnerActivity, onCloseSheet }: TodayWaterStatusProps) {
  const { userProfile, partnerProfile } = useCouple();
  const router = useRouter();

  const isMyDone = !!myActivity;
  const isPartnerDone = !!partnerActivity;
  const isBothDone = isMyDone && isPartnerDone;

  return (
    <div className="bg-[#FFFDF7] dark:bg-charcoal-800/80 rounded-[24px] p-4 border border-amber-100 dark:border-amber-900/30 shadow-soft-sm space-y-3">
      <div className="flex items-center justify-between border-b border-amber-100/60 dark:border-amber-900/20 pb-2">
        <h4 className="text-xs font-bold text-[#302A2C] dark:text-cream-50 uppercase tracking-wider">
          Hôm nay
        </h4>
        <span className="text-[11px] font-semibold text-[#F5A623]">
          {isBothDone ? '✓ Hoàn thành' : '⏳ Đang chăm sóc'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* User Card */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white dark:bg-charcoal-700/60 border border-amber-100/70 dark:border-amber-900/30">
          <div className="w-8 h-8 rounded-full bg-[#FCE7EF] overflow-hidden shrink-0 border border-rose-200 flex items-center justify-center text-xs font-bold text-[#EC6F91]">
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} alt="Me" className="w-full h-full object-cover" />
            ) : (
              userProfile?.display_name?.charAt(0).toUpperCase() || 'Bạn'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#302A2C] dark:text-cream-50 truncate">
              {userProfile?.display_name || 'Bạn'}
            </p>
            {isMyDone ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Đã tưới hoa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <Clock className="w-3 h-3 text-amber-500 animate-pulse" /> Đang chờ
              </span>
            )}
          </div>
        </div>

        {/* Partner Card */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white dark:bg-charcoal-700/60 border border-amber-100/70 dark:border-amber-900/30">
          <div className="w-8 h-8 rounded-full bg-lavender-200 overflow-hidden shrink-0 border border-purple-200 flex items-center justify-center text-xs font-bold text-purple-600">
            {partnerProfile?.avatar_url ? (
              <img src={partnerProfile.avatar_url} alt="Partner" className="w-full h-full object-cover" />
            ) : (
              partnerProfile?.display_name?.charAt(0).toUpperCase() || 'P'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#302A2C] dark:text-cream-50 truncate">
              {partnerProfile?.display_name || 'Người ấy'}
            </p>
            {isPartnerDone ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Đã tưới hoa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <Clock className="w-3 h-3 text-amber-500 animate-pulse" /> Đang chờ
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Message / Action */}
      {isBothDone ? (
        <div className="text-center pt-1">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1">
            🌻 Hôm nay bông hoa đã được chăm rồi! <Heart className="w-3.5 h-3.5 fill-[#EC6F91] text-[#EC6F91]" />
          </p>
          <p className="text-[11px] text-gray-500 italic mt-0.5">Cảm ơn vì luôn ở đây ♡</p>
        </div>
      ) : (
        <div className="pt-1 space-y-2 text-center">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1">
            🌱 Hôm nay hoa vẫn đang chờ một người tưới... 💧
          </p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              if (onCloseSheet) onCloseSheet();
              router.push('/messages');
            }}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-400 to-[#EC6F91] text-white text-xs font-bold rounded-2xl shadow-soft-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <MessageCircle className="w-4 h-4" /> Đi nhắn tin ngay 💌
          </motion.button>
        </div>
      )}
    </div>
  );
}
