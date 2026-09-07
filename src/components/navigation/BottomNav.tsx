'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, MessageCircle, Flower2, Image as ImageIcon, User } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/', label: 'Trang chủ', icon: Heart },
  { href: '/messages', label: 'Tin nhắn', icon: MessageCircle },
  { href: '/garden', label: 'Khu vườn', icon: Flower2 },
  { href: '/memories', label: 'Kỷ niệm', icon: ImageIcon },
  { href: '/profile', label: 'Góc nhỏ', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide nav on login, onboarding or desktop screen
  if (['/login', '/onboarding'].includes(pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none lg:hidden">
      <div className="w-full max-w-[480px] px-4 pb-safe pointer-events-auto">
        <div className="glass-card rounded-full px-3 py-2 flex items-center justify-around shadow-soft-lg border border-rose-200/50 dark:border-rose-900/30">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center py-1 px-3 min-w-[54px] min-h-[44px] rounded-full transition-colors group"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-rose-100 dark:bg-rose-950/60 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10 transition-transform duration-200 group-active:scale-90 ${
                    isActive
                      ? 'text-rose-600 dark:text-rose-400 stroke-[2.5]'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium relative z-10 mt-0.5 ${
                    isActive
                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
