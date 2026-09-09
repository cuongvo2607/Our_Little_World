'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, Heart, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCouple } from '@/context/CoupleContext';
import {
  formatNotificationTime,
  getPushPermissionState,
  supportsWebPush,
  urlBase64ToUint8Array,
} from '@/lib/notifications';
import { AppNotification } from '@/types';
import { cn } from '@/lib/utils';

type PushState = NotificationPermission | 'unsupported';

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  isCenterOpen: boolean;
  pushPermission: PushState;
  pushSupported: boolean;
  pushSaving: boolean;
  pushError: string | null;
  openCenter: () => void;
  closeCenter: () => void;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  enablePushNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCouple();
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCenterOpen, setIsCenterOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<AppNotification | null>(null);
  const [pushPermission, setPushPermission] = useState<PushState>('unsupported');
  const [pushSaving, setPushSaving] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const seenToastIdsRef = useRef<Set<string>>(new Set());
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushSupported = pushPermission !== 'unsupported';
  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const hiddenPaths = ['/login', '/onboarding'];
  const shouldHideUi = hiddenPaths.includes(pathname);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data || []) as AppNotification[]);
    } catch (err) {
      console.warn('[Notifications] Could not fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id]);

  const showToast = useCallback((notification: AppNotification) => {
    if (seenToastIdsRef.current.has(notification.id)) return;
    seenToastIdsRef.current.add(notification.id);
    setToastNotification(notification);

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastNotification(null), 5000);
  }, []);

  const markRead = useCallback(async (notificationId: string) => {
    setNotifications((items) => items.map((item) => item.id === notificationId ? { ...item, is_read: true } : item));
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      await fetchNotifications();
    }
  }, [fetchNotifications, supabase]);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;

    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);

    if (error) {
      await fetchNotifications();
    }
  }, [fetchNotifications, supabase, user?.id]);

  const handleNotificationOpen = useCallback(async (notification: AppNotification) => {
    await markRead(notification.id);
    setToastNotification(null);
    setIsCenterOpen(false);
    router.push(notification.url || '/');
  }, [markRead, router]);

  const savePushSubscription = useCallback(async () => {
    if (!supportsWebPush()) {
      setPushPermission('unsupported');
      throw new Error('Web Push is not supported');
    }

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      throw new Error('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY');
    }

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js');
    }

    const readyRegistration = await navigator.serviceWorker.ready;
    const existingSubscription = await readyRegistration.pushManager.getSubscription();
    const subscription = existingSubscription || await readyRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    });

    const response = await fetch('/api/push-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!response.ok) throw new Error('Could not save push subscription');
  }, []);

  const enablePushNotifications = useCallback(async () => {
    setPushError(null);

    if (!supportsWebPush()) {
      setPushPermission('unsupported');
      setPushError('Thiết bị/trình duyệt này chưa hỗ trợ Web Push.');
      return;
    }

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setPushError('Thiếu NEXT_PUBLIC_VAPID_PUBLIC_KEY.');
      return;
    }

    setPushSaving(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== 'granted') {
        setPushError('Thông báo đang bị chặn trong trình duyệt.');
        return;
      }

      await savePushSubscription();
    } catch (err) {
      console.error('[Notifications] Enable push failed:', err);
      setPushError('Không thể bật thông báo. Vui lòng thử lại.');
    } finally {
      setPushSaving(false);
    }
  }, [savePushSubscription]);

  useEffect(() => {
    setPushPermission(getPushPermissionState());
  }, []);

  useEffect(() => {
    if (!user?.id || getPushPermissionState() !== 'granted') return;

    savePushSubscription().catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Notifications] Could not refresh push subscription:', err);
      }
    });
  }, [savePushSubscription, user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          const notification = payload.new as AppNotification;
          setNotifications((items) => {
            if (items.some((item) => item.id === notification.id)) return items;
            return [notification, ...items].slice(0, 50);
          });
          showToast(notification);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          const notification = payload.new as AppNotification;
          setNotifications((items) => items.map((item) => item.id === notification.id ? notification : item));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showToast, supabase, user?.id]);

  useEffect(() => () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    unreadCount,
    loading,
    isCenterOpen,
    pushPermission,
    pushSupported,
    pushSaving,
    pushError,
    openCenter: () => setIsCenterOpen(true),
    closeCenter: () => setIsCenterOpen(false),
    markRead,
    markAllRead,
    enablePushNotifications,
  }), [
    notifications,
    unreadCount,
    loading,
    isCenterOpen,
    pushPermission,
    pushSupported,
    pushSaving,
    pushError,
    markRead,
    markAllRead,
    enablePushNotifications,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {!shouldHideUi && (
        <>
          <NotificationToast notification={toastNotification} onOpen={handleNotificationOpen} />
          <NotificationCenter
            isOpen={isCenterOpen}
            notifications={notifications}
            loading={loading}
            unreadCount={unreadCount}
            onClose={() => setIsCenterOpen(false)}
            onOpenNotification={handleNotificationOpen}
            onMarkAllRead={markAllRead}
          />
        </>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }

  return context;
}

export function NotificationBellButton({ className }: { className?: string }) {
  const { unreadCount, openCenter } = useNotifications();

  return (
    <button
      type="button"
      onClick={openCenter}
      className={cn('relative w-9.5 h-9.5 rounded-full bg-white/80 dark:bg-charcoal-800/80 border border-[rgba(232,109,145,0.18)] shadow-soft-sm text-[#E86D91] flex items-center justify-center active:scale-95 transition-transform', className)}
      aria-label="Mở thông báo"
    >
      <Bell className="w-4.5 h-4.5 text-[#302830] dark:text-cream-50" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E86D91] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-charcoal-900">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export function PushNotificationSettings() {
  const { pushPermission, pushSupported, pushSaving, pushError, enablePushNotifications } = useNotifications();

  const label = pushPermission === 'granted'
    ? 'Thông báo đã bật'
    : pushPermission === 'denied'
      ? 'Thông báo đang bị chặn'
      : pushSupported
        ? 'Bật thông báo'
        : 'Thiết bị chưa hỗ trợ';

  return (
    <div className="p-3 space-y-2">
      <button
        type="button"
        onClick={enablePushNotifications}
        disabled={!pushSupported || pushPermission === 'granted' || pushSaving}
        className="w-full flex items-center justify-between hover:bg-rose-50/50 dark:hover:bg-rose-950/20 rounded-2xl transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-3">
          <Bell className="w-4 h-4 text-rose-500" />
          <span className="text-xs font-semibold text-charcoal-800 dark:text-cream-50">{label}</span>
        </div>
        {pushSaving ? <Loader2 className="w-4 h-4 animate-spin text-rose-500" /> : <span className="text-xs text-gray-400">{pushPermission === 'granted' ? 'Bật' : ''}</span>}
      </button>
      {pushPermission === 'denied' && (
        <p className="text-[11px] text-[#81727B] leading-relaxed">
          Hãy mở cài đặt trình duyệt/ứng dụng và cho phép thông báo cho Our Little World.
        </p>
      )}
      {pushError && <p className="text-[11px] text-red-500 font-medium">{pushError}</p>}
      {pushSupported && pushPermission !== 'granted' && (
        <p className="text-[11px] text-[#81727B] leading-relaxed">
          Trên iPhone, hãy thêm web vào Màn hình chính rồi mở PWA để bật thông báo khi app đóng.
        </p>
      )}
    </div>
  );
}

function NotificationToast({
  notification,
  onOpen,
}: {
  notification: AppNotification | null;
  onOpen: (notification: AppNotification) => void;
}) {
  return (
    <AnimatePresence>
      {notification && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          onClick={() => onOpen(notification)}
          className="fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+16px)] z-[80] w-[calc(100%-28px)] max-w-[390px] -translate-x-1/2 rounded-3xl bg-white/95 dark:bg-charcoal-800/95 border border-rose-100 dark:border-rose-900/40 shadow-soft-lg backdrop-blur-xl px-4 py-3 text-left"
        >
          <p className="text-sm font-extrabold text-charcoal-800 dark:text-cream-50">{notification.body}</p>
          <p className="text-[11px] text-[#81727B] mt-0.5">{formatNotificationTime(notification.created_at)}</p>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function NotificationCenter({
  isOpen,
  notifications,
  loading,
  unreadCount,
  onClose,
  onOpenNotification,
  onMarkAllRead,
}: {
  isOpen: boolean;
  notifications: AppNotification[];
  loading: boolean;
  unreadCount: number;
  onClose: () => void;
  onOpenNotification: (notification: AppNotification) => void;
  onMarkAllRead: () => Promise<void>;
}) {
  const todayNotifications = notifications.filter((item) => isToday(item.created_at));
  const olderNotifications = notifications.filter((item) => !isToday(item.created_at));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/35 backdrop-blur-sm p-3 sm:items-center">
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.96 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            className="w-full max-w-[430px] glass-card rounded-[28px] border border-rose-200/70 dark:border-rose-900/40 shadow-soft-lg overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-rose-100 dark:border-rose-900/30">
              <h3 className="text-sm font-bold text-charcoal-800 dark:text-cream-50 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#E86D91]" /> Thông báo
              </h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button type="button" onClick={onMarkAllRead} className="min-h-[38px] px-3 rounded-full text-xs font-bold text-[#E86D91] hover:bg-rose-50 flex items-center gap-1">
                    <CheckCheck className="w-4 h-4" /> Đã đọc
                  </button>
                )}
                <button type="button" onClick={onClose} className="min-h-[40px] min-w-[40px] rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 flex items-center justify-center" aria-label="Đóng">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 max-h-[68vh] overflow-y-auto space-y-4">
              {loading ? (
                <p className="text-xs text-[#81727B] text-center py-8">Đang tải thông báo...</p>
              ) : notifications.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Heart className="w-10 h-10 text-rose-300 fill-rose-100 mx-auto" />
                  <p className="text-sm font-bold text-charcoal-800 dark:text-cream-50">Chưa có thông báo nào</p>
                  <p className="text-xs text-[#81727B]">Khi người ấy gửi yêu thương, nơi này sẽ sáng lên.</p>
                </div>
              ) : (
                <>
                  <NotificationGroup title="Hôm nay" items={todayNotifications} onOpen={onOpenNotification} />
                  <NotificationGroup title="Trước đó" items={olderNotifications} onOpen={onOpenNotification} />
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function NotificationGroup({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: AppNotification[];
  onOpen: (notification: AppNotification) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#81727B] px-1">{title}</p>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpen(item)}
          className={cn(
            'w-full rounded-2xl border px-3.5 py-3 text-left transition-colors',
            item.is_read
              ? 'bg-white/55 dark:bg-charcoal-800/50 border-rose-100/40 dark:border-rose-900/20'
              : 'bg-[#FFF3F7] dark:bg-rose-950/35 border-rose-200/80 dark:border-rose-800/50'
          )}
        >
          <p className="text-sm font-bold text-charcoal-800 dark:text-cream-50">{item.body}</p>
          <p className="text-[11px] text-[#81727B] mt-1">{formatNotificationTime(item.created_at)}</p>
        </button>
      ))}
    </div>
  );
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}
