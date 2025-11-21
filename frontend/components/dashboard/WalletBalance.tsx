'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { walletApi } from '@/lib/api-client';
import type { WalletBalance as WalletBalanceType } from '@/types/api';
import { useSocket } from '@/hooks/useSocket';
import Link from 'next/link';
import toast from 'react-hot-toast';

export const WalletBalance: React.FC = () => {
  const [balance, setBalance] = useState<WalletBalanceType | null>(null);
  const [loading, setLoading] = useState(true);
  const { coinUpdate, isConnected } = useSocket();

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const data = await walletApi.getBalance();
        setBalance(data);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, []);

  // Update balance when coin update is received via Socket.io
  useEffect(() => {
    if (coinUpdate) {
      // Update balance immediately
      setBalance((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          balance: coinUpdate.balance,
        };
      });

      // Show success toast
      toast.success(
        `🎉 +${coinUpdate.coinsAwarded} coins! ${coinUpdate.description}`,
        {
          duration: 5000,
          icon: '💰',
        }
      );
    }
  }, [coinUpdate]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
        backgroundColor: 'oklch(0.1 0 0 / 0.5)',
      }}>
        <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  const balanceNum = parseFloat(balance.balance);

  return (
    <Link href="/dashboard/wallet">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all relative"
        style={{
          backgroundColor: 'oklch(0.1 0 0 / 0.5)',
        }}
        animate={coinUpdate ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5"
            style={{ color: 'oklch(0.8 0.15 60)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm font-semibold text-white">
            {balanceNum.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <AnimatePresence>
          {coinUpdate && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute -right-2 -top-2 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full"
            >
              +{coinUpdate.coinsAwarded}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Link>
  );
};
