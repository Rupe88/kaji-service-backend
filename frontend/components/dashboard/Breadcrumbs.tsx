'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface BreadcrumbItem {
  label: string;
  href: string;
}

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/profile': 'Profile',
  '/dashboard/jobs': 'Jobs',
  '/dashboard/applications': 'Applications',
  '/dashboard/training': 'Training',
  '/dashboard/training/my-trainings': 'My Trainings',
  '/dashboard/employer/training': 'My Courses',
  '/dashboard/employer/training/create': 'Create Course',
  '/dashboard/favorites': 'Favorites',
  '/dashboard/wallet': 'Wallet',
  '/dashboard/history': 'History',
  '/dashboard/settings': 'Settings',
};

export const Breadcrumbs: React.FC = () => {
  const pathname = usePathname();
  
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/dashboard' },
    ];

    if (paths.length > 1) {
      const currentPath = `/${paths.join('/')}`;
      const label = routeLabels[currentPath] || paths[paths.length - 1].charAt(0).toUpperCase() + paths[paths.length - 1].slice(1);
      breadcrumbs.push({
        label,
        href: currentPath,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const isDashboard = pathname === '/dashboard';

  if (isDashboard) {
    return null; // Don't show breadcrumbs on main dashboard
  }

  return (
    <nav className="flex items-center gap-2 text-sm">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <React.Fragment key={crumb.href}>
            {isLast ? (
              <span className="text-white font-semibold">{crumb.label}</span>
            ) : (
              <>
                <Link
                  href={crumb.href}
                  className="text-gray-400 hover:text-teal-400 transition-colors"
                >
                  {crumb.label}
                </Link>
                <svg
                  className="w-4 h-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

