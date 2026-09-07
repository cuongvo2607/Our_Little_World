'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCouple } from '@/context/CoupleContext';
import { SunflowerStage } from './SunflowerStage';
import { X, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MilestoneModalProps {
  isOpen: boolean;
  streakDays: number;
  onClose: () => void;
}

export function MilestoneModal({ isOpen, streakDays, onClose }: MilestoneModalProps) {
  const { user, couple } = useCouple();
  const [savingMemory, setSavingMemory] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const supabase = createClient();

  const handleSaveMilestoneMemory = async () => {
    if (!couple?.id || !user?.id) return;
    setSavingMemory(true);

    try {
      const memoryTitle = `🌻 Cột mốc ${streakDays} ngày Chuỗi Hướng Dương! 🎉`;
      const memoryDesc = `Hai đứa đã cùng nhau chăm sóc bông hoa hướng dương ngọt ngào suốt ${streakDays} ngày liên tiếp. Cảm ơn vì luôn ở đây bên nhau ♡`;
      const todayStr = new Date().toISOString().split('T')[0];

      // Insert memory into DB
      await supabase.from('memories').insert({
        couple_id: couple.id,
        created_by: user.id,
        title: memoryTitle,
        description: memoryDesc,
        memory_date: todayStr,
        image_url: 'couples/milestone-sunflower.png', // Fallback styled card image
      });

      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error saving milestone memory:', err);
    } finally {
      setSavingMemory(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            className="relative bg-gradient-to-b from-[#FFFDF5] via-[#FFF8E7] to-[#FFF5DB] dark:from-charcoal-800 dark:to-charcoal-900 rounded-[32px] p-6 max-w-[420px] w-full text-center border-2 border-amber-200/80 shadow-2xl space-y-4 overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Sparkles Decorative Header */}
            <div className="pt-2">
              <h3 className="text-2xl font-extrabold text-[#302A2C] dark:text-cream-50 flex items-center justify-center gap-2">
                🌻 {streakDays} ngày rồi! 🎉
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-xs mx-auto leading-relaxed">
                Hai đứa đã cùng chăm bông hoa này suốt {streakDays >= 30 ? 'một tháng' : `${streakDays} ngày`}. Cảm ơn vì luôn ở đây 💛
              </p>
            </div>

            {/* Large Illustration Stage */}
            <div className="py-3 flex justify-center">
              <SunflowerStage streak={streakDays} size="lg" animated />
            </div>

            {/* Milestone Board Badge */}
            <div className="inline-block bg-[#F5A623] text-white px-5 py-2 rounded-2xl shadow-lg shadow-amber-300/40 border border-amber-300">
              <span className="text-xl font-extrabold">{streakDays} ngày</span>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleSaveMilestoneMemory}
                disabled={savingMemory || savedSuccess}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-400 to-[#EC6F91] text-white text-sm font-bold rounded-2xl shadow-lg shadow-rose-300/40 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>{savedSuccess ? '✓ Đã lưu kỷ niệm!' : savingMemory ? 'Đang lưu...' : '📸 Lưu thành kỷ niệm'}</span>
              </motion.button>

              <button
                onClick={onClose}
                className="w-full py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400"
              >
                Để sau
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
