'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MonitorForm from '@/components/MonitorForm'
import type { Monitor } from '@/lib/types'

export default function MonitorDetailClient({ monitor }: { monitor: Monitor }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${monitor.name}"? This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch(`/api/monitors/${monitor.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/dashboard/monitors')
      router.refresh()
    } else {
      alert('Failed to delete monitor')
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Edit monitor</h2>
          <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <MonitorForm mode="edit" initial={monitor} onClose={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <button onClick={() => setEditing(true)} className="btn-secondary">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
        Edit
      </button>
      <button onClick={handleDelete} disabled={deleting} className="btn-danger">
        {deleting ? 'Deleting…' : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Delete
          </>
        )}
      </button>
    </div>
  )
}
