import { Resend } from 'resend'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Monitor, Incident } from './types'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'alerts@sitewatch.app'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function alreadySent(
  monitorId: string,
  incidentId: string | null,
  alertType: string,
  recipient: string
): Promise<boolean> {
  const supabase = getServiceClient()
  const query = supabase
    .from('alerts_sent')
    .select('id')
    .eq('monitor_id', monitorId)
    .eq('alert_type', alertType)
    .eq('recipient', recipient)

  if (incidentId) query.eq('incident_id', incidentId)

  const { data } = await query.limit(1)
  return (data?.length ?? 0) > 0
}

async function recordSent(
  monitorId: string,
  incidentId: string | null,
  alertType: string,
  recipient: string
) {
  const supabase = getServiceClient()
  await supabase.from('alerts_sent').insert({
    monitor_id: monitorId,
    incident_id: incidentId,
    alert_type: alertType,
    recipient,
  })
}

function emailWrapper(content: string) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;padding:40px 0;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:24px 32px;">
          <p style="color:#a5b4fc;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 4px;">SiteWatch</p>
          <p style="color:#ffffff;font-size:20px;font-weight:700;margin:0;">Monitoring Alert</p>
        </div>
        <div style="padding:32px;">
          ${content}
        </div>
        <div style="padding:16px 32px;background:#f3f4f6;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">Sent by SiteWatch · <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color:#6366f1;text-decoration:none;">Manage alerts</a></p>
        </div>
      </div>
    </div>
  `
}

export async function sendDownAlert(monitor: Monitor, incident: Incident) {
  for (const email of monitor.notify_emails) {
    const sent = await alreadySent(monitor.id, incident.id, 'down', email)
    if (sent) continue

    const html = emailWrapper(`
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:12px;height:12px;border-radius:50%;background:#ef4444;flex-shrink:0;"></div>
        <h2 style="color:#111827;font-size:18px;font-weight:700;margin:0;">Monitor is DOWN</h2>
      </div>
      <p style="color:#374151;margin:0 0 20px;"><strong>${monitor.name}</strong> is currently unreachable.</p>
      <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:10px 14px;background:#f9fafb;font-size:13px;font-weight:600;color:#6b7280;width:120px;">URL</td><td style="padding:10px 14px;background:#f9fafb;font-size:13px;color:#111827;">${monitor.url}</td></tr>
        <tr><td style="padding:10px 14px;background:#ffffff;font-size:13px;font-weight:600;color:#6b7280;">Cause</td><td style="padding:10px 14px;background:#ffffff;font-size:13px;color:#111827;">${incident.cause ?? 'Unknown'}</td></tr>
        <tr><td style="padding:10px 14px;background:#f9fafb;font-size:13px;font-weight:600;color:#6b7280;">Detected</td><td style="padding:10px 14px;background:#f9fafb;font-size:13px;color:#111827;">${new Date(incident.started_at).toUTCString()}</td></tr>
      </table>
    `)

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `🔴 [SiteWatch] ${monitor.name} is DOWN`,
      html,
    })

    await recordSent(monitor.id, incident.id, 'down', email)
  }
}

export async function sendResolvedAlert(monitor: Monitor, incident: Incident) {
  for (const email of monitor.notify_emails) {
    const sent = await alreadySent(monitor.id, incident.id, 'resolved', email)
    if (sent) continue

    const downtime = incident.resolved_at
      ? Math.round(
          (new Date(incident.resolved_at).getTime() - new Date(incident.started_at).getTime()) /
            60000
        )
      : null

    const html = emailWrapper(`
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:12px;height:12px;border-radius:50%;background:#22c55e;flex-shrink:0;"></div>
        <h2 style="color:#111827;font-size:18px;font-weight:700;margin:0;">Monitor Recovered</h2>
      </div>
      <p style="color:#374151;margin:0 0 20px;"><strong>${monitor.name}</strong> is back online.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 14px;background:#f9fafb;font-size:13px;font-weight:600;color:#6b7280;width:120px;">URL</td><td style="padding:10px 14px;background:#f9fafb;font-size:13px;color:#111827;">${monitor.url}</td></tr>
        ${downtime !== null ? `<tr><td style="padding:10px 14px;background:#ffffff;font-size:13px;font-weight:600;color:#6b7280;">Downtime</td><td style="padding:10px 14px;background:#ffffff;font-size:13px;color:#111827;">${downtime} minutes</td></tr>` : ''}
        <tr><td style="padding:10px 14px;background:#f9fafb;font-size:13px;font-weight:600;color:#6b7280;">Resolved</td><td style="padding:10px 14px;background:#f9fafb;font-size:13px;color:#111827;">${new Date(incident.resolved_at!).toUTCString()}</td></tr>
      </table>
    `)

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `✅ [SiteWatch] ${monitor.name} is back UP`,
      html,
    })

    await recordSent(monitor.id, incident.id, 'resolved', email)
  }
}

export async function sendSslExpiryAlert(monitor: Monitor, daysRemaining: number) {
  const dedupKey = `${monitor.id}-ssl-${daysRemaining <= 7 ? '7d' : '30d'}`
  for (const email of monitor.notify_emails) {
    const sent = await alreadySent(monitor.id, null, 'ssl_expiry', email + dedupKey)
    if (sent) continue

    const html = emailWrapper(`
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:12px;height:12px;border-radius:50%;background:#f59e0b;flex-shrink:0;"></div>
        <h2 style="color:#111827;font-size:18px;font-weight:700;margin:0;">SSL Certificate Expiring</h2>
      </div>
      <p style="color:#374151;margin:0 0 20px;">The SSL certificate for <strong>${monitor.name}</strong> will expire in <strong>${daysRemaining} days</strong>.</p>
      <p style="color:#374151;margin:0;">URL: <a href="${monitor.url}" style="color:#6366f1;">${monitor.url}</a></p>
      <p style="color:#6b7280;font-size:13px;margin-top:16px;">Please renew your certificate as soon as possible to avoid service interruption.</p>
    `)

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `⚠️ [SiteWatch] SSL certificate for ${monitor.name} expires in ${daysRemaining} days`,
      html,
    })

    await recordSent(monitor.id, null, 'ssl_expiry', email + dedupKey)
  }
}

export async function sendDomainExpiryAlert(monitor: Monitor, daysRemaining: number) {
  const dedupKey = `${monitor.id}-domain-${daysRemaining <= 7 ? '7d' : '30d'}`
  for (const email of monitor.notify_emails) {
    const sent = await alreadySent(monitor.id, null, 'domain_expiry', email + dedupKey)
    if (sent) continue

    const html = emailWrapper(`
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:12px;height:12px;border-radius:50%;background:#f59e0b;flex-shrink:0;"></div>
        <h2 style="color:#111827;font-size:18px;font-weight:700;margin:0;">Domain Expiring Soon</h2>
      </div>
      <p style="color:#374151;margin:0 0 20px;">The domain for <strong>${monitor.name}</strong> will expire in <strong>${daysRemaining} days</strong>.</p>
      <p style="color:#374151;margin:0;">URL: <a href="${monitor.url}" style="color:#6366f1;">${monitor.url}</a></p>
      <p style="color:#6b7280;font-size:13px;margin-top:16px;">Please renew your domain registration to avoid losing ownership.</p>
    `)

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `⚠️ [SiteWatch] Domain for ${monitor.name} expires in ${daysRemaining} days`,
      html,
    })

    await recordSent(monitor.id, null, 'domain_expiry', email + dedupKey)
  }
}
