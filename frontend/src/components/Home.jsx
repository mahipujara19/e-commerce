import { useEffect, useMemo, useState } from 'react'
import { Rating } from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { setCategory } from '../toolkit/searchSlice'
import { formatCategory, FREE_SHIPPING_MINIMUM, LUXURY_CATEGORIES, moneyShort, SIGNATURE_CATEGORIES } from '../utils/format'
import useCouponOffers from '../hooks/useCouponOffers'
import CouponOffers from './CouponOffers'
import CountUp from './CountUp'
import ProductCard, { ProductCardSkeleton } from './ProductCard'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'
import usePageMeta from '../hooks/usePageMeta'
import Price from './Price'


const MARQUEE = ['Fine jewellery', 'Timepieces', 'Signature fragrance', 'Leather goods', 'Eyewear', 'Objects for the home']

// The hero headline, one word at a time; `em` words are set in shimmering gold italics.
const HEADLINE = [{ text: 'Objects' }, { text: 'of' }, { text: 'quiet', em: true }, { text: 'luxury.' }]

// Twinkling sparkles around the hero picture: position, size and timing.
const SPARKLES = [
  { className: 'left-[6%] top-[14%] text-xl', delay: '0s' },
  { className: 'right-[8%] top-[6%] text-sm', delay: '1.1s' },
  { className: 'right-[2%] top-[48%] text-2xl', delay: '0.5s' },
  { className: 'left-[14%] bottom-[10%] text-sm', delay: '1.8s' },
  { className: 'right-[22%] bottom-[2%] text-lg', delay: '2.4s' },
]

// Sets --x/--y (spotlight) or --px/--py (parallax, -0.5 to 0.5) on the element from the mouse position.
const followPointer = (event, mode) => {
  if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const rect = event.currentTarget.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height
  const style = event.currentTarget.style
  if (mode === 'parallax') {
    style.setProperty('--px', (x - 0.5).toFixed(3))
    style.setProperty('--py', (y - 0.5).toFixed(3))
  } else {
    style.setProperty('--x', `${(x * 100).toFixed(1)}%`)
    style.setProperty('--y', `${(y * 100).toFixed(1)}%`)
  }
}

const resetParallax = (event) => {
  event.currentTarget.style.setProperty('--px', '0')
  event.currentTarget.style.setProperty('--py', '0')
}

const PERKS = [
  { icon: LocalShippingOutlinedIcon, title: 'Complimentary shipping', text: `On every order over ${moneyShort(FREE_SHIPPING_MINIMUM)}` },
  { icon: AutorenewRoundedIcon, title: 'Effortless returns', text: '30 days to change your mind' },
  { icon: LockOutlinedIcon, title: 'Secure checkout', text: 'Encrypted, protected payments' },
  { icon: SupportAgentOutlinedIcon, title: 'Concierge support', text: 'Here for you 7 days a week' },
]

