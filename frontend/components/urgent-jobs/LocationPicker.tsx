'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getCurrentLocation } from '@/utils/distance';
import { getProvinces, getDistrictsByProvince, getMunicipalitiesByDistrict } from '@/lib/nepal-locations';
import toast from 'react-hot-toast';

interface LocationPickerProps {
  onLocationChange: (location: {
    province: string;
    district: string;
    city: string;
    ward?: string;
    street?: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  initialLocation?: {
    province?: string;
    district?: string;
    city?: string;
    ward?: string;
    street?: string;
    latitude?: number;
    longitude?: number;
  };
  error?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationChange,
  initialLocation,
  error,
}) => {
  const [province, setProvince] = useState(initialLocation?.province || '');
  const [district, setDistrict] = useState(initialLocation?.district || '');
  const [city, setCity] = useState(initialLocation?.city || '');
  const [ward, setWard] = useState(initialLocation?.ward || '');
  const [street, setStreet] = useState(initialLocation?.street || '');
  const [latitude, setLatitude] = useState<number | undefined>(initialLocation?.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(initialLocation?.longitude);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    onLocationChange({
      province,
      district,
      city,
      ward,
      street,
      latitude,
      longitude,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [province, district, city, ward, street, latitude, longitude]);

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const location = await getCurrentLocation();
      setLatitude(location.latitude);
      setLongitude(location.longitude);
      toast.success('Location detected successfully');
    } catch (error: any) {
      console.error('Error getting location:', error);
      toast.error('Could not get your location. Please enter manually.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvince = e.target.value;
    setProvince(newProvince);
    setDistrict(''); // Reset district when province changes
    setCity(''); // Reset city when province changes
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDistrict = e.target.value;
    setDistrict(newDistrict);
    setCity(''); // Reset city when district changes
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">Location *</label>
        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          disabled={isGettingLocation}
          className="text-xs"
        >
          {isGettingLocation ? 'Getting...' : 'Use Current Location'}
        </Button>
      </div>

      {(latitude && longitude) && (
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'oklch(0.7 0.15 180 / 0.1)' }}>
          <p className="text-xs text-gray-400 mb-1">GPS Coordinates:</p>
          <p className="text-sm" style={{ color: 'oklch(0.7 0.15 180)' }}>
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Province *</label>
          <select
            value={province}
            onChange={handleProvinceChange}
            className="w-full px-4 py-3 rounded-xl text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.8)',
              borderColor: error ? 'oklch(0.65 0.2 330)' : 'oklch(0.7 0.15 180 / 0.2)',
            }}
          >
            <option value="">Select Province</option>
            {getProvinces().map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">District *</label>
          <select
            value={district}
            onChange={handleDistrictChange}
            disabled={!province}
            className="w-full px-4 py-3 rounded-xl text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.8)',
              borderColor: error ? 'oklch(0.65 0.2 330)' : 'oklch(0.7 0.15 180 / 0.2)',
            }}
          >
            <option value="">{province ? 'Select District' : 'Select Province first'}</option>
            {province && getDistrictsByProvince(province).map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">City/Municipality *</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!district}
            className="w-full px-4 py-3 rounded-xl text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.8)',
              borderColor: error ? 'oklch(0.65 0.2 330)' : 'oklch(0.7 0.15 180 / 0.2)',
            }}
          >
            <option value="">{district ? 'Select City/Municipality' : 'Select District first'}</option>
            {province && district && getMunicipalitiesByDistrict(province, district).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Ward"
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          placeholder="e.g., 1, 2, 3..."
          helperText="Optional"
        />
      </div>

      <Input
        label="Street Address"
        value={street}
        onChange={(e) => setStreet(e.target.value)}
        placeholder="Street address (optional)"
        helperText="Optional"
      />

      {error && (
        <p className="text-sm flex items-center gap-1.5" style={{ color: 'oklch(0.65 0.2 330)' }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

