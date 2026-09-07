import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Sidebar } from '@/components/navigation/Sidebar';
import { RightPanel } from '@/components/navigation/RightPanel';
import { PWAInstaller } from '@/components/navigation/PWAInstaller';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { PageTransition } from '@/components/ui/PageTransition';
import { CoupleProvider } from '@/context/CoupleContext';

export const metadata: Metadata = {
  title: 'Our Little World - Thế Giới Nhỏ Của Hai Ta',
  description: 'Không gian riêng tư ngọt ngào dành cho 2 người yêu nhau',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Our Little World',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#FDFBF7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen bg-cream-100 dark:bg-charcoal-900 text-charcoal-800 dark:text-cream-50 antialiased selection:bg-rose-200">
        <CoupleProvider>
          <PWAInstaller />
          <AmbientBackground />

          {/* Responsive Layout Wrapper */}
          <div className="min-h-screen flex justify-center bg-cream-50/60 dark:bg-charcoal-900/60 relative z-10">
            <div className="w-full max-w-7xl flex justify-center min-h-screen">
              {/* Desktop Left Sidebar (>= 1024px) */}
              <Sidebar />

              {/* Main Content Area with PageTransition */}
              <main className="w-full max-w-[480px] lg:max-w-2xl min-h-screen flex flex-col relative px-4 pt-safe pb-28 lg:pb-8 lg:py-6 border-x border-rose-100/50 dark:border-rose-950/30">
                <PageTransition>{children}</PageTransition>
              </main>

              {/* Desktop Right Info Panel (>= 1024px) */}
              <RightPanel />
            </div>

            {/* Mobile Bottom Navigation (< 1024px) */}
            <BottomNav />
          </div>
        </CoupleProvider>
      </body>
    </html>
  );
}
