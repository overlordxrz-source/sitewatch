export type MonitorStatus = 'up' | 'down' | 'degraded' | 'pending'

export interface Monitor {
  id: string
  user_id: string
  name: string
  url: string
  slug: string
  check_interval: number
  is_active: boolean
  status: MonitorStatus
  notify_emails: string[]
  created_at: string
  updated_at: string
}

export interface Check {
  id: string
  monitor_id: string
  checked_at: string
  status_code: number | null
  response_time: number | null
  is_up: boolean
  error: string | null
}

export interface Incident {
  id: string
  monitor_id: string
  started_at: string
  resolved_at: string | null
  cause: string | null
}

export interface SslInfo {
  id: string
  monitor_id: string
  checked_at: string
  valid: boolean
  issuer: string | null
  subject: string | null
  expires_at: string | null
  days_remaining: number | null
}

export interface DomainInfo {
  id: string
  monitor_id: string
  checked_at: string
  expires_at: string | null
  days_remaining: number | null
  registrar: string | null
}

export interface PublicMonitorStatus {
  id: string
  slug: string
  name: string
  url: string
  status: MonitorStatus
  created_at: string
  uptime_30d: number | null
  avg_response_24h: number | null
}
