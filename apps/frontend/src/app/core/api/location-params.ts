import type { UserLocation } from '@/core/models/location.model';

/**
 * Query params of the user position, none when it is unknown (the API then uses its default city).
 */
export function locationParams(location?: UserLocation | null): Record<string, number> {
  return location ? { lat: location.lat, lon: location.lon } : {};
}
