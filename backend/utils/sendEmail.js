import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { formatMoney } from './money.js'

const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : null

// Thrown when an email could not be handed to the SMTP server; callers decide whether that fails the request.
export class EmailDeliveryError extends Error {
  constructor(message, cause) {
    super(message, { cause })
    this.name = 'EmailDeliveryError'
  }
}

// Called once at startup so a wrong host or password shows up in the log, not on the first signup.
export const checkEmailTransport = async () => {
  if (!transporter) {
    const where = env.isProduction ? 'Emails will fail until it is set' : 'Emails will be printed to this console'
    console.warn(`[email] SMTP_HOST is not set. ${where}.`)
    return
  }
  try {
    await transporter.verify()
    console.log(`[email] SMTP ready at ${env.smtp.host}:${env.smtp.port}`)
  } catch (error) {
    console.error(`[email] SMTP check failed for ${env.smtp.host}:${env.smtp.port}: ${error.message}`)
  }
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

const layout = (heading, body, action, footer) => `
  <div style="background:#faf7f2;padding:40px 16px;font-family:Helvetica,Arial,sans-serif;color:#171412">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e0d5;padding:40px">
      <p style="font-family:Georgia,serif;font-size:26px;margin:0 0 32px">good<em>things</em><span style="color:#8c6b38">.</span></p>
      <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:28px;margin:0 0 16px">${escapeHtml(heading)}</h1>
      <div style="line-height:1.6;color:#6f665d;margin:0 0 32px">${body}</div>
      ${action ? `<a href="${action.url}" style="display:inline-block;background:#171412;color:#faf7f2;text-decoration:none;padding:14px 28px;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">${action.label}</a>` : ''}
      <p style="font-size:12px;color:#8a8178;margin:32px 0 0">${footer}</p>
    </div>
  </div>`

const IGNORE_FOOTER = 'If you did not request this, you can safely ignore this email.'

// `body` is trusted HTML built here; anything from users must go through escapeHtml first.
const send = async ({ to, subject, heading, body, text, action, footer = IGNORE_FOOTER, replyTo }) => {
  const plain = text ?? `${heading}\n\n${body}${action ? `\n\n${action.label}: ${action.url}` : ''}`

  if (!transporter) {
    if (env.isProduction) throw new EmailDeliveryError('Email delivery is not configured on the server')
    console.log(`[email] To: ${to}\n[email] Subject: ${subject}\n[email] ${plain.replace(/\n/g, '\n[email] ')}`)
    return
  }

  try {
    await transporter.sendMail({ from: env.emailFrom, to, replyTo, subject, text: plain, html: layout(heading, body, action, footer) })
  } catch (error) {
    throw new EmailDeliveryError(`Could not send "${subject}" to ${to}: ${error.message}`, error)
  }
}

export const sendVerificationEmail = (user, token) =>
  send({
    to: user.email,
    subject: 'Confirm your email address',
    heading: `Welcome, ${user.name.split(' ')[0]}`,
    body: 'Please confirm your email address so we can keep you updated on your orders. This link expires in 24 hours.',
    action: { label: 'Verify email', url: `${env.clientUrl}/verify-email?token=${token}` },
  })

export const sendPasswordResetEmail = (user, token) =>
  send({
    to: user.email,
    subject: 'Reset your password',
    heading: 'Reset your password',
    body: 'We received a request to reset the password for your account. This link expires in 1 hour.',
    action: { label: 'Choose a new password', url: `${env.clientUrl}/reset-password?token=${token}` },
  })

const cell = 'padding:8px 10px;border-bottom:1px solid #e7e0d5;text-align:left'

// changes: [{ name, sku, previous, updated }]; one email per save, however many products it touched.
export const sendStockUpdateEmail = ({ to, changes, updatedBy, updatedAt }) => {
  const timestamp = updatedAt.toISOString()
  const rows = changes
    .map(({ name, sku, previous, updated }) =>
      `<tr><td style="${cell}">${escapeHtml(name)}</td><td style="${cell}">${escapeHtml(sku || '—')}</td>` +
      `<td style="${cell};text-align:right">${previous}</td><td style="${cell};text-align:right;color:#171412"><strong>${updated}</strong></td></tr>`,
    )
    .join('')

  const summary = `${escapeHtml(updatedBy.name)} (${escapeHtml(updatedBy.email)}) changed stock at ${timestamp}.`

  return send({
    to: to.join(', '),
    subject: changes.length === 1 ? `Stock updated: ${changes[0].name}` : `Stock updated for ${changes.length} products`,
    heading: 'Stock updated',
    body: `<p style="margin:0 0 20px">${summary}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#6f665d">
        <thead><tr><th style="${cell}">Product</th><th style="${cell}">SKU</th><th style="${cell};text-align:right">Previous</th><th style="${cell};text-align:right">Updated</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
    text: [
      'Stock updated',
      `${updatedBy.name} (${updatedBy.email}) changed stock at ${timestamp}.`,
      ...changes.map(({ name, sku, previous, updated }) => `- ${name} (SKU ${sku || 'none'}): ${previous} -> ${updated}`),
    ].join('\n'),
    action: { label: 'Open inventory', url: `${env.clientUrl}/admin/inventory` },
    footer: 'You receive this because you manage the goodthings inventory.',
  })
}

// ── Orders ──

const money = formatMoney
export const orderNumber = (id) => `GT-${String(id).slice(-8).toUpperCase()}`
const orderUrl = (order) => `${env.clientUrl}/account/orders/${order.id}`
const ORDER_FOOTER = 'Questions about your order? Reply to this email or visit our contact page.'

const itemRows = (order) =>
  order.items
    .map((item) =>
      `<tr><td style="${cell}">${escapeHtml(item.name)} × ${item.quantity}</td>` +
      `<td style="${cell};text-align:right">${money(item.price * item.quantity)}</td></tr>`,
    )
    .join('')

const totalsRows = (order) =>
  [
    ['Subtotal', money(order.subtotal)],
    ...(order.discount ? [[`Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ''}`, `−${money(order.discount)}`]] : []),
    ['Shipping', order.shipping === 0 ? 'Free' : money(order.shipping)],
    ['Tax', money(order.tax)],
    ['<strong>Total</strong>', `<strong>${money(order.totalAmount)}</strong>`],
  ]
    .map(([label, value]) => `<tr><td style="${cell}">${label}</td><td style="${cell};text-align:right">${value}</td></tr>`)
    .join('')

const orderTable = (order) =>
  `<table style="width:100%;border-collapse:collapse;font-size:13px;color:#6f665d;margin-top:16px">${itemRows(order)}${totalsRows(order)}</table>`

const plainItems = (order) => order.items.map((item) => `- ${item.name} x ${item.quantity}: ${money(item.price * item.quantity)}`).join('\n')

const etaText = (order, prefix) =>
  order.estimatedDelivery ? ` ${prefix} ${new Date(order.estimatedDelivery).toDateString()}.` : ''

export const sendOrderConfirmationEmail = (order) => {
  const number = orderNumber(order.id)
  const paidNote = order.payment?.method === 'manual'
    ? 'Payment will be collected as agreed (for example on delivery). We will be in touch if anything is needed.'
    : 'Your payment was received.'
  const eta = etaText(order, 'Estimated delivery:')
  return send({
    to: order.shippingAddress.email,
    subject: `Order ${number} confirmed`,
    heading: 'Thank you for your order',
    body: `<p style="margin:0">Order <strong>${number}</strong> is confirmed. ${paidNote}${eta}</p>${orderTable(order)}`,
    text: `Thank you for your order\n\nOrder ${number} is confirmed. ${paidNote}${eta}\n\n${plainItems(order)}\n\nTotal: ${money(order.totalAmount)}\n\nTrack it: ${orderUrl(order)}`,
    action: { label: 'View your order', url: orderUrl(order) },
    footer: ORDER_FOOTER,
  })
}

export const sendOrderShippedEmail = (order) => {
  const number = orderNumber(order.id)
  const carrier = order.carrier ? ` (${order.carrier})` : ''
  const trackingHtml = order.trackingNumber
    ? ` Tracking number: <strong>${escapeHtml(order.trackingNumber)}</strong>${escapeHtml(carrier)}.`
    : ''
  const trackingText = order.trackingNumber ? ` Tracking number: ${order.trackingNumber}${carrier}.` : ''
  const eta = etaText(order, 'Expected by')
  return send({
    to: order.shippingAddress.email,
    subject: `Order ${number} has shipped`,
    heading: 'Your order is on its way',
    body: `<p style="margin:0">Order <strong>${number}</strong> has left our studio.${trackingHtml}${eta}</p>`,
    text: `Your order is on its way\n\nOrder ${number} has shipped.${trackingText}${eta}\n\n${orderUrl(order)}`,
    action: { label: 'Track your order', url: orderUrl(order) },
    footer: ORDER_FOOTER,
  })
}

export const sendOrderDeliveredEmail = (order) =>
  send({
    to: order.shippingAddress.email,
    subject: `Order ${orderNumber(order.id)} was delivered`,
    heading: 'Your order has arrived',
    body: 'We hope you love it. If anything is not right, you can return unused items within 30 days.',
    action: { label: 'View your order', url: orderUrl(order) },
    footer: ORDER_FOOTER,
  })

export const sendOrderCancelledEmail = (order) => {
  const note = order.payment?.status === 'refunded'
    ? `A refund of ${money(order.totalAmount)} has been issued to your original payment method. It usually appears within 5–10 business days.`
    : 'No payment was taken for this order.'
  const number = orderNumber(order.id)
  return send({
    to: order.shippingAddress.email,
    subject: `Order ${number} was cancelled`,
    heading: 'Your order was cancelled',
    body: `<p style="margin:0">Order <strong>${number}</strong> was cancelled. ${note}</p>`,
    text: `Your order was cancelled\n\nOrder ${number} was cancelled. ${note}`,
    action: { label: 'View your order', url: orderUrl(order) },
    footer: ORDER_FOOTER,
  })
}

// Staff alert for every new confirmed order.
export const sendNewOrderAlertEmail = ({ to, order }) => {
  const { fullName, email } = order.shippingAddress
  const number = orderNumber(order.id)
  return send({
    to: to.join(', '),
    subject: `New order ${number} · ${money(order.totalAmount)}`,
    heading: 'New order',
    body: `<p style="margin:0">${escapeHtml(fullName)} (${escapeHtml(email)}) placed order <strong>${number}</strong>.</p>${orderTable(order)}`,
    text: `New order ${number} from ${fullName} (${email})\n\n${plainItems(order)}\n\nTotal: ${money(order.totalAmount)}`,
    action: { label: 'Open orders', url: `${env.clientUrl}/admin/orders?order=${order.id}` },
    footer: 'You receive this because you manage goodthings orders.',
  })
}

// ── Support ──

export const sendContactEmail = ({ to, name, email, topic, reference, message }) =>
  send({
    to,
    replyTo: email,
    subject: `[Contact] ${topic}${reference ? ` · ${reference}` : ''} — ${name}`,
    heading: 'New customer message',
    body:
      `<p style="margin:0 0 12px"><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;` +
      `${reference ? ` · Order ${escapeHtml(reference)}` : ''}</p>` +
      `<p style="margin:0;white-space:pre-wrap">${escapeHtml(message)}</p>`,
    text: `From: ${name} <${email}>\nTopic: ${topic}${reference ? `\nOrder: ${reference}` : ''}\n\n${message}`,
    footer: 'Reply directly to the customer at the address above.',
  })
