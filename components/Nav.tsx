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
    ...(session
      ? [
          { href: '/builder', label: 'Builder' },
          { href: '/wants', label: 'Wants' },
          { href: '/matches', label: 'Matches' },
          { href: '/profile', label: 'Profile' },
        ]
      : []),
  ]

  return (
    <header className="glass sticky top-0 z-40 border-b border-sand-200/70">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-lg font-bold text-sand-900"
        >
          {/* Logo mark — stacked card glyph */}
          <span className="relative inline-flex h-8 w-8 items-center justify-center">
            <span className="absolute inset-0 rotate-6 rounded-md bg-accent-200 transition-transform duration-300 ease-out-expo group-hover:rotate-12" />
            <span className="absolute inset-0 -rotate-3 rounded-md bg-accent-500 shadow-card transition-transform duration-300 ease-out-expo group-hover:-rotate-6" />
            <span className="relative text-sm font-black text-white">M</span>
          </span>
          <span className="transition-colors group-hover:text-accent-600">
            MTG&nbsp;Vault
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 sm:flex">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                  active
                    ? 'text-accent-600'
                    : 'text-sand-600 hover:bg-sand-100/80 hover:text-sand-900'
                }`}
              >
                {label}
                {/* Animated active underline */}
                <span
                  className={`absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-accent-500 transition-all duration-300 ease-out-expo ${
                    active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                  }`}
                />
              </Link>
            )
          })}

          <div className="mx-2 h-5 w-px bg-sand-200" />

          {session ? (
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-sand-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-accent-500 px-4 py-1.5 text-sm font-semibold text-white shadow-card transition-all duration-300 ease-out-expo hover:-translate-y-px hover:bg-accent-600 hover:shadow-glow-accent"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-lg text-sand-600 transition-colors hover:bg-sand-100 sm:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span
            className={`h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out-expo ${
              open ? 'translate-y-[7px] rotate-45' : ''
            }`}
          />
          <span
            className={`h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${
              open ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out-expo ${
              open ? '-translate-y-[7px] -rotate-45' : ''
            }`}
          />
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="glass animate-slide-down border-t border-sand-200/70 px-4 pb-4 sm:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
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
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-1 rounded-lg bg-accent-500 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-accent-600"
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
