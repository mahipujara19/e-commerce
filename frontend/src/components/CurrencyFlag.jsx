// Small flags for the currency picker, drawn inline: Windows does not render flag emoji, and inline SVG needs no
// image requests. They are simplified for a 20px-wide display and are decorative (aria-hidden); the currency code
// beside each flag carries the meaning.

const W = 30
const H = 20

// Union Jack, scaled into the given box; used on its own and in the Australian and New Zealand cantons.
const unionJack = (w, h) => (
  <g>
    <rect width={w} height={h} fill="#012169" />
    <path d={`M0 0L${w} ${h}M${w} 0L0 ${h}`} stroke="#fff" strokeWidth={h * 0.2} />
    <path d={`M0 0L${w} ${h}M${w} 0L0 ${h}`} stroke="#C8102E" strokeWidth={h * 0.08} />
    <path d={`M${w / 2} 0V${h}M0 ${h / 2}H${w}`} stroke="#fff" strokeWidth={h * 0.33} />
    <path d={`M${w / 2} 0V${h}M0 ${h / 2}H${w}`} stroke="#C8102E" strokeWidth={h * 0.2} />
  </g>
)

// A Nordic cross: background, cross colour, optional inner cross colour.
const nordic = (bg, cross, inner) => (
  <>
    <rect width={W} height={H} fill={bg} />
    <path d="M11 0V20M0 10H30" stroke={cross} strokeWidth={inner ? 5 : 4} />
    {inner && <path d="M11 0V20M0 10H30" stroke={inner} strokeWidth={2.4} />}
  </>
)

const stars = (points, fill, r = 1.1) => points.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={fill} />)

const FLAGS = {
  USD: (
    <>
      <rect width={W} height={H} fill="#fff" />
      {[0, 2, 4, 6].map((row) => <rect key={row} y={(row * H) / 7} width={W} height={H / 7} fill="#B22234" />)}
      <rect width={13} height={(H * 4) / 7} fill="#3C3B6E" />
    </>
  ),
  EUR: (
    <>
      <rect width={W} height={H} fill="#003399" />
      {stars(Array.from({ length: 12 }, (_, i) => [15 + 6 * Math.sin((i * Math.PI) / 6), 10 - 6 * Math.cos((i * Math.PI) / 6)]), '#FFCC00', 0.9)}
    </>
  ),
  GBP: unionJack(W, H),
  INR: (
    <>
      <rect width={W} height={H / 3} fill="#FF9933" />
      <rect y={H / 3} width={W} height={H / 3} fill="#fff" />
      <rect y={(H * 2) / 3} width={W} height={H / 3} fill="#138808" />
      <circle cx={15} cy={10} r={2.4} fill="none" stroke="#000080" strokeWidth={0.8} />
    </>
  ),
  AUD: (
    <>
      <rect width={W} height={H} fill="#012169" />
      {unionJack(15, 10)}
      {stars([[7.5, 15.5], [22, 5], [25, 9], [20, 11], [22, 16.5]], '#fff')}
    </>
  ),
  NZD: (
    <>
      <rect width={W} height={H} fill="#012169" />
      {unionJack(15, 10)}
      {stars([[22, 5], [25.5, 9], [19.5, 10], [22, 16]], '#fff', 1.4)}
      {stars([[22, 5], [25.5, 9], [19.5, 10], [22, 16]], '#C8102E', 0.9)}
    </>
  ),
  CAD: (
    <>
      <rect width={W} height={H} fill="#fff" />
      <rect width={7.5} height={H} fill="#D80621" />
      <rect x={22.5} width={7.5} height={H} fill="#D80621" />
      <path d="M15 4l1.3 2.6 1.9-.9-.6 3.5 2.4-1.6.4 1.4 2-.3-1.3 2.4.9.6-3.6 2.4.3 1.3-3.2-.4V17h-1v-2.4l-3.2.4.3-1.3-3.6-2.4.9-.6-1.3-2.4 2 .3.4-1.4 2.4 1.6-.6-3.5 1.9.9z" fill="#D80621" />
    </>
  ),
  JPY: (
    <>
      <rect width={W} height={H} fill="#fff" />
      <circle cx={15} cy={10} r={6} fill="#BC002D" />
    </>
  ),
  CHF: (
    <>
      <rect width={W} height={H} fill="#DA291C" />
      <path d="M15 4.5V15.5M9.5 10H20.5" stroke="#fff" strokeWidth={3.4} />
    </>
  ),
  SEK: nordic('#006AA7', '#FECC00'),
  NOK: nordic('#BA0C2F', '#fff', '#00205B'),
  DKK: nordic('#C8102E', '#fff'),
  SGD: (
    <>
      <rect width={W} height={H / 2} fill="#EF3340" />
      <rect y={H / 2} width={W} height={H / 2} fill="#fff" />
      <circle cx={7} cy={5} r={3.4} fill="#fff" />
      <circle cx={8.5} cy={5} r={3.1} fill="#EF3340" />
      {stars([[10.5, 3.2], [12.6, 4.6], [11.8, 7], [9.2, 7], [8.4, 4.6]], '#fff', 0.55)}
    </>
  ),
  MXN: (
    <>
      <rect width={10} height={H} fill="#006847" />
      <rect x={10} width={10} height={H} fill="#fff" />
      <rect x={20} width={10} height={H} fill="#CE1126" />
      <circle cx={15} cy={10} r={2.6} fill="#8C6B38" />
    </>
  ),
  BRL: (
    <>
      <rect width={W} height={H} fill="#009C3B" />
      <path d="M15 2.5L27 10L15 17.5L3 10Z" fill="#FFDF00" />
      <circle cx={15} cy={10} r={4.2} fill="#002776" />
    </>
  ),
  AED: (
    <>
      <rect width={W} height={H / 3} fill="#00732F" />
      <rect y={H / 3} width={W} height={H / 3} fill="#fff" />
      <rect y={(H * 2) / 3} width={W} height={H / 3} fill="#000" />
      <rect width={8} height={H} fill="#FF0000" />
    </>
  ),
}

function CurrencyFlag({ code, className = '' }) {
  const flag = FLAGS[code]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" className={`h-[14px] w-[21px] shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10 ${className}`}>
      {flag ?? <rect width={W} height={H} fill="rgb(var(--sand))" />}
    </svg>
  )
}

export default CurrencyFlag
