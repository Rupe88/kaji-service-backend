'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  title?: string;
  address?: string;
  height?: string;
  zoom?: number;
  showMarker?: boolean;
  className?: string;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  latitude,
  longitude,
  title,
  address,
  height = '400px',
  zoom = 15,
  showMarker = true,
  className = '',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapRef.current || !latitude || !longitude) {
      return;
    }

    setIsLoading(true);
    setMapError(null);

    // Use OpenStreetMap with Leaflet for free map display
    // Load Leaflet CSS and JS dynamically
    const loadLeaflet = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if Leaflet is already loaded
        if ((window as any).L) {
          resolve();
          return;
        }

        // Load Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoGS5s3Vwc8ylk=';
        link.crossOrigin = '';
        document.head.appendChild(link);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Leaflet'));
        document.body.appendChild(script);
      });
    };

    loadLeaflet()
      .then(() => {
        const L = (window as any).L;
        if (!L || !mapRef.current) {
          throw new Error('Leaflet not loaded');
        }

        // Clear previous map if exists
        if (mapRef.current) {
          mapRef.current.innerHTML = '';
        }

        // Initialize map
        const map = L.map(mapRef.current).setView([latitude, longitude], zoom);

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Add marker if requested
        if (showMarker) {
          const marker = L.marker([latitude, longitude]).addTo(map);
          if (title || address) {
            const popupContent = `
              <div style="padding: 8px;">
                ${title ? `<strong>${title}</strong><br/>` : ''}
                ${address ? `<span style="color: #666;">${address}</span>` : ''}
              </div>
            `;
            marker.bindPopup(popupContent).openPopup();
          }
        }

        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error loading map:', error);
        setMapError('Failed to load map. Please try again.');
        setIsLoading(false);
      });
  }, [latitude, longitude, zoom, showMarker, title, address]);

  if (!latitude || !longitude) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border-2 ${className}`}
        style={{
          height,
          backgroundColor: 'oklch(0.1 0 0 / 0.5)',
          borderColor: 'oklch(0.7 0.15 180 / 0.3)',
        }}
      >
        <div className="text-center p-4">
          <svg
            className="w-12 h-12 mx-auto mb-2 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-gray-400 text-sm">Location not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border-2 ${className}`} style={{ height, borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white text-sm">Loading map...</p>
          </div>
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
          <div className="text-center p-4">
            <p className="text-red-400 text-sm mb-2">{mapError}</p>
            <a
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:text-teal-300 text-sm underline"
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: height }} />
    </div>
  );
};

