'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { SearchBar } from './SearchBar';
import { Breadcrumbs } from './Breadcrumbs';
import { WalletBalance } from './WalletBalance';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-black">
      <Sidebar />
      <main className="lg:ml-64">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 border-b border-gray-800/50 backdrop-blur-xl" style={{
          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
        }}>
          <div className="flex items-center justify-between px-6 py-4 gap-4">
            <div className="flex items-center gap-6 flex-1">
              <Breadcrumbs />
              <SearchBar />
            </div>
            <div className="flex items-center gap-4">
              <WalletBalance />
              <NotificationCenter />
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
};

