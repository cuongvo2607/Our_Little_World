'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCouple } from '@/context/CoupleContext';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  calculateLoveDuration,
  getDaysTogether,
  formatDateVietnamese,
  triggerHeartConfetti,
} from '@/lib/utils';
import {
  Mood,
  MoodEmoji,
  Memory,
  TimeCapsule,
} from '@/types';
import {
  Heart,
  Sparkles,
  Send,
  Calendar,
  Image as ImageIcon,
  Clock,
  ChevronRight,
  Smile,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const MOOD_OPTIONS: { emoji: MoodEmoji; label: string }[] = [
  { emoji: '😭', label: 'Rất buồn' },
  { emoji: '😔', label: 'Hơi buồn' },
  { emoji: '😐', label: 'Bình thường' },
  { emoji: '😊', label: 'Vui vẻ' },
  { emoji: '🥰', label: 'Yêu đời' },
  { emoji: '🥳', label: 'Rất vui' },
];

export default function HomePage() {
  const { user, userProfile, partnerProfile, couple, partnerMood, myMood, loading: contextLoading, refreshData } = useCouple();

  const [recentMemory, setRecentMemory] = useState<Memory | null>(null);
  const [upcomingCapsule, setUpcomingCapsule] = useState<TimeCapsule | null>(null);

  // Mood selector modal
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<MoodEmoji>('🥰');
  const [moodNote, setMoodNote] = useState('');
  const [savingMood, setSavingMood] = useState(false);

  // Quick message spam cooldown
  const [quickMsgCooldown, setQuickMsgCooldown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (couple?.id) {
      fetchExtraDashboardData(couple.id);
    }
  }, [couple?.id]);

  const fetchExtraDashboardData = async (coupleId: string) => {
    try {
      // Fetch Recent Memory
      const { data: memoryData } = await supabase
        .from('memories')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setRecentMemory(memoryData);

      // Fetch Next Time Capsule
      const { data: capsuleData } = await supabase
        .from('time_capsules')
        .select('*')
        .eq('couple_id', coupleId)
        .is('opened_at', null)
        .order('unlock_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      setUpcomingCapsule(capsuleData);
    } catch (err) {
      console.error('Error loading extra dashboard data:', err);
    }
  };

  // Quick Love Message Action ("Nhớ cậu", "Yêu cậu", "Ôm một cái")
  const handleSendQuickMessage = async (type: 'miss_you' | 'love_you' | 'hug', label: string) => {
    if (quickMsgCooldown || !couple || !user) return;

    setQuickMsgCooldown(true);
    triggerHeartConfetti();

    try {
      await supabase.from('love_messages').insert({
        couple_id: couple.id,
        sender_id: user.id,
        type,
        message: label,
      });

      showToast(`Đã gửi "${label}" tới người ấy ❤️`);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setQuickMsgCooldown(false), 3000);
    }
  };

  // Submit Daily Mood
  const handleSaveMood = async () => {
    if (!couple || !user) return;
    setSavingMood(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('moods')
        .upsert(
          {
            couple_id: couple.id,
            user_id: user.id,
            mood: selectedEmoji,
            note: moodNote || null,
            mood_date: todayStr,
          },
          { onConflict: 'user_id, mood_date' }
        );

      if (error) throw error;
      await refreshData();
      setIsMoodModalOpen(false);
      showToast('Đã cập nhật tâm trạng hôm nay!');
    } catch (err: any) {
      showToast(err.message || 'Không thể lưu tâm trạng');
    } finally {
      setSavingMood(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (contextLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Heart className="w-10 h-10 text-rose-400 animate-bounce fill-rose-300" />
        <p className="text-xs text-gray-400">Đang chuẩn bị thế giới nhỏ...</p>
      </div>
    );
  }

  const daysTogether = getDaysTogether(couple?.start_date);
  const loveDuration = calculateLoveDuration(couple?.start_date);

  return (
    <div className="space-y-5 py-2">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-charcoal-800/90 text-white text-xs font-semibold rounded-full shadow-soft-lg backdrop-blur-md flex items-center gap-2 border border-white/20"
          >
            <Heart className="w-4 h-4 text-rose-400 fill-rose-400 animate-bounce" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Couple Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="relative flex -space-x-3">
            {/* User Avatar */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-11 h-11 rounded-full border-2 border-white dark:border-charcoal-800 bg-rose-200 overflow-hidden flex items-center justify-center font-bold text-rose-600 shadow-soft-sm"
            >
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Me" className="w-full h-full object-cover" />
              ) : (
                userProfile?.display_name?.charAt(0).toUpperCase() || 'U'
              )}
            </motion.div>

            {/* Partner Avatar with Online Glow Ring */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-11 h-11 rounded-full border-2 border-white dark:border-charcoal-800 bg-lavender-200 overflow-hidden flex items-center justify-center font-bold text-purple-600 shadow-soft-sm ring-2 ring-emerald-400 ring-offset-1 ring-offset-white dark:ring-offset-charcoal-900"
            >
              {partnerProfile?.avatar_url ? (
                <img src={partnerProfile.avatar_url} alt="Partner" className="w-full h-full object-cover" />
              ) : (
                partnerProfile?.display_name?.charAt(0).toUpperCase() || 'P'
              )}
            </motion.div>
          </div>

          <div>
            <h2 className="text-base font-bold text-charcoal-800 dark:text-cream-50 leading-tight">
              {couple?.name || 'Thế Giới Của Hai Ta'}
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <span>{partnerProfile ? `Cùng với ${partnerProfile.display_name}` : 'Đang chờ người ấy kết nối...'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </p>
          </div>
        </div>

        <Link href="/profile" className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center transition-transform active:scale-90">
          <Sparkles className="w-5 h-5 text-rose-400" />
        </Link>
      </div>

      {/* High-Contrast Accessible Love Counter Card */}
      <Card hoverEffect={false} className="bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600 text-white relative overflow-hidden shadow-soft-lg shadow-rose-300/40 border-none p-6">
        <div className="absolute -right-6 -bottom-6 opacity-20 pointer-events-none animate-pulse-soft">
          <Heart className="w-44 h-44 fill-white" />
        </div>

        <div className="relative z-10 text-center py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/90 mb-1 flex items-center justify-center gap-1.5 drop-shadow">
            <Heart className="w-4 h-4 fill-white animate-pulse-soft" /> Chúng ta đã bên nhau
          </p>
          <div className="text-4xl sm:text-5xl font-black tracking-tight my-2 text-white drop-shadow-md">
            ❤️ {daysTogether} ngày
          </div>
          <div className="text-xs text-white font-bold bg-black/25 backdrop-blur-md inline-block px-4 py-1.5 rounded-full border border-white/30 shadow-sm">
            {loveDuration.years > 0 ? `${loveDuration.years} năm • ` : ''}
            {loveDuration.months} tháng • {loveDuration.days} ngày
          </div>
        </div>
      </Card>

      {/* Daily Mood Card */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Smile className="w-4 h-4 text-rose-400" /> Hôm nay thế nào?
          </h3>
          <button
            onClick={() => setIsMoodModalOpen(true)}
            className="text-xs text-rose-500 font-medium hover:underline min-h-[44px] px-2 flex items-center"
          >
            {myMood ? 'Đổi tâm trạng' : '+ Chọn tâm trạng'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* My Mood */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-rose-50/60 dark:bg-rose-950/30 p-3 rounded-2xl border border-rose-100 dark:border-rose-900/30"
          >
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Bạn:</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl animate-bounce">{myMood ? myMood.mood : '❓'}</span>
              <div>
                <p className="text-xs font-semibold text-charcoal-800 dark:text-cream-50">
                  {myMood ? MOOD_OPTIONS.find((m) => m.emoji === myMood.mood)?.label : 'Chưa cập nhật'}
                </p>
                {myMood?.note && (
                  <p className="text-[10px] text-gray-500 italic line-clamp-1">"{myMood.note}"</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Partner Mood */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-lavender-50/60 dark:bg-lavender-950/30 p-3 rounded-2xl border border-lavender-200/50 dark:border-lavender-900/30"
          >
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {partnerProfile?.display_name || 'Người ấy'}:
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl animate-pulse">{partnerMood ? partnerMood.mood : '❓'}</span>
              <div>
                <p className="text-xs font-semibold text-charcoal-800 dark:text-cream-50">
                  {partnerMood ? MOOD_OPTIONS.find((m) => m.emoji === partnerMood.mood)?.label : 'Chưa cập nhật'}
                </p>
                {partnerMood?.note && (
                  <p className="text-[10px] text-gray-500 italic line-clamp-1">"{partnerMood.note}"</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </Card>

      {/* Quick Love Message Actions with Pop Bounce Physics */}
      <Card className="space-y-3">
        <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Send className="w-4 h-4 text-rose-400" /> Tương tác nhanh
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleSendQuickMessage('miss_you', 'Nhớ cậu 🫶')}
            disabled={quickMsgCooldown}
            className="flex flex-col items-center justify-center p-3 bg-white dark:bg-charcoal-800 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-soft-sm hover:border-rose-300 transition-all min-h-[64px]"
          >
            <span className="text-2xl mb-1">🫶</span>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Nhớ cậu</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleSendQuickMessage('love_you', 'Yêu cậu ❤️')}
            disabled={quickMsgCooldown}
            className="flex flex-col items-center justify-center p-3 bg-white dark:bg-charcoal-800 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-soft-sm hover:border-rose-300 transition-all min-h-[64px]"
          >
            <span className="text-2xl mb-1">❤️</span>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Yêu cậu</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleSendQuickMessage('hug', 'Ôm một cái 🫂')}
            disabled={quickMsgCooldown}
            className="flex flex-col items-center justify-center p-3 bg-white dark:bg-charcoal-800 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-soft-sm hover:border-rose-300 transition-all min-h-[64px]"
          >
            <span className="text-2xl mb-1">🫂</span>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Ôm một cái</span>
          </motion.button>
        </div>
      </Card>

      {/* Recent Memory Showcase */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-rose-400" /> Kỷ niệm mới nhất
          </h3>
          <Link href="/memories" className="text-xs text-rose-500 font-medium hover:underline flex items-center gap-0.5">
            Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentMemory ? (
          <Link href="/memories" className="block group">
            <div className="relative h-44 rounded-2xl overflow-hidden shadow-soft-sm">
              <img
                src={recentMemory.image_url}
                alt={recentMemory.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                <span className="text-[10px] text-rose-200">{formatDateVietnamese(recentMemory.memory_date)}</span>
                <h4 className="text-sm font-bold line-clamp-1">{recentMemory.title}</h4>
              </div>
            </div>
          </Link>
        ) : (
          <div className="text-center py-6 border border-dashed border-rose-200 dark:border-rose-900/30 rounded-2xl">
            <p className="text-xs text-gray-400">Chưa có kỷ niệm nào.</p>
            <Link href="/memories" className="inline-block mt-2 text-xs font-medium text-rose-500 hover:underline">
              + Thêm khoảnh khắc đầu tiên ❤️
            </Link>
          </div>
        )}
      </Card>

      {/* Time Capsule Preview */}
      {upcomingCapsule && (
        <Card className="p-4 space-y-2 bg-gradient-to-r from-lavender-100/70 to-rose-100/70 dark:from-lavender-950/40 dark:to-rose-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                Thư gửi tương lai
              </span>
            </div>
            <Link href="/time-capsule" className="text-xs text-purple-600 dark:text-purple-300 font-medium hover:underline">
              Chi tiết
            </Link>
          </div>
          <p className="text-sm font-semibold text-charcoal-800 dark:text-cream-50">
            "{upcomingCapsule.title}"
          </p>
          <p className="text-[11px] text-gray-500">
            Mở lúc: {formatDateVietnamese(upcomingCapsule.unlock_at.split('T')[0])}
          </p>
        </Card>
      )}

      {/* Daily Mood Selection Modal with Spring Animation */}
      <Modal
        isOpen={isMoodModalOpen}
        onClose={() => setIsMoodModalOpen(false)}
        title="Hôm nay bạn cảm thấy thế nào?"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {MOOD_OPTIONS.map((item) => (
              <motion.button
                key={item.emoji}
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                onClick={() => setSelectedEmoji(item.emoji)}
                className={`p-3 rounded-2xl flex flex-col items-center justify-center border transition-all ${
                  selectedEmoji === item.emoji
                    ? 'bg-rose-100 border-rose-400 dark:bg-rose-950 dark:border-rose-500 scale-105 shadow-soft-sm'
                    : 'bg-white dark:bg-charcoal-800 border-gray-100 dark:border-gray-800'
                }`}
              >
                <span className="text-3xl">{item.emoji}</span>
                <span className="text-[11px] mt-1 font-medium text-gray-600 dark:text-gray-300">
                  {item.label}
                </span>
              </motion.button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Ghi chú ngắn (tùy chọn)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Hôm nay hơi mệt / Nhớ cậu"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
            />
          </div>

          <Button onClick={handleSaveMood} className="w-full" isLoading={savingMood}>
            Lưu tâm trạng ❤️
          </Button>
        </div>
      </Modal>
    </div>
  );
}
