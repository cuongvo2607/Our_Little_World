'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageCircle, Plus, Image as ImageIcon, User, Heart, Sparkles, Clock, ListTodo, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide nav on login, onboarding, or before hydration
  if (!mounted || ['/login', '/onboarding'].includes(pathname)) {
    return null;
  }

  return (
    <>
      {/* Quick Action Popup Modal for Center [+] Button */}
      <AnimatePresence>
        {showPlusMenu && (
          <div className="fixed inset-0 z-50 flex items-end justify-center pb-24 px-4 bg-black/30 backdrop-blur-xs lg:hidden" onClick={() => setShowPlusMenu(false)}>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 dark:bg-charcoal-800/95 backdrop-blur-xl p-4 rounded-3xl shadow-soft-lg border border-rose-200 dark:border-rose-900/40 w-full max-w-[360px] space-y-3"
            >
              <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-900/30 pb-2">
                <h4 className="text-xs font-bold text-charcoal-800 dark:text-cream-50 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#E86D91]" /> Tạo mới khoảnh khắc
                </h4>
                <button onClick={() => setShowPlusMenu(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    setShowPlusMenu(false);
                    router.push('/memories');
                  }}
                  className="p-3 bg-[#FFF7FA] dark:bg-rose-950/40 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex items-center gap-2 text-xs font-bold text-[#E86D91] active:scale-95 transition-transform"
                >
                  <ImageIcon className="w-4 h-4 text-[#E86D91]" /> Thêm kỷ niệm
                </button>

                <button
                  onClick={() => {
                    setShowPlusMenu(false);
                    router.push('/timeline');
                  }}
                  className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-900/30 flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-300 active:scale-95 transition-transform"
                >
                  <Clock className="w-4 h-4 text-purple-500" /> Cột mốc yêu
                </button>

                <button
                  onClick={() => {
                    setShowPlusMenu(false);
                    router.push('/bucket-list');
                  }}
                  className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300 active:scale-95 transition-transform"
                >
                  <ListTodo className="w-4 h-4 text-amber-500" /> Bucket List
                </button>

                <button
                  onClick={() => {
                    setShowPlusMenu(false);
                    router.push('/time-capsule');
                  }}
                  className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-300 active:scale-95 transition-transform"
                >
                  <Heart className="w-4 h-4 text-rose-500" /> Hòm thư tương lai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none lg:hidden">
        <div className="w-full max-w-[480px] px-3 pb-safe pointer-events-auto">
          <div className="bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-xl rounded-full px-2 py-1.5 flex items-center justify-between shadow-[0_8px_30px_rgba(232,109,145,0.18)] border border-[rgba(232,109,145,0.18)]">
            {/* 1. Trang chủ */}
            <Link
              href="/"
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] rounded-full transition-colors group ${
                pathname === '/' ? 'text-[#E86D91]' : 'text-[#81727B] dark:text-gray-400'
              }`}
            >
              {pathname === '/' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-[#FCE7EF] dark:bg-rose-950/70 rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Home className={`w-5 h-5 relative z-10 ${pathname === '/' ? 'stroke-[2.5] text-[#E86D91]' : ''}`} />
              <span className={`text-[10px] relative z-10 mt-0.5 ${pathname === '/' ? 'font-bold text-[#E86D91]' : 'font-medium'}`}>
                Trang chủ
              </span>
            </Link>

            {/* 2. Tin nhắn */}
            <Link
              href="/messages"
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] rounded-full transition-colors group ${
                pathname.startsWith('/messages') ? 'text-[#E86D91]' : 'text-[#81727B] dark:text-gray-400'
              }`}
            >
              {pathname.startsWith('/messages') && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-[#FCE7EF] dark:bg-rose-950/70 rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <MessageCircle className={`w-5 h-5 relative z-10 ${pathname.startsWith('/messages') ? 'stroke-[2.5] text-[#E86D91]' : ''}`} />
              <span className={`text-[10px] relative z-10 mt-0.5 ${pathname.startsWith('/messages') ? 'font-bold text-[#E86D91]' : 'font-medium'}`}>
                Tin nhắn
              </span>
            </Link>

            {/* 3. Center Floating Action Button [+] */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              className="w-12 h-12 -mt-4 rounded-full bg-gradient-to-tr from-rose-400 via-[#E86D91] to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-300/50 border-2 border-white dark:border-charcoal-900 shrink-0 z-20"
            >
              <Plus className={`w-6 h-6 transition-transform duration-300 ${showPlusMenu ? 'rotate-45' : ''}`} />
            </motion.button>

            {/* 4. Kỷ niệm */}
            <Link
              href="/memories"
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] rounded-full transition-colors group ${
                pathname.startsWith('/memories') ? 'text-[#E86D91]' : 'text-[#81727B] dark:text-gray-400'
              }`}
            >
              {pathname.startsWith('/memories') && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-[#FCE7EF] dark:bg-rose-950/70 rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <ImageIcon className={`w-5 h-5 relative z-10 ${pathname.startsWith('/memories') ? 'stroke-[2.5] text-[#E86D91]' : ''}`} />
              <span className={`text-[10px] relative z-10 mt-0.5 ${pathname.startsWith('/memories') ? 'font-bold text-[#E86D91]' : 'font-medium'}`}>
                Kỷ niệm
              </span>
            </Link>

            {/* 5. Góc nhỏ */}
            <Link
              href="/profile"
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] rounded-full transition-colors group ${
                pathname.startsWith('/profile') ? 'text-[#E86D91]' : 'text-[#81727B] dark:text-gray-400'
              }`}
            >
              {pathname.startsWith('/profile') && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-[#FCE7EF] dark:bg-rose-950/70 rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <User className={`w-5 h-5 relative z-10 ${pathname.startsWith('/profile') ? 'stroke-[2.5] text-[#E86D91]' : ''}`} />
              <span className={`text-[10px] relative z-10 mt-0.5 ${pathname.startsWith('/profile') ? 'font-bold text-[#E86D91]' : 'font-medium'}`}>
                Góc nhỏ
              </span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
