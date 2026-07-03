import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkHttp, checkSsl } from '@/lib/monitoring'
import { checkDomain } from '@/lib/domain'
import { sendDownAlert, sendResolvedAlert, sendSslExpiryAlert, sendDomainExpiryAlert } from '@/lib/alerts'
import type { Monitor, Incident } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  const vercelCronHeader = req.headers.get('authorization')
  const isVercelCron = vercelCronHeader === `Bearer ${process.env.CRON_SECRET}`
  const isValidSecret = secret === process.env.CRON_SECRET

  if (!isValidSecret && !isVercelCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()

  // Fetch all active monitors
  const { data: monitors, error: monitorsError } = await supabase
    .from('monitors')
    .select('*')
    .eq('is_active', true)

  if (monitorsError) {
    console.error('Failed to fetch monitors:', monitorsError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const results: { id: string; name: string; was_up: boolean; is_up: boolean }[] = []
  const now = new Date()
  // Domain RDAP is slow — only run once per day (at midnight hour)
  const isDailyRun = now.getUTCHours() === 0 && now.getUTCMinutes() < 10

  for (const monitor of (monitors as Monitor[])) {
    try {
      // ---- HTTP Check ----
      const httpResult = await checkHttp(monitor.url)

      await supabase.from('checks').insert({
        monitor_id: monitor.id,
        checked_at: now.toISOString(),
        status_code: httpResult.status_code,
        response_time: httpResult.response_time,
        is_up: httpResult.is_up,
        error: httpResult.error,
      })

      // ---- Determine previous status ----
      const prevStatus = monitor.status
      const newStatus = httpResult.is_up ? 'up' : 'down'

      // ---- Open / Close incidents ----
      if (!httpResult.is_up && prevStatus !== 'down') {
        // Site just went DOWN → open incident
        const { data: incident } = await supabase
          .from('incidents')
          .insert({
            monitor_id: monitor.id,
            started_at: now.toISOString(),
            cause: httpResult.error ?? `HTTP ${httpResult.status_code}`,
          })
          .select()
          .single()

        if (incident) {
          await sendDownAlert(monitor, incident as Incident)
        }
      } else if (httpResult.is_up && prevStatus === 'down') {
        // Site just came back UP → close incident
        const { data: openIncident } = await supabase
          .from('incidents')
          .select('*')
          .eq('monitor_id', monitor.id)
          .is('resolved_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .single()

        if (openIncident) {
          const { data: resolvedIncident } = await supabase
            .from('incidents')
            .update({ resolved_at: now.toISOString() })
            .eq('id', openIncident.id)
            .select()
            .single()

          if (resolvedIncident) {
            await sendResolvedAlert(monitor, resolvedIncident as Incident)
          }
        }
      }

      // Update monitor status
      await supabase
        .from('monitors')
        .update({ status: newStatus })
        .eq('id', monitor.id)

      results.push({ id: monitor.id, name: monitor.name, was_up: prevStatus === 'up', is_up: httpResult.is_up })

      // ---- SSL check (every run) ----
      const sslResult = await checkSsl(monitor.url)
      await supabase.from('ssl_info').insert({
        monitor_id: monitor.id,
        checked_at: now.toISOString(),
        valid: sslResult.valid,
        issuer: sslResult.issuer,
        subject: sslResult.subject,
        expires_at: sslResult.expires_at?.toISOString() ?? null,
        days_remaining: sslResult.days_remaining,
      })

      if (sslResult.days_remaining !== null) {
        if (sslResult.days_remaining <= 7 || sslResult.days_remaining === 30) {
          await sendSslExpiryAlert(monitor, sslResult.days_remaining)
        }
      }

      // ---- Domain check (once per day) ----
      if (isDailyRun) {
        const domainResult = await checkDomain(monitor.url)
        if (domainResult.expires_at) {
          await supabase.from('domain_info').insert({
            monitor_id: monitor.id,
            checked_at: now.toISOString(),
            expires_at: domainResult.expires_at.toISOString(),
            days_remaining: domainResult.days_remaining,
            registrar: domainResult.registrar,
          })

          if (domainResult.days_remaining !== null) {
            if (domainResult.days_remaining <= 7 || domainResult.days_remaining === 30) {
              await sendDomainExpiryAlert(monitor, domainResult.days_remaining)
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error checking monitor ${monitor.id}:`, err)
    }
  }

  return NextResponse.json({ checked: results.length, results })
}
