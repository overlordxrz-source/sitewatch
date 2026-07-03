import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { PublicMonitorStatus, Check, Incident } from '@/lib/types'

// Use service role for public read without auth
function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = getPublicClient()
  const { data } = await supabase.from('monitors').select('name').eq('slug', slug).single()
  if (!data) return { title: 'Status Page' }
  return {
    title: `${data.name} — Status`,
    description: `Live uptime and incident status for ${data.name}`,
  }
}

function StatusBanner({ status }: { status: string }) {
  if (status === 'up') {
    return (
      <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-6 py-4 mb-8">
        <div className="relative">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-50" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400" />
        </div>
        <p className="text-green-300 font-medium">All systems operational</p>
      </div>
    )
  }
  if (status === 'down') {
    return (
      <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-6 py-4 mb-8">
        <span className="inline-flex rounded-full h-3 w-3 bg-red-400" />
        <p className="text-red-300 font-medium">Service disruption detected</p>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-6 py-4 mb-8">
      <span className="inline-flex rounded-full h-3 w-3 bg-amber-400" />
      <p className="text-amber-300 font-medium">Degraded performance</p>
    </div>
  )
}

export default async function StatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = getPublicClient()

  const { data: monitor } = await supabase
    .from('monitors')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!monitor) notFound()

  const m = monitor as PublicMonitorStatus & { url: string }

  const [{ data: checks }, { data: incidents }] = await Promise.all([
    supabase
      .from('checks')
      .select('*')
      .eq('monitor_id', m.id)
      .order('checked_at', { ascending: false })
      .limit(90),
    supabase
      .from('incidents')
      .select('*')
      .eq('monitor_id', m.id)
      .order('started_at', { ascending: false })
      .limit(10),
  ])

  const allChecks = (checks as Check[]) ?? []
  const allIncidents = (incidents as Incident[]) ?? []

  // Build uptime bars (last 90 checks bucketed)
  const upCount = allChecks.filter((c) => c.is_up).length
  const uptimePct = allChecks.length > 0 ? ((upCount / allChecks.length) * 100).toFixed(2) : null

  return (
    <div className="min-h-screen bg-[--color-surface-0]">
      {/* Fixed bg glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-brand-700 rounded-md flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="text-sm text-slate-500 font-medium">SiteWatch Status</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-1">{m.name}</h1>
        <p className="text-slate-400 text-sm mb-8">
          <a href={m.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-300 transition-colors">{m.url}</a>
        </p>

        <StatusBanner status={m.status} />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Uptime</p>
            <p className={`text-2xl font-bold ${uptimePct && parseFloat(uptimePct) >= 99 ? 'text-green-400' : uptimePct && parseFloat(uptimePct) >= 95 ? 'text-amber-400' : 'text-red-400'}`}>
              {uptimePct ? `${uptimePct}%` : '—'}
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Avg response</p>
            <p className="text-2xl font-bold text-white">
              {allChecks.length > 0
                ? `${Math.round(allChecks.filter(c => c.response_time).reduce((s, c) => s + (c.response_time ?? 0), 0) / allChecks.filter(c => c.response_time).length)}ms`
                : '—'}
            </p>
          </div>
        </div>

        {/* Uptime bars */}
        {allChecks.length > 0 && (
          <div className="card p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400">Recent checks</p>
              <p className="text-xs text-slate-500">Last {allChecks.length} checks</p>
            </div>
            <div className="flex gap-0.5 h-8 items-end">
              {[...allChecks].reverse().map((c, i) => (
                <div
                  key={c.id}
                  title={`${new Date(c.checked_at).toLocaleString()} — ${c.is_up ? 'Up' : 'Down'}${c.response_time ? ` (${c.response_time}ms)` : ''}`}
                  className={`flex-1 rounded-sm transition-opacity hover:opacity-80 ${c.is_up ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ height: c.response_time ? `${Math.min(100, Math.max(20, (c.response_time / 2000) * 100))}%` : '40%' }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-600">Oldest</span>
              <span className="text-xs text-slate-600">Latest</span>
            </div>
          </div>
        )}

        {/* Incidents */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Incident history</h2>
          </div>
          {allIncidents.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-green-400 text-sm font-medium">No incidents recorded 🎉</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {allIncidents.map((incident) => (
                <div key={incident.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${incident.resolved_at ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${incident.resolved_at ? 'bg-green-400' : 'bg-red-400'}`} />
                      {incident.resolved_at ? 'Resolved' : 'Ongoing'}
                    </span>
                    {incident.resolved_at && (
                      <span className="text-xs text-slate-500">
                        Downtime: {Math.round((new Date(incident.resolved_at).getTime() - new Date(incident.started_at).getTime()) / 60000)} min
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {new Date(incident.started_at).toLocaleString()}
                    {incident.resolved_at && ` → ${new Date(incident.resolved_at).toLocaleString()}`}
                  </p>
                  {incident.cause && <p className="text-xs text-slate-600 mt-1">{incident.cause}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-8">
          Powered by{' '}
          <a href={process.env.NEXT_PUBLIC_APP_URL ?? '/'} className="text-brand-500 hover:text-brand-400 transition-colors">
            SiteWatch
          </a>
        </p>
      </div>
    </div>
  )
}
