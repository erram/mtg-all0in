import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { syncScryfall, type SyncProgress } from '../lib/sync-scryfall'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

function progressBar(done: number, total: number, width = 28): string {
  const filled = Math.round((done / total) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

function onProgress(p: SyncProgress) {
  switch (p.phase) {
    case 'download':
      process.stdout.write(`\n${p.message}\n`)
      break
    case 'cards':
    case 'prices': {
      const pct = Math.round((p.current / p.total) * 100).toString().padStart(3)
      const label = p.phase === 'cards' ? 'Cards ' : 'Prices'
      process.stdout.write(
        `\r${label}  [${progressBar(p.current, p.total)}] ${p.current.toLocaleString().padStart(6)} / ${p.total.toLocaleString()} ${pct}%`
      )
      if (p.current === p.total) process.stdout.write('\n')
      break
    }
    case 'cleanup':
      process.stdout.write(`\n${p.message}\n`)
      break
    case 'done':
      console.log(`\n✓ ${p.message}`)
      break
  }
}

console.log('MTG Vault — Scryfall bulk sync')
console.log('='.repeat(40))

syncScryfall(prisma, onProgress)
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('\nSync failed:', err)
    process.exit(1)
  })
