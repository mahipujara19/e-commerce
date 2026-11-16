# Stripe Checkout branding

Stripe-hosted Checkout takes its logo, icon and colours from the Stripe account, not from this repository. The
Stripe SDK in this repo (`stripe` 18.5.0, API version `2025-08-27.basil`) has no per-session branding parameter,
so `backend/services/orderService.js` sends none. Set them once in the Dashboard.

## Files

| File | Use | Size |
| --- | --- | --- |
| `stripe-icon-512.png` | **Icon**: the store mark (italic "g" and gold dot on night), full-bleed, because Stripe crops icons to its own shape | 512 × 512 PNG |
| `stripe-logo-cream.png` | **Logo** on a dark brand colour (recommended, see below) | 992 × 224 PNG, transparent |
| `stripe-logo-ink.png` | **Logo** if you choose a light brand colour instead | 992 × 224 PNG, transparent |

All are rendered from the site's own artwork (`frontend/public/favicon.svg` and the header wordmark) in Playfair Display.

## Dashboard steps

1. Open **Settings → Branding** (dashboard.stripe.com/settings/branding).
2. **Icon**: upload `stripe-icon-512.png`.
3. **Logo**: upload `stripe-logo-cream.png`.
4. **Brand color**: `#171412` (the store's night). Checkout uses it as its background.
5. **Accent color**: `#8c6b38` (the store's gold). Used for the pay button; white text on it has about 5:1 contrast.
6. Save. Check that the preview shows the cream logo on the dark background.
7. Optional: **Settings → Public details**: set the public business name (`goodthings`) and support details that Checkout and receipts show.
8. Verify: place a test-mode order with card payment from the store; the hosted page should show the logo and colours.

The upload form states Stripe's current file requirements (format, maximum file size, minimum dimensions). These files
are PNG and far below any size limit. If you change the brand colour to a light one, use `stripe-logo-ink.png` instead.
