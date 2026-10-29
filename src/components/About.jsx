import { useMemo } from 'react'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import RecyclingRoundedIcon from '@mui/icons-material/RecyclingRounded'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import SectionHeading from './SectionHeading'

const VALUES = [
  { icon: VerifiedOutlinedIcon, title: 'Quality first', text: 'Every piece is tested and refined, held to a standard that puts craftsmanship and durability above all else.' },
  { icon: RecyclingRoundedIcon, title: 'Responsibly sourced', text: 'We partner with makers who share our commitment to ethical production, fair wages and minimal impact.' },
  { icon: WorkspacePremiumOutlinedIcon, title: 'Designed with care', text: 'From the weight of a clasp to the last note of a fragrance, every detail is intentional.' },
  { icon: LocalShippingOutlinedIcon, title: 'Thoughtful delivery', text: 'Complimentary shipping over $75, packed beautifully in recycled materials.' },
]

function About() {
  const products = useSelector((state) => state.products.items)

  const stats = useMemo(() => {
    const categories = new Set(products.map((product) => product.category)).size
    const rating = products.length ? (products.reduce((sum, product) => sum + product.rating, 0) / products.length).toFixed(1) : '—'
    return [
      { value: products.length || '—', label: 'Curated pieces' },
      { value: categories || '—', label: 'Categories' },
      { value: rating, label: 'Average rating' },
      { value: '30', label: 'Day returns' },
    ]
  }, [products])

  return (
    <>
      <section className="container-x grid items-center gap-12 py-12 sm:py-16 md:grid-cols-2 md:gap-10 md:py-20 lg:gap-16 lg:py-24" aria-labelledby="about-title">
        <div className="animate-fade-up">
          <h1 id="about-title" className="font-display text-[40px] leading-[1.04] tracking-tight sm:text-5xl lg:text-7xl">
            Made for the everyday, <em className="text-gold">built</em> to be kept.
          </h1>
          <p className="mt-8 max-w-lg text-lg leading-relaxed text-stone">
            goodthings began with a simple belief — that the objects we live with every day should be beautifully
            designed, responsibly made and built to last.
          </p>
          <p className="mt-4 max-w-lg leading-relaxed text-stone">
            We search for pieces that feel as good in ten years as they do today, and we present them with the care
            they deserve.
          </p>
        </div>
        <div className="relative pb-14 pr-8 sm:pr-14" aria-hidden="true">
          <div className="relative grid aspect-[4/5] place-items-center overflow-hidden bg-night text-cream">
            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold-light/20 blur-3xl" />
            <div className="relative grid h-56 w-56 place-items-center rounded-full border border-gold-light/40 sm:h-72 sm:w-72">
              <div className="absolute inset-3 rounded-full border border-gold-light/20" />
              <span className="inline-block -translate-y-[18%] font-display text-[110px] italic leading-none sm:text-[140px]">
                g<span className="not-italic text-gold-light">.</span>
              </span>
            </div>
            <p className="absolute left-8 top-8 text-[11px] uppercase tracking-[0.32em] text-cream/50">Made to be kept</p>
          </div>
          <div className="absolute bottom-0 right-0 w-3/5 bg-surface p-7 shadow-2xl ring-1 ring-line">
            <p className="font-display text-2xl leading-snug">Fewer, better things — chosen with care.</p>
          </div>
        </div>
      </section>

      <section className="bg-night text-cream" aria-label="goodthings in numbers">
        <dl className="container-x grid grid-cols-2 gap-y-10 py-16 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse text-center">
              <dt className="mt-2 text-[11px] uppercase tracking-[0.2em] text-cream/60">{stat.label}</dt>
              <dd className="font-display text-5xl text-gold-light">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="py-14 md:py-20 lg:py-28" aria-labelledby="values-title">
        <div className="container-x">
          <SectionHeading id="values-title" align="center" title="Our values" />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-surface p-8 ring-1 ring-line transition hover:-translate-y-1 hover:shadow-xl">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-sand text-gold">
                  <Icon />
                </span>
                <h3 className="mt-6 font-display text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sand py-20 text-center md:py-28">
        <div className="container-x max-w-4xl">
          <p className="font-display text-3xl italic leading-snug md:text-5xl">
            “We don&apos;t chase trends. We make room for things worth keeping.”
          </p>
          <p className="mt-8 text-[11px] uppercase tracking-[0.24em] text-stone">— The goodthings team</p>
        </div>
      </section>

      <section className="container-x py-20 text-center md:py-28">
        <h2 className="font-display text-4xl md:text-5xl">Find your next favourite</h2>
        <p className="mx-auto mt-4 max-w-md text-stone">Explore the full collection of pieces chosen to last.</p>
        <Link to="/" className="btn-primary mt-10">Browse the collection</Link>
      </section>
    </>
  )
}

export default About
