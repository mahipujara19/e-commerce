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

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

const layout = (heading, body, action) => `
  <div style="background:#faf7f2;padding:40px 16px;font-family:Helvetica,Arial,sans-serif;color:#171412">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e0d5;padding:40px">
      <p style="font-family:Georgia,serif;font-size:26px;margin:0 0 32px">good<em>things</em><span style="color:#8c6b38">.</span></p>
      <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:28px;margin:0 0 16px">${escapeHtml(heading)}</h1>
      <p style="line-height:1.6;color:#6f665d;margin:0 0 32px">${body}</p>
      <a href="${action.url}" style="display:inline-block;background:#171412;color:#faf7f2;text-decoration:none;padding:14px 28px;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">${action.label}</a>
      <p style="font-size:12px;color:#8a8178;margin:32px 0 0">If you did not request this, you can safely ignore this email.</p>
    </div>
  </div>`

const send = async ({ to, subject, heading, body, action }) => {
  if (!transporter) {
    console.log(`[email] To: ${to}\n[email] Subject: ${subject}\n[email] ${action.label}: ${action.url}`)
    return
  }

  await transporter.sendMail({
    from: env.emailFrom,
    to,
    subject,
    text: `${heading}\n\n${body}\n\n${action.label}: ${action.url}`,
    html: layout(heading, body, action),
  })
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
