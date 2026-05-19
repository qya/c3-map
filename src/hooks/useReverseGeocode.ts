import { useState, useEffect } from 'react';

export const useReverseGeocode = (lat: number, lng: number) => {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAddress = async () => {
      if (!lat || !lng) return;

      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          {
            headers: {
              'Accept-Language': 'en',
            },
          },
        );

        if (!response.ok) {
          throw new Error('Failed to fetch address');
        }

        const data = await response.json();
        if (data.display_name) {
          setAddress(data.display_name);
        } else {
          setAddress('Address not found');
        }
      } catch (error) {
        setAddress('Geocoding failed');
      } finally {
        setLoading(false);
      }
    };

    fetchAddress();
  }, [lat, lng]);

  return { address, loading };
};
