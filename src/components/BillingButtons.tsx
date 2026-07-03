'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SubscribeButton({ isTrialing }: { isTrialing: boolean }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(`Error: ${data.error ?? 'No checkout URL returned'}`)
        setLoading(false)
      }
    } catch (err) {
      alert(`Network error: ${err}`)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn-primary w-full py-3 text-base"
    >
      {loading ? 'Loading...' : isTrialing ? 'Subscribe — €29/month' : 'Re-activate — €29/month'}
    </button>
  )
}

export function ManageButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn-secondary w-full py-3 text-base"
    >
      {loading ? 'Loading...' : 'Manage subscription'}
    </button>
  )
}
