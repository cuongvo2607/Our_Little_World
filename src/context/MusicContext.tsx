'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { OUR_PLAYLIST, RepeatMode, Song } from '@/lib/music';

type MusicPreferences = {
  songId: string;
  volume: number;
  currentTime: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
};

type MusicContextValue = {
  songs: Song[];
  currentSong: Song;
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
  error: string | null;
  togglePlay: () => Promise<void>;
  playSong: (index: number) => Promise<void>;
  nextSong: () => Promise<void>;
  previousSong: () => Promise<void>;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  retry: () => Promise<void>;
};

const STORAGE_KEY = 'our-little-world-music';
const MusicContext = createContext<MusicContextValue | null>(null);

function getNextRepeatMode(mode: RepeatMode): RepeatMode {
  if (mode === 'off') return 'all';
  if (mode === 'all') return 'one';
  return 'off';
}

function getRandomIndex(currentIndex: number, songCount: number) {
  if (songCount <= 1) return currentIndex;

  let next = currentIndex;
  while (next === currentIndex) {
    next = Math.floor(Math.random() * songCount);
  }
  return next;
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const songs = OUR_PLAYLIST;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldResumeRef = useRef(false);
  const currentIndexRef = useRef(0);
  const repeatModeRef = useRef<RepeatMode>('all');
  const shuffleRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.75);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [shuffle, setShuffle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const currentSong = songs[currentIndex] || songs[0];

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handlePlaying = () => {
      setError(null);
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      setError('Không thể phát bài hát này');
    };
    const handleEnded = () => {
      const currentRepeatMode = repeatModeRef.current;
      const currentSongIndex = currentIndexRef.current;
      const currentShuffle = shuffleRef.current;

      if (currentRepeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => setError('Không thể phát bài hát này'));
        return;
      }

      shouldResumeRef.current = currentRepeatMode === 'all' || currentSongIndex < songs.length - 1 || currentShuffle;
      const nextIndex = currentShuffle ? getRandomIndex(currentSongIndex, songs.length) : (currentSongIndex + 1) % songs.length;

      if (currentRepeatMode === 'off' && currentSongIndex === songs.length - 1 && !currentShuffle) {
        setIsPlaying(false);
        audio.currentTime = 0;
        return;
      }

      setCurrentIndex(nextIndex);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [songs.length]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const prefs = JSON.parse(raw) as Partial<MusicPreferences>;
        const savedIndex = songs.findIndex((song) => song.id === prefs.songId);
        if (savedIndex >= 0) setCurrentIndex(savedIndex);
        if (typeof prefs.volume === 'number') setVolumeState(Math.min(1, Math.max(0, prefs.volume)));
        if (typeof prefs.currentTime === 'number') setCurrentTime(Math.max(0, prefs.currentTime));
        if (prefs.repeatMode) setRepeatMode(prefs.repeatMode);
        if (typeof prefs.shuffle === 'boolean') setShuffle(prefs.shuffle);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsHydrated(true);
  }, [songs]);

  useEffect(() => {
    if (!isHydrated || !currentSong) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        songId: currentSong.id,
        volume,
        currentTime,
        repeatMode,
        shuffle,
      } satisfies MusicPreferences)
    );
  }, [currentSong, currentTime, isHydrated, repeatMode, shuffle, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    setError(null);
    audio.src = currentSong.audioPath;
    audio.load();

    if (currentTime > 0) {
      const restoreTime = () => {
        audio.currentTime = Math.min(currentTime, Number.isFinite(audio.duration) ? audio.duration : currentTime);
        audio.removeEventListener('loadedmetadata', restoreTime);
      };
      audio.addEventListener('loadedmetadata', restoreTime);
    }

    if (shouldResumeRef.current) {
      shouldResumeRef.current = false;
      audio.play().catch(() => {
        setIsPlaying(false);
        setError(null);
      });
    }
  }, [currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const pauseMusicForVideo = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLVideoElement && isPlaying) {
        audioRef.current?.pause();
      }
    };

    document.addEventListener('play', pauseMusicForVideo, true);
    return () => document.removeEventListener('play', pauseMusicForVideo, true);
  }, [isPlaying]);

  const playCurrentAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (!audio.src || !audio.src.endsWith(currentSong.audioPath)) {
      audio.src = currentSong.audioPath;
    }

    setError(null);
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      setIsPlaying(false);
      setError('Không thể phát bài hát này');
    }
  }, [currentSong]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    await playCurrentAudio();
  }, [isPlaying, playCurrentAudio]);

  const playSong = useCallback(async (index: number) => {
    if (index < 0 || index >= songs.length) return;
    shouldResumeRef.current = true;
    setCurrentTime(0);
    setCurrentIndex(index);
  }, [songs.length]);

  const nextSong = useCallback(async () => {
    shouldResumeRef.current = isPlaying;
    setCurrentTime(0);
    setCurrentIndex((index) => (shuffle ? getRandomIndex(index, songs.length) : (index + 1) % songs.length));
  }, [isPlaying, shuffle, songs.length]);

  const previousSong = useCallback(async () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 4) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    shouldResumeRef.current = isPlaying;
    setCurrentTime(0);
    setCurrentIndex((index) => (index - 1 + songs.length) % songs.length);
  }, [isPlaying, songs.length]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    setVolumeState(Math.min(1, Math.max(0, nextVolume)));
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((value) => !value), []);
  const cycleRepeatMode = useCallback(() => setRepeatMode((mode) => getNextRepeatMode(mode)), []);
  const retry = useCallback(async () => playCurrentAudio(), [playCurrentAudio]);

  const value = useMemo<MusicContextValue>(() => ({
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
  }), [
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
  ]);

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used inside MusicProvider');
  }

  return context;
}
