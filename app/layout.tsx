import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Nav } from '@/components/Nav'
import { BackgroundDecor } from '@/components/BackgroundDecor'

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
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <BackgroundDecor />
        <Providers>
          <Nav />
          <div className="min-h-screen">{children}</div>
          <footer className="mt-16 border-t border-sand-200">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-sand-400 sm:flex-row">
              <p>
                <span className="font-semibold text-sand-500">MTG Vault</span> — collection
                tracking &amp; tournament insights
              </p>
              <p className="text-center sm:text-right">
                Card data &amp; images © Scryfall · Tournament data via MTGTop8 &amp; MTGGoldfish ·
                Unaffiliated with Wizards of the Coast
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
