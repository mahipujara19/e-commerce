import useInView from '../hooks/useInView'

/**
 * Fades and slides its content in when it scrolls into view (styles: .reveal in index.css).
 * variant: 'up' (default), 'left', 'right', 'scale' or 'fade'. delay: ms, for staggering items in a row.
 * `as` keeps the right element (article, figure, button…), so wrapping adds no extra markup.
 * With "reduce motion" switched on, the content is simply shown.
 */
function Reveal({ as: Tag = 'div', variant = 'up', delay = 0, className = '', style, children, ...rest }) {
  const [ref, inView] = useInView()
  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      className={`reveal ${inView ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms`, ...style } : style}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export default Reveal
