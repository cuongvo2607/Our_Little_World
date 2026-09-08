export type RepeatMode = 'off' | 'one' | 'all';

export type Song = {
  id: string;
  title: string;
  artist: string;
  audioPath: string;
  coverPath?: string;
};

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
