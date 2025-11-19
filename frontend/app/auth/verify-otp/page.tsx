'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { OTPInput } from '@/components/auth/OTPInput';
import { ResendOTP } from '@/components/auth/ResendOTP';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Confetti } from '@/components/ui/Confetti';
import { OTPType } from '@/lib/constants';

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOTP, resendOTP } = useAuth();
  
  const email = searchParams.get('email') || '';
  const typeParam = searchParams.get('type') || 'EMAIL_VERIFICATION';
  const type = typeParam as OTPType;

  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const particles = useMemo(
    () =>
      [...Array(15)].map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 2,
        size: Math.random() * 2 + 1,
      })),
    []
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (!email) {
      router.push('/auth/login');
    }
  }, [email, router]);

  const handleOTPComplete = async (otpCode: string) => {
    setOtp(otpCode);
    setIsVerifying(true);
    setError('');

    try {
      const success = await verifyOTP(email, otpCode, type);
      
      if (success) {
        setShowConfetti(true);
        setTimeout(() => {
          if (type === 'EMAIL_VERIFICATION') {
            router.push('/dashboard');
          } else if (type === 'LOGIN_OTP') {
            router.push('/dashboard');
          } else {
            router.push('/auth/login');
          }
        }, 2000);
      } else {
        setError('Invalid or expired OTP. Please try again.');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    return await resendOTP(email, type);
  };

  const getTitle = () => {
    switch (type) {
      case 'EMAIL_VERIFICATION':
        return 'Verify Your Email';
      case 'LOGIN_OTP':
        return 'Verify Login';
      case 'PASSWORD_RESET':
        return 'Verify Password Reset';
      default:
        return 'Verify OTP';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'EMAIL_VERIFICATION':
        return 'We sent a verification code to your email. Please enter it below.';
      case 'LOGIN_OTP':
        return 'We sent a login code to your email. Please enter it below.';
      case 'PASSWORD_RESET':
        return 'We sent a password reset code to your email. Please enter it below.';
      default:
        return 'Please enter the OTP sent to your email.';
    }
  };

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(oklch(0.7 0.15 180 / 0.1) 1px, transparent 1px),
              linear-gradient(90deg, oklch(0.7 0.15 180 / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Animated Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: i % 2 === 0 ? 'oklch(0.7 0.15 180)' : 'oklch(0.65 0.2 300)',
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
            }}
          />
        ))}
      </div>

      {/* Mouse Tracking Glow */}
      <motion.div
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, oklch(0.65 0.2 330 / 0.15) 0%, transparent 70%)',
        }}
        animate={{
          x: mousePosition.x - 192,
          y: mousePosition.y - 192,
        }}
        transition={{ type: 'spring', damping: 30 }}
      />

      <Navbar />
      <Confetti trigger={showConfetti} message="Verification successful!" />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 sm:p-8 lg:p-10 rounded-2xl border-2 backdrop-blur-xl shadow-2xl"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.9)',
              borderColor: 'oklch(0.65 0.2 330 / 0.3)',
              borderWidth: '2px',
              borderStyle: 'solid',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px oklch(0.17 0 0 / 0.5)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8 sm:mb-10"
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3">{getTitle()}</h1>
              <p className="text-gray-400 mb-3 sm:mb-4 text-base sm:text-lg">{getDescription()}</p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm font-medium px-4 py-2 rounded-lg inline-block"
                style={{ 
                  color: 'oklch(0.7 0.15 180)',
                  backgroundColor: 'oklch(0.7 0.15 180 / 0.1)',
                  border: '1px solid oklch(0.7 0.15 180 / 0.2)',
                }}
              >
                {email}
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-5 sm:space-y-6"
            >
              <OTPInput
                length={6}
                onComplete={handleOTPComplete}
                error={error}
              />

              {isVerifying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <p className="text-gray-400">Verifying...</p>
                </motion.div>
              )}

              <ResendOTP onResend={handleResend} cooldownSeconds={60} />
            </motion.div>
          </motion.div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
