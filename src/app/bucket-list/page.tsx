'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { BucketItem } from '@/types';
import { CheckCircle2, Circle, Plus, Trash2, Check, ListTodo } from 'lucide-react';
import { triggerHeartConfetti, formatDateVietnamese } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function BucketListPage() {
  const [items, setItems] = useState<BucketItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'todo' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchBucketList();
  }, []);

  const fetchBucketList = async () => {
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
        .from('bucket_list')
        .select('*')
        .eq('couple_id', member.couple_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBucketItem = async (e: React.FormEvent) => {
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

      const { error } = await supabase.from('bucket_list').insert({
        couple_id: member.couple_id,
        created_by: user.id,
        title,
        description: description || null,
      });

      if (error) throw error;

      setTitle('');
      setDescription('');
      setIsAddModalOpen(false);
      fetchBucketList();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi thêm mục tiêu');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCompleted = async (item: BucketItem) => {
    const nextCompletedState = !item.is_completed;
    if (nextCompletedState) {
      triggerHeartConfetti();
    }

    try {
      const { error } = await supabase
        .from('bucket_list')
        .update({
          is_completed: nextCompletedState,
          completed_at: nextCompletedState ? new Date().toISOString() : null,
        })
        .eq('id', item.id);

      if (error) throw error;
      fetchBucketList();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mục tiêu này?')) return;
    try {
      await supabase.from('bucket_list').delete().eq('id', id);
      fetchBucketList();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = items.filter((i) => {
    if (filter === 'todo') return !i.is_completed;
    if (filter === 'completed') return i.is_completed;
    return true;
  });

  return (
    <div className="space-y-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-charcoal-800 dark:text-cream-50 flex items-center gap-2">
            Danh Sách Mơ Ước <ListTodo className="w-5 h-5 text-rose-400" />
          </h1>
          <p className="text-xs text-gray-500">Những điều hai ta muốn cùng làm</p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Thêm
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-rose-50 dark:bg-rose-950/40 p-1 rounded-2xl">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
            filter === 'all'
              ? 'bg-white dark:bg-charcoal-800 text-rose-600 shadow-soft-sm'
              : 'text-gray-500'
          }`}
        >
          Tất cả ({items.length})
        </button>
        <button
          onClick={() => setFilter('todo')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
            filter === 'todo'
              ? 'bg-white dark:bg-charcoal-800 text-rose-600 shadow-soft-sm'
              : 'text-gray-500'
          }`}
        >
          Dự định ({items.filter((i) => !i.is_completed).length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
            filter === 'completed'
              ? 'bg-white dark:bg-charcoal-800 text-rose-600 shadow-soft-sm'
              : 'text-gray-500'
          }`}
        >
          Đã xong ({items.filter((i) => i.is_completed).length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-xs text-gray-400">Đang tải dự định...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <p className="text-xs text-gray-400">
            Hai bạn chưa có dự định nào trong danh mục này.
          </p>
          <Button onClick={() => setIsAddModalOpen(true)} size="sm">
            + Thêm ý tưởng mới ❤️
          </Button>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`flex items-start justify-between p-3.5 transition-all ${
                item.is_completed
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50 opacity-80'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3 flex-1 pr-2">
                <button
                  onClick={() => handleToggleCompleted(item)}
                  className="mt-0.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-rose-500 hover:scale-110 transition-transform"
                >
                  {item.is_completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                <div>
                  <h3
                    className={`text-sm font-semibold text-charcoal-800 dark:text-cream-50 ${
                      item.is_completed ? 'line-through text-gray-400' : ''
                    }`}
                  >
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                  )}
                  {item.is_completed && item.completed_at && (
                    <p className="text-[10px] text-emerald-600 font-medium mt-1">
                      ✓ Hoàn thành ngày {formatDateVietnamese(item.completed_at.split('T')[0])}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDeleteItem(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Add Bucket Item Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Dự Định Mới 🎯"
      >
        <form onSubmit={handleCreateBucketItem} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Dự định / Việc muốn làm cùng nhau
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Đi Đà Lạt, Ngắm hoàng hôn trên biển..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Ghi chú thêm (tùy chọn)
            </label>
            <textarea
              rows={2}
              placeholder="Địa điểm, chi tiết hoặc lý do thích..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50 resize-none"
            />
          </div>

          <Button type="submit" className="w-full" isLoading={saving}>
            Lưu dự định ❤️
          </Button>
        </form>
      </Modal>
    </div>
  );
}
