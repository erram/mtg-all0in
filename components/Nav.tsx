'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'

export function Nav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/search', label: 'Search' },
    { href: '/collection', label: 'Collection' },
    { href: '/tournaments', label: 'Tournaments' },
    { href: '/analyzer', label: 'Analyzer' },
    ...(session ? [{ href: '/profile', label: 'Profile' }] : []),
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-sand-900 hover:text-accent-500 transition-colors">
          MTG Vault
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 sm:flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors hover:text-accent-500 ${
                pathname.startsWith(href) ? 'text-accent-500' : 'text-sand-600'
              }`}
            >
              {label}
            </Link>
          ))}
          {session ? (
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm font-medium text-sand-600 hover:text-red-600 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-accent-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-600 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="flex items-center justify-center rounded p-2 text-sand-600 hover:bg-sand-100 sm:hidden transition-colors"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className="text-xl">{open ? '✕' : '☰'}</span>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-sand-200 bg-white px-4 pb-4 sm:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname.startsWith(href)
                    ? 'bg-accent-50 text-accent-600'
                    : 'text-sand-700 hover:bg-sand-100'
                }`}
              >
                {label}
              </Link>
            ))}
            {session ? (
              <button
                onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }) }}
                className="rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-md bg-accent-500 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-accent-600"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
