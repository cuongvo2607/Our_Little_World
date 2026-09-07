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

  // Hide nav on login, onboarding
  if (['/login', '/onboarding'].includes(pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none lg:hidden">
      <div className="w-full max-w-[480px] px-3 pb-safe pointer-events-auto">
        <div className="bg-white/85 dark:bg-charcoal-900/85 backdrop-blur-xl rounded-full px-2 py-1.5 flex items-center justify-around shadow-[0_8px_25px_rgba(232,109,145,0.15)] border border-[rgba(232,109,145,0.18)]">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[42px] rounded-full transition-colors group"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-[#FCE7EF] dark:bg-rose-950/70 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-4.5 h-4.5 relative z-10 transition-all duration-200 group-active:scale-90 ${
                    isActive
                      ? 'text-[#E86D91] dark:text-rose-400 stroke-[2.5]'
                      : 'text-[#81727B] dark:text-gray-400'
                  }`}
                />
                <span
                  className={`text-[10px] relative z-10 mt-0.5 transition-colors ${
                    isActive
                      ? 'text-[#E86D91] dark:text-rose-400 font-bold'
                      : 'text-[#81727B] dark:text-gray-400 font-medium'
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

