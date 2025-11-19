'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiProps {
  trigger: boolean;
  message?: string;
}

export const Confetti: React.FC<ConfettiProps> = ({ trigger, message = 'Congratulations!' }) => {
  useEffect(() => {
    if (trigger) {
      // Create confetti burst
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: NodeJS.Timeout = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // Teal and purple confetti
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#14b8a6', '#a855f7', '#5eead4', '#c084fc'],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#14b8a6', '#a855f7', '#5eead4', '#c084fc'],
        });
      }, 250);

      // Show message toast
      setTimeout(() => {
        // Message will be shown via toast in the component using this
      }, 100);
    }
  }, [trigger, message]);

  return null;
};

