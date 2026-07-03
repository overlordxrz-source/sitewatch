'use client'

import { useState } from 'react'
import MonitorForm from './MonitorForm'

export default function AddMonitorModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add monitor
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg bg-[--color-surface-1] border border-white/10 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <h2 className="text-base font-semibold text-white">Add new monitor</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <MonitorForm mode="create" onClose={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
