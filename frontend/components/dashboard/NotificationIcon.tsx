'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationIcon: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-all duration-200"
        style={{
          backgroundColor: isOpen ? 'oklch(0.15 0 0 / 0.5)' : 'transparent',
        }}
      >
        <svg
          className="w-6 h-6 text-gray-300 hover:text-white transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {hasNotifications && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"
          />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-12 w-80 rounded-2xl border-2 backdrop-blur-xl shadow-2xl z-50"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.95)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <div className="p-4 border-b border-gray-800/50">
                <h3 className="text-white font-semibold text-lg">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {hasNotifications ? (
                  <div className="p-4 space-y-3">
                    {/* Notification items will go here */}
                    <p className="text-gray-400 text-sm text-center py-8">
                      No new notifications
                    </p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <svg
                      className="w-12 h-12 mx-auto mb-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    <p className="text-gray-400 text-sm">No notifications yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

