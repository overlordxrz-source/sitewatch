import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'SiteWatch — Uptime & SSL Monitor',
    template: '%s | SiteWatch',
  },
  description:
    'Monitor uptime, SSL certificates, and domain expiry for all your client websites from one dashboard.',
  keywords: ['uptime monitor', 'SSL monitor', 'domain expiry', 'website monitoring'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
