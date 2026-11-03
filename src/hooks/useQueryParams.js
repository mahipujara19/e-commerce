import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

// Keeps filters in the URL so they survive reloads and can be linked to (e.g. /admin/orders?status=pending).
// Passing null or '' for a key removes it.
function useQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const update = useCallback(
    (changes) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          Object.entries(changes).forEach(([key, value]) => (value == null || value === '' ? next.delete(key) : next.set(key, value)))
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [searchParams, update]
}

export default useQueryParams
