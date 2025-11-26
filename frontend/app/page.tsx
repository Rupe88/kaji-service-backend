'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { TypingAnimation } from '@/components/ui/TypingAnimation';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';
import { TrendingJob, PlatformStatistics } from '@/types/api';
import { useAuth } from '@/hooks/useAuth';

interface FeatureCard {
  title: string;
  description: string;
  icon: string;
  gradient: string;
  color: 'teal' | 'purple' | 'pink' | 'blue' | 'amber' | 'green' | 'violet' | 'yellow' | 'indigo' | 'emerald' | 'cyan' | 'slate';
  features: string[];
}

const hrFeatures: FeatureCard[] = [
  {
    title: 'SECURE AUTHENTICATION',
    description: 'Enterprise-grade security with multi-factor authentication and encryption',
    icon: '',
    gradient: 'from-slate-400 to-gray-600',
    color: 'teal',
    features: ['MFA Support', 'OAuth Integration', 'Password Encryption', 'Session Management', 'Security Alerts'],
  },
  {
    title: 'AI SKILL MATCHING',
    description: 'Intelligent AI-powered matching system that connects candidates with perfect job opportunities',
    icon: '',
    gradient: 'from-purple-400 to-indigo-600',
    color: 'purple',
    features: ['AI Matching', 'Skill Analysis', 'Smart Recommendations', 'Match Scoring', 'Email Notifications'],
  },
  {
    title: 'TRAINING & CERTIFICATIONS',
    description: 'Comprehensive training programs, exams, and verifiable certifications system (LMS)',
    icon: '',
    gradient: 'from-blue-400 to-cyan-600',
    color: 'blue',
    features: ['Training Courses', 'Online Exams', 'Certifications', 'Progress Tracking', 'Coin Rewards'],
  },
  {
    title: 'EVENTS MANAGEMENT',
    description: 'Organize and manage job fairs, workshops, webinars, and networking events',
    icon: '',
    gradient: 'from-amber-400 to-orange-600',
    color: 'amber',
    features: ['Event Creation', 'Registration Management', 'Capacity Control', 'Event Analytics', 'Notifications'],
  },
  {
    title: 'LOCATION-BASED MATCHING',
    description: 'Find jobs and candidates within 30km radius with intelligent geolocation matching',
    icon: '',
    gradient: 'from-pink-400 to-rose-600',
    color: 'pink',
    features: ['30km Radius', 'Distance Filter', 'Nearby Jobs', 'Location Alerts', 'Map Integration'],
  },
  {
    title: 'AI JOB RECOMMENDATION',
    description: 'Smart AI-powered job recommendations based on skills, experience, and preferences',
    icon: '',
    gradient: 'from-violet-400 to-purple-600',
    color: 'violet',
    features: ['Personalized Recommendations', 'Skill-Based Matching', 'Location Preferences', 'Experience Analysis', 'Real-Time Updates'],
  },
];

