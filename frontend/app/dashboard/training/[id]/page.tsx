'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { trainingApi, walletApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { YouTubeEmbed } from '@/components/training/YouTubeEmbed';
import { YouTubeVideoPlayer } from '@/components/training/YouTubeVideoPlayer';
import { CourseComments } from '@/components/training/CourseComments';
import { TimeTracker } from '@/components/training/TimeTracker';
import { getCourseThumbnail } from '@/utils/htmlUtils';
import type { TrainingCourse, TrainingEnrollment } from '@/types/api';

function TrainingDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const courseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [enrollment, setEnrollment] = useState<TrainingEnrollment | null>(null);
  const [isProvider, setIsProvider] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const courseData = await trainingApi.getCourse(courseId);
        setCourse(courseData);

        // Check if user is the provider
        if (user?.id && courseData.providerId) {
          setIsProvider(courseData.providerId === user.id);
        }

        // Check if user is enrolled
        if (user?.id) {
          try {
            const enrollmentsResponse = await trainingApi.getEnrollments({
              userId: user.id,
              courseId: courseId,
            });
            if (enrollmentsResponse.data && enrollmentsResponse.data.length > 0) {
              const enrollmentData = enrollmentsResponse.data[0];
              setEnrollment(enrollmentData);
              // Update last active time when user views the course
              if (enrollmentData.id) {
                trainingApi.updateEnrollment(enrollmentData.id, {
                  lastActiveAt: new Date().toISOString(),
                }).catch(() => {
                  // Silently fail - not critical
                });
              }
            }
          } catch (error) {
            // User might not be enrolled yet
          }
        }
      } catch (error: any) {
        console.error('Error fetching course:', error);
        toast.error('Failed to load course details');
        router.push('/dashboard/training');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId, user?.id, router]);

  const handleEnroll = async () => {
    if (!user?.id) {
      toast.error('Please login to enroll');
      return;
    }

    try {
      setEnrolling(true);
      const newEnrollment = await trainingApi.enroll({
        courseId: courseId,
        userId: user.id,
      });
      setEnrollment(newEnrollment);
      toast.success('Successfully enrolled in course!');
      router.push('/dashboard/training/my-trainings');
    } catch (error: any) {
      console.error('Error enrolling:', error);
      toast.error(error.response?.data?.message || 'Failed to enroll in course');
    } finally {
      setEnrolling(false);
    }
  };

  const formatPrice = (course: TrainingCourse) => {
    if (course.isFree) return 'Free';
    const price = typeof course.price === 'string' ? parseFloat(course.price) : course.price;
    return `Rs. ${price.toLocaleString()}`;
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days} day${days !== 1 ? 's' : ''}`;
    return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
  };

  const getSeatsAvailable = (course: TrainingCourse) => {
    if (!course.seats) return 'Unlimited seats';
    const available = course.seats - course.bookedSeats;
    return `${available} of ${course.seats} seats available`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading course details...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-white mb-2">Course not found</h2>
            <p className="text-gray-400 mb-6">The course you're looking for doesn't exist.</p>
            <Link href="/dashboard/training">
              <Button variant="primary">Back to Courses</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isEnrolled = enrollment !== null;
  const seatsAvailable = course.seats ? (course.seats - course.bookedSeats) > 0 : true;
  const canEnroll = !isEnrolled && !isProvider && seatsAvailable && course.isActive;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Back Button */}
        <Link href="/dashboard/training" className="inline-flex items-center text-teal-400 hover:text-teal-300 mb-6">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Courses
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - YouTube Style */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Video Player */}
            {course.videoMaterials && course.videoMaterials.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 backdrop-blur-xl p-0 overflow-hidden"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <YouTubeVideoPlayer
                  url={course.videoMaterials[selectedVideoIndex]}
                  title={course.title}
                  showControls={true}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 backdrop-blur-xl p-8"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <div className="aspect-video bg-gradient-to-br from-teal-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-20 h-20 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-gray-400">No video materials available</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Course Info Section (YouTube-style) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border-2 backdrop-blur-xl p-6"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              {/* Title and Meta */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-white mb-3">{course.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <span>{course._count?.enrollments || 0} enrolled</span>
                    <span>•</span>
                    <span>{formatDuration(course.duration)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-1 rounded-full bg-gray-800/50 text-gray-300 text-xs">
                      {course.category}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                      {course.mode}
                    </span>
                    {course.isVerified && (
                      <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs border border-green-500/30">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <div
                  className="text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: course.description }}
                />
              </div>

              {/* Syllabus */}
              {course.syllabus && course.syllabus.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-4">Syllabus</h2>
                  <ul className="space-y-2">
                    {course.syllabus.map((item, index) => (
                      <li key={index} className="flex items-start text-gray-300">
                        <svg className="w-5 h-5 text-teal-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prerequisites */}
              {course.prerequisites && course.prerequisites.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-4">Prerequisites</h2>
                  <ul className="space-y-2">
                    {course.prerequisites.map((item, index) => (
                      <li key={index} className="flex items-start text-gray-300">
                        <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Learning Outcomes */}
              {course.learningOutcomes && course.learningOutcomes.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-4">Learning Outcomes</h2>
                  <ul className="space-y-2">
                    {course.learningOutcomes.map((item, index) => (
                      <li key={index} className="flex items-start text-gray-300">
                        <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Video Playlist (YouTube-style sidebar) */}
              {course.videoMaterials && course.videoMaterials.length > 1 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Course Videos ({course.videoMaterials.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {course.videoMaterials.map((url, index) => {
                      const thumbnail = getCourseThumbnail([url]);
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedVideoIndex(index)}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
                            selectedVideoIndex === index
                              ? 'bg-teal-500/20 border border-teal-500/30'
                              : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                          }`}
                        >
                          <div className="relative flex-shrink-0 w-40 h-24 rounded overflow-hidden bg-gray-800">
                            {thumbnail ? (
                              <img src={thumbnail} alt={`Video ${index + 1}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            )}
                            {selectedVideoIndex === index && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white line-clamp-2">
                              {course.title} - Part {index + 1}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Video {index + 1}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reading Materials */}
              {course.readingMaterials && course.readingMaterials.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Reading Materials</h3>
                  <div className="space-y-2">
                    {course.readingMaterials.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors text-teal-400 hover:text-teal-300"
                      >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="text-sm truncate">{url}</span>
                        <svg className="w-4 h-4 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Syllabus, Prerequisites, Learning Outcomes - Collapsible */}
              <div className="space-y-4">
                {course.syllabus && course.syllabus.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer text-lg font-semibold text-white mb-2 flex items-center justify-between">
                      <span>Syllabus ({course.syllabus.length} topics)</span>
                      <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <ul className="mt-3 space-y-2">
                      {course.syllabus.map((item, index) => (
                        <li key={index} className="flex items-start text-gray-300">
                          <svg className="w-5 h-5 text-teal-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {course.prerequisites && course.prerequisites.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer text-lg font-semibold text-white mb-2 flex items-center justify-between">
                      <span>Prerequisites ({course.prerequisites.length})</span>
                      <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <ul className="mt-3 space-y-2">
                      {course.prerequisites.map((item, index) => (
                        <li key={index} className="flex items-start text-gray-300">
                          <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {course.learningOutcomes && course.learningOutcomes.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer text-lg font-semibold text-white mb-2 flex items-center justify-between">
                      <span>Learning Outcomes ({course.learningOutcomes.length})</span>
                      <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <ul className="mt-3 space-y-2">
                      {course.learningOutcomes.map((item, index) => (
                        <li key={index} className="flex items-start text-gray-300">
                          <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </motion.div>

            {/* Comments Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border-2 backdrop-blur-xl p-6"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <CourseComments courseId={courseId} />
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl border-2 backdrop-blur-xl p-6 sticky top-6"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <div className="space-y-6">
                <div>
                  <div className="text-3xl font-bold text-white mb-2">{formatPrice(course)}</div>
                  {!course.isFree && (
                    <p className="text-gray-400 text-sm">One-time payment</p>
                  )}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration</span>
                    <span className="text-white font-medium">{formatDuration(course.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mode</span>
                    <span className="text-white font-medium">{course.mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Category</span>
                    <span className="text-white font-medium">{course.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Seats</span>
                    <span className="text-white font-medium">{getSeatsAvailable(course)}</span>
                  </div>
                  {course.startDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Start Date</span>
                      <span className="text-white font-medium">
                        {new Date(course.startDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {course.endDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">End Date</span>
                      <span className="text-white font-medium">
                        {new Date(course.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-800/50">
                  {isProvider ? (
                    <div className="space-y-3">
                      <Link href="/dashboard/employer/training">
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-full"
                        >
                          Manage Course
                        </Button>
                      </Link>
                      <p className="text-center text-sm text-gray-400">
                        You created this course
                      </p>
                    </div>
                  ) : isEnrolled ? (
                    <div className="space-y-4">
                      {/* Time Tracker */}
                      {enrollment && enrollment.id && (
                        <TimeTracker
                          enrollmentId={enrollment.id}
                          initialTimeSpent={enrollment.timeSpent || 0}
                          onTimeUpdate={(minutes) => {
                            setEnrollment(prev => prev ? { ...prev, timeSpent: minutes } : null);
                          }}
                        />
                      )}

                      {/* Progress Bar */}
                      {enrollment && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Progress</span>
                            <span className="text-white font-semibold">{enrollment.progress}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${enrollment.progress}%` }}
                              transition={{ duration: 0.5 }}
                              className="h-full"
                              style={{
                                background: 'linear-gradient(to right, oklch(0.7 0.15 180), oklch(0.7 0.15 240))',
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full"
                        onClick={() => router.push('/dashboard/training/my-trainings')}
                      >
                        View My Progress
                      </Button>
                      <p className="text-center text-sm text-gray-400">
                        You are enrolled in this course
                      </p>
                    </div>
                  ) : canEnroll ? (
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={handleEnroll}
                      disabled={enrolling}
                    >
                      {enrolling ? 'Enrolling...' : 'Enroll Now'}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full"
                        disabled
                      >
                        {!seatsAvailable ? 'No Seats Available' : !course.isActive ? 'Course Inactive' : 'Cannot Enroll'}
                      </Button>
                      {!seatsAvailable && (
                        <p className="text-center text-sm text-red-400">
                          All seats are booked
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function TrainingDetailPage() {
  return (
    <ProtectedRoute>
      <TrainingDetailContent />
    </ProtectedRoute>
  );
}

