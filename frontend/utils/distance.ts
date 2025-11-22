/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance for display
 * @param distanceInKm Distance in kilometers
 * @param showAway Optional: Add "away" suffix (default: false)
 * @returns Formatted string (e.g., "1.5 km", "500 m", "1.5 km away")
 */
export const formatDistance = (distanceInKm: number, showAway: boolean = false): string => {
  let formatted: string;
  
  if (distanceInKm < 1) {
    // Less than 1 km, show in meters
    const meters = Math.round(distanceInKm * 1000);
    formatted = `${meters} m`;
  } else if (distanceInKm < 10) {
    // Less than 10 km, show one decimal place
    formatted = `${distanceInKm.toFixed(1)} km`;
  } else {
    // 10 km or more, show as whole number
    formatted = `${Math.round(distanceInKm)} km`;
  }
  
  return showAway ? `${formatted} away` : formatted;
};

/**
 * Get user's current location using browser geolocation API
 * @returns Promise with latitude and longitude
 */
export const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

