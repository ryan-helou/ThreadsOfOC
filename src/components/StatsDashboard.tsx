import type { InventoryStats } from '../../shared/helpers.ts'
import { money } from '../lib/format.ts'

/**
 * The ledger strip — a single hairline-divided panel that reads like a
 * reseller's P&L printout, not a row of KPI cards. Figures are monospaced.
 */
const CELLS: {
  key: keyof InventoryStats
  label: string
  dot?: string
  isMoney?: boolean
  strong?: boolean
}[] = [
  { key: 'totalPieces', label: 'Pieces' },
  { key: 'available', label: 'Available', dot: 'bg-avail' },
  { key: 'pending', label: 'Pending', dot: 'bg-pending' },
  { key: 'sold', label: 'Sold', dot: 'bg-muted' },
  { key: 'profitSold', label: 'Profit · realized', isMoney: true, strong: true },
]

export function StatsDashboard({ stats }: { stats: InventoryStats }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card sm:grid-cols-5 sm:divide-y-0">
      {CELLS.map((cell) => (
        <div
          key={cell.key}
          className={`px-4 py-3.5 ${cell.strong ? 'bg-surface-2' : ''}`}
        >
          <div className="flex items-center gap-1.5">
            {cell.dot && <span className={`h-2 w-2 rounded-full ${cell.dot}`} />}
            <span className="eyebrow">{cell.label}</span>
          </div>
          <div
            className={`font-mono mt-1.5 font-bold tabular ${
              cell.strong ? 'text-2xl text-avail' : 'text-2xl text-ink'
            }`}
          >
            {cell.isMoney ? money(stats[cell.key]) : stats[cell.key]}
          </div>
        </div>
      ))}
    </div>
  )
}
