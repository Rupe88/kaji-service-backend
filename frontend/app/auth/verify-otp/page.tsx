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
import { getDashboardRoute } from '@/lib/routing';
import { OTPType } from '@/lib/constants';

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOTP, resendOTP, user } = useAuth();
  
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
      // For password reset, don't verify OTP here - let reset-password endpoint handle it
      // If we verify here, the OTP gets marked as used and reset-password will fail
      if (type === 'PASSWORD_RESET') {
        // Just redirect to reset password page with the OTP code
        // The reset-password endpoint will verify the OTP when resetting the password
        router.push(`/auth/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(otpCode)}`);
        return;
      }

      const success = await verifyOTP(email, otpCode, type);
      
      if (success) {
        setShowConfetti(true);
        setTimeout(async () => {
          if (type === 'EMAIL_VERIFICATION' || type === 'LOGIN_OTP') {
            // Get user role after verification to redirect correctly
            try {
              const { authApi } = await import('@/lib/auth');
              const userData = await authApi.getMe();
              router.push(getDashboardRoute(userData.role));
            } catch {
              router.push('/dashboard');
            }
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

      <Confetti trigger={showConfetti} message="Verification successful!" />
      
      {/* Go Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-6 left-4 sm:top-8 sm:left-6 z-20"
      >
        <motion.button
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/auth/login')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm sm:text-base font-medium transition-all duration-300 backdrop-blur-sm border-2"
          style={{
            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
            borderColor: 'oklch(0.65 0.2 300 / 0.3)',
          }}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Go Back</span>
        </motion.button>
      </motion.div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 sm:p-8 lg:p-10 rounded-2xl border-2 backdrop-blur-xl shadow-2xl"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.9)',
              borderColor: 'oklch(0.65 0.2 300 / 0.3)',
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
              <div className="mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, oklch(0.7 0.15 180) 0%, oklch(0.65 0.2 300) 100%)',
                  }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </motion.div>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3">{getTitle()}</h1>
              <p className="text-gray-400 mb-4 sm:mb-6 text-base sm:text-lg">{getDescription()}</p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{ 
                  backgroundColor: 'oklch(0.7 0.15 180 / 0.1)',
                  border: '1px solid oklch(0.7 0.15 180 / 0.2)',
                }}
              >
                <svg className="w-4 h-4" style={{ color: 'oklch(0.7 0.15 180)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium" style={{ color: 'oklch(0.7 0.15 180)' }}>
                  {email}
                </span>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-6 sm:space-y-8"
            >
              <div>
                <OTPInput
                  length={6}
                  onComplete={handleOTPComplete}
                  error={error}
                />
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-sm text-center flex items-center justify-center gap-2"
                    style={{ color: 'oklch(0.65 0.2 330)' }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </motion.p>
                )}
              </div>

              {isVerifying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-3"
                >
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2" style={{ borderColor: 'oklch(0.7 0.15 180)' }}></div>
                  <p className="text-gray-400">Verifying OTP...</p>
                </motion.div>
              )}

              <div className="pt-4 border-t" style={{ borderColor: 'oklch(0.17 0 0 / 0.5)' }}>
                <ResendOTP onResend={handleResend} cooldownSeconds={60} />
              </div>
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
