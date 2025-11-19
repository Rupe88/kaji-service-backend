'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';
import { TrendingJob, PlatformStatistics } from '@/types/api';

interface FeatureCard {
  title: string;
  description: string;
  icon: string;
  gradient: string;
  color: 'teal' | 'purple' | 'pink' | 'blue';
  features: string[];
}

const hrFeatures: FeatureCard[] = [
  {
    title: 'JOB POSTING',
    description: 'Post jobs and find the perfect candidates for your organization',
    icon: '💼',
    gradient: 'from-teal-400 to-cyan-600',
    color: 'teal',
    features: ['Job Listings', 'Candidate Search', 'Application Management', 'Hiring Analytics'],
  },
  {
    title: 'SKILL MATCHING',
    description: 'AI-powered location-based skill matching for better job-candidate fit',
    icon: '🎯',
    gradient: 'from-purple-400 to-indigo-600',
    color: 'purple',
    features: ['AI Matching', 'Location-Based', 'Skill Analysis', 'Smart Recommendations'],
  },
  {
    title: 'LOCATION-BASED',
    description: 'Find jobs and candidates based on your location preferences',
    icon: '📍',
    gradient: 'from-pink-400 to-rose-600',
    color: 'pink',
    features: ['Location Search', 'Distance Filter', 'Regional Jobs', 'Local Candidates'],
  },
  {
    title: 'CAREER DEVELOPMENT',
    description: 'Training, certifications, and skill development opportunities',
    icon: '📚',
    gradient: 'from-blue-400 to-cyan-600',
    color: 'blue',
    features: ['Training Programs', 'Certifications', 'Skill Development', 'Career Growth'],
  },
];

