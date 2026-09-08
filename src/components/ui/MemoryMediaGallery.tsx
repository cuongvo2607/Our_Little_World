'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, Play, RotateCw, X } from 'lucide-react';
import { MemoryMedia } from '@/types';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/memoryMedia';

type MemoryMediaGalleryProps = {
  media: MemoryMedia[];
  title: string;
  layout?: 'cover' | 'grid' | 'detail';
  priority?: boolean;
  onOpen?: (index: number) => void;
};

export function MemoryMediaGallery({ media, title, layout = 'grid', priority = false, onOpen }: MemoryMediaGalleryProps) {
  const visibleMedia = media.slice(0, layout === 'detail' ? media.length : 4);
  const extraCount = Math.max(0, media.length - visibleMedia.length);

  if (media.length === 0) {
    return (
      <div className="aspect-[16/9] rounded-[18px] bg-rose-50/70 dark:bg-charcoal-800 flex flex-col items-center justify-center text-[#81727B]">
        <ImageOff className="w-7 h-7 mb-1 text-[#E86D91]" />
        <span className="text-[11px] font-medium">Chưa có media</span>
      </div>
    );
  }

  if (layout === 'cover') {
    return (
      <MemoryMediaTile
        item={media[0]}
        title={title}
        priority={priority}
        className="aspect-[16/9]"
        onClick={() => onOpen?.(0)}
      />
    );
  }

  if (layout === 'detail') {
    return (
      <div className="space-y-3">
        {media.map((item, index) => (
          <MemoryMediaTile
            key={item.id}
            item={item}
            title={title}
            priority={priority && index === 0}
            className="aspect-[16/10] rounded-[20px]"
            onClick={() => onOpen?.(index)}
            showControls
          />
        ))}
      </div>
    );
  }

  const gridClass = visibleMedia.length === 1
    ? 'grid-cols-1'
    : visibleMedia.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-2';

  return (
    <div className={cn('grid gap-1.5 overflow-hidden rounded-[20px]', gridClass)}>
      {visibleMedia.map((item, index) => (
        <MemoryMediaTile
          key={item.id}
          item={item}
          title={title}
          priority={priority && index === 0}
          className={cn(
            visibleMedia.length === 1 ? 'aspect-[16/10]' : 'aspect-square',
            visibleMedia.length === 3 && index === 0 ? 'row-span-2 aspect-auto min-h-[220px]' : ''
          )}
          onClick={() => onOpen?.(index)}
        >
          {extraCount > 0 && index === visibleMedia.length - 1 && (
            <div className="absolute inset-0 z-30 bg-black/55 flex items-center justify-center text-white text-2xl font-bold">
              +{extraCount}
            </div>
          )}
        </MemoryMediaTile>
      ))}
    </div>
  );
}

type TileProps = {
  item: MemoryMedia;
  title: string;
  className?: string;
  priority?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  showControls?: boolean;
};

export function MemoryMediaTile({ item, title, className, priority = false, onClick, children, showControls = false }: TileProps) {
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const url = item.signed_url || item.storage_path;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'relative block w-full overflow-hidden bg-[#FCE7EF]/40 dark:bg-charcoal-800 text-left group',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center text-[#81727B] dark:text-gray-300">
          <span className="text-xs font-semibold">
            {item.media_type === 'video' ? 'Không thể phát video' : 'Không thể tải ảnh'}
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              setHasError(false);
              setRetryKey((value) => value + 1);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                setHasError(false);
                setRetryKey((value) => value + 1);
              }
            }}
            className="inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-charcoal-700 px-3 py-1.5 text-[11px] font-semibold text-[#E86D91]"
          >
            <RotateCw className="w-3 h-3" /> Thử lại
          </span>
        </div>
      ) : item.media_type === 'video' ? (
        <>
          <video
            key={retryKey}
            src={url}
            preload="metadata"
            playsInline
            controls={showControls}
            onError={() => setHasError(true)}
            className="h-full w-full object-cover"
          />
          {!showControls && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20 text-white">
              <div className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </div>
              {item.duration_seconds ? (
                <span className="mt-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold">
                  {formatDuration(item.duration_seconds)}
                </span>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <img
          key={retryKey}
          src={url}
          alt={title}
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      )}
      {children}
    </div>
  );
}

type MemoryMediaViewerProps = {
  media: MemoryMedia[];
  title: string;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

export function MemoryMediaViewer({ media, title, index, onIndexChange, onClose }: MemoryMediaViewerProps) {
  const item = media[index];
  if (!item) return null;

  const canGoPrev = index > 0;
  const canGoNext = index < media.length - 1;
  const url = item.signed_url || item.storage_path;

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 text-white flex items-center justify-center">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 min-h-[44px] min-w-[44px] rounded-full bg-white/10 flex items-center justify-center"
        aria-label="Đóng"
      >
        <X className="w-6 h-6" />
      </button>

      {media.length > 1 && (
        <>
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() => onIndexChange(index - 1)}
            className="absolute left-3 top-1/2 z-20 min-h-[44px] min-w-[44px] -translate-y-1/2 rounded-full bg-white/10 disabled:opacity-25 flex items-center justify-center"
            aria-label="Media trước"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => onIndexChange(index + 1)}
            className="absolute right-3 top-1/2 z-20 min-h-[44px] min-w-[44px] -translate-y-1/2 rounded-full bg-white/10 disabled:opacity-25 flex items-center justify-center"
            aria-label="Media sau"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <div className="w-full h-full max-h-[100dvh] p-4 pt-16 pb-[calc(env(safe-area-inset-bottom)+24px)] flex items-center justify-center">
        {item.media_type === 'video' ? (
          <video
            src={url}
            controls
            playsInline
            preload="metadata"
            className="max-h-full max-w-full rounded-lg"
          />
        ) : (
          <img src={url} alt={title} className="max-h-full max-w-full object-contain rounded-lg" />
        )}
      </div>
    </div>
  );
}
