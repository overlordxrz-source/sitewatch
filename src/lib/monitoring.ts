import * as https from 'https'
import * as http from 'http'
import * as tls from 'tls'
import { URL } from 'url'

export interface HttpCheckResult {
  is_up: boolean
  status_code: number | null
  response_time: number | null
  error: string | null
}

export interface SslCheckResult {
  valid: boolean
  issuer: string | null
  subject: string | null
  expires_at: Date | null
  days_remaining: number | null
  error?: string
}

export async function checkHttp(url: string, timeoutMs = 10000): Promise<HttpCheckResult> {
  const start = Date.now()
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url)
      const lib = parsed.protocol === 'https:' ? https : http
      const req = lib.get(url, { timeout: timeoutMs }, (res) => {
        const response_time = Date.now() - start
        const status_code = res.statusCode ?? null
        const is_up = status_code !== null && status_code < 500
        res.resume()
        resolve({ is_up, status_code, response_time, error: null })
      })

      req.on('timeout', () => {
        req.destroy()
        resolve({
          is_up: false,
          status_code: null,
          response_time: Date.now() - start,
          error: 'Request timed out',
        })
      })

      req.on('error', (err) => {
        resolve({
          is_up: false,
          status_code: null,
          response_time: Date.now() - start,
          error: err.message,
        })
      })
    } catch (err: unknown) {
      resolve({
        is_up: false,
        status_code: null,
        response_time: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  })
}

export async function checkSsl(url: string): Promise<SslCheckResult> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') {
        return resolve({ valid: false, issuer: null, subject: null, expires_at: null, days_remaining: null, error: 'Not HTTPS' })
      }

      const port = parsed.port ? parseInt(parsed.port) : 443
      const socket = tls.connect(
        { host: parsed.hostname, port, servername: parsed.hostname },
        () => {
          const cert = socket.getPeerCertificate()
          socket.end()

          if (!cert || !cert.valid_to) {
            return resolve({ valid: false, issuer: null, subject: null, expires_at: null, days_remaining: null, error: 'Could not retrieve certificate' })
          }

          const expiresAt = new Date(cert.valid_to)
          const now = new Date()
          const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          const valid = socket.authorized && daysRemaining > 0

          resolve({
            valid: valid === true,
            issuer: (Array.isArray(cert.issuer?.O) ? cert.issuer.O[0] : cert.issuer?.O) ?? (Array.isArray(cert.issuer?.CN) ? cert.issuer.CN[0] : cert.issuer?.CN) ?? null,
            subject: (Array.isArray(cert.subject?.CN) ? cert.subject.CN[0] : cert.subject?.CN) ?? null,
            expires_at: expiresAt,
            days_remaining: daysRemaining,
          })
        }
      )

      socket.on('error', (err) => {
        resolve({ valid: false, issuer: null, subject: null, expires_at: null, days_remaining: null, error: err.message })
      })

      socket.setTimeout(10000, () => {
        socket.destroy()
        resolve({ valid: false, issuer: null, subject: null, expires_at: null, days_remaining: null, error: 'SSL check timed out' })
      })
    } catch (err: unknown) {
      resolve({
        valid: false,
        issuer: null,
        subject: null,
        expires_at: null,
        days_remaining: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  })
}
