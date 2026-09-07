'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemoryImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  aspectRatio?: string;
  sizes?: string;
}

export function MemoryImage({
  src,
  alt,
  className,
  priority = false,
  aspectRatio = 'aspect-[16/9]',
  sizes = '(max-width: 768px) 100vw, 600px',
}: MemoryImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn('relative overflow-hidden bg-[#FCE7EF]/40 dark:bg-charcoal-800', aspectRatio, className)}>
      {/* Skeleton Shimmer while image is loading */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-10 animate-pulse bg-gradient-to-r from-[#FCE7EF]/40 via-rose-100/60 to-[#FCE7EF]/40 dark:from-charcoal-800 dark:via-charcoal-700 dark:to-charcoal-800" />
      )}

      {/* Fallback UI if image fails to load */}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-rose-50/70 dark:bg-charcoal-800 text-[#81727B] dark:text-gray-400">
          <ImageOff className="w-8 h-8 text-[#E86D91] mb-1 opacity-70" />
          <span className="text-[11px] font-medium">Không thể tải ảnh</span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt || 'Khoảnh khắc kỷ niệm'}
          fill
          priority={priority}
          sizes={sizes}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className={cn(
            'object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
        />
      )}
    </div>
  );
}
