'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

interface JobLocationMapProps {
  latitude: number;
  longitude: number;
  jobTitle?: string;
  companyName?: string;
  radiusKm?: number; // Radius in kilometers to show as circle
  userLatitude?: number; // User's location for distance calculation
  userLongitude?: number;
  distance?: number; // Pre-calculated distance in km
  className?: string;
  height?: string;
}

// Component to fit map bounds
function MapBounds({ lat, lng, radiusKm, userLat, userLng }: {
  lat: number;
  lng: number;
  radiusKm?: number;
  userLat?: number;
  userLng?: number;
}) {
  const { useMap } = require('react-leaflet');
  const map = useMap();

  useEffect(() => {
    if (userLat && userLng) {
      // Fit bounds to show both job and user location
      const L = require('leaflet');
      const bounds = L.latLngBounds(
        [lat, lng],
        [userLat, userLng]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (radiusKm) {
      // Fit bounds to show circle radius
      const L = require('leaflet');
      const bounds = L.latLngBounds(
        [lat - radiusKm / 111, lng - radiusKm / (111 * Math.cos(lat * Math.PI / 180))],
        [lat + radiusKm / 111, lng + radiusKm / (111 * Math.cos(lat * Math.PI / 180))]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // Just center on job location
      map.setView([lat, lng], 13);
    }
  }, [map, lat, lng, radiusKm, userLat, userLng]);

  return null;
}

export const JobLocationMap: React.FC<JobLocationMapProps> = ({
  latitude,
  longitude,
  jobTitle,
  companyName,
  radiusKm = 10, // Default 10km radius
  userLatitude,
  userLongitude,
  distance,
  className = '',
  height = '400px',
}) => {
  const [isClient, setIsClient] = useState(false);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    // Fix for default marker icons in Next.js
    import('leaflet').then((leaflet) => {
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl;
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      setL(leaflet.default);
    });
  }, []);

  // Calculate distance if user location is provided
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const displayDistance = distance !== undefined 
    ? distance 
    : (userLatitude && userLongitude 
        ? calculateDistance(latitude, longitude, userLatitude, userLongitude) 
        : undefined);

  if (!isClient) {
    return (
      <div 
        className={`rounded-xl overflow-hidden border-2 ${className}`} 
        style={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: 'oklch(0.1 0 0 / 0.6)' 
        }}
      >
        <div className="text-gray-400">Loading map...</div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden border-2 relative ${className}`} style={{ height }}>
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        .leaflet-container {
          height: 100%;
          width: 100%;
        }
      `}</style>
      <MapContainer
        center={[latitude, longitude]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Job location marker */}
        <Marker position={[latitude, longitude]}>
          <Popup>
            <div className="text-sm">
              <strong className="font-semibold">{jobTitle || 'Job Location'}</strong>
              {companyName && <div className="text-gray-600">{companyName}</div>}
              {displayDistance !== undefined && (
                <div className="mt-1 text-teal-600 font-medium">
                  {Math.round(displayDistance * 10) / 10} km away
                </div>
              )}
            </div>
          </Popup>
        </Marker>

        {/* User location marker (if provided) */}
        {userLatitude && userLongitude && (
          <Marker position={[userLatitude, userLongitude]}>
            <Popup>
              <div className="text-sm">
                <strong className="font-semibold">Your Location</strong>
                {displayDistance !== undefined && (
                  <div className="mt-1 text-teal-600 font-medium">
                    {Math.round(displayDistance * 10) / 10} km away
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Circle showing radius/range */}
        <Circle
          center={[latitude, longitude]}
          radius={radiusKm * 1000} // Convert km to meters
          pathOptions={{
            color: '#14b8a6', // Teal color
            fillColor: '#14b8a6',
            fillOpacity: 0.1,
            weight: 2,
          }}
        />

        {/* Fit bounds to show all markers and circle */}
        <MapBounds
          lat={latitude}
          lng={longitude}
          radiusKm={radiusKm}
          userLat={userLatitude}
          userLng={userLongitude}
        />
      </MapContainer>

      {/* Distance info overlay */}
      {displayDistance !== undefined && (
        <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium z-[1000]">
          📍 {Math.round(displayDistance * 10) / 10} km away
        </div>
      )}
    </div>
  );
};
