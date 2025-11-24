'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentViewerProps {
  documentUrl: string;
  documentName: string;
  documentType?: 'pdf' | 'image' | 'video';
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentUrl,
  documentName,
  documentType,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine document type from URL if not provided
  const getDocumentType = (): 'pdf' | 'image' | 'video' => {
    if (documentType) return documentType;
    const url = documentUrl.toLowerCase();
    if (url.includes('.pdf')) return 'pdf';
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/)) return 'image';
    if (url.match(/\.(mp4|webm|ogg)$/) || url.includes('video')) return 'video';
    return 'pdf'; // Default to PDF
  };

  const docType = getDocumentType();

  const handleOpen = () => {
    setIsOpen(true);
    setIsLoading(true);
    setError(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsLoading(true);
    setError(null);
  };

  const getViewerUrl = (url: string): string => {
    // Fix Cloudinary URLs for viewing - remove problematic flags but don't change resource type
    if (url.includes('cloudinary.com')) {
      let viewerUrl = url;
      // Remove fl_attachment flag if present (causes 401 errors)
      if (viewerUrl.includes('fl_attachment')) {
        viewerUrl = viewerUrl.replace('/fl_attachment/', '/').replace('/fl_attachment', '');
        // Clean up any double slashes
        viewerUrl = viewerUrl.replace('//', '/');
      }
      // Remove other transformation flags that might interfere
      viewerUrl = viewerUrl.replace(/\/f_[^\/]+\//g, '/');
      // DO NOT change /image/upload/ to /raw/upload/ - files uploaded as images only exist at /image/upload/
      return viewerUrl;
    }
    return url;
  };

  const viewerUrl = getViewerUrl(documentUrl);

  return (
    <>
      <div className="flex gap-2 items-center">
        <button
          onClick={handleOpen}
          className="text-teal-400 hover:text-teal-300 underline text-sm"
        >
          📄 View {documentName}
        </button>
        <a
          href={documentUrl}
          download
          className="text-blue-400 hover:text-blue-400 underline text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          ⬇️ Download
        </a>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-6xl max-h-[90vh] rounded-2xl border-2 overflow-hidden"
              style={{
                backgroundColor: 'oklch(0.15 0 0 / 0.95)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b-2" style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}>
                <h3 className="text-lg font-bold text-white">{documentName}</h3>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Document Viewer */}
              <div className="relative w-full h-[calc(90vh-80px)] bg-black">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
                  </div>
                )}

                {error ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-red-400 mb-4">{error}</p>
                      <div className="flex gap-4 justify-center">
                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-lg text-white"
                          style={{ backgroundColor: 'oklch(0.7 0.15 180)' }}
                        >
                          Open in New Tab
                        </a>
                        <a
                          href={documentUrl}
                          download
                          className="px-4 py-2 rounded-lg text-white"
                          style={{ backgroundColor: 'oklch(0.7 0.15 240)' }}
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {docType === 'pdf' && (
                      <iframe
                        src={viewerUrl}
                        className="w-full h-full"
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                          setError('Failed to load PDF. Please try opening in a new tab or downloading.');
                          setIsLoading(false);
                        }}
                        title={documentName}
                      />
                    )}

                    {docType === 'image' && (
                      <img
                        src={viewerUrl}
                        alt={documentName}
                        className="w-full h-full object-contain"
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                          setError('Failed to load image.');
                          setIsLoading(false);
                        }}
                      />
                    )}

                    {docType === 'video' && (
                      <video
                        src={viewerUrl}
                        controls
                        className="w-full h-full"
                        onLoadedData={() => setIsLoading(false)}
                        onError={() => {
                          setError('Failed to load video.');
                          setIsLoading(false);
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

