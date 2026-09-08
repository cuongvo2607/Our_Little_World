'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useCouple } from '@/context/CoupleContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MemoryMediaGallery, MemoryMediaViewer } from '@/components/ui/MemoryMediaGallery';
import {
  createMemoryStoragePath,
  fetchMemoriesWithOptionalRelations,
  formatViewedAtTime,
  getReadableFileSize,
  getUploadBody,
  MAX_MEMORY_IMAGE_BYTES,
  MAX_MEMORY_VIDEO_BYTES,
  MEMORY_MEDIA_BUCKET,
  MemoryWithMedia,
  readMediaMetadata,
  SelectedMemoryMedia,
  validateMemoryMediaFile,
} from '@/lib/memoryMedia';
import { formatDateVietnamese } from '@/lib/utils';
import { MemoryMedia } from '@/types';
import {
  Calendar,
  CheckCircle2,
  Circle,
  ImagePlus,
  LayoutGrid,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { registerUserActivity } from '@/lib/activity';
import { createPartnerNotification } from '@/lib/notifications';

type UploadPhase = {
  active: boolean;
  message: string;
};

function MemorySeenStatus({
  memory,
  currentUserId,
  partnerName,
  partnerId,
  compact = false,
}: {
  memory: MemoryWithMedia;
  currentUserId?: string;
  partnerName?: string;
  partnerId?: string;
  compact?: boolean;
}) {
  if (!currentUserId || memory.created_by !== currentUserId || !partnerId) return null;

  const partnerView = memory.memory_views?.find((view) => view.viewer_id === partnerId);
  const displayName = partnerName || 'Người ấy';

  if (!partnerView) {
    return (
      <div className={`inline-flex items-center gap-1 text-[11px] font-medium ${compact ? 'text-rose-100/90' : 'text-[#81727B] dark:text-gray-400'}`}>
        <Circle className="w-3 h-3" />
        <span>{compact ? 'Chưa xem' : `${displayName} chưa xem`}</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 text-[11px] font-semibold ${compact ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-300'}`}>
      <CheckCircle2 className="w-3 h-3" />
      <span>
        {compact ? 'Đã xem' : `Đã xem bởi ${displayName}`}
        {partnerView.viewed_at ? ` • ${formatViewedAtTime(partnerView.viewed_at)}` : ''}
      </span>
    </div>
  );
}

export default function MemoriesPage() {
  const { user, partnerProfile } = useCouple();
  const [memories, setMemories] = useState<MemoryWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'card'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMemoryMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>({ active: false, message: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<MemoryWithMedia | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isManageMenuOpen, setIsManageMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const selectedMediaRef = useRef<SelectedMemoryMedia[]>([]);
  const selectedMemoryRef = useRef<MemoryWithMedia | null>(null);
  const recordedViewRef = useRef<Set<string>>(new Set());

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const selectedMemoryMedia = selectedMemory?.media || [];
  const hasSelectedMedia = selectedMedia.length > 0;
  const imageLimitLabel = useMemo(() => getReadableFileSize(MAX_MEMORY_IMAGE_BYTES), []);
  const videoLimitLabel = useMemo(() => getReadableFileSize(MAX_MEMORY_VIDEO_BYTES), []);
  const canManageSelectedMemory = !!selectedMemory && selectedMemory.created_by === user?.id;

  const fetchMemories = useCallback(async () => {
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

      if (!member?.couple_id) return;

      const resolved = await fetchMemoriesWithOptionalRelations(supabase, member.couple_id, {
        orderColumn: 'memory_date',
        includeViews: true,
      });

      setMemories(resolved);

      const openMemory = selectedMemoryRef.current;
      if (openMemory) {
        setSelectedMemory(resolved.find((memory) => memory.id === openMemory.id) || null);
      }
    } catch (err) {
      console.error('Error fetching memories:', err);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribeToMemoryChanges() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .single();

      if (!member?.couple_id) return;

      channel = supabase
        .channel(`memories-page-${member.couple_id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'memories', filter: `couple_id=eq.${member.couple_id}` },
          () => fetchMemories()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'memory_media', filter: `couple_id=eq.${member.couple_id}` },
          () => fetchMemories()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'memory_views', filter: `couple_id=eq.${member.couple_id}` },
          () => fetchMemories()
        )
        .subscribe();
    }

    subscribeToMemoryChanges();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchMemories, supabase]);

  useEffect(() => {
    selectedMediaRef.current = selectedMedia;
  }, [selectedMedia]);

  useEffect(() => {
    selectedMemoryRef.current = selectedMemory;
  }, [selectedMemory]);

  useEffect(() => () => {
    selectedMediaRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  const resetForm = () => {
    selectedMedia.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setTitle('');
    setDescription('');
    setLocation('');
    setMemoryDate(new Date().toISOString().split('T')[0]);
    setSelectedMedia([]);
    setFormError(null);
    setUploadPhase({ active: false, message: '' });
  };

  const handleMediaSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    const nextItems: SelectedMemoryMedia[] = [];

    for (const file of files) {
      const validation = validateMemoryMediaFile(file);
      if (!validation.valid || !validation.mediaType) {
        setFormError(validation.error || 'Không thể chọn tệp này.');
        continue;
      }

      const metadata = await readMediaMetadata(file, validation.mediaType);
      nextItems.push({
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: metadata.previewUrl,
        mediaType: validation.mediaType,
        width: metadata.width,
        height: metadata.height,
        durationSeconds: metadata.durationSeconds,
        status: 'pending',
      });
    }

    if (nextItems.length > 0) {
      setSelectedMedia((items) => [...items, ...nextItems]);
      setFormError(null);
    }
  };

  const removeSelectedMedia = (id: string) => {
    setSelectedMedia((items) => {
      const item = items.find((mediaItem) => mediaItem.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return items.filter((mediaItem) => mediaItem.id !== id);
    });
  };

  const setMediaStatus = (id: string, status: SelectedMemoryMedia['status'], error?: string) => {
    setSelectedMedia((items) => items.map((item) => item.id === id ? { ...item, status, error } : item));
  };

  const handleOpenMemory = useCallback(async (memory: MemoryWithMedia) => {
    setSelectedMemory(memory);
    setIsManageMenuOpen(false);
    setIsDeleteConfirmOpen(false);
    setDeleteError(null);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.id || memory.created_by === authUser.id || recordedViewRef.current.has(memory.id)) return;

    const wasAlreadyViewed = memory.memory_views?.some((view) => view.viewer_id === authUser.id);
    recordedViewRef.current.add(memory.id);
    const { error: rpcError } = await supabase.rpc('record_memory_view', {
      p_memory_id: memory.id,
    });

    if (rpcError) {
      const { error: insertError } = await supabase
        .from('memory_views')
        .upsert(
          { memory_id: memory.id, couple_id: memory.couple_id, viewer_id: authUser.id },
          { onConflict: 'memory_id,viewer_id', ignoreDuplicates: true }
        );

      if (insertError) {
        recordedViewRef.current.delete(memory.id);
        console.error('Error recording memory view:', rpcError, insertError);
        return;
      }
    }

    if (!wasAlreadyViewed) {
      createPartnerNotification(supabase, 'memory_viewed', null, memory.id).catch((notificationError) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Notifications] Memory viewed notification skipped:', notificationError);
        }
      });
    }

    await fetchMemories();
  }, [fetchMemories, supabase]);

  const handleCreateMemory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (uploading) return;

    if (!hasSelectedMedia) {
      setFormError('Hãy chọn ít nhất một ảnh hoặc video cho kỷ niệm này.');
      return;
    }

    setUploading(true);
    setFormError(null);
    setUploadPhase({ active: true, message: 'Đang lưu kỷ niệm... ❤️' });

    const uploadedPaths: string[] = [];
    let createdMemoryId: string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Bạn cần đăng nhập để tạo kỷ niệm.');

      const { data: member } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .single();

      if (!member?.couple_id) throw new Error('Không tìm thấy couple của bạn.');

      const { data: memory, error: memoryError } = await supabase
        .from('memories')
        .insert({
          couple_id: member.couple_id,
          created_by: user.id,
          title,
          description: description || null,
          memory_date: memoryDate,
          location: location || null,
          image_url: null,
        })
        .select('*')
        .single();

      if (memoryError) throw memoryError;
      createdMemoryId = memory.id;

      const mediaRows: Omit<MemoryMedia, 'id' | 'created_at' | 'signed_url'>[] = [];

      for (let index = 0; index < selectedMedia.length; index += 1) {
        const item = selectedMedia[index];
        const label = item.mediaType === 'video' ? `Video ${index + 1}` : `Ảnh ${index + 1}`;
        setUploadPhase({ active: true, message: `Đang tải lên ${label}...` });
        setMediaStatus(item.id, 'uploading');

        const path = createMemoryStoragePath(member.couple_id, memory.id, item.file, item.mediaType);
        const uploadBody = await getUploadBody(item.file, item.mediaType);

        const { error: uploadError } = await supabase.storage
          .from(MEMORY_MEDIA_BUCKET)
          .upload(path, uploadBody.body, {
            contentType: uploadBody.contentType,
            upsert: false,
          });

        if (uploadError) {
          setMediaStatus(item.id, 'error', uploadError.message);
          throw new Error(`Không thể tải ${item.mediaType === 'video' ? 'video' : 'ảnh'} lên.\nThử lại`);
        }

        uploadedPaths.push(path);
        setMediaStatus(item.id, 'done');

        mediaRows.push({
          memory_id: memory.id,
          couple_id: member.couple_id,
          storage_path: path,
          media_type: item.mediaType,
          mime_type: uploadBody.contentType,
          file_size: uploadBody.body.size,
          width: item.width,
          height: item.height,
          duration_seconds: item.durationSeconds,
          sort_order: index,
        });
      }

      const { error: mediaError } = await supabase
        .from('memory_media')
        .insert(mediaRows);

      if (mediaError) throw mediaError;

      await supabase
        .from('memories')
        .update({ image_url: mediaRows[0]?.storage_path || null })
        .eq('id', memory.id);

      await registerUserActivity('memory', memory.id);

      createPartnerNotification(supabase, 'memory_created', null, memory.id).catch((notificationError) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Notifications] Memory notification skipped:', notificationError);
        }
      });

      resetForm();
      setIsAddModalOpen(false);
      await fetchMemories();
    } catch (err: any) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(MEMORY_MEDIA_BUCKET).remove(uploadedPaths);
      }

      if (createdMemoryId) {
        await supabase.from('memories').delete().eq('id', createdMemoryId);
      }

      setFormError(err?.message || 'Không thể lưu kỷ niệm. Thử lại nhé.');
    } finally {
      setUploading(false);
      setUploadPhase({ active: false, message: '' });
    }
  };

  const handleDeleteMemory = async (memory: MemoryWithMedia) => {
    if (memory.created_by !== user?.id) {
      setDeleteError('Chỉ người tạo kỷ niệm mới có thể xóa.');
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      const storagePaths = memory.media.map((item) => item.storage_path).filter(Boolean);
      if (storagePaths.length > 0) {
        await supabase.storage.from(MEMORY_MEDIA_BUCKET).remove(storagePaths);
      } else if (memory.image_url?.startsWith('couples/')) {
        await supabase.storage.from(MEMORY_MEDIA_BUCKET).remove([memory.image_url]);
      }

      const { error } = await supabase.from('memories').delete().eq('id', memory.id);
      if (error) throw error;

      setIsDeleteConfirmOpen(false);
      setIsManageMenuOpen(false);
      setSelectedMemory(null);
      await fetchMemories();
    } catch (err: any) {
      console.error(err);
      setDeleteError(err?.message || 'Không thể xóa kỷ niệm. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 py-2 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-charcoal-800 dark:text-cream-50 flex items-center gap-2">
            Kỷ niệm của chúng ta <Sparkles className="w-5 h-5 text-rose-400" />
          </h1>
          <p className="text-xs text-gray-500">Lưu giữ từng ảnh, từng video đáng nhớ</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex bg-rose-50 dark:bg-rose-950/40 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center ${
                viewMode === 'grid' ? 'bg-white dark:bg-charcoal-800 text-rose-600 shadow-soft-sm' : 'text-gray-400'
              }`}
              aria-label="Xem dạng lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center ${
                viewMode === 'card' ? 'bg-white dark:bg-charcoal-800 text-rose-600 shadow-soft-sm' : 'text-gray-400'
              }`}
              aria-label="Xem dạng card"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>

          <Button onClick={() => setIsAddModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Tạo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-rose-400 mb-2" />
          <p className="text-xs text-gray-400">Đang tải kho kỷ niệm...</p>
        </div>
      ) : memories.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-semibold text-charcoal-800 dark:text-cream-50">
            Chúng mình chưa có kỷ niệm nào
          </h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Hãy lưu lại khoảnh khắc đầu tiên.
          </p>
          <Button onClick={() => setIsAddModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Thêm kỷ niệm đầu tiên
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.06 } },
          }}
          className="grid grid-cols-2 gap-3"
        >
          {memories.map((memory, index) => (
            <motion.button
              type="button"
              key={memory.id}
              variants={{
                hidden: { opacity: 0, y: 15, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1 },
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleOpenMemory(memory)}
              className="relative h-48 rounded-[22px] overflow-hidden glass-card cursor-pointer group shadow-soft-sm hover:shadow-soft-lg transition-all text-left"
            >
              <MemoryMediaGallery media={memory.media} title={memory.title} layout="cover" priority={index < 2} />
              <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/75 via-transparent to-transparent flex flex-col justify-end p-3 text-white pointer-events-none">
                <span className="text-[10px] text-rose-200">{formatDateVietnamese(memory.memory_date)}</span>
                <h4 className="text-xs font-bold line-clamp-1">{memory.title}</h4>
                <MemorySeenStatus
                  memory={memory}
                  currentUserId={user?.id}
                  partnerId={partnerProfile?.id}
                  partnerName={partnerProfile?.display_name}
                  compact
                />
              </div>
            </motion.button>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
          className="space-y-4"
        >
          {memories.map((memory, index) => (
            <motion.div
              key={memory.id}
              variants={{
                hidden: { opacity: 0, y: 15 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <Card
                onClick={() => handleOpenMemory(memory)}
                className="cursor-pointer space-y-3 hover:border-rose-300 transition-colors"
              >
                <MemoryMediaGallery media={memory.media} title={memory.title} priority={index === 0} />
                <div>
                  <span className="text-xs text-rose-500 font-medium">
                    {formatDateVietnamese(memory.memory_date)}
                  </span>
                  <h3 className="text-base font-bold text-charcoal-800 dark:text-cream-50">
                    {memory.title}
                  </h3>
                  {memory.location && (
                    <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400" /> {memory.location}
                    </p>
                  )}
                  {memory.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{memory.description}</p>
                  )}
                  <div className="mt-2">
                    <MemorySeenStatus
                      memory={memory}
                      currentUserId={user?.id}
                      partnerId={partnerProfile?.id}
                      partnerName={partnerProfile?.display_name}
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          if (!uploading) {
            setIsAddModalOpen(false);
            resetForm();
          }
        }}
        title="Tạo kỷ niệm mới"
      >
        <form onSubmit={handleCreateMemory} className="space-y-4 pb-[env(safe-area-inset-bottom)]">
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Tiêu đề
            </span>
            <input
              type="text"
              required
              placeholder="Kỷ niệm đi Đà Lạt ❤️"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Ngày kỷ niệm
              </span>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  required
                  value={memoryDate}
                  onChange={(event) => setMemoryDate(event.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
                />
              </div>
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Địa điểm
              </span>
              <input
                type="text"
                placeholder="Đà Lạt"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Mô tả
            </span>
            <textarea
              rows={3}
              placeholder="Hôm đó vui ghê ❤️"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50 resize-none"
            />
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Ảnh và video</span>
              <span className="text-[10px] text-gray-400">Ảnh {imageLimitLabel}, video {videoLimitLabel}</span>
            </div>

            {selectedMedia.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                {selectedMedia.map((item, index) => (
                  <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden bg-rose-50 dark:bg-charcoal-800">
                    {item.mediaType === 'video' ? (
                      <video src={item.previewUrl} preload="metadata" playsInline muted className="w-full h-full object-cover" />
                    ) : (
                      <img src={item.previewUrl} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute left-2 bottom-2 z-20 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white">
                      {item.mediaType === 'video' ? <Video className="w-3 h-3" /> : <ImagePlus className="w-3 h-3" />}
                      {item.status === 'done' ? '✓' : item.status === 'uploading' ? 'Đang tải' : item.mediaType === 'video' ? 'Video' : 'Ảnh'}
                    </div>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => removeSelectedMedia(item.id)}
                      className="absolute right-2 top-2 z-20 min-h-[34px] min-w-[34px] rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-50"
                      aria-label="Xóa media"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex flex-col items-center justify-center min-h-32 border-2 border-dashed border-rose-200 dark:border-rose-900/40 rounded-2xl cursor-pointer hover:bg-rose-50/50 transition-colors px-4 text-center">
              <Upload className="w-8 h-8 text-rose-400 mb-1" />
              <span className="text-xs font-semibold text-rose-500">Thêm ảnh hoặc video</span>
              <span className="text-[10px] text-gray-400 mt-0.5">JPEG, PNG, WEBP, MP4, WEBM, MOV</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {formError && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 px-3 py-2 text-xs text-red-600 dark:text-red-300 whitespace-pre-line">
              {formError}
            </div>
          )}

          {uploadPhase.active && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs text-rose-600 dark:text-rose-200 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploadPhase.message}
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={uploading} disabled={!hasSelectedMedia || uploading}>
            Đăng kỷ niệm
          </Button>
        </form>
      </Modal>

      {selectedMemory && (
        <Modal
          isOpen={!!selectedMemory}
          onClose={() => {
            setSelectedMemory(null);
            setIsManageMenuOpen(false);
            setIsDeleteConfirmOpen(false);
            setDeleteError(null);
          }}
          title="Kỷ niệm"
          headerAction={
            canManageSelectedMemory ? (
              <button
                type="button"
                onClick={() => {
                  setIsManageMenuOpen((value) => !value);
                  setIsDeleteConfirmOpen(false);
                  setDeleteError(null);
                }}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Quản lý kỷ niệm"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            ) : null
          }
        >
          <div className="space-y-4">
            {isManageMenuOpen && !isDeleteConfirmOpen && (
              <div className="rounded-2xl border border-rose-100 dark:border-rose-900/30 bg-white/85 dark:bg-charcoal-800/95 shadow-soft-sm overflow-hidden">
                <div className="px-4 py-3 text-sm font-semibold text-charcoal-800 dark:text-cream-50">
                  Quản lý kỷ niệm
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(true);
                    setDeleteError(null);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Xóa kỷ niệm
                </button>
                <button
                  type="button"
                  onClick={() => setIsManageMenuOpen(false)}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-[#81727B] hover:bg-rose-50/70 dark:hover:bg-white/5"
                >
                  Hủy
                </button>
              </div>
            )}

            {isDeleteConfirmOpen && (
              <div className="rounded-2xl border border-red-100 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-charcoal-800 dark:text-cream-50">
                    Xóa kỷ niệm này?
                  </h3>
                  <p className="text-sm font-semibold text-red-600 mt-1 line-clamp-2">
                    {selectedMemory.title}
                  </p>
                  <p className="text-xs text-[#81727B] dark:text-gray-300 mt-2">
                    Ảnh, video và nội dung của kỷ niệm này sẽ bị xóa.
                  </p>
                </div>

                {deleteError && (
                  <div className="rounded-xl bg-white/80 dark:bg-charcoal-800 px-3 py-2 text-xs text-red-600 dark:text-red-300">
                    {deleteError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    autoFocus
                    disabled={deleting}
                    onClick={() => {
                      setIsDeleteConfirmOpen(false);
                      setDeleteError(null);
                    }}
                  >
                    Giữ lại
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    isLoading={deleting}
                    onClick={() => handleDeleteMemory(selectedMemory)}
                  >
                    Xóa kỷ niệm
                  </Button>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold text-charcoal-800 dark:text-cream-50">
                {selectedMemory.title}
              </h2>
              <p className="text-xs text-rose-500 font-medium mt-1">
                {formatDateVietnamese(selectedMemory.memory_date)}
              </p>
              {selectedMemory.location && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" /> {selectedMemory.location}
                </p>
              )}
            </div>

            <MemoryMediaGallery
              media={selectedMemory.media}
              title={selectedMemory.title}
              layout="detail"
              priority
              onOpen={(index) => setViewerIndex(index)}
            />

            {selectedMemory.description && (
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {selectedMemory.description}
              </p>
            )}

            <div className="pt-1">
              <MemorySeenStatus
                memory={selectedMemory}
                currentUserId={user?.id}
                partnerId={partnerProfile?.id}
                partnerName={partnerProfile?.display_name}
              />
            </div>
          </div>
        </Modal>
      )}

      {viewerIndex !== null && selectedMemoryMedia.length > 0 && (
        <MemoryMediaViewer
          media={selectedMemoryMedia}
          title={selectedMemory?.title || 'Kỷ niệm'}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}
