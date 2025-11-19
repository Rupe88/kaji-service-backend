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
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-400 to-purple-600 rounded-lg flex items-center justify-center"
            style={{
              boxShadow: '0 0 20px rgba(20, 184, 166, 0.5)',
            }}
          >
            <span className="text-xl sm:text-2xl font-bold text-white">T</span>
          </motion.div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-teal-400 to-purple-600 bg-clip-text text-transparent">
            HR PLATFORM
          </h1>
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
              <Link href="/jobs" className="text-gray-300 hover:text-white transition-colors text-sm lg:text-base">
                Jobs
              </Link>
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors text-sm lg:text-base">
                Dashboard
              </Link>
              {user && (
                <span className="text-gray-300 text-sm lg:text-base">
                  {user.firstName} {user.lastName}
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={logout} className="text-xs sm:text-sm">
              Logout
            </Button>
          </>
        ) : (
          <>
            <Link href="/auth/login">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
                LOGIN
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="primary" size="sm" style={{ background: 'oklch(0.65 0.2 300)' }} className="text-xs sm:text-sm px-3 sm:px-4">
                REGISTER
              </Button>
            </Link>
          </>
        )}
      </motion.div>
    </nav>
  );
};

