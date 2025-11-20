'use client';

import React, { useState } from 'react';
import { extractYouTubeId, getYouTubeThumbnail } from '@/utils/htmlUtils';
import { Button } from '@/components/ui/Button';

interface YouTubeVideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
  showControls?: boolean;
}

export const YouTubeVideoPlayer: React.FC<YouTubeVideoPlayerProps> = ({ 
  url, 
  title, 
  className = '',
  showControls = true,
}) => {
  const videoId = extractYouTubeId(url);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!videoId) {
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

  const thumbnail = getYouTubeThumbnail(videoId, 'maxres');

  return (
    <div className={`w-full ${className}`}>
      {/* Video Player */}
      <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
          title={title || 'YouTube video player'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      {/* Video Info Section (YouTube-style) */}
      {showControls && (
        <div className="mt-4 space-y-4">
          {/* Title */}
          {title && (
            <h2 className="text-xl font-semibold text-white">{title}</h2>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
            <div className="flex items-center gap-4">
              {/* Like Button */}
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  isLiked
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                <span className="text-sm font-medium">Like</span>
              </button>

              {/* Share Button */}
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 transition-colors"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: title || 'Video',
                      url: url,
                    });
                  } else {
                    navigator.clipboard.writeText(url);
                    alert('Link copied to clipboard!');
                  }
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-sm font-medium">Share</span>
              </button>

              {/* Save Button */}
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  isSaved
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span className="text-sm font-medium">Save</span>
              </button>
            </div>

            {/* More Options */}
            <button className="p-2 rounded-full bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

