/** Availability status chip. Tone comes from the pure helper; CSS lives here. */
import type { Availability } from '../../shared/types.ts'
import { availabilityToChip, type ChipTone } from '../../shared/helpers.ts'

const TONE: Record<ChipTone, string> = {
  green: 'bg-avail-bg text-avail border-avail/25',
  amber: 'bg-pending-bg text-pending border-pending/25',
  muted: 'bg-muted-bg text-muted border-muted/25',
}

export function Chip({
  status,
  size = 'md',
}: {
  status: Availability
  size?: 'sm' | 'md'
}) {
  const chip = availabilityToChip(status)
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wide ${pad} ${TONE[chip.tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {chip.label}
    </span>
  )
}

/** Compact photo-overlay chip: "M" bubble tinted by availability. */
export function SizeBubble({
  sizeLabel,
  status,
}: {
  sizeLabel: string
  status: Availability
}) {
  const chip = availabilityToChip(status)
  return (
    <span
      title={`${sizeLabel || '—'} · ${chip.label}`}
      className={`inline-flex min-w-6 items-center justify-center rounded border px-1.5 py-0.5 text-[11px] font-bold uppercase backdrop-blur-sm ${TONE[chip.tone]}`}
    >
      {sizeLabel || '—'}
    </span>
  )
}