function Home() {
  usePageMeta({})
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items: products, status } = useSelector((state) => state.products)
  const offers = useCouponOffers()
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
    navigate('/shop')
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-sand" onPointerMove={(event) => followPointer(event, 'parallax')} onPointerLeave={resetParallax}>
        {/* Drifting light in the background */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[480px] w-[480px] animate-blob rounded-full bg-surface/60 blur-3xl" />
          <div className="absolute -right-24 top-1/4 h-[420px] w-[420px] animate-blob rounded-full bg-gold-soft blur-3xl [animation-delay:-6s]" />
          <div className="absolute -bottom-40 left-1/3 h-[380px] w-[380px] animate-blob rounded-full bg-gold-light/20 blur-3xl [animation-delay:-12s]" />
        </div>
        <div className="container-x relative grid items-center gap-14 py-12 sm:py-16 md:grid-cols-[1.1fr_1fr] md:gap-8 md:py-20 lg:min-h-[min(calc(100svh-7.5rem),780px)] lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-12">
          <div className="max-w-xl">
            {/* <p className="mb-6 inline-flex animate-fade-up items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">
              <span className="h-px w-10 bg-gold" aria-hidden="true" /> 
            </p> */}
            <h1 className="font-display text-[42px] leading-[1.03] tracking-tight sm:text-6xl md:text-[54px] lg:text-7xl xl:text-[84px]">
              {HEADLINE.map((word, index) => (
                <span key={word.text}>
                  <span className="inline-block overflow-hidden pb-[0.12em] pr-[0.06em] align-bottom">
                    <span className="inline-block animate-word-up" style={{ animationDelay: `${150 + index * 120}ms` }}>
                      {word.em ? <em className="text-shimmer">{word.text}</em> : word.text}
                    </span>
                  </span>
                  {index < HEADLINE.length - 1 && ' '}
                </span>
              ))}
            </h1>
            <p className="mt-6 max-w-md animate-fade-up text-[15px] leading-relaxed text-stone [animation-delay:650ms] sm:mt-7 sm:text-base lg:text-lg">
              Fine jewellery, refined timepieces and signature fragrance — curated for those who buy less, but better.
            </p>
            <div className="mt-9 flex animate-fade-up flex-col gap-3 [animation-delay:800ms] sm:mt-10 sm:flex-row sm:gap-4 md:max-w-xs md:flex-col md:gap-3 lg:max-w-none lg:flex-row lg:gap-4">
              <Link to="/shop" className="btn-primary group w-full shadow-[0_18px_40px_-20px_rgba(0,0,0,0.6)] sm:w-auto md:w-full lg:w-auto">
                Shop the collection <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link to="/about" className="btn-outline w-full sm:w-auto md:w-full lg:w-auto">
                Our story
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md animate-fade-up grid-cols-3 gap-4 border-t border-ink/10 pt-7 [animation-delay:950ms] sm:mt-14 sm:gap-6 sm:pt-8">
              {[
                { value: products.length ? `${products.length}+` : '80+', label: 'Pieces' },
                { value: categoryCount || '15', label: 'Categories' },
                { value: '30', label: 'Day returns' },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <dt className="mt-1 whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-stone sm:text-[11px] sm:tracking-[0.16em]">
                    {stat.label}
                  </dt>
                  <dd className="order-first font-display text-3xl md:text-4xl"><CountUp value={stat.value} /></dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto mb-8 w-full max-w-[340px] animate-fade-in [animation-duration:1.2s] sm:max-w-[440px] md:mb-0 md:max-w-[560px]">
            {/* Back layers move against the mouse, the picture with it, for a sense of depth. */}
            <div aria-hidden="true" className="parallax-back absolute inset-0">
              <div className="absolute inset-[5%] rounded-full bg-gradient-to-br from-surface via-surface to-gold-soft shadow-[inset_0_-30px_60px_-30px_rgba(140,107,56,0.35)]" />
              <div className="absolute inset-0 rounded-full border border-ink/10" />
              <div className="absolute -inset-[4%] animate-spin-slow rounded-full border border-dashed border-gold/40" />
              <div className="absolute inset-[1%] animate-spin-slower">
                <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_18px_4px_rgba(201,169,110,0.7)]" />
              </div>
              {SPARKLES.map((sparkle) => (
                <span key={sparkle.delay} className={`absolute animate-twinkle text-gold ${sparkle.className}`} style={{ animationDelay: sparkle.delay }}>
                  ✦
                </span>
              ))}
            </div>
            <div className="parallax-front relative z-10">
              <div className="aspect-square w-full animate-float motion-reduce:animate-none">
                {heroProducts.map((product, index) => (
                  <img
                    key={product.id}
                    src={product.images?.[0] ?? product.thumbnail}
                    alt={index === activeSlide ? product.title : ''}
                    aria-hidden={index !== activeSlide}
                    className={`absolute inset-0 h-full w-full object-contain p-[13%] drop-shadow-2xl transition-all duration-1000 ease-out ${
                      index === activeSlide ? 'rotate-0 scale-100 opacity-100 blur-0' : '-rotate-6 scale-90 opacity-0 blur-sm'
                    }`}
                  />
                ))}
              </div>
            </div>
            {heroProduct && (
              <Link
                key={heroProduct.id}
                to={`/productitem/${heroProduct.id}`}
                className="group absolute -left-2 bottom-2 z-20 flex animate-fade-in items-center gap-3 bg-surface/95 p-2.5 pr-4 shadow-xl ring-1 ring-line/60 backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-2xl sm:-left-4 sm:bottom-10 sm:gap-4 sm:p-3 sm:pr-5"
              >
                <img src={heroProduct.thumbnail} alt="" className="h-12 w-12 bg-sand object-contain p-1 sm:h-14 sm:w-14" />
                <span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
                    {formatCategory(heroProduct.category)}
                  </span>
                  <span className="block max-w-[150px] truncate font-display text-[15px] sm:max-w-[180px] sm:text-base">{heroProduct.title}</span>
                  <Price value={heroProduct.price} className="block text-sm font-semibold" />
                </span>
                <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} className="transition-transform duration-300 group-hover:translate-x-1" />
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
      <div className="marquee-mask overflow-hidden border-b border-line bg-ivory py-4 md:py-6" aria-hidden="true">
        <div className="flex w-max animate-marquee whitespace-nowrap hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[...MARQUEE, ...MARQUEE].map((word, index) => (
            <span key={index} className="flex items-center font-display text-xl italic text-ink/70 md:text-3xl">
              <span className="px-6 md:px-8">{word}</span>
              <span className="text-base not-italic text-gold">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* Perks */}
      <section aria-label="Why shop with us" className="border-b border-line">
        <div className="container-x grid grid-cols-2 lg:grid-cols-4">
          {PERKS.map(({ icon: Icon, title, text }, index) => (
            <Reveal
              key={title}
              delay={index * 110}
              className="group flex flex-col items-start gap-3 border-line px-3 py-6 odd:border-r sm:flex-row sm:items-center sm:gap-4 sm:px-6 lg:border-r lg:py-8 lg:first:pl-0 lg:last:border-r-0 [&:nth-child(-n+2)]:border-b lg:[&:nth-child(-n+2)]:border-b-0"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-gold transition-all duration-500 group-hover:rotate-[360deg] group-hover:border-gold group-hover:bg-gold group-hover:text-ivory group-hover:shadow-[0_10px_24px_-10px_rgba(140,107,56,0.8)] sm:h-12 sm:w-12">
                <Icon sx={{ fontSize: 20 }} />
              </span>
              <div>
                <p className="text-[13px] font-semibold sm:text-sm">{title}</p>
                <p className="mt-0.5 text-xs leading-snug text-stone sm:text-sm">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-14 md:py-20 lg:py-28" aria-labelledby="categories-title">
        <div className="container-x">
          <SectionHeading
            id="categories-title"
            title="Shop by category"
            action={
              <Link to="/shop" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] hover:text-gold">
                View everything <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
              </Link>
            }
          />
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:mt-12 md:grid-cols-3 lg:grid-cols-6 lg:gap-5">
            {loading
              ? Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="aspect-square animate-pulse bg-sand lg:aspect-[3/4]" />
                ))
              : categories.map((category, index) => (
                  <Reveal
                    as="button"
                    key={category.name}
                    type="button"
                    delay={index * 80}
                    onClick={() => handleCategory(category.name)}
                    className="group text-left"
                  >
                    <div className="relative aspect-square overflow-hidden bg-surface ring-1 ring-line transition duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_26px_50px_-30px_rgba(0,0,0,0.55)] group-hover:ring-gold/50 lg:aspect-[3/4]">
                      <img
                        src={category.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-contain p-6 transition duration-700 group-hover:-rotate-3 group-hover:scale-110"
                      />
                      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night/70 via-night/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1.5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-cream transition-transform duration-500 group-hover:translate-y-0"
                      >
                        Explore <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
                      </span>
                      <span className="card-shine" aria-hidden="true" />
                    </div>
                    <p className="mt-3 font-display text-base transition-colors group-hover:text-gold sm:mt-4 sm:text-lg">
                      {formatCategory(category.name)}
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-stone">{category.count} pieces</p>
                  </Reveal>
                ))}
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="bg-surface py-14 md:py-20 lg:py-28" aria-labelledby="bestsellers-title">
        <div className="container-x">
          <SectionHeading
            id="bestsellers-title"
            title="Bestsellers"
            description="The pieces our clients return to again and again."
          />
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 md:mt-12 md:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={index} />)
              : bestsellers.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
          </div>
        </div>
      </section>

      {/* Sale banner */}
      {saleProduct && (
        <section className="spotlight overflow-hidden bg-night text-cream" aria-labelledby="sale-title" onPointerMove={(event) => followPointer(event, 'spotlight')}>
          <div className="container-x grid items-center gap-12 py-16 md:grid-cols-2 md:gap-10 md:py-20 lg:gap-14 lg:py-28">
            <Reveal variant="left" className="group relative">
              <div className="relative aspect-[4/3] overflow-hidden bg-[#efe9df]">
                <img
                  src={saleProduct.images?.[0] ?? saleProduct.thumbnail}
                  alt={saleProduct.title}
                  loading="lazy"
                  className="h-full w-full object-contain p-8 transition duration-1000 ease-out group-hover:scale-110 sm:p-12"
                />
                <span className="card-shine" aria-hidden="true" />
              </div>
              <span aria-hidden="true" className="absolute -top-5 right-3 h-20 w-20 animate-ping-slow rounded-full bg-gold-light/40 sm:-right-6 sm:-top-6 sm:h-28 sm:w-28" />
              <span className="absolute -top-5 right-3 grid h-20 w-20 place-items-center rounded-full bg-gold-light text-center text-night shadow-2xl transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 sm:-right-6 sm:-top-6 sm:h-28 sm:w-28">
                <span className="font-display text-2xl leading-none sm:text-3xl">
                  −{Math.round(saleProduct.discountPercentage)}%
                  <span className="mt-1 block font-body text-[10px] font-semibold uppercase tracking-[0.2em]">Now</span>
                </span>
              </span>
            </Reveal>
            <Reveal variant="right" delay={150} className="lg:pl-8">
              <h2 id="sale-title" className="font-display text-4xl leading-[1.05] md:text-5xl lg:text-6xl">
                Rare finds, <em className="text-gold-light">gently</em> reduced.
              </h2>
              <p className="mt-6 max-w-md leading-relaxed text-cream/70">
                Our most-wanted pieces at their best price of the season — including the {saleProduct.title}, now{' '}
                <Price value={saleProduct.price} />.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-cream/80">
                {['Authenticity guaranteed', 'Complimentary gift wrapping', '30-day returns on sale items'].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckRoundedIcon sx={{ fontSize: 18 }} className="text-gold-light" /> {item}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <Link to={`/productitem/${saleProduct.id}`} className="btn-light group shadow-[0_18px_40px_-18px_rgba(201,169,110,0.8)]">
                  Shop this piece <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link to="/shop" className="text-[12px] font-semibold uppercase tracking-[0.18em] text-cream/80 underline-offset-8 hover:text-cream hover:underline">
                  Browse all
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="bg-sand py-14 md:py-20 lg:py-28" aria-labelledby="reviews-title">
          <div className="container-x">
            <SectionHeading id="reviews-title" align="center" title="Loved by our clients" />
            <div className="-mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 md:mx-0 md:mt-14 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
              {testimonials.map((review, index) => (
                <Reveal
                  as="figure"
                  key={`${review.reviewerName}-${review.date}`}
                  delay={index * 140}
                  className="relative flex w-[82%] shrink-0 snap-center flex-col overflow-hidden bg-surface p-7 ring-1 ring-transparent transition duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_-35px_rgba(0,0,0,0.45)] hover:ring-gold/40 sm:w-[60%] md:w-auto md:p-10"
                >
                  <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-8 font-display text-[140px] leading-none text-gold/15">&ldquo;</span>
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
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Promo codes customers can use now (hidden when there are none) */}
      {offers?.length > 0 && (
        <section className="pt-14 md:pt-20 lg:pt-28" aria-label="Offers">
          <div className="container-x">
            <Reveal className="bg-surface p-6 ring-1 ring-line sm:p-8">
              <CouponOffers offers={offers} headingId="home-offers-title" title="Current offers · use these codes at checkout" />
            </Reveal>
          </div>
        </section>
      )}

      {/* Newsletter: there is no subscription service yet, so the page says so instead of pretending to save an email. */}
      <section className="py-14 md:py-20 lg:py-28" aria-labelledby="newsletter-title">
        <div className="container-x">
          <Reveal variant="scale" className="relative overflow-hidden bg-surface px-6 py-16 text-center ring-1 ring-line md:px-16 md:py-20">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 animate-blob rounded-full bg-gold-soft blur-2xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 animate-blob rounded-full bg-gold-light/20 blur-2xl [animation-delay:-9s]" />
            <div className="relative">
              <h2 id="newsletter-title" className="font-display text-4xl md:text-5xl">
                Our newsletter is coming soon
              </h2>
              <p className="mx-auto mt-4 max-w-md leading-relaxed text-stone">
                Email sign-up is not open yet, so we are not collecting addresses here. Until then, new arrivals and
                current offers appear first in the shop.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/shop" className="btn-primary h-14">See new arrivals</Link>
                <Link to="/contact" className="btn-outline h-14">Contact us</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}

export default Home
