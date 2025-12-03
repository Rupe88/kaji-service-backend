/**
 * Theme Constants
 * Centralized color theme using oklch color system
 * All components should use these constants for consistency
 */

export const THEME = {
  // Background Colors
  background: {
    primary: 'oklch(0.06 0 0)',
    card: 'oklch(0.1 0 0 / 0.8)',
    cardHover: 'oklch(0.1 0 0 / 0.9)',
    overlay: 'oklch(0.1 0 0 / 0.6)',
    sidebar: 'oklch(0.1 0 0)',
  },

  // Border Colors
  border: {
    default: 'oklch(0.7 0.15 180 / 0.2)',
    hover: 'oklch(0.7 0.15 180 / 0.5)',
    error: 'oklch(0.65 0.2 330)',
    focus: 'oklch(0.7 0.15 180)',
    subtle: 'oklch(0.17 0 0 / 0.5)',
  },

  // Primary Colors (Teal)
  primary: {
    main: 'oklch(0.7 0.15 180)',
    dark: 'oklch(0.6 0.15 180)',
    light: 'oklch(0.8 0.12 180)',
    bg: 'oklch(0.7 0.15 180 / 0.1)',
    bgHover: 'oklch(0.7 0.15 180 / 0.2)',
  },

  // Accent Colors (Purple)
  accent: {
    main: 'oklch(0.65 0.2 300)',
    dark: 'oklch(0.55 0.2 300)',
    light: 'oklch(0.75 0.18 300)',
    bg: 'oklch(0.65 0.2 300 / 0.1)',
  },

  // Error Colors (Pink/Red)
  error: {
    main: 'oklch(0.65 0.2 330)',
    bg: 'oklch(0.65 0.2 330 / 0.1)',
    border: 'oklch(0.65 0.2 330)',
  },

  // Warning Colors (Orange/Yellow)
  warning: {
    main: 'oklch(0.7 0.15 70)',
    bg: 'oklch(0.7 0.15 70 / 0.1)',
  },

  // Success Colors
  success: {
    main: 'oklch(0.7 0.15 180)',
    bg: 'oklch(0.7 0.15 180 / 0.1)',
  },

  // Text Colors
  text: {
    primary: 'oklch(0.985 0 0)',
    secondary: 'oklch(0.556 0 0)',
    tertiary: 'oklch(0.4 0 0)',
    disabled: 'oklch(0.3 0 0)',
  },

  // Status Colors
  status: {
    open: 'oklch(0.7 0.15 180)',
    inProgress: 'oklch(0.8 0.15 90)',
    completed: 'oklch(0.7 0.15 180)',
    cancelled: 'oklch(0.65 0.2 330)',
    pending: 'oklch(0.8 0.15 90)',
    accepted: 'oklch(0.7 0.15 180)',
    rejected: 'oklch(0.65 0.2 330)',
  },

  // Urgency Colors
  urgency: {
    immediate: 'oklch(0.65 0.2 330)',
    today: 'oklch(0.7 0.15 70)',
    withinHours: 'oklch(0.8 0.15 90)',
  },
} as const;

/**
 * Helper function to get status color
 */
export const getStatusColor = (status: string): string => {
  const statusUpper = status.toUpperCase();
  return THEME.status[statusUpper as keyof typeof THEME.status] || THEME.primary.main;
};

/**
 * Helper function to get urgency color
 */
export const getUrgencyColor = (urgency: string): string => {
  const urgencyUpper = urgency.toUpperCase();
  if (urgencyUpper === 'IMMEDIATE') return THEME.urgency.immediate;
  if (urgencyUpper === 'TODAY') return THEME.urgency.today;
  if (urgencyUpper === 'WITHIN_HOURS') return THEME.urgency.withinHours;
  return THEME.primary.main;
};

/**
 * Helper function to get status background color
 */
export const getStatusBgColor = (status: string): string => {
  const color = getStatusColor(status);
  return `${color} / 0.2`;
};

/**
 * Helper function to get urgency background color
 */
export const getUrgencyBgColor = (urgency: string): string => {
  const color = getUrgencyColor(urgency);
  return `${color} / 0.2`;
};

