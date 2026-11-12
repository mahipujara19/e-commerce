import { CURRENCY, money, moneyShort } from '../utils/format'
import { POLICY, STORE } from '../utils/storeInfo'

/**
 * Text for the shipping, returns, privacy and terms pages.
 * These are sensible defaults that match how the store works (prices, delivery, returns, payments).
 * Have them reviewed for your country and business before launch: they are not legal advice.
 */

const CURRENCY_NAME = new Intl.DisplayNames(['en'], { type: 'currency' }).of(CURRENCY) ?? CURRENCY

const contactLine = STORE.supportEmail
  ? `email us at ${STORE.supportEmail} or use our contact page`
  : 'use our contact page'

export const POLICIES = {
  shipping: {
    title: 'Shipping policy',
    description: `Free shipping on orders over ${moneyShort(POLICY.freeShippingMinimum)}. Orders ship within ${POLICY.dispatchDays} and arrive in ${POLICY.deliveryDays}.`,
    sections: [
      {
        heading: 'Costs',
        paragraphs: [
          `Shipping is free on every order of ${moneyShort(POLICY.freeShippingMinimum)} or more (after any discount). Below that, a flat rate of ${money(POLICY.flatShipping)} applies. The exact amount is always shown in your bag and at checkout before you pay.`,
        ],
      },
      {
        heading: 'Delivery times',
        paragraphs: [
          `We prepare orders within ${POLICY.dispatchDays}. Delivery then usually takes ${POLICY.deliveryDays}. Your order page shows an estimated delivery date, and we email you a tracking number as soon as your parcel ships.`,
          'Busy periods, public holidays and remote locations can add a few days. If a parcel is late, contact us and we will chase it with the carrier.',
        ],
      },
      {
        heading: 'Tracking your order',
        paragraphs: ['Every order can be followed from your account under Order history. Once shipped, the carrier and tracking number appear there and in your shipping email.'],
      },
      {
        heading: 'Damaged or missing parcels',
        paragraphs: [`If your parcel arrives damaged or does not arrive, ${contactLine} within 7 days of the expected delivery date. We will send a replacement or a full refund.`],
      },
    ],
  },

  returns: {
    title: 'Returns & refunds',
    description: `Return unused items within ${POLICY.returnDays} days for a full refund. Cancel free of charge until your order is prepared.`,
    sections: [
      {
        heading: 'Cancelling an order',
        paragraphs: [
          'You can cancel an order yourself from its page in your account until we start preparing it. Card payments are refunded automatically; pay-on-delivery orders are simply released.',
          `Once an order is being prepared or has shipped, ${contactLine} and we will help.`,
        ],
      },
      {
        heading: `${POLICY.returnDays}-day returns`,
        paragraphs: [
          `You may return any unused item in its original condition and packaging within ${POLICY.returnDays} days of delivery. For hygiene reasons, opened fragrances and pierced jewellery cannot be returned unless faulty.`,
          `To start a return, ${contactLine} with your order number. We will reply with a returns label and instructions.`,
        ],
      },
      {
        heading: 'Refunds',
        paragraphs: [
          `We refund to your original payment method within 3 business days of receiving your return. Your bank may take a further ${POLICY.refundDays} to show it. Original shipping costs are refunded when the whole order is returned or the item is faulty.`,
        ],
      },
      {
        heading: 'Faulty items',
        paragraphs: ['If something arrives faulty or not as described, we cover return shipping and offer a replacement or a full refund, whichever you prefer.'],
      },
    ],
  },

  privacy: {
    title: 'Privacy policy',
    description: 'What personal data we collect, why, who we share it with, and the choices you have.',
    sections: [
      {
        heading: 'Who we are',
        paragraphs: [`${STORE.legalName} runs this store and is responsible for your personal data.${STORE.address ? ` Our address is ${STORE.address}.` : ''} For any privacy question, ${contactLine}.`],
      },
      {
        heading: 'What we collect',
        list: [
          'Account details: your name, email address, optional phone number and a securely hashed password (we never store it in readable form).',
          'Order details: delivery addresses, phone number for the courier, the items you buy and your order history.',
          'Payment: handled entirely by Stripe. Card numbers are entered on Stripe’s page and never reach our servers.',
          'Messages you send us through the contact form.',
          'Technical data: your IP address and browser details in our security logs, used to prevent fraud and abuse.',
          'Analytics: only if you accept analytics cookies, anonymised usage data through Google Analytics.',
        ],
      },
      {
        heading: 'Why we use it',
        list: [
          'To process and deliver your orders and handle returns (performance of our contract with you).',
          'To keep your account secure and prevent fraud (our legitimate interest).',
          'To send order and account emails. Marketing emails are only sent if you opt in, and you can opt out at any time.',
          'To understand how the store is used and improve it, only with your consent.',
        ],
      },
      {
        heading: 'Who we share it with',
        paragraphs: [
          'We share only what is needed with the companies that help us run the store: our payment processor (Stripe), our hosting and database providers, our email delivery provider, delivery carriers, and Google Analytics if you consent. We never sell your personal data.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'Order records are kept for as long as tax and accounting law requires (typically 6–10 years). Account data is kept while your account is open. Security logs are kept for up to 12 months.',
        ],
      },
      {
        heading: 'Cookies',
        paragraphs: [
          'We use strictly necessary cookies to keep you signed in and protect forms against forgery; these cannot be switched off. Analytics cookies are only set if you accept them in the cookie banner, and you can change your choice at any time from the link in the footer.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [`You can ask to see, correct, export or delete your personal data, or object to how we use it. To do so, ${contactLine}. You may also complain to your local data protection authority.`],
      },
    ],
  },

  terms: {
    title: 'Terms of sale',
    description: 'The terms that apply when you shop with us.',
    sections: [
      {
        heading: 'About these terms',
        paragraphs: [`These terms apply to every order placed with ${STORE.legalName} through this website. By placing an order you accept them, together with our shipping, returns and privacy policies.`],
      },
      {
        heading: 'Accounts',
        paragraphs: ['You need an account to order, so you can follow your orders and manage returns. Keep your password private; you are responsible for activity on your account.'],
      },
      {
        heading: 'Prices and payment',
        paragraphs: [
          `Prices are shown in ${CURRENCY_NAME}. Sales tax (${Math.round(POLICY.taxRate * 100)}%) and any shipping charge are added and shown before you pay. Card payments are processed securely by Stripe. If a price is clearly displayed in error, we will contact you before processing the order.`,
        ],
      },
      {
        heading: 'Orders and availability',
        paragraphs: [
          'Your order is confirmed once payment succeeds (or, for pay on delivery, once it is placed) and we send a confirmation email. Items are reserved for you during payment. If an item becomes unavailable after you order, we will refund it in full.',
        ],
      },
      {
        heading: 'Delivery, cancellation and returns',
        paragraphs: ['Delivery times, cancellation and returns are described in our shipping and returns policies. Nothing in these terms affects your statutory rights as a consumer.'],
      },
      {
        heading: 'Promo codes',
        paragraphs: ['Promo codes have no cash value, cannot be combined, and may be limited in time or number of uses. One code per order.'],
      },
      {
        heading: 'Liability',
        paragraphs: ['We are responsible for losses you suffer that are a foreseeable result of our breaking these terms. We are not responsible for losses that were not foreseeable, or for business losses.'],
      },
      {
        heading: 'Contact',
        paragraphs: [`Questions about these terms? ${contactLine.charAt(0).toUpperCase()}${contactLine.slice(1)}.`],
      },
    ],
  },
}

export const FAQ = [
  {
    heading: 'Orders',
    items: [
      ['How do I track my order?', 'Sign in and open Order history in your account. Each order shows its progress, estimated delivery date and, once shipped, the carrier and tracking number. We also email you at every step.'],
      ['Can I change or cancel my order?', 'You can cancel it yourself from its order page until we start preparing it. To change an address or item, contact us as soon as possible and we will do our best.'],
      ['Why do I need an account to order?', 'Your account keeps your orders, delivery addresses and wishlist in one place, so you can track deliveries and start returns without searching for emails. Creating one takes under a minute.'],
    ],
  },
  {
    heading: 'Shipping',
    items: [
      ['How much is shipping?', `Free on orders of ${moneyShort(POLICY.freeShippingMinimum)} or more. Otherwise a flat ${money(POLICY.flatShipping)}.`],
      ['How long does delivery take?', `Orders are prepared within ${POLICY.dispatchDays} and usually arrive within ${POLICY.deliveryDays} after that.`],
    ],
  },
  {
    heading: 'Payments',
    items: [
      ['Which payment methods do you accept?', 'All major cards, plus Apple Pay and Google Pay where your device supports them. Payments are handled by Stripe; your card details never reach our servers.'],
      ['When am I charged?', 'When you complete payment on the secure Stripe page. If you leave that page without paying, nothing is charged and your bag is kept.'],
      ['How do promo codes work?', 'Enter your code in the order summary at checkout and press Apply. The discount is shown before you pay. One code per order.'],
    ],
  },
  {
    heading: 'Returns',
    items: [
      ['What is your returns policy?', `Unused items in their original packaging can be returned within ${POLICY.returnDays} days of delivery for a full refund.`],
      ['When will I get my refund?', `Within 3 business days of your return arriving with us. Your bank may take a further ${POLICY.refundDays} to show it.`],
    ],
  },
]
