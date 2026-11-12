import { useCallback, useRef, useState } from 'react'

const reverseGeocode = async (latitude, longitude) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' }, signal: AbortSignal.timeout(10000) },
  )
  if (!response.ok) throw new Error('Geocode request failed')
  const data = await response.json()
  return data.address || {}
}

const toAddress = (addr) => ({
  address: [addr.house_number, addr.road].filter(Boolean).join(' ') || addr.suburb || '',
  city: addr.city || addr.town || addr.village || addr.county || '',
  state: addr.state || addr.region || '',
  zipCode: addr.postcode || '',
  country: addr.country || '',
})

const ERROR_MESSAGES = {
  1: 'Location access was blocked. Allow it for this site in your browser settings, or enter your address below.',
  2: 'Your device could not determine your location. Please enter your address below.',
  3: 'Finding your location took too long. Try again or enter your address below.',
}

// "Use my location": browser geolocation plus an OpenStreetMap lookup. onFound receives the address fields.
function useLocationAddress(onFound) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const detect = useCallback(() => {
    const id = ++requestId.current
    setError('')

    if (!window.isSecureContext || !navigator.geolocation) {
      setError('Location detection is not available in this browser. Please enter your address below.')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (requestId.current !== id) return
        try {
          const addr = await reverseGeocode(coords.latitude, coords.longitude)
          if (requestId.current === id) onFound(toAddress(addr))
        } catch {
          if (requestId.current === id) setError('We found your position but not the street address. Please enter it below.')
        } finally {
          if (requestId.current === id) setLoading(false)
        }
      },
      (geoError) => {
        if (requestId.current !== id) return
        setError(ERROR_MESSAGES[geoError.code] ?? 'Could not detect your location. Please enter your address below.')
        setLoading(false)
      },
      { timeout: 15000, maximumAge: 5 * 60 * 1000 },
    )
  }, [onFound])

  return { detect, loading, error }
}

export default useLocationAddress
