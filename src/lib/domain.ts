import { URL } from 'url'

export interface DomainCheckResult {
  expires_at: Date | null
  days_remaining: number | null
  registrar: string | null
  error?: string
}

// Uses RDAP (modern WHOIS replacement) — no external packages required
export async function checkDomain(url: string): Promise<DomainCheckResult> {
  try {
    const hostname = new URL(url).hostname
    const domain = hostname.replace(/^www\./, '')
    const rdapUrl = `https://rdap.org/domain/${domain}`

    const res = await fetch(rdapUrl, { cache: 'no-store' })
    if (!res.ok) {
      return { expires_at: null, days_remaining: null, registrar: null, error: `RDAP error: ${res.status}` }
    }

    const data = await res.json()

    let expiresAt: Date | null = null
    const events: { eventAction: string; eventDate: string }[] = data.events ?? []
    for (const event of events) {
      if (event.eventAction === 'expiration') {
        expiresAt = new Date(event.eventDate)
        break
      }
    }

    let registrar: string | null = null
    const entities: { roles?: string[]; vcardArray?: unknown[] }[] = data.entities ?? []
    for (const entity of entities) {
      if (entity.roles?.includes('registrar') && entity.vcardArray) {
        const vcardItems = entity.vcardArray[1] as [string, unknown, unknown, string][]
        for (const item of vcardItems) {
          if (item[0] === 'fn') {
            registrar = item[3]
            break
          }
        }
      }
    }

    const now = new Date()
    const daysRemaining = expiresAt
      ? Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null

    return { expires_at: expiresAt, days_remaining: daysRemaining, registrar }
  } catch (err: unknown) {
    return {
      expires_at: null,
      days_remaining: null,
      registrar: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
