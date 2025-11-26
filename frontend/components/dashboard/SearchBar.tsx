'use client';

import React, { useState, useEffect, useRef, startTransition } from 'react';
import { motion } from 'framer-motion';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export const SearchBar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevSearchParamRef = useRef<string>('');

  // Sync search query with URL params - update immediately when URL changes
  // Using startTransition to make state update non-blocking and avoid cascading renders
  useEffect(() => {
    const searchParam =
      searchParams.get('search') || searchParams.get('q') || '';
    // Only update if different to avoid unnecessary re-renders and infinite loops
    if (searchParam !== prevSearchParamRef.current) {
      prevSearchParamRef.current = searchParam;
      // Use startTransition to mark this as a non-urgent update, preventing cascading renders
      startTransition(() => {
        setSearchQuery(searchParam);
      });
    }
  }, [searchParams]); // Only depend on searchParams to prevent loops

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // If on jobs page, update search param
    if (pathname === '/dashboard/jobs') {
      const params = new URLSearchParams(searchParams.toString());
      params.set('search', query);
      params.set('page', '1'); // Reset to first page
      router.push(`/dashboard/jobs?${params.toString()}`);
    }
    // If on applications page, update search param
    else if (pathname === '/dashboard/applications') {
      const params = new URLSearchParams(searchParams.toString());
      params.set('search', query);
      params.set('page', '1'); // Reset to first page
      router.push(`/dashboard/applications?${params.toString()}`);
    }
    // Otherwise, navigate to jobs page with search
    else {
      router.push(`/dashboard/jobs?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-2xl">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search jobs, applications..."
          className="w-full pl-12 pr-4 py-2.5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200"
          style={{
            backgroundColor: isFocused
              ? 'oklch(0.15 0 0 / 0.8)'
              : 'oklch(0.1 0 0 / 0.6)',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: isFocused
              ? 'oklch(0.7 0.15 180 / 0.5)'
              : 'oklch(0.7 0.15 180 / 0.2)',
            boxShadow: isFocused
              ? '0 0 0 3px oklch(0.7 0.15 180 / 0.1)'
              : 'none',
          }}
        />
        {searchQuery && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            type="button"
            onClick={() => {
              setSearchQuery('');
              // Clear search in URL
              if (pathname === '/dashboard/jobs') {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('search');
                params.delete('q');
                params.set('page', '1');
                router.push(`/dashboard/jobs?${params.toString()}`);
              } else if (pathname === '/dashboard/applications') {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('search');
                params.set('page', '1');
                router.push(`/dashboard/applications?${params.toString()}`);
              }
            }}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </motion.button>
        )}
      </div>
    </form>
  );
};
