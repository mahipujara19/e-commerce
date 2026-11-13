import { useEffect, useRef, useState } from 'react'

const supported = typeof window !== 'undefined' && 'IntersectionObserver' in window

/**
 * [ref, inView]: inView turns true once the element scrolls into view (and stays true).
 * Browsers without IntersectionObserver simply get true, so content is never left hidden.
 */
export default function useInView({ rootMargin = '0px 0px -8% 0px' } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(!supported)

  useEffect(() => {
    const node = ref.current
    if (!node || inView) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold: 0 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [inView, rootMargin])

  return [ref, inView]
}
