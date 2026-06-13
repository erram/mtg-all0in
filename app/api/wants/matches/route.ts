import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getWantMatches } from '@/lib/wants'

// Active marketplace listings (from other sellers) matching the user's want list
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const matches = await getWantMatches(session.user.id)
  return NextResponse.json({ matches })
}
