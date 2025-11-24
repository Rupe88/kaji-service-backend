'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { trainingApi } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface TimeTrackerProps {
  enrollmentId: string;
  initialTimeSpent: number; // in minutes
  onTimeUpdate?: (minutes: number) => void;
}

export const TimeTracker: React.FC<TimeTrackerProps> = ({
  enrollmentId,
  initialTimeSpent,
  onTimeUpdate,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeSpent, setTimeSpent] = useState(initialTimeSpent); // Total time in minutes
  const [sessionTime, setSessionTime] = useState(0); // Current session time in seconds
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  // Format time display
  const formatTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatSessionTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  // Save time to backend
  const saveTime = async (newTimeSpent: number) => {
    if (saving) return;
    
    try {
      setSaving(true);
      await trainingApi.updateEnrollment(enrollmentId, {
        timeSpent: newTimeSpent,
        lastActiveAt: new Date().toISOString(),
      });
      if (onTimeUpdate) {
        onTimeUpdate(newTimeSpent);
      }
    } catch (error: any) {
      console.error('Error saving time:', error);
      // Don't show error toast for every save to avoid spam
    } finally {
      setSaving(false);
    }
  };

  // Start timer
  const handleStart = () => {
    if (isPaused) {
      // Resume from paused
      startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;
      setIsPaused(false);
    } else {
      // Start fresh
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
    }
    setIsRunning(true);
  };

  // Pause timer
  const handlePause = () => {
    if (startTimeRef.current) {
      pausedTimeRef.current = sessionTime;
      startTimeRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(true);
    
    // Save current time when pausing
    const newTimeSpent = timeSpent + Math.floor(sessionTime / 60);
    if (newTimeSpent > timeSpent) {
      saveTime(newTimeSpent);
      setTimeSpent(newTimeSpent);
      setSessionTime(0);
      pausedTimeRef.current = 0;
    }
  };

  // Stop timer and save
  const handleStop = () => {
    if (startTimeRef.current) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const newTimeSpent = timeSpent + Math.floor((pausedTimeRef.current + elapsed) / 60);
      
      setTimeSpent(newTimeSpent);
      setSessionTime(0);
      saveTime(newTimeSpent);
      
      startTimeRef.current = null;
      pausedTimeRef.current = 0;
    }
    setIsRunning(false);
    setIsPaused(false);
    toast.success('Time saved successfully');
  };

  // Reset timer (without saving)
  const handleReset = () => {
    setSessionTime(0);
    pausedTimeRef.current = 0;
    startTimeRef.current = null;
    setIsRunning(false);
    setIsPaused(false);
  };

  // Timer interval
  useEffect(() => {
    if (isRunning && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        setSessionTime(pausedTimeRef.current + elapsed);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Auto-save every 5 minutes when running (300 seconds = 5 minutes)
  useEffect(() => {
    if (isRunning && sessionTime > 0 && sessionTime >= 300 && sessionTime % 300 === 0) {
      const minutesToAdd = Math.floor(sessionTime / 60);
      const newTimeSpent = timeSpent + minutesToAdd;
      saveTime(newTimeSpent);
      setTimeSpent(newTimeSpent);
      setSessionTime(0);
      pausedTimeRef.current = 0;
      if (startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
    }
  }, [sessionTime, isRunning, timeSpent]);

  // Cleanup on unmount - save time
  useEffect(() => {
    return () => {
      if (isRunning && startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const newTimeSpent = timeSpent + Math.floor((pausedTimeRef.current + elapsed) / 60);
        if (newTimeSpent > timeSpent) {
          saveTime(newTimeSpent);
        }
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border-2 backdrop-blur-sm"
      style={{
        backgroundColor: 'oklch(0.1 0 0 / 0.4)',
        borderColor: 'oklch(0.7 0.15 180 / 0.3)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-1">Time Tracker</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {formatSessionTime(sessionTime)}
            </span>
            <span className="text-sm text-gray-400">this session</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Total: {formatTime(timeSpent)}
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
      </div>

      <div className="flex items-center gap-2">
        {!isRunning && !isPaused && (
          <button
            onClick={handleStart}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'oklch(0.7 0.15 150 / 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 150 / 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 150 / 0.3)';
            }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Start
          </button>
        )}
        
        {isRunning && (
          <>
            <button
              onClick={handlePause}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'oklch(0.8 0.15 60 / 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'oklch(0.8 0.15 60 / 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'oklch(0.8 0.15 60 / 0.3)';
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pause
            </button>
            <button
              onClick={handleStop}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'oklch(0.65 0.2 330 / 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'oklch(0.65 0.2 330 / 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'oklch(0.65 0.2 330 / 0.3)';
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Stop
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              onClick={handleStart}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'oklch(0.7 0.15 150 / 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 150 / 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 150 / 0.3)';
              }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Resume
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.3)',
              }}
            >
              Reset
            </button>
          </>
        )}
      </div>

      {saving && (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
          Saving...
        </div>
      )}
    </motion.div>
  );
};

