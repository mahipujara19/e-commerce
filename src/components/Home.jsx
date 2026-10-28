import { useEffect, useMemo, useState } from 'react'
import { Rating } from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { setCategory } from '../toolkit/searchSlice'
import { LUXURY_CATEGORIES, SIGNATURE_CATEGORIES, formatCategory, money } from '../utils/format'
import Product from './Product'
import ProductCard, { ProductCardSkeleton } from './ProductCard'
import SectionHeading from './SectionHeading'


const MARQUEE = ['Fine jewellery', 'Timepieces', 'Signature fragrance', 'Leather goods', 'Eyewear', 'Objects for the home']

const PERKS = [
  { icon: LocalShippingOutlinedIcon, title: 'Complimentary shipping', text: 'On every order over $75' },
  { icon: AutorenewRoundedIcon, title: 'Effortless returns', text: '30 days to change your mind' },
  { icon: LockOutlinedIcon, title: 'Secure checkout', text: 'Encrypted, protected payments' },
  { icon: SupportAgentOutlinedIcon, title: 'Concierge support', text: 'Here for you 7 days a week' },
]

const scrollToShop = () => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

function Home() {
  const dispatch = useDispatch()
  const { items: products, status } = useSelector((state) => state.products)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const loading = status === 'idle' || status === 'loading'

  const luxuryProducts = useMemo(() => {
    const picked = products.filter((product) => SIGNATURE_CATEGORIES.includes(product.category))
    return picked.length ? picked : products
  }, [products])

  const heroProducts = useMemo(() => {
    const picks = SIGNATURE_CATEGORIES.map((category) =>
      products
        .filter((product) => product.category === category)
        .sort((a, b) => b.rating - a.rating)[0],
    ).filter(Boolean)
    return picks.length ? picks : products.slice(0, 1)
  }, [products])

  const [slide, setSlide] = useState(0)
  const activeSlide = heroProducts.length ? slide % heroProducts.length : 0
  const heroProduct = heroProducts[activeSlide]

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (heroProducts.length < 2 || reduceMotion) return undefined
    const timer = setInterval(() => setSlide((current) => (current + 1) % heroProducts.length), 3000)
    return () => clearInterval(timer)
  }, [heroProducts.length, slide])

  const categories = useMemo(() => {
    const byCategory = new Map()
    products.forEach((product) => {
      if (!byCategory.has(product.category)) {
        byCategory.set(product.category, { name: product.category, image: product.thumbnail, count: 0 })
      }
      byCategory.get(product.category).count += 1
    })
    const preferred = LUXURY_CATEGORIES.map((name) => byCategory.get(name)).filter(Boolean)
    return (preferred.length >= 4 ? preferred : [...byCategory.values()]).slice(0, 6)
  }, [products])

  const bestsellers = useMemo(
    () => [...luxuryProducts].sort((a, b) => b.rating - a.rating).slice(0, 4),
    [luxuryProducts],
  )

  const saleProduct = useMemo(
    () => [...luxuryProducts].sort((a, b) => b.discountPercentage - a.discountPercentage)[0],
    [luxuryProducts],
  )

  const testimonials = useMemo(() => {
    const picked = []
    for (const product of luxuryProducts) {
      for (const review of product.reviews ?? []) {
        if (review.rating === 5 && !picked.some((item) => item.reviewerName === review.reviewerName)) {
          picked.push({ ...review, product: product.title })
        }
        if (picked.length === 3) return picked
      }
    }
    return picked
  }, [luxuryProducts])

  const categoryCount = useMemo(() => new Set(products.map((product) => product.category)).size, [products])

  const handleCategory = (name) => {
    dispatch(setCategory(name))
    scrollToShop()
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-sand">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-white/50 blur-3xl" />
        <div className="container-x relative grid items-center gap-12 py-16 md:py-20 lg:min-h-[min(calc(100svh-7.5rem),780px)] lg:grid-cols-[1.05fr_1fr] lg:py-12">
          <div className="max-w-xl animate-fade-up">
            <p className="eyebrow">New season · The autumn edit</p>
            <h1 className="mt-6 font-display text-[46px] leading-[1.02] tracking-tight sm:text-6xl xl:text-[84px]">
              Objects of <em className="text-gold">quiet</em> luxury.
            </h1>
            <p className="mt-7 max-w-md text-base leading-relaxed text-stone md:text-lg">
              Fine jewellery, refined timepieces and signature fragrance — curated for those who buy less, but better.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="#shop" className="btn-primary">
                Shop the collection <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
              </a>
              <Link to="/about" className="btn-outline">
                Our story
              </Link>
            </div>
            <dl className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-ink/10 pt-8">
              {[
                { value: products.length ? `${products.length}+` : '190+', label: 'Curated pieces' },
                { value: categoryCount || '20+', label: 'Categories' },
                { value: '30', label: 'Day returns' },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse">
                  <dt className="mt-1 text-[11px] uppercase tracking-[0.16em] text-stone">{stat.label}</dt>
                  <dd className="font-display text-3xl md:text-4xl">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] animate-fade-in">
            <div className="absolute inset-[5%] rounded-full bg-gradient-to-br from-white to-gold-soft" />
            <div className="absolute inset-0 rounded-full border border-ink/10" />
            <div className="relative z-10 aspect-square w-full animate-float motion-reduce:animate-none">
              {heroProducts.map((product, index) => (
                <img
                  key={product.id}
                  src={product.images?.[0] ?? product.thumbnail}
                  alt={index === activeSlide ? product.title : ''}
                  aria-hidden={index !== activeSlide}
                  className={`absolute inset-0 h-full w-full object-contain p-[13%] drop-shadow-2xl transition-all duration-1000 ease-out ${
                    index === activeSlide ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                  }`}
                />
              ))}
            </div>
            {heroProduct && (
              <Link
                key={heroProduct.id}
                to={`/productitem/${heroProduct.id}`}
                className="absolute bottom-4 left-0 z-20 flex animate-fade-in items-center gap-4 bg-white/95 p-3 pr-5 shadow-xl backdrop-blur transition hover:-translate-y-0.5 sm:-left-4 sm:bottom-10"
              >
                <img src={heroProduct.thumbnail} alt="" className="h-14 w-14 bg-sand object-contain p-1" />
                <span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
                    {formatCategory(heroProduct.category)}
                  </span>
                  <span className="block max-w-[180px] truncate font-display text-base">{heroProduct.title}</span>
                  <span className="block text-sm font-semibold">{money(heroProduct.price)}</span>
                </span>
                <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
              </Link>
            )}
            {heroProducts.length > 1 && (
              <div className="absolute -bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                {heroProducts.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSlide(index)}
                    aria-label={`Show ${product.title}`}
                    aria-current={index === activeSlide}
                    className={`h-1.5 rounded-full transition-all duration-500 ${index === activeSlide ? 'w-8 bg-ink' : 'w-1.5 bg-ink/25 hover:bg-ink/50'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="overflow-hidden border-b border-line bg-ivory py-6" aria-hidden="true">
        <div className="flex w-max animate-marquee whitespace-nowrap motion-reduce:animate-none">
          {[...MARQUEE, ...MARQUEE].map((word, index) => (
            <span key={index} className="flex items-center font-display text-2xl italic text-ink/70 md:text-3xl">
              <span className="px-8">{word}</span>
              <span className="text-base not-italic text-gold">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* Perks */}
      <section aria-label="Why shop with us" className="border-b border-line">
        <div className="container-x grid sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-4 py-7 sm:px-6 sm:first:pl-0 lg:border-l lg:first:border-l-0">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line text-gold">
                <Icon sx={{ fontSize: 22 }} />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-sm text-stone">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 md:py-28" aria-labelledby="categories-title">
        <div className="container-x">
          <SectionHeading
            id="categories-title"
            eyebrow="Explore"
            title="Shop by category"
            action={
              <a href="#shop" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] hover:text-gold">
                View everything <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
              </a>
            }
          />
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6 lg:gap-5">
            {loading
              ? Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="aspect-[3/4] animate-pulse bg-sand" />
                ))
              : categories.map((category) => (
                  <button key={category.name} type="button" onClick={() => handleCategory(category.name)} className="group text-left">
                    <div className="relative aspect-[3/4] overflow-hidden bg-white ring-1 ring-line">
                      <img
                        src={category.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-contain p-6 transition duration-700 group-hover:scale-110"
                      />
                    </div>
                    <p className="mt-4 font-display text-lg transition-colors group-hover:text-gold">
                      {formatCategory(category.name)}
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-stone">{category.count} pieces</p>
                  </button>
                ))}
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="bg-white py-20 md:py-28" aria-labelledby="bestsellers-title">
        <div className="container-x">
          <SectionHeading
            id="bestsellers-title"
            eyebrow="Most loved"
            title="Bestsellers"
            description="The pieces our clients return to again and again."
          />
          <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={index} />)
              : bestsellers.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* Sale banner */}
      {saleProduct && (
        <section className="bg-ink text-ivory" aria-labelledby="sale-title">
          <div className="container-x grid items-center gap-14 py-20 md:py-28 lg:grid-cols-2">
            <div className="relative">
              <div className="aspect-[4/3] bg-[#efe9df]">
                <img
                  src={saleProduct.images?.[0] ?? saleProduct.thumbnail}
                  alt={saleProduct.title}
                  loading="lazy"
                  className="h-full w-full object-contain p-12"
                />
              </div>
              <span className="absolute -right-3 -top-6 grid h-28 w-28 place-items-center rounded-full bg-gold-light text-center text-ink shadow-2xl sm:-right-6">
                <span className="font-display text-3xl leading-none">
                  −{Math.round(saleProduct.discountPercentage)}%
                  <span className="mt-1 block font-body text-[10px] font-semibold uppercase tracking-[0.2em]">Now</span>
                </span>
              </span>
            </div>
            <div className="lg:pl-8">
              <p className="eyebrow text-gold-light">The private sale</p>
              <h2 id="sale-title" className="mt-5 font-display text-4xl leading-[1.05] md:text-6xl">
                Rare finds, <em className="text-gold-light">gently</em> reduced.
              </h2>
              <p className="mt-6 max-w-md leading-relaxed text-ivory/70">
                Our most-wanted pieces at their best price of the season — including the {saleProduct.title}, now{' '}
                {money(saleProduct.price)}.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-ivory/80">
                {['Authenticity guaranteed', 'Complimentary gift wrapping', '30-day returns on sale items'].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckRoundedIcon sx={{ fontSize: 18 }} className="text-gold-light" /> {item}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <Link to={`/productitem/${saleProduct.id}`} className="btn-light">
                  Shop this piece
                </Link>
                <a href="#shop" className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ivory/80 underline-offset-8 hover:text-ivory hover:underline">
                  Browse all
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Full catalogue */}
      <Product />

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="bg-sand py-20 md:py-28" aria-labelledby="reviews-title">
          <div className="container-x">
            <SectionHeading id="reviews-title" align="center" eyebrow="Kind words" title="Loved by our clients" />
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {testimonials.map((review) => (
                <figure key={`${review.reviewerName}-${review.date}`} className="flex flex-col bg-white p-8 md:p-10">
                  <Rating value={review.rating} readOnly size="small" />
                  <blockquote className="mt-6 flex-1 font-display text-2xl leading-snug">“{review.comment}”</blockquote>
                  <figcaption className="mt-8 flex items-center gap-4 border-t border-line pt-6">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-ivory">
                      {review.reviewerName.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{review.reviewerName}</span>
                      <span className="block truncate text-xs text-stone">Verified buyer · {review.product}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="py-20 md:py-28" aria-labelledby="newsletter-title">
        <div className="container-x">
          <div className="relative overflow-hidden bg-white px-6 py-16 text-center ring-1 ring-line md:px-16 md:py-20">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-soft blur-2xl" />
            <div className="relative">
              <p className="eyebrow">The inner circle</p>
              <h2 id="newsletter-title" className="mt-4 font-display text-4xl md:text-5xl">
                Join for early access
              </h2>
              <p className="mx-auto mt-4 max-w-md leading-relaxed text-stone">
                Be the first to hear about new arrivals, private sales and stories from our makers.
              </p>
              {subscribed ? (
                <p role="status" className="mx-auto mt-10 inline-flex items-center gap-2 bg-sand px-6 py-4 text-sm">
                  <CheckRoundedIcon sx={{ fontSize: 18 }} className="text-gold" />
                  Thank you — you&apos;re on the list as {email}.
                </p>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    setSubscribed(true)
                  }}
                  className="mx-auto mt-10 flex max-w-lg flex-col gap-3 sm:flex-row"
                >
                  <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                  <input
                    id="newsletter-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Your email address"
                    className="h-14 min-w-0 flex-1 border border-line bg-ivory px-5 text-sm outline-none transition focus:border-ink"
                  />
                  <button type="submit" className="btn-primary h-14">
                    Subscribe
                  </button>
                </form>
              )}
              <p className="mt-4 text-xs text-stone">No spam, ever. Unsubscribe anytime.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
