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
  const mainImage = products.find((product) => product.category === 'furniture') ?? products[0]
  const accentImage = products.find((product) => product.category === 'womens-jewellery') ?? products[1]

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
      <section className="container-x grid items-center gap-16 py-16 md:py-24 lg:grid-cols-2" aria-labelledby="about-title">
        <div className="animate-fade-up">
          <p className="eyebrow">Our story</p>
          <h1 id="about-title" className="mt-5 font-display text-5xl leading-[1.04] tracking-tight md:text-7xl">
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
        <div className="relative pb-16 pr-10 sm:pr-16">
          <div className="aspect-[4/5] bg-sand">
            {mainImage && <img src={mainImage.images?.[0] ?? mainImage.thumbnail} alt="" className="h-full w-full object-contain p-12" />}
          </div>
          <div className="absolute bottom-0 right-0 aspect-square w-1/2 bg-white p-6 shadow-2xl ring-1 ring-line">
            {accentImage && <img src={accentImage.thumbnail} alt="" className="h-full w-full object-contain" />}
          </div>
        </div>
      </section>

      <section className="bg-ink text-ivory" aria-label="goodthings in numbers">
        <dl className="container-x grid grid-cols-2 gap-y-10 py-16 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse text-center">
              <dt className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ivory/60">{stat.label}</dt>
              <dd className="font-display text-5xl text-gold-light">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="py-20 md:py-28" aria-labelledby="values-title">
        <div className="container-x">
          <SectionHeading id="values-title" align="center" eyebrow="What we stand for" title="Our values" />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-white p-8 ring-1 ring-line transition hover:-translate-y-1 hover:shadow-xl">
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
