import { SupabaseClient } from '@supabase/supabase-js';
import { Memory, MemoryMedia, MemoryMediaType } from '@/types';
import { compressImage } from '@/lib/image';
import { resolveStorageUrl } from '@/lib/storage';

export const MEMORY_MEDIA_BUCKET = 'couple-memories';
export const MAX_MEMORY_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_MEMORY_VIDEO_BYTES = 100 * 1024 * 1024;

export const ALLOWED_MEMORY_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_MEMORY_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export type SelectedMemoryMedia = {
  id: string;
  file: File;
  previewUrl: string;
  mediaType: MemoryMediaType;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
};

export type MemoryWithMedia = Memory & {
  media: MemoryMedia[];
  cover_url?: string;
};

export function getReadableFileSize(bytes: number) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

export function validateMemoryMediaFile(file: File): { valid: boolean; error?: string; mediaType?: MemoryMediaType } {
  const mimeType = file.type.toLowerCase();

  if (ALLOWED_MEMORY_IMAGE_TYPES.includes(mimeType)) {
    if (file.size > MAX_MEMORY_IMAGE_BYTES) {
      return {
        valid: false,
        error: 'Ảnh này quá lớn ❤️\nHãy chọn ảnh nhỏ hơn 10 MB.',
      };
    }

    return { valid: true, mediaType: 'image' };
  }

  if (ALLOWED_MEMORY_VIDEO_TYPES.includes(mimeType)) {
    if (file.size > MAX_MEMORY_VIDEO_BYTES) {
      return {
        valid: false,
        error: 'Video này quá lớn ❤️\nHãy chọn video nhỏ hơn 100 MB.',
      };
    }

    return { valid: true, mediaType: 'video' };
  }

  return {
    valid: false,
    error: 'Tệp này chưa được hỗ trợ. Hãy chọn ảnh JPEG, PNG, WEBP hoặc video MP4, WEBM, MOV.',
  };
}

export async function readMediaMetadata(file: File, mediaType: MemoryMediaType) {
  const previewUrl = URL.createObjectURL(file);

  if (mediaType === 'image') {
    return new Promise<{ previewUrl: string; width: number | null; height: number | null; durationSeconds: null }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ previewUrl, width: img.naturalWidth || null, height: img.naturalHeight || null, durationSeconds: null });
      img.onerror = () => resolve({ previewUrl, width: null, height: null, durationSeconds: null });
      img.src = previewUrl;
    });
  }

  return new Promise<{ previewUrl: string; width: number | null; height: number | null; durationSeconds: number | null }>((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({
        previewUrl,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
      });
    };
    video.onerror = () => resolve({ previewUrl, width: null, height: null, durationSeconds: null });
    video.src = previewUrl;
  });
}

export function getMemoryFileExtension(file: File, mediaType: MemoryMediaType) {
  if (mediaType === 'image') return 'jpg';

  const mimeMap: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  };

  return mimeMap[file.type.toLowerCase()] || 'mp4';
}

export function createMemoryStoragePath(coupleId: string, memoryId: string, file: File, mediaType: MemoryMediaType) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const prefix = mediaType === 'image' ? 'photo' : 'video';
  const ext = getMemoryFileExtension(file, mediaType);

  return `couples/${coupleId}/memories/${memoryId}/${prefix}-${id}.${ext}`;
}

export async function getUploadBody(file: File, mediaType: MemoryMediaType) {
  if (mediaType === 'video') {
    return { body: file, contentType: file.type };
  }

  const compressed = await compressImage(file);
  return { body: compressed, contentType: 'image/jpeg' };
}

export async function resolveMemoryMediaUrls<T extends MemoryWithMedia>(
  supabase: SupabaseClient,
  memories: T[]
): Promise<T[]> {
  return Promise.all(
    memories.map(async (memory) => {
      const media = await Promise.all(
        (memory.media || []).map(async (item) => ({
          ...item,
          signed_url: await resolveStorageUrl(supabase, item.storage_path, MEMORY_MEDIA_BUCKET),
        }))
      );
      const cover = media[0]?.signed_url || memory.signed_url || memory.image_url || '';

      return {
        ...memory,
        media,
        cover_url: cover,
      };
    })
  );
}

export function normalizeMemoryRows(rows: any[] | null | undefined): MemoryWithMedia[] {
  return (rows || []).map((row) => {
    const memoryMedia = Array.isArray(row.memory_media) ? row.memory_media : [];
    const sortedMedia = [...memoryMedia].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const media = sortedMedia.length > 0 || !row.image_url
      ? sortedMedia
      : [{
          id: `legacy-${row.id}`,
          memory_id: row.id,
          couple_id: row.couple_id,
          storage_path: row.image_url,
          media_type: 'image',
          mime_type: 'image/jpeg',
          file_size: 0,
          width: null,
          height: null,
          duration_seconds: null,
          sort_order: 0,
          created_at: row.created_at,
        } as MemoryMedia];

    return {
      ...row,
      media,
      memory_views: Array.isArray(row.memory_views) ? row.memory_views : [],
    };
  });
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds || !Number.isFinite(seconds)) return '';
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

export function formatViewedAtTime(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
