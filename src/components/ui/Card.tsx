'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function Card({ children, className, hoverEffect = true, ...props }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'glass-card rounded-3xl p-5 shadow-soft-sm transition-all duration-300',
        hoverEffect && 'hover:-translate-y-1 hover:shadow-soft-lg',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
