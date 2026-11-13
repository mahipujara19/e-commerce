import Reveal from './Reveal'

// Section title that fades in on scroll, with a short gold line that draws itself underneath.
function SectionHeading({ title, description, action, align = 'left', id }) {
  const centered = align === 'center'

  return (
    <Reveal className={`group flex flex-col gap-6 ${centered ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'}`}>
      <div className="max-w-2xl">
        <h2 id={id} className="font-display text-[32px] leading-tight tracking-tight sm:text-4xl md:text-5xl">
          {title}
        </h2>
        <span
          aria-hidden="true"
          className={`mt-5 block h-px w-16 scale-x-0 bg-gold transition-transform delay-300 duration-1000 group-[.is-visible]:scale-x-100 ${
            centered ? 'mx-auto origin-center' : 'origin-left'
          }`}
        />
        {description && <p className="mt-4 leading-relaxed text-stone">{description}</p>}
      </div>
      {action}
    </Reveal>
  )
}

export default SectionHeading
