'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface ResumeViewerProps {
  resumeUrl: string;
  applicantName?: string;
  jobTitle?: string;
  trigger?: React.ReactNode;
}

export const ResumeViewer: React.FC<ResumeViewerProps> = ({
  resumeUrl,
  applicantName,
  jobTitle,
  trigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  // Validate resume URL
  const isValidUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return false;
    
    // Check if it's a placeholder/example URL
    if (url.includes('example.com') || url.includes('placeholder') || url.includes('dummy')) {
      return false;
    }
    
    // Check if it's a valid URL format
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Get validated URL or show error
  const validatedUrl = isValidUrl(resumeUrl) ? resumeUrl : null;

  const handleOpen = () => {
    setIsOpen(true);
    setIsLoading(true);
    setError(null);
    setUseFallback(false);
  };
  
  // Use effect to detect iframe loading timeout and switch to fallback
  useEffect(() => {
    if (isOpen && isLoading) {
      const timeout = setTimeout(() => {
        if (isLoading) {
          // Try Google Docs Viewer as fallback
          setUseFallback(true);
          setIsLoading(true);
          
          // If Google viewer also fails, show error
          setTimeout(() => {
            setIsLoading(false);
            setError('Resume viewer timed out. Please use "Open in New Tab" or "Download" options.');
          }, 3000);
        }
      }, 3000); // 3 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [isOpen, isLoading]);

  const handleClose = () => {
    setIsOpen(false);
    setIsLoading(false);
    setError(null);
    setUseFallback(false);
  };

  const handleDownload = () => {
    if (!validatedUrl) {
      toast.error('Invalid resume URL. This appears to be placeholder data.');
      return;
    }
    
    try {
      const link = document.createElement('a');
      link.href = validatedUrl;
      link.download = `resume-${applicantName || jobTitle || 'resume'}.pdf`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Resume download started');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download resume. Please try again.');
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setUseFallback(true);
  };

  const handleObjectError = () => {
    setIsLoading(false);
    setUseFallback(true);
  };

  // Convert Cloudinary URL to direct PDF view if needed
  const getViewerUrl = (url: string): string => {
    // If it's a Cloudinary URL, optimize for viewing
    if (url.includes('cloudinary.com')) {
      try {
        const urlObj = new URL(url);
        
        // Check if it's using /image/upload/ - this is wrong for PDFs
        // PDFs should use /raw/upload/ or we need to transform the URL
        if (urlObj.pathname.includes('/image/upload/')) {
          // Replace /image/upload/ with /raw/upload/ for PDFs
          urlObj.pathname = urlObj.pathname.replace('/image/upload/', '/raw/upload/');
        }
        
        // Remove any transformation flags that might interfere
        // Remove fl_attachment (forces download)
        urlObj.searchParams.delete('fl');
        urlObj.searchParams.delete('fl_attachment');
        
        // Ensure the URL ends with .pdf or has proper format
        if (!urlObj.pathname.endsWith('.pdf') && !urlObj.pathname.includes('.pdf')) {
          // Try to add .pdf extension if missing
          if (urlObj.pathname.includes('resumes/')) {
            urlObj.pathname += '.pdf';
          }
        }
        
        // For Cloudinary PDFs, use the direct URL with proper format
        // Add transformation to ensure it's treated as PDF
        const pathParts = urlObj.pathname.split('/');
        const uploadIndex = pathParts.indexOf('upload');
        if (uploadIndex !== -1 && uploadIndex < pathParts.length - 1) {
          // Insert format transformation if not present
          if (!pathParts[uploadIndex + 1].startsWith('f_')) {
            pathParts.splice(uploadIndex + 1, 0, 'f_pdf');
            urlObj.pathname = pathParts.join('/');
          }
        }
        
        return urlObj.toString();
      } catch (e) {
        // If URL parsing fails, try simple string replacement
        let viewerUrl = url;
        
        // Replace /image/upload/ with /raw/upload/ for PDFs
        viewerUrl = viewerUrl.replace('/image/upload/', '/raw/upload/');
        
        // Remove fl_attachment flag
        viewerUrl = viewerUrl.replace(/fl_attachment[^/&]*/g, '');
        viewerUrl = viewerUrl.replace(/[?&]fl_attachment[^&]*/g, '');
        
        return viewerUrl;
      }
    }
    
    // For other URLs, use as-is
    return url;
  };

  // Get Google Docs Viewer URL as fallback
  const getGoogleViewerUrl = (url: string): string => {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  };

  const handleOpenInNewTab = () => {
    if (!validatedUrl) {
      toast.error('Invalid resume URL. This appears to be placeholder data.');
      return;
    }
    
    try {
      window.open(validatedUrl, '_blank', 'noopener,noreferrer');
      toast.success('Opening resume in new tab...');
    } catch (err) {
      console.error('Error opening resume:', err);
      toast.error('Failed to open resume. Please try downloading it.');
    }
  };

  const viewerUrl = validatedUrl ? getViewerUrl(validatedUrl) : null;

  return (
    <>
      {trigger ? (
        <div onClick={handleOpen} className="cursor-pointer">
          {trigger}
        </div>
      ) : !validatedUrl ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Resume not available</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenInNewTab}
            className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition-colors"
            title="Open resume in new tab"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            View Resume
          </button>
          <button
            onClick={handleOpen}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
            title="Open in modal viewer"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-8 lg:inset-16 z-50 flex flex-col rounded-2xl border-2 overflow-hidden"
              style={{
                backgroundColor: 'oklch(0.15 0 0 / 0.95)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b-2" style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}>
                <div>
                  <h3 className="text-lg font-bold text-white">Resume Viewer</h3>
                  {applicantName && (
                    <p className="text-sm text-gray-400">{applicantName}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenInNewTab}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                    style={{
                      backgroundColor: 'oklch(0.7 0.15 180 / 0.3)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 180 / 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 180 / 0.3)';
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Open in New Tab
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                    style={{
                      backgroundColor: 'oklch(0.7 0.15 180 / 0.3)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 180 / 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 180 / 0.3)';
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={handleClose}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.5)',
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 relative overflow-hidden">
                {!validatedUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-8">
                      <svg
                        className="w-16 h-16 mx-auto mb-4 text-yellow-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <p className="text-white text-lg mb-2">Resume Not Available</p>
                      <p className="text-gray-400 mb-4">
                        This appears to be placeholder/test data. The resume URL is invalid.
                      </p>
                      <p className="text-gray-500 text-sm">
                        Please contact the applicant to upload a valid resume.
                      </p>
                    </div>
                  </div>
                ) : isLoading && !error ? (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-400">Loading resume...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-8">
                      <svg
                        className="w-16 h-16 mx-auto mb-4 text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-white text-lg mb-2">Failed to load resume</p>
                      <p className="text-gray-400 mb-4">{error}</p>
                      <div className="flex items-center gap-3 justify-center">
                        <button
                          onClick={handleOpenInNewTab}
                          className="px-6 py-2 rounded-lg text-white font-medium transition-all"
                          style={{
                            backgroundColor: 'oklch(0.7 0.15 180 / 0.3)',
                          }}
                        >
                          Open in New Tab
                        </button>
                        <button
                          onClick={handleDownload}
                          className="px-6 py-2 rounded-lg text-white font-medium transition-all"
                          style={{
                            backgroundColor: 'oklch(0.7 0.15 180 / 0.3)',
                          }}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ) : viewerUrl ? (
                  // Try direct URL first, then Google Docs Viewer as fallback
                  <div className="w-full h-full relative bg-white">
                    {!useFallback ? (
                      <iframe
                        key="direct"
                        src={viewerUrl}
                        className="w-full h-full border-0"
                        title="Resume Viewer"
                        onLoad={handleIframeLoad}
                        onError={handleIframeError}
                        style={{ minHeight: '500px' }}
                        allow="fullscreen"
                      />
                    ) : (
                      <iframe
                        key="google-viewer"
                        src={getGoogleViewerUrl(viewerUrl)}
                        className="w-full h-full border-0"
                        title="Resume Viewer"
                        onLoad={handleIframeLoad}
                        onError={() => {
                          setIsLoading(false);
                          setError('Unable to load resume. Please use "Open in New Tab" or "Download" options.');
                        }}
                        style={{ minHeight: '500px' }}
                        allow="fullscreen"
                      />
                    )}
                  </div>
                ) : null}

                {/* Fallback: Direct link if iframe fails */}
                <div className="hidden">
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="resume-fallback-link"
                  >
                    Open Resume
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