// Thunderstorm effect for static text
const ThunderstormText: React.FC<{
  text: string;
  gradient: string;
  className?: string;
}> = ({ text, gradient, className = '' }) => {
  const [thunderActive, setThunderActive] = useState(false);
  const [lightningFlash, setLightningFlash] = useState(false);

  useEffect(() => {
    // Random thunder flashes
    const thunderInterval = setInterval(() => {
      setThunderActive(true);
      setLightningFlash(true);
      
      // Multiple lightning flashes
      setTimeout(() => setLightningFlash(false), 50);
      setTimeout(() => setLightningFlash(true), 100);
      setTimeout(() => setLightningFlash(false), 150);
      setTimeout(() => setLightningFlash(true), 200);
      setTimeout(() => {
        setThunderActive(false);
        setLightningFlash(false);
      }, 400);
    }, 4000 + Math.random() * 2000); // Random intervals between 4-6 seconds

    return () => clearInterval(thunderInterval);
  }, []);

  const letters = text.split('');

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Thunder flash overlay - subtle flash */}
      {lightningFlash && (
        <motion.div
          className="absolute inset-0 bg-white opacity-0"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.1, 0.05, 0.1, 0],
          }}
          transition={{
            duration: 0.1,
            times: [0, 0.2, 0.4, 0.6, 1],
          }}
          style={{
            zIndex: 20,
          }}
        />
      )}

      {/* Main text with thunderstorm effect */}
      <div className="relative">
        {letters.map((letter, i) => {
          const isSpace = letter === ' ';
          return (
            <motion.span
              key={i}
              className="inline-block relative"
              initial={{ opacity: 0, y: 30, rotateX: -90 }}
              animate={{
                opacity: 1,
                y: 0,
                rotateX: 0,
              }}
              transition={{
                delay: i * 0.05,
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94], // Cuberto-style easing
              }}
            >
              {/* Base text */}
              <span
                className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold relative z-10`}
                style={{
                  display: 'inline-block',
                }}
              >
                {isSpace ? '\u00A0' : letter}
              </span>

              {/* Thunderstorm lightning overlay */}
              <motion.span
                className={`absolute inset-0 bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold`}
                animate={thunderActive ? {
                  x: [0, -8, 8, -5, 5, -3, 3, 0],
                  y: [0, 4, -4, 2, -2, 1, -1, 0],
                  opacity: [0, 0.3, 0, 0.2, 0, 0.15, 0, 0],
                } : {}}
                transition={{
                  duration: 0.3,
                  times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1],
                }}
              >
                {isSpace ? '\u00A0' : letter}
              </motion.span>

              {/* Lightning bolt streaks - multiple directions */}
              {thunderActive && (
                <>
                  <motion.span
                    className={`absolute inset-0 bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold opacity-30`}
                    animate={{
                      x: [0, 10, -10, 0],
                      opacity: [0, 0.2, 0, 0],
                    }}
                    transition={{
                      duration: 0.1,
                    }}
                  >
                    {isSpace ? '\u00A0' : letter}
                  </motion.span>
                  <motion.span
                    className={`absolute inset-0 bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold opacity-30`}
                    animate={{
                      x: [0, -10, 10, 0],
                      opacity: [0, 0.15, 0, 0],
                    }}
                    transition={{
                      duration: 0.1,
                      delay: 0.05,
                    }}
                  >
                    {isSpace ? '\u00A0' : letter}
                  </motion.span>
                  <motion.span
                    className={`absolute inset-0 bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold opacity-30`}
                    animate={{
                      y: [0, -8, 8, 0],
                      opacity: [0, 0.15, 0, 0],
                    }}
                    transition={{
                      duration: 0.1,
                      delay: 0.1,
                    }}
                  >
                    {isSpace ? '\u00A0' : letter}
                  </motion.span>
                </>
              )}

              {/* Random lightning flashes on individual letters */}
              {lightningFlash && Math.random() > 0.7 && (
                <motion.span
                  className="absolute inset-0 text-white font-bold"
                  animate={{
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 0.05,
                  }}
                  style={{
                    textShadow: `0 0 150px rgba(255, 255, 255, 1)`,
                    mixBlendMode: 'screen',
                    filter: 'brightness(5)',
                  }}
                >
                  {isSpace ? '\u00A0' : letter}
                </motion.span>
              )}
            </motion.span>
          );
        })}
      </div>

      {/* Thunderstorm background glow - pulsing like thunder */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 blur-2xl`}
        animate={{
          opacity: lightningFlash 
            ? [0, 0.8, 0.2, 0.6, 0] 
            : [0, 0.1, 0, 0.05, 0],
          scale: lightningFlash 
            ? [1, 1.3, 1.1, 1.2, 1] 
            : [1, 1.05, 1, 1.02, 1],
        }}
        transition={{
          duration: lightningFlash ? 0.2 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          mixBlendMode: 'screen',
          zIndex: -1,
        }}
      />
    </div>
  );
};

