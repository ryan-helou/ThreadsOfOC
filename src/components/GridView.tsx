import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Availability, Item, SizeEntry } from '../../shared/types.ts'
import { AVAILABILITY } from '../../shared/types.ts'
import {
  computeProfit,
  computeStats,
  groupItemsBySize,
} from '../../shared/helpers.ts'
import { useStore } from '../store/store.tsx'
import { money, signedMoney } from '../lib/format.ts'
import { sku } from '../lib/labels.ts'
import { Button, SelectMenu, type SelectOption } from './ui.tsx'
import { StatsDashboard } from './StatsDashboard.tsx'

const STATUS_TONE = { Available: 'avail', Pending: 'pending', Sold: 'sold' } as const

const STATUS_OPTIONS: SelectOption[] = AVAILABILITY.map((a) => ({
  value: a,
  label: a,
  tone: STATUS_TONE[a],
}))

// Left-edge accent per status: blue in stock, amber pending, green sold.
const STATUS_BORDER: Record<Availability, string> = {
  Available: 'border-l-avail',
  Pending: 'border-l-pending',
  Sold: 'border-l-sold',
}

/** Profit color: green when realized (Sold), red if a sold piece lost money,
    muted while it's still just a projection. */
function profitClass(status: Availability, profit: number): string {
  if (status !== 'Sold') return 'text-muted/70'
  return profit >= 0 ? 'text-sold' : 'text-red-600'
}

