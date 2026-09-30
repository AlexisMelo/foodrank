import { ref } from 'vue'

export interface UserLocation {
  lat: number
  lon: number
}

/**
 * - `idle`: not asked yet
 * - `pending`: waiting for the browser (permission prompt or GPS fix)
 * - `granted`: position known
 * - `dismissed`: prompt refused or closed, but the browser still allows asking again
 * - `blocked`: refused in the browser settings, the site cannot ask again
 * - `unavailable`: geolocation unsupported, or the position could not be obtained (timeout, no signal)
 */
export type LocationStatus =
  | 'idle'
  | 'pending'
  | 'granted'
  | 'dismissed'
  | 'blocked'
  | 'unavailable'

// Shared across the app
const location = ref<UserLocation | null>(null)
const status = ref<LocationStatus>('idle')
let watchingPermission = false

/**
 * Asks the Permissions API whether geolocation is blocked in the browser settings.
 */
async function isBlocked(): Promise<boolean> {
  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' })
    return permission.state === 'denied'
  } catch {
    return false
  }
}

/**
 * Follows permission changes made in the browser settings while the app is open.
 */
async function watchPermission(onGranted: () => void) {
  if (watchingPermission) return
  watchingPermission = true
  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' })
    permission.onchange = () => {
      if (permission.state === 'granted') {
        onGranted()
      } else if (permission.state === 'denied') {
        location.value = null
        status.value = 'blocked'
      }
    }
  } catch {
    // Permissions API not supported: changes are only detected on the next request
  }
}

/**
 * Browser geolocation, used to favor nearby restaurants in search.
 * Never blocks: `location` stays null while pending or if refused (the API then uses its default city).
 */
export function useUserLocation() {
  function requestLocation() {
    if (status.value === 'pending' || status.value === 'granted') return
    if (!('geolocation' in navigator)) {
      status.value = 'unavailable'
      return
    }
    status.value = 'pending'
    watchPermission(requestLocation)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        location.value = { lat: position.coords.latitude, lon: position.coords.longitude }
        status.value = 'granted'
      },
      async (error) => {
        location.value = null
        if (error.code === error.PERMISSION_DENIED) {
          status.value = (await isBlocked()) ? 'blocked' : 'dismissed'
        } else {
          status.value = 'unavailable'
        }
      },
      { timeout: 10000, maximumAge: 10 * 60 * 1000 },
    )
  }

  return { location, status, requestLocation }
}
