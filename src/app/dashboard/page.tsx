import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Monitor } from '@/lib/types'

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    up: 'bg-green-500',
    down: 'bg-red-500',
    degraded: 'bg-amber-400',
    pending: 'bg-slate-500',
  }
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'up' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${map[status] ?? 'bg-slate-500'}`} />
    </span>
  )
}

export default async function DashboardOverviewPage() {
  const supabase = await createClient()
  const { data: monitors } = await supabase
    .from('monitors')
    .select('*')
    .order('created_at', { ascending: false })

  const all = (monitors as Monitor[]) ?? []
  const upCount = all.filter((m) => m.status === 'up').length
  const downCount = all.filter((m) => m.status === 'down').length
  const totalCount = all.length

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-slate-400 text-sm mt-0.5">All your monitored sites at a glance</p>
        </div>
        <Link href="/dashboard/monitors" className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add monitor
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Monitors</p>
          <p className="text-3xl font-bold text-white">{totalCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Operational</p>
          <p className="text-3xl font-bold text-green-400">{upCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Down</p>
          <p className="text-3xl font-bold text-red-400">{downCount}</p>
        </div>
      </div>

      {/* Monitor list */}
      {all.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-600/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
            </svg>
          </div>
          <h3 className="text-white font-semibold mb-1">No monitors yet</h3>
          <p className="text-slate-400 text-sm mb-6">Add your first site to start monitoring uptime, SSL, and domain expiry.</p>
          <Link href="/dashboard/monitors" className="btn-primary">Add your first monitor</Link>
        </div>
      ) : (
        <div className="card divide-y divide-white/5">
          {all.map((monitor) => (
            <Link
              key={monitor.id}
              href={`/dashboard/monitors/${monitor.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors group"
            >
              <div className="flex items-center gap-4">
                <StatusDot status={monitor.status} />
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-brand-300 transition-colors">{monitor.name}</p>
                  <p className="text-xs text-slate-500">{monitor.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-xs text-slate-500">Interval</p>
                  <p className="text-sm text-slate-300">{monitor.check_interval}m</p>
                </div>
                <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
