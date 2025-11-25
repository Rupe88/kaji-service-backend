'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/layout/Footer';
import { Confetti } from '@/components/ui/Confetti';
import { getDashboardRoute } from '@/lib/routing';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading, user, resendOTP } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showPassword, setShowPassword] = useState(false);
  const [showResendOTPDialog, setShowResendOTPDialog] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string>('');

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

  // Redirect if already authenticated
  React.useEffect(() => {
    if (!loading && isAuthenticated && user) {
      router.push(getDashboardRoute(user.role));
    }
  }, [loading, isAuthenticated, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await login(data.email, data.password);
      
      if (result.success) {
        if (result.requiresOTP) {
          toast.success('OTP sent to your email!');
          router.push(`/auth/verify-otp?email=${encodeURIComponent(data.email)}&type=LOGIN_OTP`);
        } else {
          setShowConfetti(true);
          toast.success('Login successful!');
          // Get user role after login to redirect correctly
          setTimeout(async () => {
            // Fetch user to get role
            const { authApi } = await import('@/lib/auth');
            try {
              const userData = await authApi.getMe();
              router.push(getDashboardRoute(userData.role));
            } catch {
              router.push('/dashboard');
            }
          }, 2000);
        }
      }
    } catch (error: any) {
      // Check if error is due to unverified email (403 status)
      if (error?.response?.status === 403) {
        const isEmailVerified = error?.response?.data?.isEmailVerified;
        
        // Only show resend OTP dialog if email exists but is NOT verified
        if (isEmailVerified === false) {
          setPendingEmail(data.email);
          setShowResendOTPDialog(true);
        } else {
          // Show generic error message
          const errorMessage = error?.response?.data?.message || 'Account is not active. Please verify your email first.';
          toast.error(errorMessage);
        }
      } else {
        // Other errors - error message is already shown by login function
        console.error('Login error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!pendingEmail) return;
    
    setIsLoading(true);
    try {
      const success = await resendOTP(pendingEmail, 'EMAIL_VERIFICATION');
      if (success) {
        setShowResendOTPDialog(false);
        router.push(`/auth/verify-otp?email=${encodeURIComponent(pendingEmail)}&type=EMAIL_VERIFICATION`);
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

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
          background: 'radial-gradient(circle, oklch(0.7 0.15 180 / 0.15) 0%, transparent 70%)',
        }}
        animate={{
          x: mousePosition.x - 192,
          y: mousePosition.y - 192,
        }}
        transition={{ type: 'spring', damping: 30 }}
      />

      <Confetti trigger={showConfetti} message="Login successful!" />
      
      {/* Go Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-6 left-4 sm:top-8 sm:left-6 z-20"
      >
        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm sm:text-base font-medium transition-all duration-300 backdrop-blur-sm border-2"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.8)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Go Back</span>
          </motion.button>
        </Link>
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
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
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
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3">Welcome Back</h1>
              <p className="text-gray-400 text-base sm:text-lg">Sign in to your HR Platform account</p>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5 sm:space-y-6"
            >
              <Input
                label="Email"
                type="email"
                placeholder="Enter your email"
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] sm:top-[42px] text-gray-400 hover:text-teal-400 transition-colors focus:outline-none z-10"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between mb-4">
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-gray-400 hover:text-teal-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full"
              >
                Sign In
              </Button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t"
              style={{ borderColor: 'oklch(0.17 0 0 / 0.5)' }}
            >
              <p className="text-gray-400 text-xs sm:text-sm text-center">
                Don't have an account?{' '}
                <Link 
                  href="/auth/register" 
                  className="font-semibold hover:underline transition-all"
                  style={{ color: 'oklch(0.7 0.15 180)' }}
                >
                  Create account
                </Link>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
      
      <Footer />

      {/* Resend OTP Dialog */}
      {showResendOTPDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative p-6 sm:p-8 rounded-2xl border-2 backdrop-blur-xl shadow-2xl max-w-md w-full"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.95)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Email Not Verified</h3>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Your email address <span className="font-semibold text-white">{pendingEmail}</span> has not been verified yet. 
              Would you like to resend the verification OTP to complete your email verification?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleResendOTP}
                isLoading={isLoading}
                className="flex-1 font-semibold"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Resend OTP
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setShowResendOTPDialog(false);
                  setPendingEmail('');
                }}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
