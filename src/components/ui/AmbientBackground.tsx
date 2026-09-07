'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function AmbientBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Floating Heart 1 */}
      <motion.div
        initial={{ y: '100vh', opacity: 0, x: '10vw' }}
        animate={{
          y: ['100vh', '-10vh'],
          opacity: [0, 0.25, 0.25, 0],
          x: ['10vw', '15vw', '8vw'],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'linear',
          delay: 0,
        }}
        className="absolute text-rose-300 text-xl font-sans"
      >
        🌸
      </motion.div>

      {/* Floating Heart 2 */}
      <motion.div
        initial={{ y: '100vh', opacity: 0, x: '80vw' }}
        animate={{
          y: ['100vh', '-10vh'],
          opacity: [0, 0.2, 0.2, 0],
          x: ['80vw', '75vw', '83vw'],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'linear',
          delay: 4,
        }}
        className="absolute text-rose-400 text-lg font-sans"
      >
        ❤️
      </motion.div>

      {/* Floating Sparkle 3 */}
      <motion.div
        initial={{ y: '100vh', opacity: 0, x: '45vw' }}
        animate={{
          y: ['100vh', '-10vh'],
          opacity: [0, 0.2, 0.2, 0],
          x: ['45vw', '50vw', '42vw'],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: 'linear',
          delay: 8,
        }}
        className="absolute text-amber-300 text-base font-sans"
      >
        ✨
      </motion.div>

      {/* Ambient Gradient Glow Orbs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-rose-200/20 dark:bg-rose-950/15 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-lavender-200/20 dark:bg-purple-950/15 rounded-full blur-3xl" />
    </div>
  );
}
