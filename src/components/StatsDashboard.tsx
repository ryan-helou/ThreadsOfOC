import type { InventoryStats } from '../../shared/helpers.ts'
import { money } from '../lib/format.ts'

const CARDS: {
  key: keyof InventoryStats
  label: string
  num: string
  dot?: string
  isMoney?: boolean
}[] = [
  { key: 'totalPieces', label: 'Total Pieces', num: 'text-ink' },
  { key: 'available', label: 'Available', num: 'text-ink', dot: 'bg-avail' },
  { key: 'pending', label: 'Pending', num: 'text-ink', dot: 'bg-pending' },
  { key: 'sold', label: 'Sold', num: 'text-ink', dot: 'bg-muted' },
  { key: 'profitSold', label: 'Profit · sold', num: 'text-avail', isMoney: true },
]

export function StatsDashboard({ stats }: { stats: InventoryStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className="relative overflow-hidden rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card"
        >
          <div className="flex items-center gap-1.5">
            {card.dot && <span className={`h-2 w-2 rounded-full ${card.dot}`} />}
            <span className="eyebrow">{card.label}</span>
          </div>
          <div className={`font-poster tabular mt-1.5 text-4xl ${card.num}`}>
            {card.isMoney ? money(stats[card.key]) : stats[card.key]}
          </div>
        </div>
      ))}
    </div>
  )
}
