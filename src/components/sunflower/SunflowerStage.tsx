'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SunflowerStageLevel } from '@/types';

interface SunflowerStageProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function SunflowerStage({ streak, size = 'md', animated = true }: SunflowerStageProps) {
  // Dimensions
  const containerSizes = {
    sm: 'w-16 h-16 text-3xl',
    md: 'w-32 h-32 text-6xl',
    lg: 'w-44 h-44 text-7xl',
  };

  // Determine stage illustration based on streak
  const getStageContent = () => {
    if (streak >= 100) {
      return {
        emoji: '🌻🌻👑',
        label: 'Vườn hướng dương',
        bgColor: 'from-amber-200/80 via-yellow-100/90 to-amber-100/70',
        badge: '100+ ngày',
      };
    }
    if (streak >= 30) {
      return {
        emoji: '🌻🌻',
        label: 'Nhiều hoa hơn',
        bgColor: 'from-[#FFF7DC] via-[#FFF3C4] to-[#FFF9E6]',
        badge: '30+ ngày',
      };
    }
    if (streak >= 14) {
      return {
        emoji: '🌻✨',
        label: 'Rực rỡ',
        bgColor: 'from-[#FFF9E6] via-[#FFF4D4] to-[#FFF8EA]',
        badge: '14+ ngày',
      };
    }
    if (streak >= 7) {
      return {
        emoji: '🌻',
        label: 'Nở hoa',
        bgColor: 'from-[#FFFDF2] via-[#FFF8DC] to-[#FFFDF5]',
        badge: '7+ ngày',
      };
    }
    if (streak >= 3) {
      return {
        emoji: '🌿',
        label: 'Lớn dần',
        bgColor: 'from-[#F4FBF4] via-[#E8F6E8] to-[#F7FCF7]',
        badge: '3-6 ngày',
      };
    }
    if (streak >= 1) {
      return {
        emoji: '🌱',
        label: 'Nảy mầm',
        bgColor: 'from-[#F4FBF4] via-[#EEF9EE] to-[#FAFDFB]',
        badge: '1-2 ngày',
      };
    }
    return {
      emoji: '🌱',
      label: 'Mới bắt đầu',
      bgColor: 'from-[#F9FBF9] via-[#F0F8F0] to-[#FAFCFA]',
      badge: '0 ngày',
    };
  };

  const content = getStageContent();

  return (
    <div className="flex flex-col items-center justify-center">
      <motion.div
        animate={
          animated
            ? {
                y: [0, -4, 0],
                rotate: [0, 1.5, -1.5, 0],
              }
            : undefined
        }
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`relative rounded-full bg-gradient-to-br ${content.bgColor} flex items-center justify-center shadow-[0_8px_25px_rgba(245,166,35,0.18)] border-2 border-amber-200/60 dark:border-amber-900/40 ${containerSizes[size]}`}
      >
        {/* Soft Sparkle Background Accent */}
        <div className="absolute inset-0 rounded-full bg-white/40 dark:bg-black/10 backdrop-blur-xs pointer-events-none" />

        {/* Emoji / Illustration */}
        <span className="relative z-10 select-none drop-shadow-md">{content.emoji}</span>
      </motion.div>
    </div>
  );
}
