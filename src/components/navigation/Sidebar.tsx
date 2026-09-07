'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  MessageCircle,
  Plus,
  Image as ImageIcon,
  User,
  Sparkles,
  Clock,
  ListTodo,
  Heart,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const sidebarItems = [
  { href: '/', label: 'Trang chủ', icon: Home },
  { href: '/messages', label: 'Tin nhắn', icon: MessageCircle },
  // Center [+] Quick Action handled separately
  { href: '/memories', label: 'Kỷ niệm', icon: ImageIcon },
  { href: '/profile', label: 'Góc nhỏ', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  if (['/login', '/onboarding'].includes(pathname)) {
    return null;
  }

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 p-4 border-r border-rose-100 dark:border-rose-950/30 bg-cream-50/80 dark:bg-charcoal-900/80 backdrop-blur-md z-30">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-4 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-400 to-rose-500 flex items-center justify-center text-white shadow-soft-sm shadow-rose-300/40">
            <Heart className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-charcoal-800 dark:text-rose-100 leading-tight">
              Our Little World
            </h1>
            <p className="text-[11px] text-gray-400 font-medium">Cùng nhau mỗi ngày ♡</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {/* 1. Trang chủ */}
          <Link
            href="/"
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200',
              pathname === '/'
                ? 'bg-[#E86D91] text-white shadow-soft-sm shadow-rose-300/40'
                : 'text-gray-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-[#E86D91]'
            )}
          >
            <Home className="w-4.5 h-4.5" />
            <span>Trang chủ</span>
          </Link>

          {/* 2. Tin nhắn */}
          <Link
            href="/messages"
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200',
              pathname === '/messages'
                ? 'bg-[#E86D91] text-white shadow-soft-sm shadow-rose-300/40'
                : 'text-gray-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-[#E86D91]'
            )}
          >
            <MessageCircle className="w-4.5 h-4.5" />
            <span>Tin nhắn</span>
          </Link>

          {/* 3. [+] Tạo mới */}
          <button
            onClick={() => setShowPlusMenu(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-[#E86D91] to-rose-400 hover:from-rose-500 hover:to-rose-400 shadow-soft-sm shadow-rose-300/40 active:scale-95 transition-all duration-200"
          >
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Tạo mới</span>
          </button>

          {/* 4. Kỷ niệm */}
          <Link
            href="/memories"
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200',
              pathname === '/memories'
                ? 'bg-[#E86D91] text-white shadow-soft-sm shadow-rose-300/40'
                : 'text-gray-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-[#E86D91]'
            )}
          >
            <ImageIcon className="w-4.5 h-4.5" />
            <span>Kỷ niệm</span>
          </Link>

          {/* 5. Góc nhỏ */}
          <Link
            href="/profile"
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200',
              pathname === '/profile'
                ? 'bg-[#E86D91] text-white shadow-soft-sm shadow-rose-300/40'
                : 'text-gray-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-[#E86D91]'
            )}
          >
            <User className="w-4.5 h-4.5" />
            <span>Góc nhỏ</span>
          </Link>
        </nav>
      </aside>

      {/* Desktop [+] Quick Action Modal */}
      <AnimatePresence>
        {showPlusMenu && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs hidden lg:flex"
            onClick={() => setShowPlusMenu(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 dark:bg-charcoal-800/95 backdrop-blur-xl p-5 rounded-3xl shadow-soft-lg border border-rose-200 dark:border-rose-900/40 w-full max-w-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-900/30 pb-3">
                <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-50 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E86D91]" /> Tạo mới khoảnh khắc
                </h4>
                <button
                  onClick={() => setShowPlusMenu(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowPlusMenu(false);
                    router.push('/memories');
                  }}
                  className="p-3.5 bg-[#FFF7FA] dark:bg-rose-950/40 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex items-center gap-2 text-xs font-bold text-[#E86D91] hover:bg-rose-100/50 transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-[#E86D91]" /> Thêm kỷ niệm
                </button>

                <button
                  onClick={() => {
                    setShowPlusMenu(false);
                    router.push('/timeline');
                  }}
                  className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-900/30 flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-300 hover:bg-purple-100/50 transition-colors"
                >
                  <Clock className="w-4 h-4 text-purple-500" /> Cột mốc yêu
                </button>

                <button
                  onClick={() => {
                    setShowPlusMenu(false);
                    router.push('/bucket-list');
                  }}
                  className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100/50 transition-colors"
                >
                  <ListTodo className="w-4 h-4 text-amber-500" /> Bucket List
                </button>

                <button
                  onClick={() => {
                    setShowPlusMenu(false);
                    router.push('/time-capsule');
                  }}
                  className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-300 hover:bg-rose-100/50 transition-colors"
                >
                  <Heart className="w-4 h-4 text-rose-500" /> Hòm thư tương lai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
