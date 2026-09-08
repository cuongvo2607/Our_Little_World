'use client';

import React, { ChangeEvent, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  ImagePlus,
  ListMusic,
  Loader2,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Save,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCouple } from '@/context/CoupleContext';
import { useMusic } from '@/context/MusicContext';
import { createPartnerNotification } from '@/lib/notifications';
import {
  createSongStoragePaths,
  formatMusicTime,
  MAX_AUDIO_BYTES,
  MUSIC_BUCKET,
  readAudioDuration,
  Song,
  SongUploadDraft,
  titleFromFilename,
  validateAudioFile,
} from '@/lib/music';
import { cn } from '@/lib/utils';

const DEFAULT_ARTIST = 'Nhạc của chúng mình';
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function MiniMusicPlayer() {
  const pathname = usePathname();
  const { user, couple } = useCouple();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [drafts, setDrafts] = useState<SongUploadDraft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageMessage, setManageMessage] = useState<string | null>(null);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<Song | null>(null);
  const [savingSongId, setSavingSongId] = useState<string | null>(null);
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
    loadingSongs,
    playlistError,
    refreshSongs,
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

  const selectAudioFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    setManageError(null);
    setManageMessage(null);

    const nextDrafts: SongUploadDraft[] = [];
    for (const file of files) {
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        nextDrafts.push({
          id: crypto.randomUUID(),
          file,
          title: titleFromFilename(file.name),
          artist: DEFAULT_ARTIST,
          duration: null,
          status: 'error',
          error: validation.error,
        });
        continue;
      }

      nextDrafts.push({
        id: crypto.randomUUID(),
        file,
        title: titleFromFilename(file.name),
        artist: DEFAULT_ARTIST,
        duration: await readAudioDuration(file),
        status: 'pending',
      });
    }

    setDrafts((items) => [...items, ...nextDrafts]);
  };

  const updateDraft = (id: string, patch: Partial<Pick<SongUploadDraft, 'title' | 'artist'>>) => {
    setDrafts((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeDraft = (id: string) => {
    setDrafts((items) => items.filter((item) => item.id !== id));
  };

  const markDraft = (id: string, patch: Partial<SongUploadDraft>) => {
    setDrafts((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const uploadOneDraft = async (draft: SongUploadDraft, orderOffset: number) => {
    if (!user?.id || !couple?.id) {
      throw new Error('Bạn cần đăng nhập và có couple trước khi thêm nhạc.');
    }

    const title = draft.title.trim();
    if (!title) throw new Error('Hãy đặt tên bài hát trước khi upload.');

    const songId = crypto.randomUUID();
    const paths = createSongStoragePaths(couple.id, songId, draft.file);
    const contentType = draft.file.type || (paths.audioPath.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg');

    markDraft(draft.id, { status: 'uploading', error: undefined });

    const uploadResult = await supabase.storage
      .from(MUSIC_BUCKET)
      .upload(paths.audioPath, draft.file, { contentType, upsert: false });

    if (uploadResult.error) throw uploadResult.error;

    const insertResult = await supabase.from('couple_songs').insert({
      id: songId,
      couple_id: couple.id,
      uploaded_by: user.id,
      title,
      artist: draft.artist.trim() || DEFAULT_ARTIST,
      audio_path: paths.audioPath,
      cover_path: null,
      duration: draft.duration,
      sort_order: songs.length + orderOffset,
    });

    if (insertResult.error) {
      await supabase.storage.from(MUSIC_BUCKET).remove([paths.audioPath]);
      throw insertResult.error;
    }

    createPartnerNotification(supabase, 'song_added', null, songId).catch((notificationError) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Notifications] Song notification skipped:', notificationError);
      }
    });

    markDraft(draft.id, { status: 'done', error: undefined });
  };

  const uploadDrafts = async () => {
    const pendingDrafts = drafts.filter((draft) => draft.status === 'pending' || draft.status === 'error');
    if (pendingDrafts.length === 0) return;

    setUploading(true);
    setManageError(null);
    setManageMessage('Đang lưu playlist của chúng mình...');

    let successCount = 0;
    for (let index = 0; index < pendingDrafts.length; index += 1) {
      const draft = pendingDrafts[index];
      if (draft.error && !validateAudioFile(draft.file).valid) continue;

      try {
        await uploadOneDraft(draft, index);
        successCount += 1;
      } catch (err) {
        markDraft(draft.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Không thể upload bài hát này.',
        });
      }
    }

    await refreshSongs();
    setUploading(false);
    setManageMessage(successCount > 0 ? `Đã thêm ${successCount} bài hát.` : null);
    if (successCount < pendingDrafts.length) {
      setManageError('Một vài bài chưa upload được. Bạn có thể thử lại từng bài.');
    }
  };

  const startEditSong = (song: Song) => {
    setEditingSongId(song.id);
    setEditTitle(song.title);
    setEditArtist(song.artist);
    setManageError(null);
  };

  const saveSongEdit = async (song: Song) => {
    if (song.source !== 'supabase') return;

    setSavingSongId(song.id);
    setManageError(null);
    const { error: updateError } = await supabase
      .from('couple_songs')
      .update({
        title: editTitle.trim() || song.title,
        artist: editArtist.trim() || DEFAULT_ARTIST,
        updated_at: new Date().toISOString(),
      })
      .eq('id', song.id);

    setSavingSongId(null);
    if (updateError) {
      setManageError('Không thể lưu thông tin bài hát.');
      return;
    }

    setEditingSongId(null);
    await refreshSongs();
  };

  const uploadCover = async (song: Song, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || song.source !== 'supabase' || !couple?.id) return;

    if (!COVER_TYPES.includes(file.type) || file.size > MAX_COVER_BYTES) {
      setManageError('Cover chỉ hỗ trợ JPG, PNG, WEBP và nhỏ hơn 5 MB.');
      return;
    }

    setSavingSongId(song.id);
    setManageError(null);
    const coverPath = `couples/${couple.id}/music/${song.id}/cover.${file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'}`;
    const uploadResult = await supabase.storage
      .from(MUSIC_BUCKET)
      .upload(coverPath, file, { contentType: file.type, upsert: true });

    if (uploadResult.error) {
      setSavingSongId(null);
      setManageError('Không thể upload ảnh cover.');
      return;
    }

    const { error: updateError } = await supabase
      .from('couple_songs')
      .update({ cover_path: coverPath, updated_at: new Date().toISOString() })
      .eq('id', song.id);

    setSavingSongId(null);
    if (updateError) {
      setManageError('Không thể lưu ảnh cover.');
      return;
    }

    await refreshSongs();
  };

  const deleteSong = async () => {
    if (!deleteCandidate || deleteCandidate.source !== 'supabase') return;

    setSavingSongId(deleteCandidate.id);
    setManageError(null);

    const paths = [deleteCandidate.audioStoragePath, deleteCandidate.coverStoragePath].filter(Boolean) as string[];
    if (paths.length > 0) {
      const removeResult = await supabase.storage.from(MUSIC_BUCKET).remove(paths);
      if (removeResult.error) {
        setSavingSongId(null);
        setManageError('Không thể xóa file nhạc. Vui lòng thử lại.');
        return;
      }
    }

    const { error: deleteError } = await supabase.from('couple_songs').delete().eq('id', deleteCandidate.id);
    setSavingSongId(null);

    if (deleteError) {
      setManageError('Không thể xóa bài hát. Vui lòng thử lại.');
      return;
    }

    setDeleteCandidate(null);
    await refreshSongs();
  };

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
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsManaging((value) => !value);
                      setShowPlaylist(false);
                    }}
                    className={cn(
                      'min-h-[40px] min-w-[40px] rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center',
                      isManaging ? 'text-[#E86D91] bg-rose-50 dark:bg-rose-950/40' : 'text-gray-500'
                    )}
                    aria-label="Quản lý nhạc"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="min-h-[40px] min-w-[40px] rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 flex items-center justify-center"
                    aria-label="Đóng"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {isManaging ? (
                  <ManageMusicPanel
                    songs={songs}
                    drafts={drafts}
                    uploading={uploading}
                    manageError={manageError}
                    manageMessage={manageMessage}
                    savingSongId={savingSongId}
                    editingSongId={editingSongId}
                    editTitle={editTitle}
                    editArtist={editArtist}
                    deleteCandidate={deleteCandidate}
                    fileInputRef={fileInputRef}
                    selectAudioFiles={selectAudioFiles}
                    updateDraft={updateDraft}
                    removeDraft={removeDraft}
                    uploadDrafts={uploadDrafts}
                    startEditSong={startEditSong}
                    setEditTitle={setEditTitle}
                    setEditArtist={setEditArtist}
                    setEditingSongId={setEditingSongId}
                    saveSongEdit={saveSongEdit}
                    uploadCover={uploadCover}
                    setDeleteCandidate={setDeleteCandidate}
                    deleteSong={deleteSong}
                  />
                ) : showPlaylist ? (
                  <PlaylistPanel
                    songs={songs}
                    currentIndex={currentIndex}
                    isPlaying={isPlaying}
                    loadingSongs={loadingSongs}
                    playlistError={playlistError}
                    playSong={playSong}
                    onBack={() => setShowPlaylist(false)}
                  />
                ) : (
                  <PlayerPanel
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    repeatMode={repeatMode}
                    shuffle={shuffle}
                    error={error}
                    progressValue={progressValue}
                    retry={retry}
                    seek={seek}
                    toggleShuffle={toggleShuffle}
                    previousSong={previousSong}
                    togglePlay={togglePlay}
                    nextSong={nextSong}
                    cycleRepeatMode={cycleRepeatMode}
                    setVolume={setVolume}
                    onShowPlaylist={() => setShowPlaylist(true)}
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function PlayerPanel({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume,
  repeatMode,
  shuffle,
  error,
  progressValue,
  retry,
  seek,
  toggleShuffle,
  previousSong,
  togglePlay,
  nextSong,
  cycleRepeatMode,
  setVolume,
  onShowPlaylist,
}: {
  currentSong: Song;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeatMode: string;
  shuffle: boolean;
  error: string | null;
  progressValue: number;
  retry: () => Promise<void>;
  seek: (time: number) => void;
  toggleShuffle: () => void;
  previousSong: () => Promise<void>;
  togglePlay: () => Promise<void>;
  nextSong: () => Promise<void>;
  cycleRepeatMode: () => void;
  setVolume: (volume: number) => void;
  onShowPlaylist: () => void;
}) {
  return (
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
        onClick={onShowPlaylist}
        className="w-full rounded-2xl bg-white/65 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 px-4 py-3 text-sm font-bold text-[#E86D91] flex items-center justify-center gap-2"
      >
        <ListMusic className="w-4 h-4" /> Playlist của chúng mình
      </button>
    </>
  );
}

function PlaylistPanel({
  songs,
  currentIndex,
  isPlaying,
  loadingSongs,
  playlistError,
  playSong,
  onBack,
}: {
  songs: Song[];
  currentIndex: number;
  isPlaying: boolean;
  loadingSongs: boolean;
  playlistError: string | null;
  playSong: (index: number) => Promise<void>;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#81727B]">Playlist của chúng mình</p>
        <button type="button" onClick={onBack} className="text-xs font-semibold text-[#E86D91]">
          Player
        </button>
      </div>

      {playlistError && (
        <p className="rounded-2xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
          {playlistError}. Đang dùng playlist mẫu.
        </p>
      )}

      <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
        {loadingSongs && <p className="text-xs text-[#81727B] px-1">Đang tải playlist...</p>}
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
              {song.duration ? <span className="text-[11px] text-[#81727B]">{formatMusicTime(song.duration)}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ManageMusicPanel({
  songs,
  drafts,
  uploading,
  manageError,
  manageMessage,
  savingSongId,
  editingSongId,
  editTitle,
  editArtist,
  deleteCandidate,
  fileInputRef,
  selectAudioFiles,
  updateDraft,
  removeDraft,
  uploadDrafts,
  startEditSong,
  setEditTitle,
  setEditArtist,
  setEditingSongId,
  saveSongEdit,
  uploadCover,
  setDeleteCandidate,
  deleteSong,
}: {
  songs: Song[];
  drafts: SongUploadDraft[];
  uploading: boolean;
  manageError: string | null;
  manageMessage: string | null;
  savingSongId: string | null;
  editingSongId: string | null;
  editTitle: string;
  editArtist: string;
  deleteCandidate: Song | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectAudioFiles: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  updateDraft: (id: string, patch: Partial<Pick<SongUploadDraft, 'title' | 'artist'>>) => void;
  removeDraft: (id: string) => void;
  uploadDrafts: () => Promise<void>;
  startEditSong: (song: Song) => void;
  setEditTitle: (value: string) => void;
  setEditArtist: (value: string) => void;
  setEditingSongId: (value: string | null) => void;
  saveSongEdit: (song: Song) => Promise<void>;
  uploadCover: (song: Song, event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  setDeleteCandidate: (song: Song | null) => void;
  deleteSong: () => Promise<void>;
}) {
  return (
    <div className="space-y-4 max-h-[66vh] overflow-y-auto pr-1">
      <div className="rounded-3xl bg-white/65 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-charcoal-800 dark:text-cream-50">Thêm bài hát</p>
            <p className="text-[11px] text-[#81727B]">MP3/M4A, tối đa {Math.round(MAX_AUDIO_BYTES / 1024 / 1024)} MB mỗi bài.</p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shrink-0 rounded-full bg-[#E86D91] text-white px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
          >
            <Plus className="w-4 h-4" /> Chọn file
          </button>
          <input ref={fileInputRef as React.RefObject<HTMLInputElement>} type="file" accept="audio/mpeg,audio/mp4,.mp3,.m4a" multiple hidden onChange={selectAudioFiles} />
        </div>

        {drafts.length > 0 && (
          <div className="space-y-2">
            {drafts.map((draft) => (
              <div key={draft.id} className="rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-[#81727B] truncate">{draft.file.name}</p>
                  <button type="button" onClick={() => removeDraft(draft.id)} disabled={uploading} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  value={draft.title}
                  onChange={(event) => updateDraft(draft.id, { title: event.target.value })}
                  disabled={uploading || draft.status === 'done'}
                  className="w-full rounded-xl border border-rose-100 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[#E86D91] dark:bg-charcoal-800 dark:border-rose-900/40"
                  placeholder="Tên bài hát"
                />
                <input
                  value={draft.artist}
                  onChange={(event) => updateDraft(draft.id, { artist: event.target.value })}
                  disabled={uploading || draft.status === 'done'}
                  className="w-full rounded-xl border border-rose-100 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[#E86D91] dark:bg-charcoal-800 dark:border-rose-900/40"
                  placeholder="Ca sĩ / ghi chú"
                />
                <div className="flex items-center justify-between text-[11px]">
                  <span className={cn('font-semibold', draft.status === 'error' ? 'text-red-600' : 'text-[#81727B]')}>
                    {draft.status === 'uploading' && 'Đang tải lên...'}
                    {draft.status === 'done' && 'Đã thêm ✓'}
                    {draft.status === 'pending' && `${formatFileSize(draft.file.size)} • ${draft.duration ? formatMusicTime(draft.duration) : 'chưa có duration'}`}
                    {draft.status === 'error' && (draft.error || 'Không thể upload')}
                  </span>
                  {draft.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-[#E86D91]" />}
                  {draft.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={uploadDrafts}
              disabled={uploading || drafts.every((draft) => draft.status === 'done')}
              className="w-full rounded-2xl bg-gradient-to-r from-rose-400 via-[#E86D91] to-pink-500 text-white px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Đang lưu nhạc...' : 'Upload playlist'}
            </button>
          </div>
        )}

        {manageMessage && <p className="text-xs font-semibold text-emerald-600">{manageMessage}</p>}
        {manageError && <p className="text-xs font-semibold text-red-600">{manageError}</p>}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-[#81727B] px-1">Bài hát hiện có</p>
        {songs.map((song) => {
          const editing = editingSongId === song.id;
          const saving = savingSongId === song.id;
          const isLocal = song.source !== 'supabase';

          return (
            <div key={song.id} className="rounded-2xl bg-white/65 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 p-3 space-y-3">
              <div className="flex items-center gap-3">
                <SongCover title={song.title} coverPath={song.coverPath} small />
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="space-y-2">
                      <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="w-full rounded-xl border border-rose-100 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[#E86D91]" />
                      <input value={editArtist} onChange={(event) => setEditArtist(event.target.value)} className="w-full rounded-xl border border-rose-100 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[#E86D91]" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-charcoal-800 dark:text-cream-50 truncate">{song.title}</p>
                      <p className="text-[11px] text-[#81727B] truncate">
                        {song.artist}{isLocal ? ' • bài mẫu local' : ''}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {!isLocal && (
                <div className="flex items-center justify-end gap-2">
                  {editing ? (
                    <>
                      <button type="button" onClick={() => setEditingSongId(null)} disabled={saving} className="rounded-full px-3 py-2 text-xs font-bold text-[#81727B]">
                        Hủy
                      </button>
                      <button type="button" onClick={() => saveSongEdit(song)} disabled={saving} className="rounded-full px-3 py-2 text-xs font-bold bg-[#E86D91] text-white flex items-center gap-1.5">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Lưu
                      </button>
                    </>
                  ) : (
                    <>
                      <label className="rounded-full px-3 py-2 text-xs font-bold text-[#E86D91] bg-rose-50 cursor-pointer flex items-center gap-1.5">
                        <ImagePlus className="w-3.5 h-3.5" /> Cover
                        <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => uploadCover(song, event)} />
                      </label>
                      <button type="button" onClick={() => startEditSong(song)} className="rounded-full px-3 py-2 text-xs font-bold text-[#81727B] bg-white/70 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" /> Sửa
                      </button>
                      <button type="button" onClick={() => setDeleteCandidate(song)} className="rounded-full px-3 py-2 text-xs font-bold text-red-600 bg-red-50 flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {deleteCandidate && (
          <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/40 p-3 sm:items-center">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              className="w-full max-w-[360px] rounded-[24px] bg-white dark:bg-charcoal-900 border border-rose-100 p-5 shadow-soft-lg space-y-4"
            >
              <div>
                <p className="text-base font-extrabold text-charcoal-800 dark:text-cream-50">Xóa bài hát này?</p>
                <p className="text-sm text-[#81727B] mt-1">{deleteCandidate.title}</p>
                <p className="text-xs text-[#81727B] mt-2">File nhạc và cover trong Storage sẽ bị xóa.</p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setDeleteCandidate(null)} disabled={savingSongId === deleteCandidate.id} className="rounded-full px-4 py-2 text-sm font-bold bg-rose-50 text-[#E86D91]">
                  Giữ lại
                </button>
                <button type="button" onClick={deleteSong} disabled={savingSongId === deleteCandidate.id} className="rounded-full px-4 py-2 text-sm font-bold bg-red-50 text-red-600 flex items-center gap-1.5">
                  {savingSongId === deleteCandidate.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
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

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
