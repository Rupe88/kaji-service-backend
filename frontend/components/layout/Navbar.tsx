'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';

export const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="relative z-50 flex items-center justify-between p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 sm:gap-3"
      >
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative inline-block px-4 sm:px-5 py-2 border-2 border-teal-400/50 bg-black/30 backdrop-blur-sm"
            style={{
              clipPath:
                'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
              boxShadow: '0 0 15px rgba(20, 184, 166, 0.3)',
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
            }}
          >
            {/* Cyberpunk corner decorations - inner corners */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/40" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/40" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/40" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/40" />

            {/* Outer corner accents */}
            <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 border-t border-l border-teal-400/60" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 border-t border-r border-purple-400/60" />
            <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 border-b border-l border-purple-400/60" />
            <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 border-b border-r border-teal-400/60" />

            {/* Animated scan line effect */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
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

            <h1 className="text-sm sm:text-base lg:text-lg font-bold bg-gradient-to-r from-teal-400 to-purple-600 bg-clip-text text-transparent uppercase tracking-wider relative z-10">
              HR PLATFORM
            </h1>
          </motion.div>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 sm:gap-4"
      >
        {isAuthenticated ? (
          <>
            <div className="hidden md:flex items-center gap-4 lg:gap-6">
              <Link
                href="/jobs"
                className="text-gray-300 hover:text-white transition-colors text-sm lg:text-base"
              >
                Jobs
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-300 hover:text-white transition-colors text-sm lg:text-base"
              >
                Dashboard
              </Link>
              {user && (
                <span className="text-gray-300 text-sm lg:text-base">
                  {user.firstName} {user.lastName}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-xs sm:text-sm"
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            <Link href="/auth/login">
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm px-4 sm:px-5 py-2 border-2 hover:bg-teal-400/10"
              >
                LOGIN
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button
                variant="primary"
                size="sm"
                className="text-xs sm:text-sm px-4 sm:px-5 py-2"
              >
                REGISTER
              </Button>
            </Link>
          </>
        )}
      </motion.div>
    </nav>
  );
};
