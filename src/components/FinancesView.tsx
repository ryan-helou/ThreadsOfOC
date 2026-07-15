import { useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../store/store.tsx'
import { money } from '../lib/format.ts'
import {
  financeSummary,
  profitByBrand,
  profitByMonth,
  topBuyers,
  topSellers,
  type MonthPoint,
  type RankRow,
} from '../lib/finance.ts'

export function FinancesView() {
  const { state } = useStore()

  const summary = useMemo(() => financeSummary(state), [state])
  const months = useMemo(() => profitByMonth(state), [state])
  const brands = useMemo(() => profitByBrand(state), [state])
  const sellers = useMemo(() => topSellers(state), [state])
  const buyers = useMemo(() => topBuyers(state), [state])

  return (
    <section className="space-y-8">
      <header>
        <p className="eyebrow mb-1">The numbers · {summary.unitsSold} sold</p>
        <h1 className="font-poster text-5xl uppercase sm:text-6xl">Finances</h1>
      </header>

      {summary.unitsSold === 0 && summary.pipelineUnits === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-4 py-20 text-center text-muted">
          Log a sale and the money picture shows up here.
        </div>
      ) : (
        <>
          <HeroProfit summary={summary} />

          <Card
            title="Profit over time"
            hint="From logged sales"
          >
            <MonthlyChart points={months} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Profit by brand">
              <RankBars rows={brands} value={(r) => r.profit} format={money} accent="sold" />
            </Card>
            <Card title="Best sellers" hint="By realized profit">
              <RankBars
                rows={sellers}
                value={(r) => r.profit}
                format={money}
                accent="sold"
                sub={(r) => `${r.sublabel ?? ''} · ${r.units} sold`}
              />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Still on the table" hint="Money not yet realized">
              <div className="grid grid-cols-2 gap-3">
                <MiniStat
                  label="Projected profit"
                  value={money(summary.pipelineProfit)}
                  sub={`${summary.pipelineUnits} unsold`}
                  tone="ink"
                />
                <MiniStat
                  label="Awaiting payment"
                  value={money(summary.outstanding)}
                  sub="logged, unpaid"
                  tone="pending"
                />
              </div>
            </Card>
            <Card title="Top buyers" hint="By total spend">
              {buyers.length ? (
                <RankBars rows={buyers} value={(r) => r.revenue} format={money} accent="ink" sub={(r) => `${r.units} bought`} />
              ) : (
                <p className="py-6 text-center text-sm text-muted">
                  Add “sold to” names on the grid to see your buyers here.
                </p>
              )}
            </Card>
          </div>
        </>
      )}
    </section>
  )
}

/* ------------------------------------------------------------- hero P&L --- */

function HeroProfit({ summary }: { summary: ReturnType<typeof financeSummary> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="rounded-xl bg-sold p-5 text-white shadow-card sm:col-span-1">
        <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-white/80">
          Total profit
        </span>
        <div className="font-mono tabular mt-1 text-4xl font-bold leading-none">
          {money(summary.profit)}
        </div>
        <div className="mt-2 font-mono text-xs text-white/80">
          {summary.margin.toFixed(0)}% margin
        </div>
      </div>
      <MiniStat label="Revenue" value={money(summary.revenue)} sub="collected" tone="ink" />
      <MiniStat label="Cost of goods" value={money(summary.cost)} sub="paid out" tone="ink" />
      <MiniStat
        label="Avg / sale"
        value={money(summary.avgProfit)}
        sub={`${summary.unitsSold} units`}
        tone="ink"
      />
    </div>
  )
}

function MiniStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone: 'ink' | 'pending'
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <span className="eyebrow">{label}</span>
      <div className={`font-mono tabular mt-1 text-3xl font-bold leading-none ${tone === 'pending' ? 'text-pending' : 'text-ink'}`}>
        {value}
      </div>
      {sub && <div className="mt-2 font-mono text-xs text-muted">{sub}</div>}
    </div>
  )
}

/* --------------------------------------------------------------- shell --- */

function Card({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold uppercase tracking-wide">{title}</h2>
        {hint && <span className="eyebrow">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

/* ------------------------------------------------------- monthly chart --- */

type Metric = 'profit' | 'revenue' | 'units'
const METRICS: { key: Metric; label: string }[] = [
  { key: 'profit', label: 'Profit' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'units', label: 'Units' },
]

function MonthlyChart({ points }: { points: MonthPoint[] }) {
  const [metric, setMetric] = useState<Metric>('profit')
  const [hover, setHover] = useState<number | null>(null)

  if (!points.length) {
    return <p className="py-8 text-center text-sm text-muted">No dated sales yet.</p>
  }

  const val = (p: MonthPoint) => (metric === 'units' ? p.units : metric === 'revenue' ? p.revenue : p.profit)
  const fmt = (n: number) => (metric === 'units' ? `${n}` : money(n))
  const max = Math.max(1, ...points.map(val))
  const isMoney = metric !== 'units'
  const barColor = isMoney ? 'bg-sold' : 'bg-ink'

  return (
    <div>
      <div className="mb-4 inline-flex rounded-md border border-line p-0.5">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`rounded px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              metric === m.key ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="relative flex h-52 items-end gap-1.5 border-b border-line pt-6">
        {points.map((p, i) => {
          const h = (val(p) / max) * 100
          const active = hover === i
          return (
            <div
              key={p.key}
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {active && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md border border-line-strong bg-ink px-2 py-1 text-center text-xs text-white shadow-lift">
                  <div className="font-mono font-bold">{fmt(val(p))}</div>
                  <div className="text-[10px] text-white/70">{p.label} · {p.units} sold</div>
                </div>
              )}
              <div
                style={{ height: `${Math.max(h, val(p) > 0 ? 4 : 0)}%` }}
                className={`w-full max-w-[44px] rounded-t transition-all ${
                  active ? 'bg-ink' : barColor
                } ${hover !== null && !active ? 'opacity-40' : ''}`}
              />
              <span className="mt-1.5 font-mono text-[10px] text-muted">{p.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- ranks --- */

function RankBars({
  rows,
  value,
  format,
  accent,
  sub,
}: {
  rows: RankRow[]
  value: (r: RankRow) => number
  format: (n: number) => string
  accent: 'sold' | 'ink'
  sub?: (r: RankRow) => string
}) {
  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted">Nothing sold yet.</p>
  }
  const max = Math.max(1, ...rows.map(value))
  const bar = accent === 'sold' ? 'bg-sold' : 'bg-ink'
  const text = accent === 'sold' ? 'text-sold' : 'text-ink'

  return (
    <ol className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-semibold">
              {r.label}
              {sub && <span className="ml-1.5 font-normal text-muted">{sub(r)}</span>}
            </span>
            <span className={`font-mono text-sm font-bold ${text}`}>{format(value(r))}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div
              style={{ width: `${(value(r) / max) * 100}%` }}
              className={`h-full rounded-full transition-all group-hover:opacity-80 ${bar}`}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}
