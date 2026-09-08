'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from 'lucide-react';
import { useMusic } from '@/context/MusicContext';
import { formatMusicTime } from '@/lib/music';
import { cn } from '@/lib/utils';

export function MiniMusicPlayer() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const {
    songs,
    currentSong,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    repeatMode,
    shuffle,
    error,
    togglePlay,
    playSong,
    nextSong,
    previousSong,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeatMode,
    retry,
  } = useMusic();

  if (['/login', '/onboarding'].includes(pathname)) return null;

  const progressValue = duration > 0 ? currentTime : 0;
  const bottomOffset = pathname === '/messages'
    ? 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 12px) + 150px)'
    : 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 12px) + 16px)';

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setIsOpen(true)}
        whileTap={{ scale: 0.94 }}
        className="fixed left-4 z-40 min-h-[54px] min-w-[54px] rounded-full bg-white/90 dark:bg-charcoal-800/90 border border-rose-200/70 dark:border-rose-900/40 shadow-[0_8px_25px_rgba(232,109,145,0.20)] flex items-center justify-center text-[#E86D91] backdrop-blur-xl"
        style={{ bottom: bottomOffset }}
        aria-label="Mở nhạc của chúng mình"
      >
        <motion.span
          animate={isPlaying ? { y: [0, -2, 0], rotate: [-3, 3, -3] } : { y: 0, rotate: 0 }}
          transition={{ duration: 1.6, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}
          className="relative flex items-center justify-center"
        >
          <Music2 className="w-5 h-5" />
          {isPlaying && (
            <span className="absolute -right-5 -bottom-1 flex items-end gap-0.5 text-[8px] text-[#E86D91]">
              <span className="w-1 h-2 bg-current rounded-full animate-pulse" />
              <span className="w-1 h-3.5 bg-current rounded-full animate-pulse [animation-delay:120ms]" />
              <span className="w-1 h-2.5 bg-current rounded-full animate-pulse [animation-delay:240ms]" />
            </span>
          )}
        </motion.span>
        <span className="hidden lg:block ml-2 max-w-[130px] truncate text-xs font-semibold">
          {currentSong.title}
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/35 backdrop-blur-sm p-3 sm:items-center">
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.96 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
              className="w-full max-w-[430px] glass-card rounded-[28px] border border-rose-200/70 dark:border-rose-900/40 shadow-soft-lg overflow-hidden pb-[env(safe-area-inset-bottom)]"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-rose-100 dark:border-rose-900/30">
                <h3 className="text-sm font-bold text-charcoal-800 dark:text-cream-50 flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-[#E86D91]" /> Nhạc của chúng mình
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="min-h-[40px] min-w-[40px] rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 flex items-center justify-center"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {showPlaylist ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#81727B]">Playlist của chúng mình</p>
                      <button
                        type="button"
                        onClick={() => setShowPlaylist(false)}
                        className="text-xs font-semibold text-[#E86D91]"
                      >
                        Player
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                      {songs.map((song, index) => {
                        const active = index === currentIndex;
                        return (
                          <button
                            type="button"
                            key={song.id}
                            onClick={() => playSong(index)}
                            className={cn(
                              'w-full p-2.5 rounded-2xl flex items-center gap-3 text-left border transition-colors',
                              active
                                ? 'bg-[#FCE7EF] border-rose-200 text-charcoal-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-cream-50'
                                : 'bg-white/60 dark:bg-charcoal-800/60 border-transparent hover:border-rose-100'
                            )}
                          >
                            <SongCover title={song.title} coverPath={song.coverPath} small />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold truncate flex items-center gap-1">
                                {active && isPlaying ? <Volume2 className="w-3.5 h-3.5 text-[#E86D91]" /> : <Play className="w-3.5 h-3.5 text-[#E86D91]" />}
                                {song.title}
                              </p>
                              <p className="text-[11px] text-[#81727B] truncate">{song.artist}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <SongCover title={currentSong.title} coverPath={currentSong.coverPath} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-widest text-[#E86D91] font-bold">
                          Nhạc của chúng mình ♡
                        </p>
                        <h4 className="text-lg font-extrabold text-charcoal-800 dark:text-cream-50 truncate">
                          {currentSong.title}
                        </h4>
                        <p className="text-xs text-[#81727B] truncate">{currentSong.artist}</p>
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 px-3 py-2 text-xs text-red-600 dark:text-red-300 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" /> {error}
                        </span>
                        <button type="button" onClick={retry} className="font-bold text-red-600 dark:text-red-200">
                          Thử lại
                        </button>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        step={0.1}
                        value={progressValue}
                        onChange={(event) => seek(Number(event.target.value))}
                        className="w-full accent-[#E86D91]"
                        aria-label="Tua bài hát"
                      />
                      <div className="flex items-center justify-between text-[11px] font-medium text-[#81727B]">
                        <span>{formatMusicTime(currentTime)}</span>
                        <span>{formatMusicTime(duration)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <IconButton active={shuffle} onClick={toggleShuffle} label="Trộn bài">
                        <Shuffle className="w-4 h-4" />
                      </IconButton>
                      <IconButton onClick={previousSong} label="Bài trước">
                        <SkipBack className="w-5 h-5 fill-current" />
                      </IconButton>
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="w-14 h-14 rounded-full bg-gradient-to-r from-rose-400 via-[#E86D91] to-pink-500 text-white shadow-lg shadow-rose-300/40 flex items-center justify-center active:scale-95 transition-transform"
                        aria-label={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
                      >
                        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                      </button>
                      <IconButton onClick={nextSong} label="Bài sau">
                        <SkipForward className="w-5 h-5 fill-current" />
                      </IconButton>
                      <IconButton active={repeatMode !== 'off'} onClick={cycleRepeatMode} label="Lặp lại">
                        {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                      </IconButton>
                    </div>

                    <div className="hidden sm:flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-[#81727B]" />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={(event) => setVolume(Number(event.target.value))}
                        className="flex-1 accent-[#E86D91]"
                        aria-label="Âm lượng"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPlaylist(true)}
                      className="w-full rounded-2xl bg-white/65 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 px-4 py-3 text-sm font-bold text-[#E86D91] flex items-center justify-center gap-2"
                    >
                      <ListMusic className="w-4 h-4" /> Playlist của chúng mình
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function IconButton({
  children,
  onClick,
  label,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-[42px] min-w-[42px] rounded-full flex items-center justify-center transition-colors',
        active
          ? 'bg-[#FCE7EF] text-[#E86D91] dark:bg-rose-950/60'
          : 'text-[#81727B] hover:bg-rose-50 dark:hover:bg-white/5'
      )}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function SongCover({ title, coverPath, small = false }: { title: string; coverPath?: string; small?: boolean }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn('rounded-2xl overflow-hidden shrink-0 bg-gradient-to-br from-[#FCE7EF] via-white to-[#F7E9FF] border border-rose-100 flex items-center justify-center text-[#E86D91] shadow-soft-sm', small ? 'w-12 h-12' : 'w-20 h-20')}>
      {coverPath && !hasError ? (
        <img
          src={coverPath}
          alt={title}
          loading="lazy"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <Music2 className={small ? 'w-5 h-5' : 'w-8 h-8'} />
      )}
    </div>
  );
}
