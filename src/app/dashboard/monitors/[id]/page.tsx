import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MonitorDetailClient from '@/components/MonitorDetailClient'
import type { Monitor, Check, Incident, SslInfo, DomainInfo } from '@/lib/types'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('monitors').select('name').eq('id', id).single()
  return { title: data?.name ?? 'Monitor' }
}

function UptimePill({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-500">—</span>
  const color = value >= 99 ? 'text-green-400' : value >= 95 ? 'text-amber-400' : 'text-red-400'
  return <span className={`font-semibold ${color}`}>{value.toFixed(2)}%</span>
}

export default async function MonitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: monitor },
    { data: checks },
    { data: incidents },
    { data: sslData },
    { data: domainData },
  ] = await Promise.all([
    supabase.from('monitors').select('*').eq('id', id).single(),
    supabase.from('checks').select('*').eq('monitor_id', id).order('checked_at', { ascending: false }).limit(50),
    supabase.from('incidents').select('*').eq('monitor_id', id).order('started_at', { ascending: false }).limit(10),
    supabase.from('ssl_info').select('*').eq('monitor_id', id).order('checked_at', { ascending: false }).limit(1).single(),
    supabase.from('domain_info').select('*').eq('monitor_id', id).order('checked_at', { ascending: false }).limit(1).single(),
  ])

  if (!monitor) notFound()

  const m = monitor as Monitor
  const allChecks = (checks as Check[]) ?? []
  const allIncidents = (incidents as Incident[]) ?? []
  const ssl = sslData as SslInfo | null
  const domain = domainData as DomainInfo | null

  const upCount = allChecks.filter((c) => c.is_up).length
  const uptimePct = allChecks.length > 0 ? Math.round((upCount / allChecks.length) * 10000) / 100 : null
  const avgResponse = allChecks.length > 0
    ? Math.round(allChecks.reduce((sum, c) => sum + (c.response_time ?? 0), 0) / allChecks.filter(c => c.response_time).length)
    : null

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/dashboard/monitors" className="hover:text-slate-300 transition-colors">Monitors</Link>
        <span>/</span>
        <span className="text-white">{m.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{m.name}</h1>
          <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-brand-300 transition-colors flex items-center gap-1 mt-0.5">
            {m.url}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href={`/status/${m.slug}`}
            target="_blank"
            className="btn-secondary text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Status page
          </Link>
          <MonitorDetailClient monitor={m} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Uptime (recent)</p>
          <div className="text-2xl font-bold"><UptimePill value={uptimePct} /></div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Avg response</p>
          <p className="text-2xl font-bold text-white">{avgResponse !== null ? `${avgResponse}ms` : '—'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">SSL expires</p>
          <p className={`text-2xl font-bold ${ssl?.days_remaining !== null && ssl?.days_remaining !== undefined && ssl.days_remaining <= 14 ? 'text-amber-400' : 'text-white'}`}>
            {ssl?.days_remaining !== null && ssl?.days_remaining !== undefined ? `${ssl.days_remaining}d` : '—'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Domain expires</p>
          <p className={`text-2xl font-bold ${domain?.days_remaining !== null && domain?.days_remaining !== undefined && domain.days_remaining <= 30 ? 'text-amber-400' : 'text-white'}`}>
            {domain?.days_remaining !== null && domain?.days_remaining !== undefined ? `${domain.days_remaining}d` : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent checks */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Recent checks</h2>
          </div>
          {allChecks.length === 0 ? (
            <p className="text-slate-500 text-sm p-5">No checks yet — the cron hasn&apos;t run.</p>
          ) : (
            <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
              {allChecks.slice(0, 20).map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.is_up ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-xs text-slate-400">
                      {new Date(c.checked_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-right text-xs text-slate-400">
                    {c.status_code && <span>HTTP {c.status_code}</span>}
                    {c.response_time && <span>{c.response_time}ms</span>}
                    {c.error && <span className="text-red-400 truncate max-w-[120px]" title={c.error}>{c.error}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incidents */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Incident history</h2>
          </div>
          {allIncidents.length === 0 ? (
            <div className="p-5 text-center">
              <p className="text-green-400 text-sm font-medium">No incidents 🎉</p>
              <p className="text-slate-500 text-xs mt-1">This site has been healthy.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
              {allIncidents.map((incident) => (
                <div key={incident.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${incident.resolved_at ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {incident.resolved_at ? 'Resolved' : 'Ongoing'}
                    </span>
                    {incident.resolved_at && (
                      <span className="text-xs text-slate-500">
                        {Math.round((new Date(incident.resolved_at).getTime() - new Date(incident.started_at).getTime()) / 60000)}m downtime
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Started: {new Date(incident.started_at).toLocaleString()}
                  </p>
                  {incident.cause && <p className="text-xs text-slate-600 mt-0.5">{incident.cause}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
