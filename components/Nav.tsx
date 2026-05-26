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
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-gray-900 hover:text-blue-600">
          MTG Vault
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 sm:flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                pathname.startsWith(href) ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              {label}
            </Link>
          ))}
          {session ? (
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm font-medium text-gray-600 hover:text-red-600"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="flex items-center justify-center rounded p-2 text-gray-600 hover:bg-gray-100 sm:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className="text-xl">{open ? '✕' : '☰'}</span>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 sm:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  pathname.startsWith(href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            ))}
            {session ? (
              <button
                onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }) }}
                className="rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white"
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
