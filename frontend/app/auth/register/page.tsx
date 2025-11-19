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

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isAuthenticated, loading, resendOTP } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
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
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [loading, isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      // Add default values for backend
      const finalData = {
        ...registerData,
        firstName: '',
        lastName: '',
        role: 'INDIVIDUAL' as const,
      };
      const success = await registerUser(finalData);
      
      if (success) {
        router.push(`/auth/verify-otp?email=${encodeURIComponent(data.email)}&type=EMAIL_VERIFICATION`);
      }
    } catch (error: any) {
      // Check if error is due to existing email (409 status)
      if (error?.response?.status === 409) {
        // Email already exists - offer to resend OTP
        setPendingEmail(data.email);
        setShowResendOTPDialog(true);
      }
      console.error('Registration error:', error);
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
          background: 'radial-gradient(circle, oklch(0.65 0.2 300 / 0.15) 0%, transparent 70%)',
        }}
        animate={{
          x: mousePosition.x - 192,
          y: mousePosition.y - 192,
        }}
        transition={{ type: 'spring', damping: 30 }}
      />

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
              borderColor: 'oklch(0.65 0.2 300 / 0.3)',
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
        <div className="w-full max-w-lg">
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
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3">Create Account</h1>
              <p className="text-gray-400 text-base sm:text-lg">Join HR Platform and start your journey</p>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 sm:space-y-5"
            >
              <Input
                label="Email"
                type="email"
                placeholder="john@example.com"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Phone"
                type="tel"
                placeholder="+1234567890"
                error={errors.phone?.message}
                {...register('phone')}
              />

              <div>
                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  {...register('password')}
                />
                {!errors.password && (
                  <p className="mt-2 text-xs text-gray-500">
                    Must contain uppercase, lowercase, and number
                  </p>
                )}
              </div>

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Confirm your password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full mt-6 sm:mt-8"
              >
                Create Account
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
                Already have an account?{' '}
                <Link 
                  href="/auth/login" 
                  className="font-semibold hover:underline transition-all"
                  style={{ color: 'oklch(0.7 0.15 180)' }}
                >
                  Sign in
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
              borderColor: 'oklch(0.65 0.2 300 / 0.3)',
            }}
          >
            <h3 className="text-2xl font-bold text-white mb-4">Email Already Exists</h3>
            <p className="text-gray-400 mb-6">
              This email is already registered. Would you like to resend the verification OTP to{' '}
              <span className="font-semibold text-white">{pendingEmail}</span>?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleResendOTP}
                isLoading={isLoading}
                className="flex-1"
              >
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
