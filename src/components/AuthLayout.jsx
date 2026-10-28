import CheckRoundedIcon from '@mui/icons-material/CheckRounded'

const BENEFITS = [
  'Your bag, saved to your account',
  'Faster, secure checkout',
  'Order updates straight to your inbox',
  'Early access to new arrivals',
]

function AuthLayout({ children }) {
  return (
    <div className="grid lg:min-h-[calc(100svh-7.5rem)] lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-night text-cream lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-16">
        <div className="pointer-events-none absolute -right-40 top-1/3 h-[560px] w-[560px] rounded-full bg-gold-light/20 blur-3xl" />
        
        <div className="relative">
          <div className="mb-14 flex items-center gap-6" aria-hidden="true">
            <div className="relative grid h-32 w-32 place-items-center rounded-full border border-gold-light/40 xl:h-36 xl:w-36">
              <div className="absolute inset-2 rounded-full border border-gold-light/20" />
              <span className="inline-block -translate-y-[18%] font-display text-6xl italic leading-none text-cream xl:text-7xl">
                g<span className="not-italic text-gold-light">.</span>
              </span>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold tracking-tight xl:text-4xl">
                good<span className="font-normal italic">things</span>
                <span className="text-gold-light">.</span>
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-cream/50">Curated luxury</p>
            </div>
          </div>
          <h2 className="font-display text-5xl leading-[1.05] xl:text-6xl">
            A quieter kind of <em className="text-gold-light">luxury</em>.
          </h2>
          <ul className="mt-10 space-y-4 text-sm text-cream/75">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-gold-light/40">
                  <CheckRoundedIcon sx={{ fontSize: 14 }} className="text-gold-light" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        {/* <p className="relative text-[11px] uppercase tracking-[0.24em] text-cream/40">Made to be kept</p> */}
      </aside>

      <div className="flex items-center justify-center px-5 py-14 sm:px-10 lg:py-20">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-10 flex items-center gap-4 border-b border-line pb-8 lg:hidden" aria-hidden="true">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold/50">
              <span className="inline-block -translate-y-[15%] font-display text-[28px] italic leading-none">
                g<span className="not-italic text-gold">.</span>
              </span>
            </span>
            <span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">The goodthings circle</span>
              <span className="mt-1 block font-display text-lg">A quieter kind of luxury.</span>
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export function FormDivider({ children }) {
  return (
    <div className="my-8 flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-stone">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

export default AuthLayout
