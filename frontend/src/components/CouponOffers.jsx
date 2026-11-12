import { useState } from 'react'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import { copyText, describeCoupon } from '../utils/coupons'

/**
 * The list of current offers. With onApply (checkout), each code has an Apply button that sends it to the server's
 * quote, which decides whether it fits the bag. Without it (storefront), each code has a Copy button.
 */
function CouponOffers({ offers, onApply, appliedCode, headingId = 'offers-title', title = 'Current offers', className = '' }) {
  const [status, setStatus] = useState('')

  if (!offers?.length) return null

  const copy = async (code) => {
    const copied = await copyText(code)
    setStatus(copied ? `Code ${code} copied` : `Copying is not available here. The code is ${code}.`)
  }

  return (
    <section className={className} aria-labelledby={headingId}>
      <h2 id={headingId} className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone">
        <LocalOfferOutlinedIcon sx={{ fontSize: 16 }} className="text-gold" aria-hidden="true" />
        {title}
      </h2>
      <ul className="mt-3 space-y-3">
        {offers.map((offer) => {
          const text = describeCoupon(offer)
          const applied = appliedCode === offer.code
          return (
            <li key={offer.code} className="flex flex-wrap items-center justify-between gap-3 border border-dashed border-line p-4 text-sm">
              <div className="min-w-0">
                <p>
                  <strong className="font-mono tracking-wider">{offer.code}</strong>
                  <span className="ml-2 font-semibold text-gold">{text.discount}</span>
                </p>
                {offer.description && <p className="mt-1 text-stone">{offer.description}</p>}
                <p className="mt-1 text-xs text-stone">
                  {text.minimum}
                  {text.expires && ` · ${text.expires}`}
                </p>
              </div>
              {onApply ? (
                <button
                  type="button"
                  onClick={() => onApply(offer.code)}
                  disabled={applied}
                  aria-label={applied ? `Code ${offer.code} applied` : `Apply code ${offer.code}`}
                  className="btn-outline h-[40px] shrink-0 !px-4 !py-0"
                >
                  {applied ? 'Applied' : 'Apply'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => copy(offer.code)}
                  aria-label={`Copy code ${offer.code}`}
                  className="inline-flex h-[40px] shrink-0 items-center gap-2 border border-line px-4 text-xs font-semibold uppercase tracking-[0.14em] transition hover:border-ink"
                >
                  <ContentCopyRoundedIcon sx={{ fontSize: 16 }} aria-hidden="true" /> Copy
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <p role="status" aria-live="polite" className={status ? 'mt-3 text-xs text-stone' : 'sr-only'}>{status}</p>
    </section>
  )
}

export default CouponOffers
