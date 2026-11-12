import { Link } from 'react-router-dom'
import { POLICIES } from '../content/policies'
import usePageMeta from '../hooks/usePageMeta'
import { formatDate } from '../utils/format'
import { STORE } from '../utils/storeInfo'
import NotFound from './NotFound'

const RELATED = [
  { to: '/shipping', label: 'Shipping' },
  { to: '/returns', label: 'Returns & refunds' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms of sale' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact us' },
]

// Shipping, returns, privacy and terms pages; the text lives in content/policies.js.
function PolicyPage({ page }) {
  const policy = POLICIES[page]
  usePageMeta({ title: policy?.title, description: policy?.description })
  if (!policy) return <NotFound />

  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <div className="grid gap-12 lg:grid-cols-[1fr_240px] lg:gap-20">
        <article className="max-w-3xl">
          <header className="border-b border-line pb-8">
            <h1 className="font-display text-4xl md:text-5xl">{policy.title}</h1>
            <p className="mt-4 text-lg leading-relaxed text-stone">{policy.description}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-stone">
              Last updated {formatDate(STORE.policiesUpdated, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </header>

          {policy.sections.map((section) => (
            <section key={section.heading} className="mt-10">
              <h2 className="font-display text-2xl">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 leading-relaxed text-stone">{paragraph}</p>
              ))}
              {section.list && (
                <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-stone marker:text-gold">
                  {section.list.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}
        </article>

        <nav aria-label="Help and policies" className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone">Help &amp; policies</p>
          <ul className="mt-4 space-y-1 border-l border-line">
            {RELATED.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  aria-current={link.to === `/${page}` ? 'page' : undefined}
                  className={`-ml-px block border-l py-2 pl-4 text-sm transition-colors ${link.to === `/${page}` ? 'border-ink font-semibold text-ink' : 'border-transparent text-stone hover:text-ink'}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}

export default PolicyPage
