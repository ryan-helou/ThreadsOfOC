/**
 * Shared domain model — imported by both the React client and the Express
 * server so the two can never drift. Keep this file dependency-free.
 */

/** Availability is a strict, closed enum — never a free string. */
export const AVAILABILITY = ['Available', 'Pending', 'Sold'] as const
export type Availability = (typeof AVAILABILITY)[number]

/** How a sale is handed off to the buyer. */
export const FULFILLMENT = ['Pickup', 'Delivery'] as const
export type Fulfillment = (typeof FULFILLMENT)[number]

/** Payment state of a sale. Defaults to "Not yet" on creation. */
export const PAID_STATUS = ['Not yet', 'Paid'] as const
export type PaidStatus = (typeof PAID_STATUS)[number]

/**
 * One physically tracked unit: a single size of an item. Cost / sale price /
 * status all live at this level, because a Medium can be Sold while a Small is
 * still Available.
 */
export interface SizeEntry {
  id: string
  sizeLabel: string
  status: Availability
  cost: number
  salePrice: number
  note: string
}

/** A garment. Holds one photo and a list of per-size tracked units. */
export interface Item {
  id: string
  name: string
  brand: string
  /** URL to the photo (served seed asset, remote URL, or data: URI). */
  photo: string
  /** Optional external listing / reference link. */
  referenceUrl?: string
  sizes: SizeEntry[]
}

/** A logged sale, pinned to a specific item + size unit. */
export interface Sale {
  id: string
  itemId: string
  sizeId: string
  buyerName: string
  fulfillment: Fulfillment
  /** ISO 8601 datetime for pickup / delivery. */
  datetime: string
  salePrice: number
  paid: PaidStatus
  notes: string
}

/** The entire persisted application state. This is what Backup/Restore moves. */
export interface AppState {
  items: Item[]
  sales: Sale[]
}

/** Version stamp written into backup files for forward compatibility. */
export const BACKUP_VERSION = 1

export interface BackupFile extends AppState {
  version: number
  exportedAt: string
}
