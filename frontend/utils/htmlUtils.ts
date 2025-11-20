/**
 * Strips HTML tags from a string and returns plain text
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

/**
 * Truncates text to a specified length
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text) return '';
  const stripped = stripHtml(text);
  if (stripped.length <= maxLength) return stripped;
  return stripped.substring(0, maxLength).trim() + '...';
};

/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
export const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Gets YouTube thumbnail URL from video ID or URL
 */
export const getYouTubeThumbnail = (videoIdOrUrl: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string | null => {
  const videoId = extractYouTubeId(videoIdOrUrl) || videoIdOrUrl;
  if (!videoId) return null;

  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
};

/**
 * Gets the first YouTube thumbnail from an array of video URLs
 */
export const getCourseThumbnail = (videoMaterials?: string[]): string | null => {
  if (!videoMaterials || videoMaterials.length === 0) return null;
  
  for (const url of videoMaterials) {
    const thumbnail = getYouTubeThumbnail(url);
    if (thumbnail) return thumbnail;
  }
  
  return null;
};

