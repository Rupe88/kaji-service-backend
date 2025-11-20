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

  // Format distance (km or meters)
  const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
      // Show in meters if less than 1km
      const meters = Math.round(distanceKm * 1000);
      return `${meters}m away`;
    } else if (distanceKm < 10) {
      // Show one decimal place for distances less than 10km
      return `${Math.round(distanceKm * 10) / 10}km away`;
    } else {
      // Show rounded for distances 10km or more
      return `${Math.round(distanceKm)}km away`;
    }
  };

  const displayDistance = distance !== undefined 
    ? distance 
    : (userLatitude && userLongitude 
        ? calculateDistance(latitude, longitude, userLatitude, userLongitude) 
        : undefined);

  // Create custom icons
  const jobIcon = L ? L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }) : undefined;

  const userIcon = L ? L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }) : undefined;

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
    <div className={`relative ${className}`} style={{ height }}>
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        .leaflet-container {
          height: 100%;
          width: 100%;
          background-color: #1a1a1a;
          font-family: inherit;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        }
        .leaflet-control-zoom a {
          background-color: rgba(20, 20, 20, 0.9) !important;
          color: #e5e7eb !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: rgba(30, 30, 30, 0.95) !important;
          color: #14b8a6 !important;
        }
        .leaflet-popup-content-wrapper {
          background-color: rgba(20, 20, 20, 0.95) !important;
          color: #e5e7eb !important;
          border-radius: 8px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
        }
        .leaflet-popup-tip {
          background-color: rgba(20, 20, 20, 0.95) !important;
        }
        .leaflet-popup-close-button {
          color: #9ca3af !important;
        }
        .leaflet-popup-close-button:hover {
          color: #e5e7eb !important;
        }
      `}</style>
      <MapContainer
        center={[latitude, longitude]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
        className="rounded-b-2xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Job location marker */}
        <Marker 
          position={[latitude, longitude]}
          icon={jobIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong className="font-semibold text-white">{jobTitle || 'Job Location'}</strong>
              {companyName && <div className="text-gray-400 mt-1">{companyName}</div>}
              {displayDistance !== undefined && (
                <div className="mt-2 px-2 py-1 rounded bg-teal-500/20 text-teal-400 font-medium text-xs inline-block">
                  📍 {formatDistance(displayDistance)}
                </div>
              )}
            </div>
          </Popup>
        </Marker>

        {/* User location marker (if provided) */}
        {userLatitude && userLongitude && (
          <Marker 
            position={[userLatitude, userLongitude]}
            icon={userIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong className="font-semibold text-white">Your Location</strong>
                {displayDistance !== undefined && (
                  <div className="mt-2 px-2 py-1 rounded bg-teal-500/20 text-teal-400 font-medium text-xs inline-block">
                    📍 {formatDistance(displayDistance)}
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
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '5, 5',
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
        <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur-md text-white px-4 py-2.5 rounded-lg text-sm font-semibold z-[1000] border border-teal-500/30 shadow-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-teal-400">{formatDistance(displayDistance)}</span>
          </div>
        </div>
      )}
      
      {/* Map controls info */}
      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs z-[1000] border border-gray-700/50">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Scroll to zoom</span>
        </div>
      </div>
    </div>
  );
};
