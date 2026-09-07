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
  Settings,
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

  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
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
      // Fetch Recent Memories (up to 3 for carousel)
      const { data: memoryData } = await supabase
        .from('memories')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false })
        .limit(3);

      setRecentMemories(memoryData || []);

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
        <Heart className="w-10 h-10 text-[#E86D91] animate-bounce fill-[#FCE7EF]" />
        <p className="text-xs text-[#81727B]">Đang chuẩn bị thế giới nhỏ...</p>
      </div>
    );
  }

  const daysTogether = getDaysTogether(couple?.start_date);
  const loveDuration = calculateLoveDuration(couple?.start_date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-[760px] mx-auto space-y-5 py-2 px-3 sm:px-4"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-[#302830]/90 text-white text-xs font-semibold rounded-full shadow-soft-lg backdrop-blur-md flex items-center gap-2 border border-white/20"
          >
            <Heart className="w-4 h-4 text-[#E86D91] fill-[#E86D91] animate-bounce" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER SECTION */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          {/* Overlapping Avatars */}
          <div className="relative flex -space-x-3.5">
            {/* User Avatar */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-[46px] h-[46px] rounded-full border-2 border-white dark:border-charcoal-800 bg-[#FCE7EF] overflow-hidden flex items-center justify-center font-bold text-[#E86D91] shadow-soft-sm z-10 shrink-0"
            >
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Me" className="w-full h-full object-cover" />
              ) : (
                userProfile?.display_name?.charAt(0).toUpperCase() || 'U'
              )}
            </motion.div>

            {/* Partner Avatar with Online Indicator Ring */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-[46px] h-[46px] rounded-full border-2 border-white dark:border-charcoal-800 bg-lavender-200 overflow-hidden flex items-center justify-center font-bold text-purple-600 shadow-soft-sm ring-2 ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-offset-charcoal-900 z-20 shrink-0"
            >
              {partnerProfile?.avatar_url ? (
                <img src={partnerProfile.avatar_url} alt="Partner" className="w-full h-full object-cover" />
              ) : (
                partnerProfile?.display_name?.charAt(0).toUpperCase() || 'P'
              )}
            </motion.div>
          </div>

          <div>
            <h2 className="text-[18px] font-semibold text-[#302830] dark:text-cream-50 leading-snug">
              {couple?.name || 'Thế Giới Của Hai Ta'}
            </h2>
            <p className="text-[12px] text-[#81727B] dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
              <span>{partnerProfile ? `Cùng với ${partnerProfile.display_name}` : 'Đang chờ người ấy kết nối...'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </p>
          </div>
        </div>

        {/* Circular Glass Action Button */}
        <Link
          href="/profile"
          className="w-9.5 h-9.5 rounded-full bg-white/80 dark:bg-charcoal-800/80 border border-[rgba(232,109,145,0.18)] shadow-soft-sm text-[#E86D91] flex items-center justify-center active:scale-95 transition-transform"
        >
          <Sparkles className="w-4.5 h-4.5" />
        </Link>
      </div>

      {/* 2. LOVE COUNTER (HERO SECTION) */}
      <div className="bg-gradient-to-br from-[#FFF7FA] via-[#FFF2F4] to-[#FFF9F5] dark:from-charcoal-800/90 dark:via-rose-950/40 dark:to-charcoal-900/90 rounded-[24px] p-6 text-center relative overflow-hidden border border-[rgba(232,109,145,0.18)] shadow-[0_8px_30px_rgba(232,109,145,0.08)]">
        {/* Soft Decorative Background Heart */}
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <Heart className="w-48 h-48 fill-[#E86D91] text-[#E86D91]" />
        </div>

        <div className="relative z-10 py-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A6672] dark:text-rose-200/80 mb-2 flex items-center justify-center gap-2">
            <Heart className="w-4 h-4 fill-[#E86D91] text-[#E86D91] animate-pulse-soft" /> CHÚNG TA ĐÃ BÊN NHAU
          </p>

          <div className="text-[46px] sm:text-[52px] font-extrabold tracking-tight my-1 text-[#2F2730] dark:text-cream-50 leading-none">
            {daysTogether} <span className="text-2xl sm:text-3xl font-bold text-[#E86D91]">ngày</span>
          </div>

          <div className="mt-3">
            <span className="bg-[#FCE7EF] dark:bg-rose-950/60 text-[#E86D91] dark:text-rose-300 font-medium text-[12px] px-4 py-1.5 rounded-full border border-[rgba(232,109,145,0.2)] inline-block shadow-none">
              {loveDuration.years > 0 ? `${loveDuration.years} năm • ` : ''}
              {loveDuration.months} tháng • {loveDuration.days} ngày
            </span>
          </div>
        </div>
      </div>

      {/* 3. MOOD CARD ("Hôm nay thế nào?") */}
      <Card className="p-4.5 space-y-3.5 border border-[rgba(232,109,145,0.12)] rounded-[24px]">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#302830] dark:text-cream-50 flex items-center gap-2">
            <Smile className="w-4.5 h-4.5 text-[#E86D91]" /> Hôm nay thế nào?
          </h3>
          <button
            onClick={() => setIsMoodModalOpen(true)}
            className="text-xs text-[#E86D91] font-semibold hover:underline px-1 py-0.5"
          >
            {myMood ? 'Đổi tâm trạng' : '+ Chọn tâm trạng'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* My Mood Mini Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-[#FFF8FA] dark:bg-rose-950/20 p-3.5 rounded-[20px] border border-[rgba(232,109,145,0.12)] shadow-soft-sm flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-[#FCE7EF] overflow-hidden shrink-0 border border-rose-200 flex items-center justify-center text-xs font-bold text-[#E86D91]">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Me" className="w-full h-full object-cover" />
              ) : (
                'Bạn'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xl leading-none">{myMood ? myMood.mood : '❓'}</span>
                <span className="text-xs font-bold text-[#302830] dark:text-cream-50 truncate">
                  {myMood ? MOOD_OPTIONS.find((m) => m.emoji === myMood.mood)?.label : 'Chưa cập nhật'}
                </span>
              </div>
              <p className="text-[11px] text-[#81727B] dark:text-gray-400 mt-0.5 truncate">
                {myMood?.note ? `"${myMood.note}"` : 'Bạn'}
              </p>
            </div>
          </motion.div>

          {/* Partner Mood Mini Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-[#FAF8FF] dark:bg-lavender-950/20 p-3.5 rounded-[20px] border border-lavender-200/50 dark:border-lavender-900/30 shadow-soft-sm flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-lavender-200 overflow-hidden shrink-0 border border-purple-200 flex items-center justify-center text-xs font-bold text-purple-600">
              {partnerProfile?.avatar_url ? (
                <img src={partnerProfile.avatar_url} alt="Partner" className="w-full h-full object-cover" />
              ) : (
                'P'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xl leading-none">{partnerMood ? partnerMood.mood : '❓'}</span>
                <span className="text-xs font-bold text-[#302830] dark:text-cream-50 truncate">
                  {partnerMood ? MOOD_OPTIONS.find((m) => m.emoji === partnerMood.mood)?.label : 'Chưa cập nhật'}
                </span>
              </div>
              <p className="text-[11px] text-[#81727B] dark:text-gray-400 mt-0.5 truncate">
                {partnerMood?.note ? `"${partnerMood.note}"` : partnerProfile?.display_name || 'Người ấy'}
              </p>
            </div>
          </motion.div>
        </div>
      </Card>

      {/* 4. QUICK ACTION CARDS ("Nhớ cậu", "Yêu cậu", "Ôm một cái") */}
      <Card className="p-4.5 space-y-3.5 border border-[rgba(232,109,145,0.12)] rounded-[24px]">
        <h3 className="text-[15px] font-bold text-[#302830] dark:text-cream-50 flex items-center gap-2">
          <Send className="w-4.5 h-4.5 text-[#E86D91]" /> Gửi yêu thương
        </h3>

        <div className="grid grid-cols-3 gap-2.5">
          {/* Action 1: Nhớ cậu */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => handleSendQuickMessage('miss_you', 'Nhớ cậu 🫶')}
            disabled={quickMsgCooldown}
            className="flex flex-col items-center justify-center p-3 bg-[#FFFDF7] dark:bg-amber-950/20 rounded-[20px] border border-amber-100/70 dark:border-amber-900/30 shadow-soft-sm hover:border-amber-200 transition-all min-h-[90px]"
          >
            <div className="w-11 h-11 rounded-full bg-[#FFF4E5] text-[#D97706] flex items-center justify-center text-xl mb-1 shadow-soft-sm">
              🫶
            </div>
            <span className="text-xs font-bold text-[#302830] dark:text-amber-200">Nhớ cậu</span>
          </motion.button>

          {/* Action 2: Yêu cậu */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => handleSendQuickMessage('love_you', 'Yêu cậu ❤️')}
            disabled={quickMsgCooldown}
            className="flex flex-col items-center justify-center p-3 bg-[#FFF7FA] dark:bg-rose-950/20 rounded-[20px] border border-rose-100/70 dark:border-rose-900/30 shadow-soft-sm hover:border-rose-200 transition-all min-h-[90px]"
          >
            <div className="w-11 h-11 rounded-full bg-[#FCE7EF] text-[#E86D91] flex items-center justify-center text-xl mb-1 shadow-soft-sm">
              ❤️
            </div>
            <span className="text-xs font-bold text-[#302830] dark:text-rose-200">Yêu cậu</span>
          </motion.button>

          {/* Action 3: Ôm một cái */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => handleSendQuickMessage('hug', 'Ôm một cái 🫂')}
            disabled={quickMsgCooldown}
            className="flex flex-col items-center justify-center p-3 bg-[#FAF9FF] dark:bg-purple-950/20 rounded-[20px] border border-purple-100/70 dark:border-purple-900/30 shadow-soft-sm hover:border-purple-200 transition-all min-h-[90px]"
          >
            <div className="w-11 h-11 rounded-full bg-[#F0EEFF] text-[#7C3AED] flex items-center justify-center text-xl mb-1 shadow-soft-sm">
              🫂
            </div>
            <span className="text-xs font-bold text-[#302830] dark:text-purple-200">Ôm một cái</span>
          </motion.button>
        </div>
      </Card>

      {/* 5. RECENT MEMORIES SHOWCASE */}
      <Card className="p-4.5 space-y-3.5 border border-[rgba(232,109,145,0.12)] rounded-[24px]">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#302830] dark:text-cream-50 flex items-center gap-2">
            <ImageIcon className="w-4.5 h-4.5 text-[#E86D91]" /> Kỷ niệm gần đây
          </h3>
          <Link
            href="/memories"
            className="text-xs text-[#E86D91] font-semibold hover:underline flex items-center gap-0.5"
          >
            Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentMemories.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-none">
            {recentMemories.map((mem) => (
              <Link
                key={mem.id}
                href="/memories"
                className="block group snap-start shrink-0 w-full sm:w-[85%]"
              >
                <div className="relative aspect-[16/10] rounded-[20px] overflow-hidden shadow-soft-sm border border-[rgba(232,109,145,0.12)]">
                  <img
                    src={mem.image_url}
                    alt={mem.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                    <span className="text-[11px] text-rose-200 font-medium">
                      {formatDateVietnamese(mem.memory_date)}
                    </span>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{mem.title}</h4>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-rose-200 dark:border-rose-900/30 rounded-[20px]">
            <p className="text-xs text-[#81727B]">Chưa có kỷ niệm nào.</p>
            <Link
              href="/memories"
              className="inline-block mt-2 text-xs font-semibold text-[#E86D91] hover:underline"
            >
              + Thêm khoảnh khắc đầu tiên ❤️
            </Link>
          </div>
        )}
      </Card>

      {/* 6. TIME CAPSULE PREVIEW */}
      {upcomingCapsule && (
        <Card className="p-4 space-y-2 bg-gradient-to-r from-purple-50/80 to-rose-50/80 dark:from-purple-950/30 dark:to-rose-950/30 border border-purple-100/60 dark:border-purple-900/30 rounded-[20px] shadow-soft-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                Thư gửi tương lai
              </span>
            </div>
            <Link href="/time-capsule" className="text-xs text-purple-600 dark:text-purple-300 font-semibold hover:underline">
              Chi tiết
            </Link>
          </div>
          <p className="text-sm font-bold text-[#302830] dark:text-cream-50">
            "{upcomingCapsule.title}"
          </p>
          <p className="text-[11px] text-[#81727B]">
            Mở lúc: {formatDateVietnamese(upcomingCapsule.unlock_at.split('T')[0])}
          </p>
        </Card>
      )}

      {/* Daily Mood Selection Modal */}
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
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                onClick={() => setSelectedEmoji(item.emoji)}
                className={`p-3.5 rounded-[20px] flex flex-col items-center justify-center border transition-all ${
                  selectedEmoji === item.emoji
                    ? 'bg-[#FCE7EF] border-[#E86D91] dark:bg-rose-950 dark:border-rose-500 scale-105 shadow-soft-sm'
                    : 'bg-white dark:bg-charcoal-800 border-gray-100 dark:border-gray-800'
                }`}
              >
                <span className="text-3xl">{item.emoji}</span>
                <span className="text-[11px] mt-1.5 font-medium text-[#302830] dark:text-gray-300">
                  {item.label}
                </span>
              </motion.button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#81727B] dark:text-gray-400 mb-1">
              Ghi chú ngắn (tùy chọn)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Hôm nay hơi mệt / Nhớ cậu"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-[#302830] dark:text-cream-50"
            />
          </div>

          <Button onClick={handleSaveMood} className="w-full bg-[#E86D91] hover:bg-rose-600 text-white" isLoading={savingMood}>
            Lưu tâm trạng ❤️
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
}
