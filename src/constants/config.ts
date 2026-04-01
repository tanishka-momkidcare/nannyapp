export const GOOGLE_MAPS_API_KEY = 'AIzaSyDO_eSBGKu-qwUCeB4eP6_a0pXoF8r35lM';

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
