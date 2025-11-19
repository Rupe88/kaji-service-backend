'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';

export default function IndustrialKYCPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-16">
        <h1 className="text-4xl font-bold text-white mb-8">Industrial KYC</h1>
        <div className="bg-card-bg border border-border rounded-lg p-8">
          <p className="text-gray-400">Industrial KYC form coming in next phase...</p>
        </div>
      </div>
    </div>
  );
}

