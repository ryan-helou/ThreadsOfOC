import type { InventoryStats } from '../../shared/helpers.ts'
import { money } from '../lib/format.ts'

const CARDS: {
  key: keyof InventoryStats
  label: string
  tone: string
  isMoney?: boolean
}[] = [
  { key: 'totalPieces', label: 'Total Pieces', tone: 'text-ink' },
  { key: 'available', label: 'Available', tone: 'text-avail' },
  { key: 'pending', label: 'Pending', tone: 'text-pending' },
  { key: 'sold', label: 'Sold', tone: 'text-muted' },
  { key: 'profitSold', label: 'Profit (sold)', tone: 'text-ink', isMoney: true },
]

export function StatsDashboard({ stats }: { stats: InventoryStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className="rounded-xl border border-line bg-surface px-4 py-3 shadow-sm"
        >
          <div className="text-xs font-semibold uppercase tracking-widest text-muted">
            {card.label}
          </div>
          <div className={`mt-1 font-display text-3xl font-bold ${card.tone}`}>
            {card.isMoney ? money(stats[card.key]) : stats[card.key]}
          </div>
        </div>
      ))}
    </div>
  )
}