const FeatureCard: React.FC<{
  feature: FeatureCard;
  index: number;
}> = ({ feature, index }) => {
  const [isHovered, setIsHovered] = useState(false);

  const borderColorMap = {
    teal: 'hover:border-teal-400 shadow-[0_0_30px_rgba(20,184,166,0.3)]',
    purple: 'hover:border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    pink: 'hover:border-pink-400 shadow-[0_0_30px_rgba(236,72,153,0.3)]',
    blue: 'hover:border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.05, y: -10 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="cursor-pointer"
    >
      <div
        className={`
          relative p-4 sm:p-5 lg:p-6 rounded-xl
          bg-gray-900/40 backdrop-blur-md
          border-2 border-gray-700
          transition-all duration-300
          ${borderColorMap[feature.color]}
          group
        `}
      >
        <motion.div
          className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 -z-10`}
          animate={{ opacity: isHovered ? 0.1 : 0 }}
          transition={{ duration: 0.3 }}
        />

        <motion.div
          animate={{ scale: isHovered ? 1.2 : 1, rotateZ: isHovered ? 5 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-3xl sm:text-4xl lg:text-5xl mb-3 sm:mb-4"
        >
          {feature.icon}
        </motion.div>

        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 uppercase tracking-wider sm:tracking-widest">
          {feature.title}
        </h3>

        <p className="text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 leading-relaxed">
          {feature.description}
        </p>

        <motion.ul
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            height: isHovered ? 'auto' : 0,
          }}
          transition={{ duration: 0.3 }}
          className="mb-4 space-y-1 overflow-hidden"
        >
          {feature.features.map((item, i) => (
            <li
              key={i}
              className="text-xs text-gray-400 flex items-center gap-2"
            >
              <span
                className={`w-1 h-1 rounded-full bg-gradient-to-r ${feature.gradient}`}
              />
              {item}
            </li>
          ))}
        </motion.ul>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-sm font-semibold text-teal-400 group-hover:text-pink-400 transition-colors">
            Explore Feature →
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default function Home() {
  const router = useRouter();
  const { scrollY } = useScroll();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [trendingJobs, setTrendingJobs] = useState<TrendingJob[]>([]);
  const [statistics, setStatistics] = useState<PlatformStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  const particles = useMemo(
    () =>
      [...Array(30)].map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 2,
        size: Math.random() * 3 + 2,
      })),
    []
  );

  // Parallax effects
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsData, statsData] = await Promise.allSettled([
          apiClient.get<TrendingJob[]>(API_ENDPOINTS.TRENDING.JOBS).catch(() => null),
          apiClient.get<PlatformStatistics>(API_ENDPOINTS.ANALYTICS.PLATFORM).catch(() => null),
        ]);

        if (jobsData.status === 'fulfilled' && jobsData.value) {
          setTrendingJobs(jobsData.value || []);
        }

        if (statsData.status === 'fulfilled' && statsData.value) {
          setStatistics(statsData.value);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(oklch(0.7 0.15 180 / 0.1) 1px, transparent 1px),
              linear-gradient(90deg, oklch(0.7 0.15 180 / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 100%)',
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
              background: i % 3 === 0 ? 'oklch(0.7 0.15 180)' : i % 3 === 1 ? 'oklch(0.65 0.2 300)' : 'oklch(0.65 0.2 330)',
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
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
          background: 'radial-gradient(circle, oklch(0.7 0.15 180 / 0.2) 0%, transparent 70%)',
        }}
        animate={{
          x: mousePosition.x - 192,
          y: mousePosition.y - 192,
        }}
        transition={{ type: 'spring', damping: 30 }}
      />

      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <motion.div
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto w-full text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12 sm:mb-16"
          >
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold mb-4 sm:mb-6 leading-tight">
              <motion.span
                className="inline-block bg-gradient-to-r from-teal-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
                animate={{
                  opacity: [1, 0.8, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                HR PLATFORM
              </motion.span>
              <br />
              <motion.span
                className="inline-block bg-gradient-to-r from-pink-500 via-purple-500 to-teal-400 bg-clip-text text-transparent"
                animate={{
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                TALENT ACQUISITION
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-gray-400 max-w-4xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4"
            >
              Connect talent with opportunity. Find your dream job or the perfect candidate with our intelligent, location-based matching platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center px-4"
            >
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:min-w-[200px]">
                  Get Started
                </Button>
              </Link>
              <Link href="/jobs" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:min-w-[200px]">
                  Explore Jobs
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Video Demo Section */}
      <section className="relative z-10 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8 sm:mb-12 lg:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              <span className="bg-gradient-to-r from-teal-400 to-purple-600 bg-clip-text text-transparent">
                See It In Action
              </span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              Watch how HR Platform transforms your recruitment process
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative rounded-2xl overflow-hidden border-2 border-gray-700 bg-gray-900/40 backdrop-blur-md shadow-2xl"
            style={{
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="aspect-video bg-gradient-to-br from-teal-900/20 to-purple-900/20 flex items-center justify-center">
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-teal-400 to-purple-600 flex items-center justify-center cursor-pointer"
                >
                  <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </motion.div>
                <p className="text-gray-400">Video Demo Coming Soon</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="relative z-10 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8 sm:mb-12 lg:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              <span className="bg-gradient-to-r from-teal-400 to-purple-600 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              Everything you need to streamline your HR and recruitment process
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12 lg:mb-16">
            {hrFeatures.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      {statistics && (
        <section className="relative z-10 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12 lg:mb-16"
            >
              {[
                { label: 'Total Users', value: statistics.totalUsers ?? 0, color: 'oklch(0.7 0.15 180)' },
                { label: 'Total Jobs', value: statistics.totalJobs ?? 0, color: 'oklch(0.65 0.2 300)' },
                { label: 'Active Jobs', value: statistics.activeJobs ?? 0, color: 'oklch(0.65 0.2 330)' },
                { label: 'Applications', value: statistics.totalApplications ?? 0, color: 'oklch(0.6 0.15 250)' },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="p-4 sm:p-6 rounded-xl border-2 border-gray-700 bg-gray-900/40 backdrop-blur-md text-center group cursor-pointer transition-all duration-300 hover:border-teal-400"
                >
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-1 sm:mb-2" style={{ color: stat.color }}>
                    {stat.value.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-xs sm:text-sm font-medium uppercase tracking-wider">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Trending Jobs Section */}
      {trendingJobs.length > 0 && (
        <section className="relative z-10 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-8 sm:mb-12 lg:mb-16"
            >
              <span className="bg-gradient-to-r from-teal-400 to-purple-600 bg-clip-text text-transparent">
                Trending Jobs
              </span>
            </motion.h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {trendingJobs.slice(0, 6).map((item, index) => (
                <motion.div
                  key={item.jobId}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.03, y: -8 }}
                  className="p-6 rounded-2xl border-2 border-gray-700 bg-gray-900/40 backdrop-blur-md transition-all duration-300 cursor-pointer group hover:border-teal-400"
                  style={{
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-teal-400 transition-colors duration-300">
                    {item.job.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">{item.job.description}</p>
                  <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-700">
                    <span className="font-medium" style={{ color: 'oklch(0.7 0.15 180)' }}>
                      {item.applicationCount || 0} applications
                    </span>
                    <span className="text-gray-500">{item.viewCount || 0} views</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="relative z-10 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              <span className="bg-gradient-to-r from-teal-400 to-purple-600 bg-clip-text text-transparent">
                Ready to Transform Your HR?
              </span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto px-4">
              Join thousands of companies using HR Platform to find the best talent and grow their teams.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center px-4">
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:min-w-[200px]">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/auth/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:min-w-[200px]">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Animated Scanning Line */}
      <motion.div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent"
        animate={{ y: ['0vh', '100vh'] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Corner Decorations */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-4 border-l-4 border-teal-400 opacity-30" />
      <div className="absolute top-0 right-0 w-32 h-32 border-t-4 border-r-4 border-pink-400 opacity-30" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-b-4 border-l-4 border-purple-400 opacity-30" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-4 border-r-4 border-teal-400 opacity-30" />
      
      <Footer />
    </div>
  );
}
