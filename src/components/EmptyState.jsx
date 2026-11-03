// Shared look for "nothing here yet" and error screens: gold icon in a sand circle, serif heading, one action.
function EmptyState({ icon: Icon, title, description, action, compact = false, titleAs: Title = 'h2', className = '' }) {
  return (
    <div className={`animate-fade-in text-center ${compact ? 'px-6 py-14' : 'py-24 md:py-32'} ${className}`}>
      {Icon && (
        <span className={`mx-auto grid place-items-center rounded-full bg-sand text-gold ${compact ? 'h-16 w-16' : 'h-24 w-24'}`}>
          <Icon sx={{ fontSize: compact ? 28 : 36 }} />
        </span>
      )}
      <Title className={`font-display ${compact ? 'mt-6 text-2xl md:text-3xl' : 'mt-8 text-4xl md:text-5xl'}`}>{title}</Title>
      {description && <p className="mx-auto mt-4 max-w-sm leading-relaxed text-stone">{description}</p>}
      {action && <div className={compact ? 'mt-8' : 'mt-10'}>{action}</div>}
    </div>
  )
}

export default EmptyState
