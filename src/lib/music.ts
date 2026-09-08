export type RepeatMode = 'off' | 'one' | 'all';

export type Song = {
  id: string;
  title: string;
  artist: string;
  audioPath: string;
  coverPath?: string;
  audioStoragePath?: string;
  coverStoragePath?: string | null;
  duration?: number | null;
  sortOrder?: number;
  source?: 'local' | 'supabase';
};

export type SongUploadDraft = {
  id: string;
  file: File;
  title: string;
  artist: string;
  duration: number | null;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
};

export const MUSIC_BUCKET = 'couple-music';
export const MAX_AUDIO_BYTES = 30 * 1024 * 1024;
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a'];

export const OUR_PLAYLIST: Song[] = [
  {
    id: 'dem-ngay-xa-em',
    title: 'Đếm Ngày Xa Em',
    artist: 'Nhạc của chúng mình',
    audioPath: '/music/dem-ngay-xa-em.mp3',
    coverPath: '/music/covers/dem-ngay-xa-em.jpg',
  },
  {
    id: 'co-em-cho',
    title: 'Có Em Chờ',
    artist: 'Nhạc của chúng mình',
    audioPath: '/music/co-em-cho.mp3',
    coverPath: '/music/covers/co-em-cho.jpg',
  },
  {
    id: 'den-khi-nao',
    title: 'Đến Khi Nào',
    artist: 'Nhạc của chúng mình',
    audioPath: '/music/den-khi-nao.mp3',
    coverPath: '/music/covers/den-khi-nao.jpg',
  },
];

export function formatMusicTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();
  const extensionAllowed = extension === 'mp3' || extension === 'm4a';

  if (!ALLOWED_AUDIO_TYPES.includes(mimeType) && !extensionAllowed) {
    return {
      valid: false,
      error: 'Chỉ hỗ trợ MP3 hoặc M4A bạn có quyền sử dụng.',
    };
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return {
      valid: false,
      error: 'Bài hát này quá lớn. Hãy chọn file nhỏ hơn 30 MB.',
    };
  }

  return { valid: true };
}

export function titleFromFilename(filename: string) {
  const cleanName = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanName) return 'Bài hát mới';

  return cleanName
    .split(' ')
    .map((word) => word.charAt(0).toLocaleUpperCase('vi-VN') + word.slice(1))
    .join(' ');
}

export function getAudioExtension(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'm4a') return 'm4a';
  return 'mp3';
}

export function createSongStoragePaths(coupleId: string, songId: string, file: File) {
  return {
    audioPath: `couples/${coupleId}/music/${songId}/audio.${getAudioExtension(file)}`,
    coverPath: `couples/${coupleId}/music/${songId}/cover.jpg`,
  };
}

export async function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : null;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}
