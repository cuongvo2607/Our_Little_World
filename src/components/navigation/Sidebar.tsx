'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Heart,
  MessageCircle,
  Clock,
  Image as ImageIcon,
  Flower2,
  ListTodo,
  Sparkles,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { href: '/', label: 'Trang chủ', icon: Heart },
  { href: '/messages', label: 'Tin nhắn', icon: MessageCircle },
  { href: '/timeline', label: 'Hành trình', icon: Clock },
  { href: '/memories', label: 'Album kỷ niệm', icon: ImageIcon },
  { href: '/garden', label: 'Khu vườn', icon: Flower2 },
  { href: '/bucket-list', label: 'Bucket List', icon: ListTodo },
  { href: '/time-capsule', label: 'Hòm thư tương lai', icon: Sparkles },
  { href: '/profile', label: 'Cài đặt', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  if (['/login', '/onboarding'].includes(pathname)) {
    return null;
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 p-4 border-r border-rose-100 dark:border-rose-950/30 bg-cream-50/80 dark:bg-charcoal-900/80 backdrop-blur-md">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-400 to-rose-500 flex items-center justify-center text-white shadow-soft-sm shadow-rose-300/40">
          <Heart className="w-5 h-5 fill-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-charcoal-800 dark:text-rose-100 leading-tight">
            Our Little World
          </h1>
          <p className="text-[11px] text-gray-400">Không gian hai ta</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all duration-200',
                isActive
                  ? 'bg-rose-500 text-white shadow-soft-sm shadow-rose-300/30'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'stroke-[2.5]' : '')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
