'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDateVietnamese } from '@/lib/utils';
import { TimelineEvent } from '@/types';
import { Plus, Calendar, Sparkles, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: member } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .single();

      if (!member) return;

      const { data, error } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('couple_id', member.couple_id)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
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

      const { error } = await supabase.from('timeline_events').insert({
        couple_id: member.couple_id,
        created_by: user.id,
        title,
        description,
        event_date: eventDate,
      });

      if (error) throw error;

      setTitle('');
      setDescription('');
      setIsAddModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo sự kiện');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-charcoal-800 dark:text-cream-50 flex items-center gap-2">
            Hành Trình Tình Yêu <Calendar className="w-5 h-5 text-rose-400" />
          </h1>
          <p className="text-xs text-gray-500">Cột mốc thời gian đáng nhớ của hai ta</p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Thêm
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-xs text-gray-400">Đang tải hành trình...</p>
        </div>
      ) : events.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-400">
            <Heart className="w-7 h-7 fill-rose-300" />
          </div>
          <h3 className="text-sm font-semibold text-charcoal-800 dark:text-cream-50">
            Chưa có cột mốc nào
          </h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Câu chuyện của hai bạn đang chờ được viết. Hãy ghi lại ngày quen nhau nhé ❤️
          </p>
          <Button onClick={() => setIsAddModalOpen(true)} size="sm">
            + Thêm cột mốc đầu tiên
          </Button>
        </Card>
      ) : (
        /* Timeline Tree Container */
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.08 },
            },
          }}
          className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-rose-200 dark:before:bg-rose-900/40"
        >
          {events.map((evt) => (
            <motion.div
              key={evt.id}
              variants={{
                hidden: { opacity: 0, x: -15 },
                show: { opacity: 1, x: 0 },
              }}
              className="relative"
            >
              {/* Timeline Dot Marker */}
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-rose-400 border-2 border-white dark:border-charcoal-900 shadow-soft-sm flex items-center justify-center animate-pulse-soft">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              <Card className="p-4 space-y-1.5 hover:border-rose-300 transition-colors">
                <span className="text-xs font-semibold text-rose-500">
                  {formatDateVietnamese(evt.event_date)}
                </span>
                <h3 className="text-base font-bold text-charcoal-800 dark:text-cream-50">
                  {evt.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {evt.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add Event Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Cột Mốc Thời Gian ✨"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Tên cột mốc
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Ngày đầu tiên gặp nhau / Lần đầu đi du lịch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Thời gian
            </label>
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Mô tả chi tiết
            </label>
            <textarea
              rows={3}
              required
              placeholder="Chia sẻ kỷ niệm đẹp lúc đó..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50 resize-none"
            />
          </div>

          <Button type="submit" className="w-full" isLoading={saving}>
            Lưu cột mốc ❤️
          </Button>
        </form>
      </Modal>
    </div>
  );
}
