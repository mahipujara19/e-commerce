import { FLAT_SHIPPING, FREE_SHIPPING_MINIMUM, TAX_RATE } from './format'

// Business details shown on the contact, legal and policy pages. Set them in .env (VITE_* values reach the browser).
// Anything left empty is simply not shown, so no placeholder ever reaches customers.
export const STORE = {
  name: 'goodthings',
  legalName: import.meta.env.VITE_STORE_LEGAL_NAME || 'goodthings',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || '',
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE || '',
  address: import.meta.env.VITE_STORE_ADDRESS || '',
  supportHours: import.meta.env.VITE_SUPPORT_HOURS || 'Monday to Friday, 9:00–18:00',
  // Date the policies were last reviewed; update it whenever the text changes.
  policiesUpdated: import.meta.env.VITE_POLICIES_UPDATED || '2026-11-12',
}

export const POLICY = {
  freeShippingMinimum: FREE_SHIPPING_MINIMUM,
  flatShipping: FLAT_SHIPPING,
  taxRate: TAX_RATE,
  deliveryDays: '3–5 business days',
  dispatchDays: '1–2 business days',
  returnDays: 30,
  refundDays: '5–10 business days',
}
