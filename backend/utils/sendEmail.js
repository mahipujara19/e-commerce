import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

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
const send = async ({ to, subject, heading, body, text, action, footer = IGNORE_FOOTER }) => {
  const plain = text ?? `${heading}\n\n${body}${action ? `\n\n${action.label}: ${action.url}` : ''}`

  if (!transporter) {
    if (env.isProduction) throw new EmailDeliveryError('Email delivery is not configured on the server')
    console.log(`[email] To: ${to}\n[email] Subject: ${subject}\n[email] ${plain.replace(/\n/g, '\n[email] ')}`)
    return
  }

  try {
    await transporter.sendMail({ from: env.emailFrom, to, subject, text: plain, html: layout(heading, body, action, footer) })
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
