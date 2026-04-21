import Config from 'react-native-config';

// ─── API Configs ─────────────────────────────────────────────────────────────
// Use config1.API_HOST for dev, config2 for staging, config3 for prod.
// Mix and match per API call as needed.

export const config1 = {

  API_HOST: 'https://d2ed-49-205-177-253.ngrok-free.app',
};

export const config2 = {
  API_HOST: 'https://staging.api.momkidcare.com',
};

export const config3 = {
  API_HOST: 'https://api.momkidcare.com',
};

// ─── Google Maps ─────────────────────────────────────────────────────────────

export const GOOGLE_MAPS_API_KEY = Config.GOOGLE_MAPS_API_KEY || '';

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${lat},${lng}&language=hi&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results?.[0]?.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
