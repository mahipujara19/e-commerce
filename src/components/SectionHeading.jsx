function SectionHeading({ eyebrow, title, description, action, align = 'left', id }) {
  const centered = align === 'center'

  return (
    <div className={`flex flex-col gap-6 ${centered ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'}`}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={id} className="mt-3 font-display text-[32px] leading-tight tracking-tight sm:mt-4 sm:text-4xl md:text-5xl">
          {title}
        </h2>
        {description && <p className="mt-4 leading-relaxed text-stone">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export default SectionHeading
