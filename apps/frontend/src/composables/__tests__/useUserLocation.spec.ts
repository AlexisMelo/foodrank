import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'

const PERMISSION_DENIED = 1
const TIMEOUT = 3

/**
 * Replaces the browser geolocation: `getCurrentPosition` runs `answer` with the success and error callbacks,
 * and the Permissions API reports `permissionState`.
 */
function stubGeolocation(
  answer: (success: PositionCallback, error: PositionErrorCallback) => void,
  permissionState: PermissionState = 'prompt',
) {
  vi.stubGlobal('navigator', {
    geolocation: { getCurrentPosition: vi.fn(answer) },
    permissions: { query: vi.fn().mockResolvedValue({ state: permissionState }) },
  })
}

/**
 * Builds the error the browser gives when the position cannot be obtained.
 */
function positionError(code: number): GeolocationPositionError {
  return { code, PERMISSION_DENIED, message: '' } as GeolocationPositionError
}

/**
 * Imports a fresh copy of the composable, whose state is shared at module level.
 */
async function loadUseUserLocation() {
  vi.resetModules()
  const { useUserLocation } = await import('@/composables/useUserLocation')
  return useUserLocation()
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useUserLocation', () => {
  it('stores the position when the user accepts', async () => {
    stubGeolocation((success) =>
      success({ coords: { latitude: 49.18, longitude: -0.37 } } as GeolocationPosition),
    )
    const { location, status, requestLocation } = await loadUseUserLocation()

    requestLocation()

    expect(status.value).toBe('granted')
    expect(location.value).toEqual({ lat: 49.18, lon: -0.37 })
  })

  it('is dismissed when the user closes the prompt', async () => {
    stubGeolocation((_, error) => error(positionError(PERMISSION_DENIED)), 'prompt')
    const { location, status, requestLocation } = await loadUseUserLocation()

    requestLocation()
    await flushPromises()

    expect(status.value).toBe('dismissed')
    expect(location.value).toBeNull()
  })

  it('is blocked when geolocation is refused in the browser settings', async () => {
    stubGeolocation((_, error) => error(positionError(PERMISSION_DENIED)), 'denied')
    const { status, requestLocation } = await loadUseUserLocation()

    requestLocation()
    await flushPromises()

    expect(status.value).toBe('blocked')
  })

  it('is unavailable when the position cannot be obtained', async () => {
    stubGeolocation((_, error) => error(positionError(TIMEOUT)))
    const { status, requestLocation } = await loadUseUserLocation()

    requestLocation()
    await flushPromises()

    expect(status.value).toBe('unavailable')
  })

  it('is unavailable when the browser does not support geolocation', async () => {
    vi.stubGlobal('navigator', {})
    const { status, requestLocation } = await loadUseUserLocation()

    requestLocation()

    expect(status.value).toBe('unavailable')
  })

  it('does not ask again once the position is known', async () => {
    stubGeolocation((success) =>
      success({ coords: { latitude: 49.18, longitude: -0.37 } } as GeolocationPosition),
    )
    const { requestLocation } = await loadUseUserLocation()

    requestLocation()
    requestLocation()

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1)
  })
})
