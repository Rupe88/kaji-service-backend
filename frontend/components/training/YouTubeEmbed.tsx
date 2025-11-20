'use client';

import React from 'react';
import { extractYouTubeId, getYouTubeThumbnail } from '@/utils/htmlUtils';

interface YouTubeEmbedProps {
  url: string;
  title?: string;
  className?: string;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ url, title, className = '' }) => {
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    // If not a valid YouTube URL, show as a link
    return (
      <div className={`my-4 ${className}`}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-400 hover:text-teal-300 underline break-all"
        >
          {title || url}
        </a>
      </div>
    );
  }

  return (
    <div className={`my-6 ${className}`}>
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}> {/* 16:9 aspect ratio */}
        <iframe
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title || 'YouTube video player'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{
            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
          }}
        />
      </div>
      {title && (
        <p className="mt-2 text-sm text-gray-400">{title}</p>
      )}
    </div>
  );
};

