/**
 * Location Service
 * Handles location-based calculations and queries for urgent jobs
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationWithDistance {
  distance: number; // in kilometers
  coordinates: Coordinates;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Find jobs within a specified radius from a given location
 * @param centerLat Center latitude
 * @param centerLon Center longitude
 * @param jobs Array of jobs with latitude and longitude
 * @param radiusKm Radius in kilometers
 * @returns Array of jobs with distance information, sorted by distance
 */
export function findNearbyJobs<T extends { latitude: number | null; longitude: number | null }>(
  centerLat: number,
  centerLon: number,
  jobs: T[],
  radiusKm: number = 50
): Array<T & { distance: number }> {
  const nearbyJobs: Array<T & { distance: number }> = [];

  for (const job of jobs) {
    if (job.latitude === null || job.longitude === null) {
      continue; // Skip jobs without location
    }

    const distance = calculateDistance(
      centerLat,
      centerLon,
      job.latitude,
      job.longitude
    );

    if (distance <= radiusKm) {
      nearbyJobs.push({
        ...job,
        distance,
      });
    }
  }

  // Sort by distance (closest first)
  nearbyJobs.sort((a, b) => a.distance - b.distance);

  return nearbyJobs;
}

/**
 * Format distance for display
 * @param distanceKm Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

/**
 * Get bounding box coordinates for a location and radius
 * Useful for database queries to filter jobs before calculating exact distance
 * @param centerLat Center latitude
 * @param centerLon Center longitude
 * @param radiusKm Radius in kilometers
 * @returns Bounding box coordinates
 */
export function getBoundingBox(
  centerLat: number,
  centerLon: number,
  radiusKm: number
): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  // Approximate: 1 degree latitude ≈ 111 km
  // Longitude varies by latitude, so we use a conservative estimate
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(toRadians(centerLat)));

  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLon: centerLon - lonDelta,
    maxLon: centerLon + lonDelta,
  };
}

/**
 * Validate coordinates
 * @param lat Latitude
 * @param lon Longitude
 * @returns True if coordinates are valid
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Find users within a specified radius from a given location
 * @param centerLat Center latitude
 * @param centerLon Center longitude
 * @param radiusKm Radius in kilometers
 * @returns Array of user IDs with distance information
 */
export interface NearbyUser {
  userId: string;
  distance: number; // in kilometers
  email?: string | null;
  firstName?: string | null;
}

/**
 * Calculate distance for a user's location
 * Helper function to calculate distance for users with coordinates
 */
export function calculateUserDistance(
  centerLat: number,
  centerLon: number,
  userLat: number | null,
  userLon: number | null
): number | null {
  if (userLat === null || userLon === null) {
    return null;
  }
  return calculateDistance(centerLat, centerLon, userLat, userLon);
}

