import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 
  'onDrag' | 'onDragStart' | 'onDragEnd' | 
  'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  onClick,
  ...props
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastClickTimeRef = useRef<number>(0);

  // Initialize audio context
  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      // Audio context not supported - silently fail
      console.debug('Web Audio API not supported');
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Play click sound
  const playClickSound = () => {
    if (disabled || isLoading || !audioContextRef.current) return;

    // Throttle sound playback
    const now = Date.now();
    if (now - lastClickTimeRef.current < 100) return;
    lastClickTimeRef.current = now;

    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;

      // Resume audio context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies based on variant
      const frequencies: Record<string, number> = {
        primary: 523,    // C note
        secondary: 659,  // E note
        outline: 440,    // A note
        ghost: 392,      // G note
      };

      oscillator.frequency.value = frequencies[variant] || 523;
      oscillator.type = 'sine';

      const currentTime = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.08, currentTime); // Slightly louder for clicks
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.15);

      oscillator.start(currentTime);
      oscillator.stop(currentTime + 0.15);
    } catch (error) {
      // Silently fail if audio is not supported
      console.debug('Click sound playback failed');
    }
  };

  // Handle click with sound
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playClickSound();
    if (onClick) {
      onClick(e);
    }
  };
  const baseStyles = 'font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group uppercase tracking-wider border-2';
  
  const variants = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-[#14b8a6] hover:bg-[#14b8a6]/10 backdrop-blur-sm',
    ghost: 'text-white hover:bg-white/10 border-0',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, #14b8a6 0%, #a855f7 100%)',
          borderColor: '#14b8a6',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          boxShadow: '0 0 20px rgba(20, 184, 166, 0.5), inset 0 0 20px rgba(168, 85, 247, 0.3)',
        };
      case 'secondary':
        return {
          background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
          borderColor: '#a855f7',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          boxShadow: '0 0 20px rgba(168, 85, 247, 0.5), inset 0 0 20px rgba(147, 51, 234, 0.3)',
        };
      case 'outline':
        return {
          borderColor: '#14b8a6',
          background: 'rgba(20, 184, 166, 0.05)',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          boxShadow: '0 0 15px rgba(20, 184, 166, 0.4)',
        };
      default:
        return {
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <motion.button
      whileHover={disabled || isLoading ? {} : {
        scale: 1.02,
        boxShadow: variant === 'primary' 
          ? '0 0 30px rgba(20, 184, 166, 0.7), inset 0 0 30px rgba(168, 85, 247, 0.4)'
          : variant === 'outline'
          ? '0 0 25px rgba(20, 184, 166, 0.6)'
          : '0 0 30px rgba(168, 85, 247, 0.7)',
      }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      style={{
        ...variantStyles,
        fontFamily: 'var(--font-poppins), Poppins, sans-serif',
      }}
      disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      {/* Cyberpunk corner decorations - inner corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/40" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/40" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/40" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/40" />
      
      {/* Outer corner accents */}
      <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-teal-400/60" />
      <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-purple-400/60" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-purple-400/60" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-teal-400/60" />
      
      {/* Animated scan line effect */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
        }}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      />
      
      {/* Glitch effect on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
        style={{
          background: variant === 'primary' 
            ? 'linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(168, 85, 247, 0.1))'
            : variant === 'outline'
            ? 'linear-gradient(135deg, rgba(20, 184, 166, 0.05), transparent)'
            : 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.1))',
        }}
        animate={{
          opacity: [0, 0.3, 0, 0.2, 0],
        }}
        transition={{
          duration: 0.3,
          repeat: Infinity,
          repeatDelay: 3,
        }}
      />
      {isLoading ? (
        <>
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </motion.button>
  );
};

