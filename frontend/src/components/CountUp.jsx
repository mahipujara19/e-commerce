import { useEffect, useState } from 'react'
import useInView from '../hooks/useInView'

/**
 * Counts a number such as "80+" or 15 up from zero when it scrolls into view. Values that are not a number
 * are shown as they are. Screen readers always get the final value.
 */
function CountUp({ value, duration = 1600 }) {
  const match = String(value).match(/^(\d+)(.*)$/)
  const target = match ? Number(match[1]) : null
  const suffix = match ? match[2] : ''
  const [ref, inView] = useInView()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!inView || target === null) return undefined
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = performance.now()
    let frame = 0
    const tick = (now) => {
      const progress = reduce ? 1 : Math.min(1, (now - start) / duration)
      // Ease out: fast at first, settling gently on the final number.
      setCurrent(Math.round(target * (1 - (1 - progress) ** 3)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, target, duration])

  if (target === null) return value

  return (
    <span ref={ref}>
      <span aria-hidden="true">{current}{suffix}</span>
      <span className="sr-only">{value}</span>
    </span>
  )
}

export default CountUp
