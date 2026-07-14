/**
 * Small, pure, framework-agnostic helpers. No React, no DOM, no I/O — so they
 * run identically on the server, in the browser, and in tests.
 */
import type { Availability, Item, SizeEntry } from './types.ts'

/* ------------------------------------------------------------------ ids --- */

/** Stable, collision-resistant id with a human-readable prefix. */
export function generateId(prefix: 'item' | 'size' | 'sale'): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : // Fallback for exotic runtimes; never the hot path.
        Array.from({ length: 16 }, () =>
          Math.floor(Math.random() * 256)
            .toString(16)
            .padStart(2, '0'),
        ).join('')
  return `${prefix}_${uuid}`
}

/* --------------------------------------------------------------- profit --- */

/** Raw margin for a single unit: sale price minus cost. */
export function computeProfit(size: Pick<SizeEntry, 'cost' | 'salePrice'>): number {
  return round2(numberOr0(size.salePrice) - numberOr0(size.cost))
}

/** Profit only counts toward totals once the unit is actually Sold. */
export function realizedProfit(size: SizeEntry): number {
  return size.status === 'Sold' ? computeProfit(size) : 0
}

/* ---------------------------------------------------------------- stats --- */

export interface InventoryStats {
  totalPieces: number
  available: number
  pending: number
  sold: number
  profitSold: number
}

/** Live dashboard numbers. Recomputed from scratch on every edit — cheap. */
export function computeStats(items: Item[]): InventoryStats {
  const stats: InventoryStats = {
    totalPieces: 0,
    available: 0,
    pending: 0,
    sold: 0,
    profitSold: 0,
  }
  for (const item of items) {
    for (const size of item.sizes) {
      stats.totalPieces += 1
      if (size.status === 'Available') stats.available += 1
      else if (size.status === 'Pending') stats.pending += 1
      else if (size.status === 'Sold') {
        stats.sold += 1
        stats.profitSold += computeProfit(size)
      }
    }
  }
  stats.profitSold = round2(stats.profitSold)
  return stats
}

/* -------------------------------------------------------------- grouping --- */

/** One spreadsheet row: a size unit paired with its parent item. */
export interface GridRow {
  item: Item
  size: SizeEntry
  /** True for the first row of each item group, so the UI can draw a header. */
  isGroupStart: boolean
}

/** Flatten items into grid rows, grouped so all sizes of an item are adjacent. */
export function groupItemsBySize(items: Item[]): GridRow[] {
  const rows: GridRow[] = []
  for (const item of items) {
    item.sizes.forEach((size, index) => {
      rows.push({ item, size, isGroupStart: index === 0 })
    })
  }
  return rows
}

/* --------------------------------------------------------------- chips --- */

export type ChipTone = 'green' | 'amber' | 'muted'

export interface Chip {
  label: Availability
  short: string
  tone: ChipTone
}

/** Availability → presentation-neutral chip descriptor (tone, not CSS). */
export function availabilityToChip(status: Availability): Chip {
  switch (status) {
    case 'Available':
      return { label: 'Available', short: 'A', tone: 'green' }
    case 'Pending':
      return { label: 'Pending', short: 'P', tone: 'amber' }
    case 'Sold':
      return { label: 'Sold', short: 'S', tone: 'muted' }
  }
}

/* ------------------------------------------------------------ sanitize --- */

/**
 * Only allow http/https links. Blocks `javascript:`, `data:`, etc. so a stored
 * reference URL can never become an XSS vector when rendered as an href.
 */
export function sanitizeUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString()
    }
    return undefined
  } catch {
    // Not an absolute URL — reject rather than guess.
    return undefined
  }
}

/**
 * Escape HTML-significant characters. React already escapes text nodes, but we
 * use this for any non-React sink (exports, document titles, etc.).
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/* ------------------------------------------------------------ numbers --- */

/** Coerce anything to a finite number, defaulting to 0 (never NaN). */
export function numberOr0(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Round to cents to avoid float drift in money math. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/* ---------------------------------------------------------- validation --- */

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

/**
 * A sale is only valid with real cost + sale numbers. This is the exact bug
 * from the old app: empty fields silently produced $0 profit.
 */
export function validateSaleFinancials(input: {
  cost: unknown
  salePrice: unknown
}): ValidationResult {
  const errors: string[] = []
  if (!isPositiveMoney(input.cost)) {
    errors.push('Cost is required and must be a number of 0 or more.')
  }
  if (!isPositiveMoney(input.salePrice)) {
    errors.push('Sale price is required and must be a number greater than 0.')
  }
  return { ok: errors.length === 0, errors }
}

function isPositiveMoney(value: unknown): boolean {
  if (value === '' || value === null || value === undefined) return false
  const n = Number(value)
  return Number.isFinite(n) && n >= 0
}
