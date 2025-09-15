interface GeocodeResult {
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    suburb?: string;
    neighbourhood?: string;
    hamlet?: string;
    locality?: string;
  };
}

interface DetailedLocationInfo {
  barangay?: string;
  municipality: string;
  province: string;
  region?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface ReverseGeocodeResponse {
  success: boolean;
  locationName: string;
  detailedInfo?: DetailedLocationInfo;
  error?: string;
}

/**
 * Reverse geocodes coordinates to get location name using OpenStreetMap Nominatim API
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Promise with location name or error
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResponse> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'ProteQ-Emergency-Management/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data: GeocodeResult = await response.json();

    if (!data || !data.display_name) {
      return {
        success: false,
        locationName: 'Unknown Location',
        error: 'No location data found'
      };
    }

    // Extract the most relevant location name with barangay information
    let locationName = 'Unknown Location';
    let detailedInfo: DetailedLocationInfo | undefined;

    if (data.address) {
      // Extract barangay/subdivision information
      const barangay = data.address.suburb || data.address.neighbourhood || data.address.hamlet || data.address.locality;

      // Extract municipality/city information
      const municipality = data.address.city || data.address.town || data.address.village || data.address.municipality;

      // Extract province/state information
      const province = data.address.state || data.address.county;

      // Extract country information
      const country = data.address.country;

      // Build location name with barangay if available
      if (barangay && municipality && province) {
        locationName = `Barangay ${barangay}, ${municipality}, ${province}`;
      } else if (barangay && municipality) {
        locationName = `Barangay ${barangay}, ${municipality}`;
      } else if (municipality && province) {
        locationName = `${municipality}, ${province}`;
      } else if (municipality) {
        locationName = municipality;
      } else if (province) {
        locationName = province;
      } else {
        // Fallback to display_name but clean it up
        locationName = data.display_name.split(',')[0] || data.display_name;
      }

      // Add country if it's not Philippines (to avoid redundancy)
      if (country && country !== 'Philippines' && !locationName.includes(country)) {
        locationName += `, ${country}`;
      }

      // Create detailed info object
      detailedInfo = {
        barangay: barangay,
        municipality: municipality || 'Unknown',
        province: province || 'Unknown',
        coordinates: {
          latitude,
          longitude
        }
      };
    } else {
      // Fallback to display_name
      locationName = data.display_name.split(',')[0] || data.display_name;
    }

    return {
      success: true,
      locationName,
      detailedInfo
    };

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      success: false,
      locationName: 'Location Unavailable',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Hook to get location name from coordinates with loading state
 */
export function useReverseGeocode(latitude: number | null, longitude: number | null) {
  const [locationName, setLocationName] = React.useState<string>('Loading location...');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (latitude === null || longitude === null) {
      setLocationName('Location not available');
      return;
    }

    const fetchLocation = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await reverseGeocode(latitude, longitude);
        if (result.success) {
          setLocationName(result.locationName);
        } else {
          setLocationName('Location not found');
          setError(result.error || 'Failed to get location');
        }
      } catch (err) {
        setLocationName('Location error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [latitude, longitude]);

  return { locationName, loading, error };
}

// Import React for the hook
import React from 'react';
