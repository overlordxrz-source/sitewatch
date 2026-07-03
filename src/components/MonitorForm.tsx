'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MonitorFormProps {
  mode: 'create' | 'edit'
  initial?: {
    id?: string
    name?: string
    url?: string
    slug?: string
    check_interval?: number
    notify_emails?: string[]
    is_active?: boolean
  }
  onClose?: () => void
}

export default function MonitorForm({ mode, initial, onClose }: MonitorFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [emails, setEmails] = useState<string[]>(initial?.notify_emails ?? [])

  function addEmail() {
    const e = emailInput.trim()
    if (e && !emails.includes(e)) {
      setEmails([...emails, e])
      setEmailInput('')
    }
  }

  function removeEmail(e: string) {
    setEmails(emails.filter((x) => x !== e))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const payload = {
      name: formData.get('name') as string,
      url: formData.get('url') as string,
      slug: formData.get('slug') as string,
      check_interval: parseInt(formData.get('check_interval') as string),
      notify_emails: emails,
      is_active: formData.get('is_active') === 'on',
    }

    try {
      const res = await fetch(
        mode === 'create' ? '/api/monitors' : `/api/monitors/${initial?.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        setLoading(false)
        return
      }

      router.refresh()
      onClose?.()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label className="label">Site name</label>
        <input
          name="name"
          required
          placeholder="My Client Site"
          defaultValue={initial?.name}
          className="input"
          onChange={(e) => {
            const slugField = document.getElementById('slug-field') as HTMLInputElement | null
            if (slugField && mode === 'create') slugField.value = slugify(e.target.value)
          }}
        />
      </div>

      <div>
        <label className="label">URL to monitor</label>
        <input
          name="url"
          required
          type="url"
          placeholder="https://example.com"
          defaultValue={initial?.url}
          className="input"
        />
      </div>

      <div>
        <label className="label">Public slug <span className="text-slate-600 font-normal">(for status page)</span></label>
        <div className="flex gap-2 items-center">
          <span className="text-slate-500 text-sm">/status/</span>
          <input
            id="slug-field"
            name="slug"
            required
            pattern="[a-z0-9\-]+"
            placeholder="my-client-site"
            defaultValue={initial?.slug}
            className="input flex-1"
          />
        </div>
      </div>

      <div>
        <label className="label">Check interval</label>
        <select name="check_interval" defaultValue={initial?.check_interval ?? 5} className="input">
          <option value={1}>Every 1 minute</option>
          <option value={5}>Every 5 minutes</option>
          <option value={10}>Every 10 minutes</option>
          <option value={30}>Every 30 minutes</option>
          <option value={60}>Every 60 minutes</option>
        </select>
      </div>

      <div>
        <label className="label">Alert emails</label>
        <div className="flex gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail() } }}
            placeholder="alert@example.com"
            className="input flex-1"
          />
          <button type="button" onClick={addEmail} className="btn-secondary px-3">Add</button>
        </div>
        {emails.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {emails.map((e) => (
              <span key={e} className="inline-flex items-center gap-1.5 bg-brand-600/15 text-brand-300 border border-brand-500/20 rounded-full px-3 py-0.5 text-xs font-medium">
                {e}
                <button type="button" onClick={() => removeEmail(e)} className="hover:text-white">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          id="is_active"
          name="is_active"
          defaultChecked={initial?.is_active ?? true}
          className="w-4 h-4 rounded accent-brand-500"
        />
        <label htmlFor="is_active" className="text-sm text-slate-300">Active (monitoring enabled)</label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onClose && (
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        )}
        <button type="submit" disabled={loading} className="btn-primary min-w-[100px]">
          {loading ? 'Saving…' : mode === 'create' ? 'Add monitor' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
