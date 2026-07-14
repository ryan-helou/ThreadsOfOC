/**
 * Availability status chip. Colors are finance-forward and mapped straight from
 * the status here (not via the shared tone), so this file owns its own palette:
 *   Available → blue (in stock)   Pending → amber   Sold → green (money in)
 */
import type { Availability } from '../../shared/types.ts'

const STATUS_STYLE: Record<Availability, string> = {
  Available: 'bg-avail-bg text-avail border-avail/30',
  Pending: 'bg-pending-bg text-pending border-pending/30',
  Sold: 'bg-sold-bg text-sold border-sold/30',
}

export function Chip({
  status,
  size = 'md',
}: {
  status: Availability
  size?: 'sm' | 'md'
}) {
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wide ${pad} ${STATUS_STYLE[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  )
}

/** Compact photo-overlay chip: a size bubble tinted by availability. */
export function SizeBubble({
  sizeLabel,
  status,
}: {
  sizeLabel: string
  status: Availability
}) {
  return (
    <span
      title={`${sizeLabel || '—'} · ${status}`}
      className={`inline-flex min-w-6 items-center justify-center rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase shadow-sm ${STATUS_STYLE[status]}`}
    >
      {sizeLabel || '—'}
    </span>
  )
}
