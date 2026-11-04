function PageLoader({ className = 'min-h-[60svh]' }) {
  return (
    <div role="status" aria-live="polite" className={`grid place-items-center ${className}`}>
      <div className="flex flex-col items-center gap-5">
        <span className="relative grid h-16 w-16 place-items-center">
          <span className="absolute inset-0 animate-spin rounded-full border border-line border-t-gold" />
          <span className="inline-block -translate-y-[15%] font-display text-[28px] italic leading-none">
            g<span className="not-italic text-gold">.</span>
          </span>
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone">Loading</span>
      </div>
    </div>
  )
}

export default PageLoader
