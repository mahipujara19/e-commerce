import { useEffect, useState } from 'react'

// The value, once it has stopped changing for `delay` ms. Used so typing a search does not send a request per key.
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

export default useDebouncedValue
