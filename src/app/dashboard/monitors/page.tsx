import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AddMonitorModal from '@/components/AddMonitorModal'
import type { Monitor } from '@/lib/types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Monitors' }

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    up: 'badge-up',
    down: 'badge-down',
    degraded: 'badge-degraded',
    pending: 'badge-pending',
  }
  const dotColor: Record<string, string> = {
    up: 'bg-green-400',
    down: 'bg-red-400',
    degraded: 'bg-amber-400',
    pending: 'bg-slate-400',
  }
  return (
    <span className={cls[status] ?? 'badge-pending'}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor[status] ?? 'bg-slate-400'}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default async function MonitorsPage() {
  const supabase = await createClient()
  const { data: monitors } = await supabase
    .from('monitors')
    .select('*')
    .order('created_at', { ascending: false })

  const all = (monitors as Monitor[]) ?? []

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitors</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {all.length} site{all.length !== 1 ? 's' : ''} being tracked
          </p>
        </div>
        <AddMonitorModal />
      </div>

      {all.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 text-sm">No monitors yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Site</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Interval</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alerts</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {all.map((monitor) => (
                <tr key={monitor.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{monitor.name}</p>
                    <p className="text-xs text-slate-500">{monitor.url}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={monitor.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-400">{monitor.check_interval}m</td>
                  <td className="px-5 py-4 text-slate-400">{monitor.notify_emails.length} email{monitor.notify_emails.length !== 1 ? 's' : ''}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/dashboard/monitors/${monitor.id}`}
                      className="text-slate-500 hover:text-brand-300 text-xs font-medium transition-colors"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
