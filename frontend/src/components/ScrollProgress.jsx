import { useEffect, useRef } from 'react'

// A thin gold bar along the top of the window that fills as the page is scrolled. Decorative only.
function ScrollProgress() {
  const bar = useRef(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[1600] h-[3px]">
      <div ref={bar} className="h-full origin-left bg-gradient-to-r from-gold via-gold-light to-gold" style={{ transform: 'scaleX(0)' }} />
    </div>
  )
}

export default ScrollProgress
