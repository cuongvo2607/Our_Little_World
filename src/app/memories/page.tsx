'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MemoryImage } from '@/components/ui/MemoryImage';
import { batchResolveStorageUrls } from '@/lib/storage';
import { validateImageFile, compressImage } from '@/lib/image';
import { formatDateVietnamese } from '@/lib/utils';
import { Memory } from '@/types';
import {
  Plus,
  LayoutGrid,
  Square,
  Upload,
  Calendar,
  X,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MemoriesPage() {
  const [memories, setMemories] = useState<(Memory & { signed_url?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'card'>('grid');

  // Add Memory Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Detail view modal
  const [selectedMemory, setSelectedMemory] = useState<(Memory & { signed_url?: string }) | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
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
        .from('memories')
        .select('*')
        .eq('couple_id', member.couple_id)
        .order('memory_date', { ascending: false });

      if (error) throw error;

      // Transform signed URLs in parallel if bucket is private
      if (data) {
        const withUrls = await batchResolveStorageUrls(supabase, data);
        setMemories(withUrls);
      }
    } catch (err) {
      console.error('Error fetching memories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Vui lòng chọn 1 tấm ảnh kỷ niệm');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .single();

      if (!member) return;

      // 1. Compress image before uploading
      const compressedBlob = await compressImage(selectedFile);
      const fileExt = selectedFile.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `couples/${member.couple_id}/${fileName}`;

      // 2. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('couple-memories')
        .upload(filePath, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 3. Create DB Record
      const { error: dbError } = await supabase.from('memories').insert({
        couple_id: member.couple_id,
        created_by: user.id,
        title,
        description,
        memory_date: memoryDate,
        image_url: filePath,
      });

      if (dbError) throw dbError;

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setImagePreview(null);
      setIsAddModalOpen(false);
      fetchMemories();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu kỷ niệm');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMemory = async (memory: Memory) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kỷ niệm này?')) return;
    try {
      // Remove storage image
      if (memory.image_url.startsWith('couples/')) {
        await supabase.storage.from('couple-memories').remove([memory.image_url]);
      }
      // Remove DB row
      await supabase.from('memories').delete().eq('id', memory.id);
      setSelectedMemory(null);
      fetchMemories();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-charcoal-800 dark:text-cream-50 flex items-center gap-2">
            Kỷ Niệm Của Chúng Ta <Sparkles className="w-5 h-5 text-rose-400" />
          </h1>
          <p className="text-xs text-gray-500">Lưu giữ từng khoảnh khắc đáng nhớ</p>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex bg-rose-50 dark:bg-rose-950/40 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center ${
                viewMode === 'grid' ? 'bg-white dark:bg-charcoal-800 text-rose-600 shadow-soft-sm' : 'text-gray-400'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center ${
                viewMode === 'card' ? 'bg-white dark:bg-charcoal-800 text-rose-600 shadow-soft-sm' : 'text-gray-400'
              }`}
            >
              <Square className="w-4 h-4" />
            </button>
          </div>

          <Button onClick={() => setIsAddModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Thêm
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-xs text-gray-400">Đang tải kho ảnh kỷ niệm...</p>
        </div>
      ) : memories.length === 0 ? (
        /* Empty State */
        <Card className="text-center py-12 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-semibold text-charcoal-800 dark:text-cream-50">
            Chưa có kỷ niệm nào
          </h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Hãy thêm khoảnh khắc đáng nhớ đầu tiên của hai bạn nhé ❤️
          </p>
          <Button onClick={() => setIsAddModalOpen(true)} size="sm">
            + Thêm kỷ niệm đầu tiên
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid Gallery View with Stagger Animation */
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.06 },
            },
          }}
          className="grid grid-cols-2 gap-3"
        >
          {memories.map((mem, index) => (
            <motion.div
              key={mem.id}
              variants={{
                hidden: { opacity: 0, y: 15, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1 },
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedMemory(mem)}
              className="relative h-44 rounded-2xl overflow-hidden glass-card cursor-pointer group shadow-soft-sm hover:shadow-soft-lg transition-all"
            >
              <MemoryImage
                src={mem.signed_url || mem.image_url}
                alt={mem.title}
                priority={index < 2}
                aspectRatio="h-full w-full"
              />
              <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/75 via-transparent to-transparent flex flex-col justify-end p-2.5 text-white">
                <span className="text-[10px] text-rose-200">{formatDateVietnamese(mem.memory_date)}</span>
                <h4 className="text-xs font-bold line-clamp-1">{mem.title}</h4>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        /* Card Timeline View */
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
          className="space-y-4"
        >
          {memories.map((mem, index) => (
            <motion.div
              key={mem.id}
              variants={{
                hidden: { opacity: 0, y: 15 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <Card
                onClick={() => setSelectedMemory(mem)}
                className="cursor-pointer space-y-3 hover:border-rose-300 transition-colors"
              >
                <div className="rounded-2xl overflow-hidden">
                  <MemoryImage
                    src={mem.signed_url || mem.image_url}
                    alt={mem.title}
                    priority={index === 0}
                    aspectRatio="aspect-[16/9]"
                  />
                </div>
                <div>
                  <span className="text-xs text-rose-500 font-medium">
                    {formatDateVietnamese(mem.memory_date)}
                  </span>
                  <h3 className="text-base font-bold text-charcoal-800 dark:text-cream-50">
                    {mem.title}
                  </h3>
                  {mem.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{mem.description}</p>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add Memory Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Kỷ Niệm Mới ❤️"
      >
        <form onSubmit={handleCreateMemory} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Ảnh kỷ niệm
            </label>
            {imagePreview ? (
              <div className="relative h-44 rounded-2xl overflow-hidden group">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-rose-200 dark:border-rose-900/40 rounded-2xl cursor-pointer hover:bg-rose-50/50 transition-colors">
                <Upload className="w-8 h-8 text-rose-400 mb-1" />
                <span className="text-xs font-medium text-rose-500">Bấm để tải ảnh lên</span>
                <span className="text-[10px] text-gray-400 mt-0.5">JPEG, PNG, WEBP tối đa 10MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Tiêu đề
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Chuyến đi Đà Lạt đầu tiên 🌲"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Ngày kỷ niệm
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="date"
                required
                value={memoryDate}
                onChange={(e) => setMemoryDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Ghi chú / Cảm xúc
            </label>
            <textarea
              rows={3}
              placeholder="Viết vài dòng cảm nhận..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50 resize-none"
            />
          </div>

          <Button type="submit" className="w-full" isLoading={uploading}>
            Lưu khoảnh khắc ❤️
          </Button>
        </form>
      </Modal>

      {/* Memory Detail Fullscreen View Modal */}
      {selectedMemory && (
        <Modal
          isOpen={!!selectedMemory}
          onClose={() => setSelectedMemory(null)}
          title={selectedMemory.title}
        >
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden max-h-[60vh]">
              <img
                src={selectedMemory.signed_url || selectedMemory.image_url}
                alt={selectedMemory.title}
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <p className="text-xs text-rose-500 font-medium">
                📅 {formatDateVietnamese(selectedMemory.memory_date)}
              </p>
              {selectedMemory.description && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 leading-relaxed whitespace-pre-wrap">
                  {selectedMemory.description}
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteMemory(selectedMemory)}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Xóa kỷ niệm
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
