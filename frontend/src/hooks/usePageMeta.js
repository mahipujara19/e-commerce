import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { FREE_SHIPPING_TEXT } from '../utils/format'

export const SITE_NAME = 'goodthings'
const DEFAULT_DESCRIPTION =
  `Jewellery, timepieces, fragrance and objects for the home, chosen to be kept for years. ${FREE_SHIPPING_TEXT} and 30-day returns.`
const SITE_URL = (import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/+$/, '')

const setMeta = (attribute, key, content) => {
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!content) {
    tag?.remove()
    return
  }
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

const setCanonical = (href) => {
  let link = document.head.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = href
}

/**
 * Title, description, canonical URL, Open Graph / Twitter tags and optional JSON-LD for the current page.
 * noindex keeps private pages (bag, checkout, account) out of search results.
 * Google renders JavaScript, so these are picked up for a client-rendered app; for link previews in apps that
 * do not run JavaScript, the defaults in index.html apply.
 */
function usePageMeta({ title, description = DEFAULT_DESCRIPTION, image, noindex = false, jsonLd, type = 'website' } = {}) {
  const { pathname } = useLocation()
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — thoughtful everyday essentials`
  const url = `${SITE_URL}${pathname}`
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : ''

  useEffect(() => {
    document.title = fullTitle
    setMeta('name', 'description', description)
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:image', image)
    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    setCanonical(url)
  }, [fullTitle, description, noindex, url, image, type])

  useEffect(() => {
    if (!jsonLdText) return undefined
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = jsonLdText
    document.head.appendChild(script)
    return () => script.remove()
  }, [jsonLdText])
}

export default usePageMeta
