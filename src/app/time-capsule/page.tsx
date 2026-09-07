'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDateVietnamese, triggerHeartConfetti } from '@/lib/utils';
import { TimeCapsule } from '@/types';
import { Lock, Unlock, Plus, Clock, Sparkles } from 'lucide-react';
import { differenceInDays, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';

export default function TimeCapsulePage() {
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [unlockAt, setUnlockAt] = useState('');
  const [saving, setSaving] = useState(false);

  const [openedCapsule, setOpenedCapsule] = useState<TimeCapsule | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchCapsules();
  }, []);

  const fetchCapsules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/time-capsule');
      const json = await res.json();
      if (json.data) {
        setCapsules(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCapsule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .single();

      if (!member) return;

      const { error } = await supabase.from('time_capsules').insert({
        couple_id: member.couple_id,
        created_by: user.id,
        title,
        message,
        unlock_at: new Date(unlockAt).toISOString(),
      });

      if (error) throw error;

      setTitle('');
      setMessage('');
      setUnlockAt('');
      setIsAddModalOpen(false);
      fetchCapsules();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo hòm thư tương lai');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCapsule = async (capsule: TimeCapsule) => {
    if (capsule.is_locked) return;

    triggerHeartConfetti();
    setOpenedCapsule(capsule);

    // Update opened_at if first time opening
    if (!capsule.opened_at) {
      await supabase
        .from('time_capsules')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', capsule.id);
    }
  };

  const getCountdownString = (unlockAtStr: string) => {
    const target = parseISO(unlockAtStr);
    const now = new Date();
    if (now >= target) return 'Đã đến thời gian mở! ❤️';

    const days = differenceInDays(target, now);
    if (days > 0) return `Còn ${days} ngày nữa`;

    const hours = differenceInHours(target, now);
    if (hours > 0) return `Còn ${hours} giờ nữa`;

    const mins = differenceInMinutes(target, now);
    return `Còn ${mins} phút nữa`;
  };

  return (
    <div className="space-y-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-charcoal-800 dark:text-cream-50 flex items-center gap-2">
            Hòm Thư Tương Lai <Clock className="w-5 h-5 text-purple-400" />
          </h1>
          <p className="text-xs text-gray-500">Gửi thư tới tương lai cho người ấy</p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Viết thư
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-xs text-gray-400">Đang tải hòm thư...</p>
        </div>
      ) : capsules.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-400">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-semibold text-charcoal-800 dark:text-cream-50">
            Chưa có thư gửi tương lai nào
          </h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Hãy viết một bức thư ngọt ngào và chọn ngày mở thư trong tương lai nhé ❤️
          </p>
          <Button onClick={() => setIsAddModalOpen(true)} size="sm">
            + Viết thư đầu tiên
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {capsules.map((cap) => (
            <Card
              key={cap.id}
              className={`p-4 space-y-2 transition-all ${
                cap.is_locked
                  ? 'bg-gradient-to-r from-purple-50/60 to-rose-50/60 dark:from-purple-950/30 dark:to-rose-950/30 border-purple-200/60'
                  : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {cap.is_locked ? (
                    <Lock className="w-5 h-5 text-purple-500" />
                  ) : (
                    <Unlock className="w-5 h-5 text-emerald-500" />
                  )}
                  <h3 className="text-sm font-bold text-charcoal-800 dark:text-cream-50">
                    {cap.title}
                  </h3>
                </div>

                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-300">
                  {getCountdownString(cap.unlock_at)}
                </span>
              </div>

              <p className="text-xs text-gray-500">
                Thời gian mở: {formatDateVietnamese(cap.unlock_at.split('T')[0])}
              </p>

              <div className="pt-2 flex justify-end">
                {cap.is_locked ? (
                  <button
                    disabled
                    className="text-xs font-semibold px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-400 rounded-full cursor-not-allowed"
                  >
                    🔒 Đang khóa bảo mật
                  </button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleOpenCapsule(cap)}
                    className="bg-emerald-500 hover:bg-emerald-600 shadow-none text-white"
                  >
                    Mở thư ❤️
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Write Time Capsule Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Viết Thư Cho Tương Lai 💌"
      >
        <form onSubmit={handleCreateCapsule} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Tiêu đề bức thư
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Gửi cậu vào kỷ niệm 1 năm ❤️"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-purple-100 dark:border-purple-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-charcoal-800 dark:text-cream-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Ngày & Giờ mở thư
            </label>
            <input
              type="datetime-local"
              required
              value={unlockAt}
              onChange={(e) => setUnlockAt(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-purple-100 dark:border-purple-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-charcoal-800 dark:text-cream-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Nội dung lá thư bí mật
            </label>
            <textarea
              rows={4}
              required
              placeholder="Nhập nội dung thư... Dữ liệu được bảo mật trên máy chủ cho tới ngày mở!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-purple-100 dark:border-purple-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-charcoal-800 dark:text-cream-50 resize-none"
            />
          </div>

          <Button type="submit" className="w-full" isLoading={saving}>
            Khóa hòm thư tương lai 🔒
          </Button>
        </form>
      </Modal>

      {/* View Opened Time Capsule Modal */}
      {openedCapsule && (
        <Modal
          isOpen={!!openedCapsule}
          onClose={() => setOpenedCapsule(null)}
          title={openedCapsule.title}
        >
          <div className="space-y-3 py-2">
            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/40 rounded-2xl border border-rose-200/50">
              <p className="text-sm text-charcoal-800 dark:text-cream-50 leading-relaxed whitespace-pre-wrap">
                {openedCapsule.message}
              </p>
            </div>
            <p className="text-[11px] text-gray-400 text-right">
              Mở vào {formatDateVietnamese(new Date().toISOString().split('T')[0])} ❤️
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
