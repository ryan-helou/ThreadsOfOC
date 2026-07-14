/**
 * Presentation labels grounded in resale vernacular — SKU swing-tags and price
 * ranges. Deterministic so a given item always shows the same code.
 */
import type { Item } from '../../shared/types.ts'
import { money } from './format.ts'

/** A short swing-tag code, e.g. "HEL·9C0F". Brand prefix + a stable id tail. */
export function sku(item: Item): string {
  const prefix = (item.brand || item.name || 'ITM')
    .replace(/[^a-z]/gi, '')
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, 'X')
  const tail = item.id.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase()
  return `${prefix}·${tail || '0000'}`
}

/** Sale-price range across an item's sizes: "$130" or "$130–$140". */
export function priceRange(item: Item): string {
  const prices = item.sizes.map((s) => s.salePrice).filter((n) => n > 0)
  if (!prices.length) return '—'
  const lo = Math.min(...prices)
  const hi = Math.max(...prices)
  return lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`
}