// Thunderstorm effect text component for hero section (rotating text)
const LightningText: React.FC<{
  texts: string[];
  gradient: string;
  className?: string;
}> = ({ texts, gradient, className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thunderActive, setThunderActive] = useState(false);
  const [lightningFlash, setLightningFlash] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger thunderstorm effect before changing text
      setThunderActive(true);
      setLightningFlash(true);
      
      // Multiple lightning flashes
      setTimeout(() => setLightningFlash(false), 50);
      setTimeout(() => setLightningFlash(true), 100);
      setTimeout(() => setLightningFlash(false), 150);
      setTimeout(() => setLightningFlash(true), 200);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % texts.length);
        setThunderActive(false);
        setLightningFlash(false);
      }, 400);
    }, 3000); // Change text every 3 seconds

    // Random thunder flashes
    const thunderInterval = setInterval(() => {
      if (!thunderActive) {
        setLightningFlash(true);
        setTimeout(() => setLightningFlash(false), 30);
        setTimeout(() => setLightningFlash(true), 60);
        setTimeout(() => setLightningFlash(false), 90);
      }
    }, 4000 + Math.random() * 2000); // Random intervals between 4-6 seconds

    return () => {
      clearInterval(interval);
      clearInterval(thunderInterval);
    };
  }, [texts.length, thunderActive]);

  const currentText = texts[currentIndex];
  const letters = currentText.split('');

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Thunder flash overlay - subtle flash */}
      {lightningFlash && (
        <motion.div
          className="absolute inset-0 bg-white opacity-0"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.1, 0.05, 0.1, 0],
          }}
          transition={{
            duration: 0.1,
            times: [0, 0.2, 0.4, 0.6, 1],
          }}
          style={{
            zIndex: 20,
          }}
        />
      )}

      {/* Main text with thunderstorm effect */}
      <div className="relative">
        {letters.map((letter, i) => {
          const isSpace = letter === ' ';
          return (
            <motion.span
              key={`${currentIndex}-${i}`}
              className="inline-block relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: i * 0.03,
                duration: 0.3,
              }}
            >
              {/* Base text */}
              <span
                className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold relative z-10`}
                style={{
                  display: 'inline-block',
                }}
              >
                {isSpace ? '\u00A0' : letter}
              </span>

              {/* Thunderstorm lightning overlay */}
              <motion.span
                className={`absolute inset-0 bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold`}
                animate={thunderActive ? {
                  x: [0, -8, 8, -5, 5, -3, 3, 0],
                  y: [0, 4, -4, 2, -2, 1, -1, 0],
                  opacity: [0, 0.3, 0, 0.2, 0, 0.15, 0, 0],
                } : {}}
                transition={{
                  duration: 0.3,
                  times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1],
                }}
              >
                {isSpace ? '\u00A0' : letter}
              </motion.span>

              {/* Lightning bolt streaks - multiple directions */}
              {thunderActive && (
                <>
                  <motion.span
                    className={`absolute inset-0 bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold opacity-30`}
                    animate={{
                      x: [0, 10, -10, 0],
                      opacity: [0, 0.2, 0, 0],
                    }}
                    transition={{
                      duration: 0.1,
                    }}
                  >
                    {isSpace ? '\u00A0' : letter}
                  </motion.span>
                  <motion.span
                    className={`absolute inset-0 bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold opacity-30`}
                    animate={{
                      x: [0, -10, 10, 0],
                      opacity: [0, 0.15, 0, 0],
                    }}
                    transition={{
                      duration: 0.1,
                      delay: 0.05,
                    }}
                  >
                    {isSpace ? '\u00A0' : letter}
                  </motion.span>
                  <motion.span
                    className={`absolute inset-0 bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold opacity-30`}
                    animate={{
                      y: [0, -8, 8, 0],
                      opacity: [0, 0.15, 0, 0],
                    }}
                    transition={{
                      duration: 0.1,
                      delay: 0.1,
                    }}
                  >
                    {isSpace ? '\u00A0' : letter}
                  </motion.span>
                </>
              )}
            </motion.span>
          );
        })}
      </div>

      {/* Subtle background effect */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 blur-2xl`}
        animate={{
          opacity: [0, 0.05, 0, 0.02, 0],
          scale: [1, 1.02, 1, 1.01, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          zIndex: -1,
        }}
      />
    </div>
  );
};

