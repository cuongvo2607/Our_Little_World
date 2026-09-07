'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/navigation/Sidebar';
import { RightPanel } from '@/components/navigation/RightPanel';
import { BottomNav } from '@/components/navigation/BottomNav';
import { PageTransition } from '@/components/ui/PageTransition';
import { FloatingSunflower } from '@/components/sunflower/FloatingSunflower';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = ['/login', '/onboarding'].includes(pathname);
  const isChatPage = pathname === '/messages';

  if (isAuthPage) {
    return <main className="min-h-[100dvh] w-full flex items-center justify-center p-4">{children}</main>;
  }

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-cream-50/60 dark:bg-charcoal-900/60 relative z-10 overflow-x-hidden">
      <div className="w-full max-w-7xl flex justify-center min-h-[100dvh]">
        {/* Desktop Left Sidebar (>= 1024px) */}
        <Sidebar />

        {/* Main Content Area */}
        <main
          className={`w-full max-w-[480px] lg:max-w-2xl min-h-[100dvh] flex flex-col relative px-3 sm:px-4 border-x border-rose-100/50 dark:border-rose-950/30 ${
            isChatPage
              ? 'h-[100dvh] overflow-hidden py-0 pb-0'
              : 'pt-safe pb-nav-safe lg:pb-8 lg:py-6'
          }`}
        >
          <PageTransition>{children}</PageTransition>
        </main>

        {/* Desktop Right Info Panel (>= 1024px) */}
        <RightPanel />
      </div>

      {/* Floating Sunflower Button (Fixed right above BottomNav) */}
      <FloatingSunflower />

      {/* Mobile Bottom Navigation (< 1024px) */}
      <BottomNav />
    </div>
  );
}
