import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Nav } from '@/components/Nav'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'MTG Vault — Track your Magic collection',
  description: 'Search Magic: The Gathering cards, view real-time prices, and manage your collection.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} bg-gray-50 font-sans antialiased`}>
        <Providers>
          <Nav />
          <div className="min-h-screen">{children}</div>
        </Providers>
      </body>
    </html>
  )
}
