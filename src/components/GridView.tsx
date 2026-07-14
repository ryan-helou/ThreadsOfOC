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
import { Button } from './ui.tsx'
import { StatsDashboard } from './StatsDashboard.tsx'

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
              sizes: [{ sizeLabel: '', status: 'Available', cost: 0, salePrice: 0, note: '' }],
            })
          }
        >
          + Add Row
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-strong bg-surface-2 text-left">
              <Th className="w-[22%]">Item</Th>
              <Th className="w-[80px]">Size</Th>
              <Th className="w-[130px]">Availability</Th>
              <Th className="w-[90px]">Cost</Th>
              <Th className="w-[90px]">Sale $</Th>
              <Th className="w-[100px]">Profit</Th>
              <Th>Notes</Th>
              <Th className="w-[60px] text-right">·</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  {q ? 'No rows match your search.' : 'No rows yet — add one above.'}
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
                onAddSize={() =>
                  addSize(row.item.id, {
                    sizeLabel: '',
                    status: 'Available',
                    cost: 0,
                    salePrice: 0,
                    note: '',
                  })
                }
              />
            ))}
          </tbody>
        </table>
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
      <td className="px-3 py-1.5 align-middle">
        {isGroupStart ? (
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-semibold uppercase leading-tight">
              {item.name || 'Untitled'}
            </span>
            <button
              onClick={onAddSize}
              title="Add a size to this item"
              className="rounded border border-line px-1.5 text-xs font-semibold text-muted hover:border-ink hover:text-ink"
            >
              + size
            </button>
          </div>
        ) : (
          <span className="pl-3 text-xs text-muted">↳ {item.brand || item.name}</span>
        )}
      </td>
      <td className="px-2 py-1.5">
        <EditText value={size.sizeLabel} placeholder="—" className="w-16" onCommit={(v) => onUpdate({ sizeLabel: v })} />
      </td>
      <td className="px-2 py-1.5">
        <select
          value={size.status}
          onChange={(e) => onUpdate({ status: e.target.value as Availability })}
          className="w-full rounded border border-line bg-surface px-1.5 py-1 text-sm outline-none focus:border-ink-soft"
        >
          {AVAILABILITY.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <EditNumber value={size.cost} onCommit={(v) => onUpdate({ cost: v })} />
      </td>
      <td className="px-2 py-1.5">
        <EditNumber value={size.salePrice} onCommit={(v) => onUpdate({ salePrice: v })} />
      </td>
      <td className="px-3 py-1.5">
        <span
          className={`tabular font-semibold ${sold ? (profit >= 0 ? 'text-avail' : 'text-red-600') : 'text-muted/70'}`}
          title={sold ? 'Counted in totals' : 'Not counted until marked Sold'}
        >
          {sold ? signedMoney(profit) : money(profit)}
        </span>
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

function EditNumber({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
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
      className="tabular w-20 rounded border border-transparent bg-transparent px-1.5 py-1 text-right outline-none hover:border-line focus:border-ink-soft focus:bg-surface"
    />
  )
}