export function GridView() {
  const { state, createItem, addSize, updateSize, deleteSize, busy } = useStore()
  const [query, setQuery] = useState('')

  // Stats always reflect the FULL inventory, recomputed on every edit.
  const stats = useMemo(() => computeStats(state.items), [state.items])

  const rows = useMemo(() => groupItemsBySize(state.items), [state.items])
  const q = query.trim().toLowerCase()
  const filtered = q
    ? rows.filter(
        (r) =>
          r.item.name.toLowerCase().includes(q) ||
          r.size.note.toLowerCase().includes(q),
      )
    : rows

  // Regroup the (possibly filtered) rows by item for the mobile card layout.
  const groups = useMemo(() => {
    const map = new Map<string, { item: Item; sizes: SizeEntry[] }>()
    for (const r of filtered) {
      const g = map.get(r.item.id) ?? { item: r.item, sizes: [] }
      g.sizes.push(r.size)
      map.set(r.item.id, g)
    }
    return [...map.values()]
  }, [filtered])

  const empty = filtered.length === 0
  const emptyMsg = q ? 'No rows match your search.' : 'No rows yet — add one above.'

  const addSizeTo = (itemId: string) =>
    addSize(itemId, { sizeLabel: '', status: 'Available', cost: 0, salePrice: 0, soldTo: '', note: '' })

  return (
    <section className="space-y-6">
      <div>
        <p className="eyebrow mb-1">Spreadsheet · {stats.totalPieces} units</p>
        <h1 className="mb-5 font-poster text-5xl uppercase sm:text-6xl">Item Grid</h1>
        <StatsDashboard stats={stats} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs sm:w-72">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search item name or notes…"
            className="w-full rounded-md border border-line bg-surface py-2 pl-8 pr-3 text-sm outline-none transition focus:border-ink-soft focus:ring-2 focus:ring-ink/10"
          />
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            createItem({
              name: 'New item',
              brand: '',
              photo: '',
              sizes: [{ sizeLabel: '', status: 'Available', cost: 0, salePrice: 0, soldTo: '', note: '' }],
            })
          }
        >
          + Add Row
        </Button>
      </div>

      {/* Desktop / tablet: spreadsheet table. */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface shadow-card md:block">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-strong bg-surface-2 text-left">
              <Th className="w-[22%]">Item</Th>
              <Th className="w-[80px]">Size</Th>
              <Th className="w-[130px]">Availability</Th>
              <Th className="w-[90px]">Cost</Th>
              <Th className="w-[90px]">Sale $</Th>
              <Th className="w-[100px]">Profit</Th>
              <Th className="w-[140px]">Sold to</Th>
              <Th>Notes</Th>
              <Th className="w-[60px] text-right">·</Th>
            </tr>
          </thead>
          <tbody>
            {empty && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  {emptyMsg}
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <GridRowView
                key={row.size.id}
                item={row.item}
                size={row.size}
                isGroupStart={row.isGroupStart && !q}
                onUpdate={(patch) => updateSize(row.size.id, patch)}
                onDelete={() => deleteSize(row.size.id)}
                onAddSize={() => addSizeTo(row.item.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards, one per item, sizes as tap-friendly rows. */}
      <div className="space-y-3 md:hidden">
        {empty ? (
          <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-muted">
            {emptyMsg}
          </div>
        ) : (
          groups.map((g) => (
            <MobileItemCard
              key={g.item.id}
              item={g.item}
              sizes={g.sizes}
              onUpdate={updateSize}
              onDelete={deleteSize}
              onAddSize={() => addSizeTo(g.item.id)}
            />
          ))
        )}
      </div>
    </section>
  )
}

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-soft ${className}`}
    >
      {children}
    </th>
  )
}

/* ----------------------------------------------------------- desktop row --- */

function GridRowView({
  item,
  size,
  isGroupStart,
  onUpdate,
  onDelete,
  onAddSize,
}: {
  item: Item
  size: SizeEntry
  isGroupStart: boolean
  onUpdate: (patch: Partial<Omit<SizeEntry, 'id'>>) => void
  onDelete: () => void
  onAddSize: () => void
}) {
  const profit = computeProfit(size)
  const sold = size.status === 'Sold'

  return (
    <tr
      className={`border-b border-line transition-colors hover:bg-surface-2 ${
        isGroupStart ? 'border-t-2 border-t-line-strong' : ''
      }`}
    >
      <td className={`border-l-4 px-3 py-1.5 align-middle ${STATUS_BORDER[size.status]}`}>
        {isGroupStart ? (
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-semibold uppercase leading-tight">
              {item.name || 'Untitled'}
            </span>
            <span className="font-mono text-[10px] text-muted">{sku(item)}</span>
            <button
              onClick={onAddSize}
              title="Add a size to this item"
              className="rounded border border-line px-1.5 text-xs font-semibold text-muted hover:border-ink hover:text-ink"
            >
              + size
            </button>
          </div>
        ) : (
          <span className="pl-3 font-mono text-xs text-muted">↳ {item.brand || item.name}</span>
        )}
      </td>
      <td className="px-2 py-1.5">
        <EditText value={size.sizeLabel} placeholder="—" className="font-mono w-16 font-bold uppercase" onCommit={(v) => onUpdate({ sizeLabel: v })} />
      </td>
      <td className="px-2 py-1.5">
        <SelectMenu
          value={size.status}
          onChange={(v) => onUpdate({ status: v as Availability })}
          options={STATUS_OPTIONS}
          ariaLabel="Availability"
          size="sm"
        />
      </td>
      <td className="px-2 py-1.5">
        <EditNumber value={size.cost} onCommit={(v) => onUpdate({ cost: v })} />
      </td>
      <td className="px-2 py-1.5">
        <EditNumber value={size.salePrice} onCommit={(v) => onUpdate({ salePrice: v })} />
      </td>
      <td className="px-3 py-1.5">
        <span
          className={`font-mono tabular text-[13px] font-bold ${profitClass(size.status, profit)}`}
          title={sold ? 'Counted in totals' : 'Not counted until marked Sold'}
        >
          {sold ? signedMoney(profit) : money(profit)}
        </span>
      </td>
      <td className="px-2 py-1.5">
        <EditText
          value={size.soldTo}
          placeholder="—"
          className={`w-full ${sold ? 'text-ink' : 'text-muted'}`}
          onCommit={(v) => onUpdate({ soldTo: v })}
        />
      </td>
      <td className="px-2 py-1.5">
        <EditText value={size.note} placeholder="Add note…" className="w-full" onCommit={(v) => onUpdate({ note: v })} />
      </td>
      <td className="px-3 py-1.5 text-right">
        <button
          onClick={onDelete}
          aria-label="Delete row"
          className="rounded px-1.5 text-muted hover:text-red-600"
          title="Delete row"
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

/* ------------------------------------------------------------ mobile card --- */

function MobileItemCard({
  item,
  sizes,
  onUpdate,
  onDelete,
  onAddSize,
}: {
  item: Item
  sizes: SizeEntry[]
  onUpdate: (id: string, patch: Partial<Omit<SizeEntry, 'id'>>) => void
  onDelete: (id: string) => void
  onAddSize: () => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2.5">
        <span className="min-w-0 truncate font-display text-sm font-semibold uppercase leading-tight">
          {item.name || 'Untitled'}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-muted">{sku(item)}</span>
        <button
          onClick={onAddSize}
          className="ml-auto shrink-0 rounded border border-line px-2 py-1 text-xs font-semibold text-muted hover:border-ink hover:text-ink"
        >
          + size
        </button>
      </div>
      {sizes.map((size) => (
        <MobileSizeRow
          key={size.id}
          size={size}
          onUpdate={(patch) => onUpdate(size.id, patch)}
          onDelete={() => onDelete(size.id)}
        />
      ))}
    </div>
  )
}

function MobileSizeRow({
  size,
  onUpdate,
  onDelete,
}: {
  size: SizeEntry
  onUpdate: (patch: Partial<Omit<SizeEntry, 'id'>>) => void
  onDelete: () => void
}) {
  const profit = computeProfit(size)
  const sold = size.status === 'Sold'

  return (
    <div className={`border-b border-l-4 border-line px-3 py-3 last:border-b-0 ${STATUS_BORDER[size.status]}`}>
      <div className="flex items-center gap-2">
        <EditText
          value={size.sizeLabel}
          placeholder="—"
          className="w-14 border-line text-center font-mono font-bold uppercase"
          onCommit={(v) => onUpdate({ sizeLabel: v })}
        />
        <div className="min-w-0 flex-1">
          <SelectMenu
            value={size.status}
            onChange={(v) => onUpdate({ status: v as Availability })}
            options={STATUS_OPTIONS}
            ariaLabel="Availability"
            size="sm"
          />
        </div>
        <button
          onClick={onDelete}
          aria-label="Delete row"
          className="shrink-0 rounded px-2 py-1.5 text-muted hover:text-red-600"
        >
          ✕
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
        <MobileField label="Cost">
          <EditNumber value={size.cost} className="w-full text-center" onCommit={(v) => onUpdate({ cost: v })} />
        </MobileField>
        <MobileField label="Sale $">
          <EditNumber value={size.salePrice} className="w-full text-center" onCommit={(v) => onUpdate({ salePrice: v })} />
        </MobileField>
        <div>
          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted">
            Profit
          </span>
          <span className={`block py-1.5 font-mono text-sm font-bold ${profitClass(size.status, profit)}`}>
            {sold ? signedMoney(profit) : money(profit)}
          </span>
        </div>
      </div>

      <div className="mt-2.5">
        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted">
          Sold to
        </span>
        <div className="rounded border border-line px-1">
          <EditText
            value={size.soldTo}
            placeholder="Buyer name"
            className="w-full"
            onCommit={(v) => onUpdate({ soldTo: v })}
          />
        </div>
      </div>

      <div className="mt-2">
        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted">
          Notes
        </span>
        <div className="rounded border border-line px-1">
          <EditText
            value={size.note}
            placeholder="Add note…"
            className="w-full"
            onCommit={(v) => onUpdate({ note: v })}
          />
        </div>
      </div>
    </div>
  )
}

function MobileField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <div className="rounded border border-line">{children}</div>
    </label>
  )
}

/* --- editable cells: local draft, commit on blur / Enter --- */

function EditText({
  value,
  onCommit,
  placeholder,
  className = '',
}: {
  value: string
  onCommit: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(value)
      }}
      className={`rounded border border-transparent bg-transparent px-1.5 py-1 outline-none hover:border-line focus:border-ink-soft focus:bg-surface ${className}`}
    />
  )
}

function EditNumber({
  value,
  onCommit,
  className = 'w-20 text-right',
}: {
  value: number
  onCommit: (v: number) => void
  className?: string
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  return (
    <input
      type="number"
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = Number(draft)
        if (Number.isFinite(n) && n !== value) onCommit(n)
        else setDraft(String(value))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(String(value))
      }}
      className={`font-mono tabular rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] outline-none hover:border-line focus:border-ink-soft focus:bg-surface ${className}`}
    />
  )
}
