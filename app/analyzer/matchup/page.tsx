import Link from 'next/link'
import { MatchupCalculatorForm } from '@/components/MatchupCalculatorForm'

export default function MatchupPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sand-900">Matchup Calculator</h1>
          <p className="mt-1 text-sm text-sand-500">
            Enter your deck and your opponents to get predicted win rates based on tournament history.
          </p>
        </div>
        <Link
          href="/analyzer"
          className="rounded-md border border-sand-300 px-4 py-2 text-sm font-medium text-sand-600 hover:border-accent-300 hover:text-accent-600 transition-colors"
        >
          ← Deck analyzer
        </Link>
      </div>
      <MatchupCalculatorForm />
    </main>
  )
}
