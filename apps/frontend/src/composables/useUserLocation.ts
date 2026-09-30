import { ref } from 'vue'

export interface UserLocation {
  lat: number
  lon: number
}

// Shared across the app: the browser is asked only once per page load
const location = ref<UserLocation | null>(null)
let requested = false

/**
 * Browser geolocation, used to favor nearby restaurants in search.
 * Never blocks: `location` stays null while pending or if refused (the API then uses its default city).
 */
export function useUserLocation() {
  function requestLocation() {
    if (requested || !('geolocation' in navigator)) return
    requested = true
    navigator.geolocation.getCurrentPosition(
      (position) => {
        location.value = { lat: position.coords.latitude, lon: position.coords.longitude }
      },
      () => {
        location.value = null
      },
      { timeout: 5000, maximumAge: 10 * 60 * 1000 },
    )
  }

  return { location, requestLocation }
}
