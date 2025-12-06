import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { config } from '../config/env.js';
import { query } from '../config/database.js';

// Initialize SendGrid if API key is present
if (config.sendgridApiKey) {
  sgMail.setApiKey(config.sendgridApiKey);
}

// SMTP transporter (lazy initialized)
let smtpTransporter = null;

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;

  if (config.smtpHost && config.smtpUser && config.smtpPass) {
    smtpTransporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      }
    });
  }

  return smtpTransporter;
}

function getEmailProvider() {
  if (config.sendgridApiKey) return 'sendgrid';
  if (getSmtpTransporter()) return 'smtp';
  return null;
}

export async function sendEmail({ to, subject, html, text }) {
  const provider = getEmailProvider();

  if (!provider) {
    console.warn('No email provider configured. Email not sent.');
    return { success: false, error: 'No email provider configured' };
  }

  const from = {
    email: config.newsletterFromEmail,
    name: config.newsletterFromName
  };

  try {
    if (provider === 'sendgrid') {
      await sgMail.send({
        to,
        from: `${from.name} <${from.email}>`,
        subject,
        html,
        text: text || stripHtml(html)
      });
    } else {
      const transporter = getSmtpTransporter();
      await transporter.sendMail({
        from: `"${from.name}" <${from.email}>`,
        to,
        subject,
        html,
        text: text || stripHtml(html)
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendBulkEmail({ subject, html, text }) {
  const provider = getEmailProvider();

  if (!provider) {
    return { success: false, sent: 0, failed: 0, error: 'No email provider configured' };
  }

  // Get active subscribers
  const result = await query(
    'SELECT email FROM newsletter_subscribers WHERE is_active = true'
  );
  const subscribers = result.rows.map(r => r.email);

  if (subscribers.length === 0) {
    return { success: true, sent: 0, failed: 0, message: 'No subscribers' };
  }

  let sent = 0;
  let failed = 0;
  const errors = [];

  if (provider === 'sendgrid') {
    // SendGrid batch sending
    const from = `${config.newsletterFromName} <${config.newsletterFromEmail}>`;
    const messages = subscribers.map(email => ({
      to: email,
      from,
      subject,
      html,
      text: text || stripHtml(html)
    }));

    try {
      // SendGrid's send can handle arrays for batch sending
      // Send in batches of 100 (SendGrid limit)
      const batchSize = 100;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        await sgMail.send(batch);
        sent += batch.length;
      }
    } catch (error) {
      failed = subscribers.length - sent;
      errors.push(error.message);
    }
  } else {
    // SMTP sequential sending
    const transporter = getSmtpTransporter();
    const from = `"${config.newsletterFromName}" <${config.newsletterFromEmail}>`;

    for (const email of subscribers) {
      try {
        await transporter.sendMail({
          from,
          to: email,
          subject,
          html,
          text: text || stripHtml(html)
        });
        sent++;
      } catch (error) {
        failed++;
        errors.push(`${email}: ${error.message}`);
      }
    }
  }

  return {
    success: failed === 0,
    sent,
    failed,
    total: subscribers.length,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined
  };
}

export async function verifyConnection() {
  const provider = getEmailProvider();

  if (!provider) {
    return { configured: false, error: 'No email provider configured' };
  }

  if (provider === 'smtp') {
    try {
      const transporter = getSmtpTransporter();
      await transporter.verify();
      return { configured: true, provider: 'smtp', status: 'connected' };
    } catch (error) {
      return { configured: true, provider: 'smtp', status: 'error', error: error.message };
    }
  }

  // SendGrid doesn't have a verify method, just check if key is set
  return { configured: true, provider: 'sendgrid', status: 'configured' };
}

// Subscriber management
export async function addSubscriber(email, name = null) {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await query(
      `INSERT INTO newsletter_subscribers (email, name, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (email)
       DO UPDATE SET is_active = true, unsubscribed_at = NULL, name = COALESCE($2, newsletter_subscribers.name)
       RETURNING id, email, unsubscribe_token`,
      [normalizedEmail, name]
    );

    return { success: true, subscriber: result.rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function removeSubscriber(token) {
  try {
    const result = await query(
      `UPDATE newsletter_subscribers
       SET is_active = false, unsubscribed_at = NOW()
       WHERE unsubscribe_token = $1
       RETURNING email`,
      [token]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid unsubscribe token' };
    }

    return { success: true, email: result.rows[0].email };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getSubscriberCount() {
  const result = await query(
    'SELECT COUNT(*) as count FROM newsletter_subscribers WHERE is_active = true'
  );
  return parseInt(result.rows[0].count, 10);
}

export async function getSubscribers(limit = 100, offset = 0) {
  const result = await query(
    `SELECT id, email, name, subscribed_at, is_active
     FROM newsletter_subscribers
     ORDER BY subscribed_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

// Log newsletter send
export async function logNewsletterSend(subject, recipientCount, status, errorMessage = null) {
  await query(
    `INSERT INTO newsletter_sends (subject, recipient_count, status, error_message, completed_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [subject, recipientCount, status, errorMessage]
  );
}

export async function getSendHistory(limit = 20) {
  const result = await query(
    `SELECT id, sent_at, recipient_count, subject, status, error_message, completed_at
     FROM newsletter_sends
     ORDER BY sent_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// Helper to strip HTML tags
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default {
  sendEmail,
  sendBulkEmail,
  verifyConnection,
  addSubscriber,
  removeSubscriber,
  getSubscriberCount,
  getSubscribers,
  logNewsletterSend,
  getSendHistory
};
