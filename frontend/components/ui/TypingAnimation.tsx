'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TypingAnimationProps {
  texts: string[];
  speed?: number;
  deleteSpeed?: number;
  pauseTime?: number;
  className?: string;
  gradient?: string;
  showCursor?: boolean;
}

export const TypingAnimation: React.FC<TypingAnimationProps> = ({
  texts,
  speed = 100,
  deleteSpeed = 50,
  pauseTime = 2000,
  className = '',
  gradient = 'from-teal-400 via-purple-500 to-pink-500',
  showCursor = true,
}) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const currentFullText = texts[currentTextIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (currentText.length < currentFullText.length) {
          setCurrentText(currentFullText.slice(0, currentText.length + 1));
        } else {
          // Finished typing, pause then start deleting
          setIsPaused(true);
          setTimeout(() => {
            setIsPaused(false);
            setIsDeleting(true);
          }, pauseTime);
        }
      } else {
        // Deleting
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1));
        } else {
          // Finished deleting, move to next text
          setIsDeleting(false);
          setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, isDeleting ? deleteSpeed : speed);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, isPaused, currentTextIndex, texts, speed, deleteSpeed, pauseTime]);

  return (
    <span className={`inline-block relative ${className}`}>
      <motion.span
        className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent relative`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {currentText}
        {/* Glow effect on text */}
        <motion.span
          className={`absolute inset-0 bg-gradient-to-r ${gradient} bg-clip-text text-transparent blur-sm opacity-50`}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {currentText}
        </motion.span>
      </motion.span>
      {showCursor && (
        <motion.span
          className={`inline-block w-[2px] h-[1em] ml-1 relative`}
          style={{
            background: `linear-gradient(to bottom, 
              ${gradient.includes('teal') ? '#14b8a6' : '#ec4899'}, 
              ${gradient.includes('purple') ? '#a855f7' : '#3b82f6'}, 
              ${gradient.includes('pink') ? '#ec4899' : '#14b8a6'})`,
            boxShadow: `0 0 8px ${gradient.includes('teal') ? 'rgba(20, 184, 166, 0.8)' : 'rgba(236, 72, 153, 0.8)'}`,
          }}
          animate={{ 
            opacity: [1, 0, 1],
            scaleY: [1, 0.8, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </span>
  );
};

