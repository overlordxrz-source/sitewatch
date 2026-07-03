import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubscribeButton, ManageButton } from '@/components/BillingButtons'
import type { Metadata } from 'next'

export const runtime = 'nodejs'
export const metadata: Metadata = { title: 'Billing — SiteWatch' }

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at')
    .eq('id', user.id)
    .single()

  const status = profile?.subscription_status ?? 'trialing'
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const daysLeft = trialEnds ? Math.ceil((trialEnds.getTime() - Date.now()) / 86400000) : 0
  const isActive = status === 'active'
  const isTrialing = status === 'trialing' && daysLeft > 0

  return (
    <div className="min-h-screen bg-[--color-surface-0] flex items-center justify-center px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-brand-600/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">SiteWatch</span>
          </div>

          {isActive ? (
            <>
              <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 text-sm font-semibold text-green-400 mb-4">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                Active subscription
              </div>
              <h1 className="text-2xl font-bold text-white">You&apos;re all set</h1>
              <p className="text-slate-400 text-sm mt-1">SiteWatch Pro is active on your account.</p>
            </>
          ) : isTrialing ? (
            <>
              <div className="inline-flex items-center gap-2 bg-brand-600/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-sm font-semibold text-brand-300 mb-4">
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
                Free trial — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
              </div>
              <h1 className="text-2xl font-bold text-white">Upgrade to keep monitoring</h1>
              <p className="text-slate-400 text-sm mt-1">Your trial ends soon. Subscribe to keep your monitors running.</p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 text-sm font-semibold text-red-400 mb-4">
                <span className="w-2 h-2 bg-red-400 rounded-full" />
                Subscription required
              </div>
              <h1 className="text-2xl font-bold text-white">Subscribe to continue</h1>
              <p className="text-slate-400 text-sm mt-1">Your trial has ended. Subscribe to re-activate monitoring.</p>
            </>
          )}
        </div>

        <div className="card p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-white font-bold text-lg">SiteWatch Pro</h2>
              <p className="text-slate-400 text-sm">Everything you need to monitor client sites</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-white">€29</span>
              <span className="text-slate-400 text-sm">/month</span>
            </div>
          </div>

          <ul className="space-y-3 mb-8">
            {[
              'Unlimited monitors',
              'Checks every 5 minutes',
              'SSL certificate tracking',
              'Domain expiry alerts',
              'Instant email notifications',
              'Public status pages',
              '7-day free trial',
            ].map(f => (
              <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          {isActive ? (
            <ManageButton />
          ) : (
            <div className="space-y-3">
              <SubscribeButton isTrialing={isTrialing} />
              <p className="text-center text-xs text-slate-500">
                {isTrialing ? 'No charge until your trial ends. Cancel anytime.' : 'Cancel anytime from your billing portal.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
