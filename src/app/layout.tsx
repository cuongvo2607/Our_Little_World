import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWAInstaller } from '@/components/navigation/PWAInstaller';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { CoupleProvider } from '@/context/CoupleContext';
import { MusicProvider } from '@/context/MusicContext';
import { AppShell } from '@/components/layout/AppShell';

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
      <body className="min-h-[100dvh] bg-cream-100 dark:bg-charcoal-900 text-charcoal-800 dark:text-cream-50 antialiased selection:bg-rose-200">
        <CoupleProvider>
          <MusicProvider>
            <PWAInstaller />
            <AmbientBackground />
            <AppShell>{children}</AppShell>
          </MusicProvider>
        </CoupleProvider>
      </body>
    </html>
  );
}
