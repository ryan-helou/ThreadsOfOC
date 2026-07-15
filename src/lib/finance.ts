/**
 * Pure finance aggregations for the dashboard. Money totals come from SOLD
 * units (the source of truth for what's actually sold); the time series comes
 * from logged sales (the only records that carry a date).
 */
import type { AppState, Item, SizeEntry } from '../../shared/types.ts'
import { computeProfit } from '../../shared/helpers.ts'

const soldSizes = (items: Item[]): { item: Item; size: SizeEntry }[] =>
  items.flatMap((item) =>
    item.sizes.filter((s) => s.status === 'Sold').map((size) => ({ item, size })),
  )

export interface FinanceSummary {
  revenue: number
  cost: number
  profit: number
  unitsSold: number
  avgProfit: number
  margin: number // percent
  // Money still on the table:
  pipelineProfit: number // projected profit of Available + Pending units
  pipelineUnits: number
  outstanding: number // sale value logged but not marked Paid
}

export function financeSummary(state: AppState): FinanceSummary {
  const sold = soldSizes(state.items)
  const revenue = sold.reduce((s, { size }) => s + size.salePrice, 0)
  const cost = sold.reduce((s, { size }) => s + size.cost, 0)
  const profit = revenue - cost
  const unitsSold = sold.length

  let pipelineProfit = 0
  let pipelineUnits = 0
  for (const item of state.items) {
    for (const size of item.sizes) {
      if (size.status === 'Available' || size.status === 'Pending') {
        pipelineProfit += computeProfit(size)
        pipelineUnits += 1
      }
    }
  }

  const outstanding = state.sales
    .filter((s) => s.paid !== 'Paid')
    .reduce((s, sale) => s + sale.salePrice, 0)

  return {
    revenue,
    cost,
    profit,
    unitsSold,
    avgProfit: unitsSold ? profit / unitsSold : 0,
    margin: revenue ? (profit / revenue) * 100 : 0,
    pipelineProfit,
    pipelineUnits,
    outstanding,
  }
}

export interface MonthPoint {
  key: string // YYYY-MM
  label: string // "Mar"
  profit: number
  revenue: number
  units: number
}

/** Continuous monthly series from logged, dated sales (gaps filled with zeros). */
export function profitByMonth(state: AppState): MonthPoint[] {
  const costOf = new Map<string, number>()
  for (const item of state.items) {
    for (const size of item.sizes) costOf.set(size.id, size.cost)
  }

  const buckets = new Map<string, MonthPoint>()
  const dates: Date[] = []
  for (const sale of state.sales) {
    if (!sale.datetime) continue
    const d = new Date(sale.datetime)
    if (Number.isNaN(d.getTime())) continue
    dates.push(d)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const b =
      buckets.get(key) ??
      { key, label: d.toLocaleString(undefined, { month: 'short' }), profit: 0, revenue: 0, units: 0 }
    const cost = costOf.get(sale.sizeId) ?? 0
    b.revenue += sale.salePrice
    b.profit += sale.salePrice - cost
    b.units += 1
    buckets.set(key, b)
  }

  if (!dates.length) return []

  // Fill every month between the first and last sale so the axis is continuous.
  const min = new Date(Math.min(...dates.map((d) => d.getTime())))
  const max = new Date(Math.max(...dates.map((d) => d.getTime())))
  const out: MonthPoint[] = []
  const cur = new Date(min.getFullYear(), min.getMonth(), 1)
  const end = new Date(max.getFullYear(), max.getMonth(), 1)
  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
    out.push(
      buckets.get(key) ?? {
        key,
        label: cur.toLocaleString(undefined, { month: 'short' }),
        profit: 0,
        revenue: 0,
        units: 0,
      },
    )
    cur.setMonth(cur.getMonth() + 1)
  }
  return out
}

export interface RankRow {
  key: string
  label: string
  sublabel?: string
  profit: number
  units: number
  revenue: number
}

/** Realized profit grouped by brand, ranked high→low. */
export function profitByBrand(state: AppState): RankRow[] {
  const map = new Map<string, RankRow>()
  for (const { item, size } of soldSizes(state.items)) {
    const key = item.brand || 'Unbranded'
    const r = map.get(key) ?? { key, label: key, profit: 0, units: 0, revenue: 0 }
    r.profit += computeProfit(size)
    r.revenue += size.salePrice
    r.units += 1
    map.set(key, r)
  }
  return [...map.values()].sort((a, b) => b.profit - a.profit)
}

/** Best-selling items by realized profit, ranked high→low. */
export function topSellers(state: AppState, limit = 6): RankRow[] {
  const map = new Map<string, RankRow>()
  for (const { item, size } of soldSizes(state.items)) {
    const r =
      map.get(item.id) ??
      { key: item.id, label: item.name || 'Untitled', sublabel: item.brand, profit: 0, units: 0, revenue: 0 }
    r.profit += computeProfit(size)
    r.revenue += size.salePrice
    r.units += 1
    map.set(item.id, r)
  }
  return [...map.values()].sort((a, b) => b.profit - a.profit).slice(0, limit)
}

/** Repeat buyers, ranked by total spend. */
export function topBuyers(state: AppState, limit = 6): RankRow[] {
  const map = new Map<string, RankRow>()
  for (const { size } of soldSizes(state.items)) {
    const name = size.soldTo.trim()
    if (!name) continue
    const r = map.get(name) ?? { key: name, label: name, profit: 0, units: 0, revenue: 0 }
    r.profit += computeProfit(size)
    r.revenue += size.salePrice
    r.units += 1
    map.set(name, r)
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}
