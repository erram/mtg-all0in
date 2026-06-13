import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { MatchesClient } from '@/components/MatchesClient'

export default async function MatchesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-sand-900">Match Tracker</h1>
        <p className="mt-1 text-sm text-sand-500">
          Log your real results. They calibrate the matchup calculator — your personal record
          outweighs the model as you play more games.
        </p>
      </div>
      <MatchesClient />
    </main>
  )
}