// Cuberto-style animated text component with letter-by-letter reveal
const AnimatedText: React.FC<{
  text: string;
  gradient: string;
  delay?: number;
  isHovered?: boolean;
}> = ({ text, gradient, delay = 0, isHovered = false }) => {
  const letters = text.split('');
  const [isInView, setIsInView] = useState(false);

  return (
    <div 
      className="relative inline-block overflow-hidden"
      onMouseEnter={() => setIsInView(true)}
      onMouseLeave={() => setIsInView(false)}
    >
      {/* Split text effect - top and bottom halves */}
      <div className="relative">
        {letters.map((letter, i) => {
          const isSpace = letter === ' ';
          return (
            <motion.span
              key={i}
              className="inline-block relative"
              initial={{ opacity: 0, y: 30, rotateX: -90 }}
              animate={{
                opacity: 1,
                y: 0,
                rotateX: 0,
              }}
              transition={{
                delay: delay + i * 0.02,
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94], // Cuberto-style easing
              }}
              whileHover={isHovered ? {
                y: [-1, 1, -1, 1, 0],
                transition: { duration: 0.4 },
              } : {}}
            >
              {/* Main text with gradient */}
              <span
                className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold text-xl sm:text-2xl lg:text-3xl`}
                style={{
                  display: 'inline-block',
                  textShadow: `0 0 30px rgba(20, 184, 166, 0.4)`,
                  transform: 'perspective(1000px)',
                }}
              >
                {isSpace ? '\u00A0' : letter}
              </span>
              
              {/* Glitch effect overlay on hover */}
              {isHovered && (
                <motion.span
                  className={`absolute inset-0 bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold text-xl sm:text-2xl lg:text-3xl`}
                  animate={{
                    x: [0, -2, 2, -2, 0],
                    opacity: [0, 0.8, 0, 0.8, 0],
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                  style={{
                    textShadow: `0 0 20px rgba(168, 85, 247, 0.6)`,
                  }}
                >
                  {isSpace ? '\u00A0' : letter}
                </motion.span>
              )}
            </motion.span>
          );
        })}
      </div>
      
      {/* Animated underline effect */}
      <motion.div
        className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r ${gradient}`}
        initial={{ width: 0 }}
        animate={{ width: isHovered ? '100%' : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
    </div>
  );
};

// Kanban Board Component
const KanbanBoard: React.FC = () => {
  const [columns, setColumns] = useState<Record<string, FeatureCard[]>>({
    'features': hrFeatures.slice(0, 2),
    'in-progress': hrFeatures.slice(2, 4),
    'completed': hrFeatures.slice(4, 6),
  });

  const [draggedCard, setDraggedCard] = useState<{ feature: FeatureCard; sourceColumn: string } | null>(null);

  const columnConfig = [
    { id: 'features', title: 'Features', gradient: 'from-teal-400 to-cyan-600' },
    { id: 'in-progress', title: 'In Progress', gradient: 'from-purple-400 to-indigo-600' },
    { id: 'completed', title: 'Completed', gradient: 'from-emerald-400 to-teal-600' },
  ];

  const handleDragStart = (feature: FeatureCard, sourceColumn: string) => {
    setDraggedCard({ feature, sourceColumn });
  };

  const handleDrop = (targetColumn: string) => {
    if (!draggedCard || draggedCard.sourceColumn === targetColumn) {
      setDraggedCard(null);
      return;
    }

    const sourceColumn = [...columns[draggedCard.sourceColumn]];
    const destColumn = [...columns[targetColumn]];
    
    // Remove from source
    const cardIndex = sourceColumn.findIndex(card => card.title === draggedCard.feature.title);
    if (cardIndex === -1) {
      setDraggedCard(null);
      return;
    }
    
    const [removed] = sourceColumn.splice(cardIndex, 1);
    destColumn.push(removed);

    setColumns({
      ...columns,
      [draggedCard.sourceColumn]: sourceColumn,
      [targetColumn]: destColumn,
    });

    setDraggedCard(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 w-full">
      {columnConfig.map((column) => (
        <KanbanColumn
          key={column.id}
          columnId={column.id}
          title={column.title}
          gradient={column.gradient}
          cards={columns[column.id]}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          isDragging={draggedCard !== null}
        />
      ))}
    </div>
  );
};

// Kanban Column Component
const KanbanColumn: React.FC<{
  columnId: string;
  title: string;
  gradient: string;
  cards: FeatureCard[];
  onDragStart: (feature: FeatureCard, sourceColumn: string) => void;
  onDrop: (targetColumn: string) => void;
  isDragging: boolean;
}> = ({ columnId, title, gradient, cards, onDragStart, onDrop, isDragging }) => {
  const [isOver, setIsOver] = useState(false);

  return (
    <motion.div
      className="flex-1 min-w-[280px] sm:min-w-[320px]"
      onDragOver={(e) => {
        e.preventDefault();
        if (isDragging) setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        onDrop(columnId);
      }}
    >
      <div
        className={`
          relative p-2 sm:p-4
          min-h-[600px]
          transition-all duration-300
        `}
      >
        {/* Cards Container */}
        <div className="space-y-4">
          {cards.map((feature, index) => (
            <FeatureCard
              key={`${columnId}-${index}`}
              feature={feature}
              index={index}
              columnId={columnId}
              onDragStart={() => onDragStart(feature, columnId)}
            />
          ))}
        </div>

        {/* Drop Zone Indicator */}
        {isOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 border-2 border-dashed border-teal-400 rounded-xl bg-teal-400/10 pointer-events-none z-10"
          />
        )}
      </div>
    </motion.div>
  );
};

const FeatureCard: React.FC<{
  feature: FeatureCard;
  index: number;
  columnId?: string;
  onDragStart?: () => void;
}> = ({ feature, index, columnId, onDragStart }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const lastPlayTimeRef = React.useRef<number>(0);

  // Initialize audio context
  React.useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      // Audio context not supported
      console.debug('Web Audio API not supported');
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Play sound on hover
  React.useEffect(() => {
    if (!isHovered || !audioContextRef.current || isDragging) return;

    // Throttle sound playback to avoid too many sounds
    const now = Date.now();
    if (now - lastPlayTimeRef.current < 150) return;
    lastPlayTimeRef.current = now;

    const createBeepSound = () => {
      try {
        const audioContext = audioContextRef.current;
        if (!audioContext) return;

        // Resume audio context if suspended (required by some browsers)
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Different frequencies for different features
        const frequencies = [440, 523, 659, 784, 880, 1047]; // Musical notes (A, C, E, G, A, C)
        const frequency = frequencies[index % frequencies.length];
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        const currentTime = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.05, currentTime); // Very quiet
        gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.1);

        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.1);
      } catch (error) {
        // Silently fail if audio is not supported
        console.debug('Sound playback failed');
      }
    };

    createBeepSound();
  }, [isHovered, index, isDragging]);

  const borderColorMap: Record<string, string> = {
    teal: 'hover:border-teal-400 shadow-[0_0_30px_rgba(20,184,166,0.3)]',
    purple: 'hover:border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    pink: 'hover:border-pink-400 shadow-[0_0_30px_rgba(236,72,153,0.3)]',
    blue: 'hover:border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)]',
    amber: 'hover:border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)]',
    green: 'hover:border-green-400 shadow-[0_0_30px_rgba(74,222,128,0.3)]',
    violet: 'hover:border-violet-400 shadow-[0_0_30px_rgba(139,92,246,0.3)]',
    yellow: 'hover:border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)]',
    indigo: 'hover:border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.3)]',
    emerald: 'hover:border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    cyan: 'hover:border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]',
    slate: 'hover:border-slate-400 shadow-[0_0_30px_rgba(148,163,184,0.3)]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
      whileHover={!isDragging ? { scale: 1.02, y: -5 } : {}}
      whileDrag={{ 
        scale: 1.05, 
        rotate: 2,
        zIndex: 1000,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      }}
      drag
      dragElastic={0.2}
      dragMomentum={false}
      onDragStart={() => {
        setIsDragging(true);
        if (onDragStart) onDragStart();
      }}
      onDragEnd={() => setIsDragging(false)}
      layout
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="cursor-grab active:cursor-grabbing"
    >
      <motion.div
        className={`
          relative p-6 sm:p-8 lg:p-10
          bg-gray-900/40 backdrop-blur-md
          border-2 border-gray-700
          transition-all duration-500
          ${borderColorMap[feature.color]}
          group
          overflow-hidden
          w-full
        `}
        style={{
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
        }}
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

        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 -z-10`}
          animate={{ opacity: isHovered ? 0.1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          }}
        />

        {/* Animated Title with Cuberto-style letter reveal */}
        <div className="mb-6 sm:mb-8 min-h-[4rem] sm:min-h-[5rem] flex items-start">
          <div className="w-full">
            <AnimatedText
              text={feature.title}
              gradient={feature.gradient}
              delay={0.1 + index * 0.05}
              isHovered={isHovered}
            />
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 + index * 0.05, duration: 0.6 }}
          className="text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 leading-relaxed"
        >
          {feature.description}
        </motion.p>

        <motion.ul
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
          }}
          transition={{ duration: 0.3 }}
          className="mb-4 space-y-1"
        >
          {feature.features.map((item, i) => (
            <li
              key={i}
              className="text-xs text-gray-400 flex items-center gap-2"
            >
              <span
                className={`w-1 h-1 rounded-full bg-gradient-to-r ${feature.gradient}`}
              />
              {item}
            </li>
          ))}
        </motion.ul>

      </motion.div>
    </motion.div>
  );
};

// Testimonials Carousel Component
const TestimonialsCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'HR Director',
      company: 'TechCorp Inc.',
      image: '👩‍💼',
      rating: 5,
      text: 'HR Platform has revolutionized our recruitment process. The AI matching system saves us hours of screening time, and we\'ve found exceptional talent faster than ever.',
      gradient: 'from-teal-400 to-cyan-500',
    },
    {
      name: 'Michael Chen',
      role: 'Software Engineer',
      company: 'StartupXYZ',
      image: '👨‍💻',
      rating: 5,
      text: 'As a job seeker, the location-based matching helped me find the perfect role near me. The platform is intuitive and the application process is seamless.',
      gradient: 'from-purple-400 to-pink-500',
    },
    {
      name: 'Emily Rodriguez',
      role: 'Talent Acquisition Manager',
      company: 'Global Solutions',
      image: '👩‍💼',
      rating: 5,
      text: 'The analytics dashboard provides incredible insights into our hiring funnel. We\'ve reduced time-to-hire by 40% and improved candidate quality significantly.',
      gradient: 'from-blue-400 to-indigo-500',
    },
    {
      name: 'David Park',
      role: 'Product Manager',
      company: 'InnovateLabs',
      image: '👨‍💼',
      rating: 5,
      text: 'The skill matching algorithm is incredibly accurate. We\'ve hired candidates who perfectly fit our team culture and technical requirements.',
      gradient: 'from-amber-400 to-orange-500',
    },
    {
      name: 'Lisa Thompson',
      role: 'Career Coach',
      company: 'CareerBoost',
      image: '👩‍🏫',
      rating: 5,
      text: 'My clients love the platform. The training and certification features help job seekers upskill and stand out in the competitive job market.',
      gradient: 'from-emerald-400 to-teal-500',
    },
    {
      name: 'James Wilson',
      role: 'CEO',
      company: 'ScaleUp Ventures',
      image: '👨‍💼',
      rating: 5,
      text: 'HR Platform has become essential to our hiring strategy. The quality of candidates and the efficiency of the platform is unmatched.',
      gradient: 'from-violet-400 to-purple-500',
    },
  ];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      if (newDirection === 1) {
        return prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1;
      } else {
        return prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1;
      }
    });
  };

  // Auto-play carousel
  useEffect(() => {
    const interval = setInterval(() => {
      paginate(1);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [currentIndex]);

  const currentTestimonial = testimonials[currentIndex];
  const nextIndex = currentIndex === testimonials.length - 1 ? 0 : currentIndex + 1;
  const prevIndex = currentIndex === 0 ? testimonials.length - 1 : currentIndex - 1;

  return (
    <div className="relative">
      {/* Main Carousel Container */}
      <div className="relative h-[400px] sm:h-[450px] lg:h-[500px] overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative p-8 sm:p-10 lg:p-12 rounded-2xl border-2 border-gray-700 bg-gray-900/60 backdrop-blur-xl overflow-hidden group">
                {/* Gradient Background */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${currentTestimonial.gradient} opacity-10 -z-10`}
                  animate={{ opacity: [0.05, 0.15, 0.05] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />

                {/* Corner Decorations */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-teal-400/50" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-purple-400/50" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-purple-400/50" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-teal-400/50" />

                {/* Content */}
                <div className="relative z-10">
                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(currentTestimonial.rating)].map((_, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="text-2xl"
                      >
                        ⭐
                      </motion.span>
                    ))}
                  </div>

                  {/* Testimonial Text */}
                  <motion.blockquote
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg sm:text-xl lg:text-2xl text-white font-medium mb-8 leading-relaxed"
                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                  >
                    "{currentTestimonial.text}"
                  </motion.blockquote>

                  {/* Author Info */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-purple-600 flex items-center justify-center text-3xl border-2 border-white/20">
                      {currentTestimonial.image}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-lg">
                        {currentTestimonial.name}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {currentTestimonial.role} at {currentTestimonial.company}
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Animated Scan Line */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                  }}
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          onClick={() => paginate(-1)}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-teal-400/50 bg-black/50 backdrop-blur-sm flex items-center justify-center text-teal-400 hover:bg-teal-400/10 hover:border-teal-400 transition-all duration-300 group"
          style={{
            clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
          }}
        >
          <motion.svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            whileHover={{ x: -2 }}
            className="group-hover:text-teal-300"
          >
            <path d="M15 18l-6-6 6-6" />
          </motion.svg>
        </button>

        <button
          onClick={() => paginate(1)}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-purple-400/50 bg-black/50 backdrop-blur-sm flex items-center justify-center text-purple-400 hover:bg-purple-400/10 hover:border-purple-400 transition-all duration-300 group"
          style={{
            clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
          }}
        >
          <motion.svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            whileHover={{ x: 2 }}
            className="group-hover:text-purple-300"
          >
            <path d="M9 18l6-6-6-6" />
          </motion.svg>
        </button>
      </div>

      {/* Dots Indicator */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
            className="relative"
          >
            <motion.div
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-teal-400'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
              animate={{
                scale: index === currentIndex ? 1.5 : 1,
                opacity: index === currentIndex ? 1 : 0.5,
              }}
            />
            {index === currentIndex && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-teal-400"
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Preview Cards (Next/Previous) */}
      <div className="hidden lg:flex items-center justify-center gap-4 mt-8">
        <motion.div
          className="w-32 h-24 rounded-lg border border-gray-700 bg-gray-900/40 backdrop-blur-sm overflow-hidden opacity-50 cursor-pointer hover:opacity-75 transition-opacity"
          onClick={() => paginate(-1)}
          whileHover={{ scale: 1.05 }}
        >
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-purple-600 flex items-center justify-center text-xs">
                {testimonials[prevIndex].image}
              </div>
              <div className="text-xs text-white font-medium truncate">
                {testimonials[prevIndex].name}
              </div>
            </div>
            <p className="text-xs text-gray-400 line-clamp-2">
              {testimonials[prevIndex].text}
            </p>
          </div>
        </motion.div>

        <motion.div
          className="w-32 h-24 rounded-lg border border-gray-700 bg-gray-900/40 backdrop-blur-sm overflow-hidden opacity-50 cursor-pointer hover:opacity-75 transition-opacity"
          onClick={() => paginate(1)}
          whileHover={{ scale: 1.05 }}
        >
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-purple-600 flex items-center justify-center text-xs">
                {testimonials[nextIndex].image}
              </div>
              <div className="text-xs text-white font-medium truncate">
                {testimonials[nextIndex].name}
              </div>
            </div>
            <p className="text-xs text-gray-400 line-clamp-2">
              {testimonials[nextIndex].text}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const { scrollY } = useScroll();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [trendingJobs, setTrendingJobs] = useState<TrendingJob[]>([]);
  const [statistics, setStatistics] = useState<PlatformStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect to dashboard if already authenticated (no flash)
  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  const particles = useMemo(
    () =>
      [...Array(30)].map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 2,
        size: Math.random() * 3 + 2,
      })),
    []
  );

  // Parallax effects
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  React.useEffect(() => {
    // Only fetch data if user is not authenticated
    if (!authLoading && !isAuthenticated) {
      const fetchData = async () => {
        try {
          const [jobsData, statsData] = await Promise.allSettled([
            apiClient.get<TrendingJob[]>(API_ENDPOINTS.TRENDING.JOBS).catch(() => null),
            apiClient.get<PlatformStatistics>(API_ENDPOINTS.ANALYTICS.PLATFORM).catch(() => null),
          ]);

          if (jobsData.status === 'fulfilled' && jobsData.value) {
            setTrendingJobs(jobsData.value || []);
          }

          if (statsData.status === 'fulfilled' && statsData.value) {
            setStatistics(statsData.value);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    } else if (!authLoading && isAuthenticated) {
      // If authenticated, stop loading immediately (will redirect)
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  // Show loading state while checking authentication or fetching data
  if (authLoading || (loading && !isAuthenticated)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render landing page if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(oklch(0.7 0.15 180 / 0.1) 1px, transparent 1px),
              linear-gradient(90deg, oklch(0.7 0.15 180 / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 100%)',
          }}
        />
      </div>

      {/* Animated Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: i % 3 === 0 ? 'oklch(0.7 0.15 180)' : i % 3 === 1 ? 'oklch(0.65 0.2 300)' : 'oklch(0.65 0.2 330)',
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
            }}
          />
        ))}
      </div>

      {/* Mouse Tracking Glow */}
      <motion.div
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, oklch(0.7 0.15 180 / 0.2) 0%, transparent 70%)',
        }}
        animate={{
          x: mousePosition.x - 192,
          y: mousePosition.y - 192,
        }}
        transition={{ type: 'spring', damping: 30 }}
      />

      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <motion.div
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 py-20 sm:py-24"
      >
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
            style={{
              background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.4), rgba(168, 85, 247, 0.4))',
            }}
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.4), rgba(168, 85, 247, 0.4))',
            }}
            animate={{
              x: [0, -50, 0],
              y: [0, -30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
          />
          {/* Animated grid overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(20, 184, 166, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(20, 184, 166, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto w-full relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8 sm:space-y-10 lg:space-y-12"
          >
            {/* Main Title */}
            <div className="space-y-4 sm:space-y-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
              >
                <ThunderstormText
                  text="HR PLATFORM"
                  gradient="from-teal-400 via-purple-500 to-pink-500"
                  className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl block"
                />
              </motion.div>
              
              <motion.div
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <LightningText
                  texts={[
                    'TALENT ACQUISITION',
                    'SKILL MATCHING',
                    'CAREER GROWTH',
                    'JOB POSTING',
                    'LOCATION-BASED',
                  ]}
                  gradient="from-pink-500 via-purple-500 to-teal-400"
                  className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold block"
                />
              </motion.div>
            </div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="max-w-3xl mx-auto relative"
            >
              <p className="text-lg sm:text-xl md:text-2xl leading-relaxed font-light bg-gradient-to-r from-teal-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Connect talent with opportunity. Find your dream job or the perfect candidate with our intelligent, location-based matching platform.
              </p>
              {/* Glowing background effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-teal-400/20 via-purple-400/20 to-pink-400/20 blur-3xl -z-10"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center pt-4"
            >
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:min-w-[240px] text-base sm:text-lg px-8 py-4">
                  Get Started
                </Button>
              </Link>
              <Link 
                href={isAuthenticated ? "/dashboard/jobs" : "/auth/login"} 
                className="w-full sm:w-auto"
              >
                <Button variant="outline" size="lg" className="w-full sm:min-w-[240px] text-base sm:text-lg px-8 py-4">
                  Explore Jobs
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Video Demo Section */}
      <section className="relative z-10 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8 sm:mb-12 lg:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              <span className="bg-gradient-to-r from-teal-400 to-purple-600 bg-clip-text text-transparent">
                See It In Action
              </span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              Watch how HR Platform transforms your recruitment process
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative rounded-2xl overflow-hidden border-2 border-gray-700 bg-gray-900/40 backdrop-blur-md shadow-2xl"
            style={{
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="aspect-video relative bg-black">
              <video
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                controls
              >
                <source src="/hr-plat.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              {/* Optional: Gradient overlay for better text readability if needed */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Cards Kanban Section */}
      <section className="relative z-10 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-8 sm:mb-12 text-center"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
              <span className="bg-gradient-to-r from-teal-400 to-purple-600 bg-clip-text text-transparent">
                Our Features
              </span>
            </h2>
            <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
              Drag and drop cards between columns to explore our platform features
            </p>
          </motion.div>
          <KanbanBoard />
        </div>
      </section>

      {/* Testimonials Carousel Section */}
      <section className="relative z-10 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              <span className="bg-gradient-to-r from-teal-400 to-purple-600 bg-clip-text text-transparent">
                What Our Users Say
              </span>
            </h2>
            <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
              Trusted by thousands of companies and job seekers worldwide
            </p>
          </motion.div>

          <TestimonialsCarousel />
        </div>
      </section>

      {/* Statistics Section */}
      {statistics && (
        <section className="relative z-10 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12 lg:mb-16"
            >
              {[
                { label: 'Total Users', value: statistics.totalUsers ?? 0, color: 'oklch(0.7 0.15 180)' },
                { label: 'Total Jobs', value: statistics.totalJobs ?? 0, color: 'oklch(0.65 0.2 300)' },
                { label: 'Active Jobs', value: statistics.activeJobs ?? 0, color: 'oklch(0.65 0.2 330)' },
                { label: 'Applications', value: statistics.totalApplications ?? 0, color: 'oklch(0.6 0.15 250)' },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="p-4 sm:p-6 rounded-xl border-2 border-gray-700 bg-gray-900/40 backdrop-blur-md text-center group cursor-pointer transition-all duration-300 hover:border-teal-400"
                >
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-1 sm:mb-2" style={{ color: stat.color }}>
                    {stat.value.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-xs sm:text-sm font-medium uppercase tracking-wider">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Trending Jobs Section */}
      {trendingJobs.length > 0 && (
        <section className="relative z-10 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-8 sm:mb-12 lg:mb-16"
            >
              <span className="bg-gradient-to-r from-teal-400 to-purple-600 bg-clip-text text-transparent">
                Trending Jobs
              </span>
            </motion.h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {trendingJobs.slice(0, 6).map((item, index) => (
                <motion.div
                  key={item.jobId}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.03, y: -8 }}
                  className="p-6 rounded-2xl border-2 border-gray-700 bg-gray-900/40 backdrop-blur-md transition-all duration-300 cursor-pointer group hover:border-teal-400"
                  style={{
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-teal-400 transition-colors duration-300">
                    {item.job.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">{item.job.description}</p>
                  <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-700">
                    <span className="font-medium" style={{ color: 'oklch(0.7 0.15 180)' }}>
                      {item.applicationCount || 0} applications
                    </span>
                    <span className="text-gray-500">{item.viewCount || 0} views</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="relative z-10 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              <span className="bg-gradient-to-r from-teal-400 to-purple-600 bg-clip-text text-transparent">
                Ready to Transform Your HR?
              </span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto px-4">
              Join thousands of companies using HR Platform to find the best talent and grow their teams.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center px-4">
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:min-w-[240px] text-base sm:text-lg px-8 py-4">
                  Start Free Trial
                </Button>
              </Link>
              <Link 
                href={isAuthenticated ? "/dashboard/jobs" : "/auth/login"} 
                className="w-full sm:w-auto"
              >
                <Button variant="outline" size="lg" className="w-full sm:min-w-[240px] text-base sm:text-lg px-8 py-4">
                  {isAuthenticated ? "Explore Jobs" : "Sign In"}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Animated Scanning Line */}
      <motion.div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent"
        animate={{ y: ['0vh', '100vh'] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Corner Decorations */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-4 border-l-4 border-teal-400 opacity-30" />
      <div className="absolute top-0 right-0 w-32 h-32 border-t-4 border-r-4 border-pink-400 opacity-30" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-b-4 border-l-4 border-purple-400 opacity-30" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-4 border-r-4 border-teal-400 opacity-30" />
      
      <Footer />
    </div>
  );
}
