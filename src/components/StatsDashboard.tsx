import type { InventoryStats } from '../../shared/helpers.ts'
import { money } from '../lib/format.ts'

/**
 * The ledger strip — a single hairline-divided panel that reads like a
 * reseller's P&L printout. Realized profit is the headline: it gets its own
 * green, full-width emphasis on mobile so the money is never buried.
 */
const CELLS: {
  key: keyof InventoryStats
  label: string
  dot?: string
  num: string
}[] = [
  { key: 'totalPieces', label: 'Pieces', num: 'text-ink' },
  { key: 'available', label: 'Available', dot: 'bg-avail', num: 'text-avail' },
  { key: 'pending', label: 'Pending', dot: 'bg-pending', num: 'text-pending' },
  { key: 'sold', label: 'Sold', dot: 'bg-sold', num: 'text-sold' },
]

export function StatsDashboard({ stats }: { stats: InventoryStats }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card sm:grid-cols-5 sm:divide-y-0">
      {CELLS.map((cell) => (
        <div key={cell.key} className="px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            {cell.dot && <span className={`h-2.5 w-2.5 rounded-full ${cell.dot}`} />}
            <span className="eyebrow">{cell.label}</span>
          </div>
          <div className={`font-mono tabular mt-1.5 text-2xl font-bold ${cell.num}`}>
            {stats[cell.key]}
          </div>
        </div>
      ))}

      {/* Profit — the headline number. Full-width green block on mobile. */}
      <div className="col-span-2 bg-sold text-white px-4 py-3.5 sm:col-span-1">
        <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-white/80">
          Profit · realized
        </span>
        <div className="font-mono tabular mt-1 text-3xl font-bold leading-none">
          {money(stats.profitSold)}
        </div>
      </div>
    </div>
  )
}
