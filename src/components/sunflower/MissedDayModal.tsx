'use client';

import React, { useState } from 'react';
import { X, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MissedDayModalProps {
  isOpen: boolean;
  streakDays: number;
  waterTokens: number;
  onUseWater: () => Promise<boolean>;
  onClose: () => void;
}

export function MissedDayModal({ isOpen, streakDays, waterTokens, onUseWater, onClose }: MissedDayModalProps) {
  const [usingWater, setUsingWater] = useState(false);

  const handleUseWaterClick = async () => {
    setUsingWater(true);
    try {
      const success = await onUseWater();
      if (success) {
        onClose();
      }
    } finally {
      setUsingWater(false);
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
            className="relative bg-gradient-to-b from-[#FFFDF7] to-[#FFF5ED] dark:from-charcoal-800 dark:to-charcoal-900 rounded-[32px] p-6 max-w-[420px] w-full text-center border border-amber-200/80 shadow-2xl space-y-4 overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Drooping Sunflower Illustration */}
            <div className="pt-2">
              <h3 className="text-xl font-bold text-[#302A2C] dark:text-cream-50">
                Hôm qua hoa chưa được chăm
              </h3>
              <p className="text-2xl mt-1">🥺</p>
            </div>

            <div className="py-2 flex justify-center">
              <div className="w-32 h-32 rounded-full bg-amber-100/60 dark:bg-amber-950/40 flex items-center justify-center text-6xl shadow-soft-sm">
                🥀
              </div>
            </div>

            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300 max-w-xs mx-auto leading-relaxed">
              <p>Hai đứa chưa cùng tưới hoa hôm qua.</p>
              <p className="font-semibold text-charcoal-800 dark:text-cream-50">
                Bạn có muốn dùng 1 giọt nước yêu thương để giữ chuỗi {streakDays} ngày không?
              </p>
            </div>

            {/* Water Token Status Card */}
            <div className="p-3 bg-[#F0F7FF] dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between text-xs">
              <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-blue-500 fill-blue-500" /> 1 Giọt nước yêu thương
              </span>
              <span className="text-[11px] font-medium text-gray-500">
                Bạn còn {waterTokens} giọt
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {waterTokens > 0 ? (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleUseWaterClick}
                  disabled={usingWater}
                  className="w-full py-3 px-4 bg-gradient-to-r from-rose-400 to-[#EC6F91] text-white text-xs font-bold rounded-2xl shadow-soft-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  💧 {usingWater ? 'Đang dùng giọt nước...' : 'Dùng ngay'}
                </motion.button>
              ) : (
                <p className="text-xs text-rose-500 font-medium italic">
                  Bạn đã hết giọt nước cứu chuỗi cho tháng này.
                </p>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400"
              >
                Không, để chuỗi mới
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
