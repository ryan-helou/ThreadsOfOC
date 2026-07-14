/**
 * SQLite persistence layer — the single authoritative store. Everything the
 * API exposes goes through the typed functions here; no route touches SQL
 * directly. Data is normalized into items / sizes / sales tables so referential
 * integrity and the sale→Sold flip are enforced by real transactions.
 */
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type {
  AppState,
  Availability,
  Fulfillment,
  Item,
  PaidStatus,
  Sale,
  SizeEntry,
} from '../../shared/types.ts'
import { numberOr0, sanitizeUrl } from '../../shared/helpers.ts'

const DB_PATH = process.env.DB_PATH ?? './data/threads.db'

const dir = dirname(DB_PATH)
if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    brand         TEXT NOT NULL DEFAULT '',
    photo         TEXT NOT NULL DEFAULT '',
    reference_url TEXT,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sizes (
    id         TEXT PRIMARY KEY,
    item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    size_label TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'Available',
    cost       REAL NOT NULL DEFAULT 0,
    sale_price REAL NOT NULL DEFAULT 0,
    note       TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sales (
    id          TEXT PRIMARY KEY,
    item_id     TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    size_id     TEXT NOT NULL REFERENCES sizes(id) ON DELETE CASCADE,
    buyer_name  TEXT NOT NULL DEFAULT '',
    fulfillment TEXT NOT NULL DEFAULT 'Pickup',
    datetime    TEXT NOT NULL DEFAULT '',
    sale_price  REAL NOT NULL DEFAULT 0,
    paid        TEXT NOT NULL DEFAULT 'Not yet',
    notes       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sizes_item ON sizes(item_id);
  CREATE INDEX IF NOT EXISTS idx_sales_size ON sales(size_id);
`)

/* --------------------------------------------------------------- reads --- */

interface ItemRow {
  id: string
  name: string
  brand: string
  photo: string
  reference_url: string | null
}
interface SizeRow {
  id: string
  item_id: string
  size_label: string
  status: string
  cost: number
  sale_price: number
  note: string
}
interface SaleRow {
  id: string
  item_id: string
  size_id: string
  buyer_name: string
  fulfillment: string
  datetime: string
  sale_price: number
  paid: string
  notes: string
}

function rowToSize(r: SizeRow): SizeEntry {
  return {
    id: r.id,
    sizeLabel: r.size_label,
    status: r.status as Availability,
    cost: numberOr0(r.cost),
    salePrice: numberOr0(r.sale_price),
    note: r.note,
  }
}

/** Read the entire authoritative state. Ordered by insertion (rowid). */
export function readState(): AppState {
  const itemRows = db
    .prepare('SELECT * FROM items ORDER BY rowid')
    .all() as ItemRow[]
  const sizeRows = db
    .prepare('SELECT * FROM sizes ORDER BY rowid')
    .all() as SizeRow[]
  const saleRows = db
    .prepare('SELECT * FROM sales ORDER BY rowid')
    .all() as SaleRow[]

  const sizesByItem = new Map<string, SizeEntry[]>()
  for (const r of sizeRows) {
    const list = sizesByItem.get(r.item_id) ?? []
    list.push(rowToSize(r))
    sizesByItem.set(r.item_id, list)
  }

  const items: Item[] = itemRows.map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand,
    photo: r.photo,
    referenceUrl: r.reference_url ?? undefined,
    sizes: sizesByItem.get(r.id) ?? [],
  }))

  const sales: Sale[] = saleRows.map((r) => ({
    id: r.id,
    itemId: r.item_id,
    sizeId: r.size_id,
    buyerName: r.buyer_name,
    fulfillment: r.fulfillment as Fulfillment,
    datetime: r.datetime,
    salePrice: numberOr0(r.sale_price),
    paid: r.paid as PaidStatus,
    notes: r.notes,
  }))

  return { items, sales }
}

export function isEmpty(): boolean {
  const row = db.prepare('SELECT COUNT(*) AS n FROM items').get() as { n: number }
  return row.n === 0
}

/* ------------------------------------------------------------- writes --- */

const now = () => new Date().toISOString()

export function insertItem(item: Item): void {
  db.prepare(
    `INSERT INTO items (id, name, brand, photo, reference_url, created_at)
     VALUES (@id, @name, @brand, @photo, @reference_url, @created_at)`,
  ).run({
    id: item.id,
    name: item.name,
    brand: item.brand,
    photo: item.photo,
    reference_url: sanitizeUrl(item.referenceUrl) ?? null,
    created_at: now(),
  })
  const insertSize = db.prepare(
    `INSERT INTO sizes (id, item_id, size_label, status, cost, sale_price, note, created_at)
     VALUES (@id, @item_id, @size_label, @status, @cost, @sale_price, @note, @created_at)`,
  )
  for (const s of item.sizes) {
    insertSize.run({
      id: s.id,
      item_id: item.id,
      size_label: s.sizeLabel,
      status: s.status,
      cost: numberOr0(s.cost),
      sale_price: numberOr0(s.salePrice),
      note: s.note,
      created_at: now(),
    })
  }
}

export function updateItem(
  id: string,
  patch: Partial<Pick<Item, 'name' | 'brand' | 'photo' | 'referenceUrl'>>,
): void {
  const current = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as
    | ItemRow
    | undefined
  if (!current) throw new HttpError(404, 'Item not found')
  db.prepare(
    `UPDATE items SET name = @name, brand = @brand, photo = @photo,
       reference_url = @reference_url WHERE id = @id`,
  ).run({
    id,
    name: patch.name ?? current.name,
    brand: patch.brand ?? current.brand,
    photo: patch.photo ?? current.photo,
    reference_url:
      patch.referenceUrl !== undefined
        ? (sanitizeUrl(patch.referenceUrl) ?? null)
        : current.reference_url,
  })
}

export function deleteItem(id: string): void {
  const info = db.prepare('DELETE FROM items WHERE id = ?').run(id)
  if (info.changes === 0) throw new HttpError(404, 'Item not found')
}

export function insertSize(itemId: string, size: SizeEntry): void {
  const item = db.prepare('SELECT id FROM items WHERE id = ?').get(itemId)
  if (!item) throw new HttpError(404, 'Item not found')
  db.prepare(
    `INSERT INTO sizes (id, item_id, size_label, status, cost, sale_price, note, created_at)
     VALUES (@id, @item_id, @size_label, @status, @cost, @sale_price, @note, @created_at)`,
  ).run({
    id: size.id,
    item_id: itemId,
    size_label: size.sizeLabel,
    status: size.status,
    cost: numberOr0(size.cost),
    sale_price: numberOr0(size.salePrice),
    note: size.note,
    created_at: now(),
  })
}

export function updateSize(id: string, patch: Partial<SizeEntry>): void {
  const current = db.prepare('SELECT * FROM sizes WHERE id = ?').get(id) as
    | SizeRow
    | undefined
  if (!current) throw new HttpError(404, 'Size not found')
  db.prepare(
    `UPDATE sizes SET size_label = @size_label, status = @status, cost = @cost,
       sale_price = @sale_price, note = @note WHERE id = @id`,
  ).run({
    id,
    size_label: patch.sizeLabel ?? current.size_label,
    status: patch.status ?? current.status,
    cost: patch.cost !== undefined ? numberOr0(patch.cost) : current.cost,
    sale_price:
      patch.salePrice !== undefined
        ? numberOr0(patch.salePrice)
        : current.sale_price,
    note: patch.note ?? current.note,
  })
}

export function deleteSize(id: string): void {
  const info = db.prepare('DELETE FROM sizes WHERE id = ?').run(id)
  if (info.changes === 0) throw new HttpError(404, 'Size not found')
}

/**
 * Insert a sale AND flip the referenced size to Sold in one transaction — the
 * core inventory-sync rule. Either both happen or neither does.
 */
export const insertSale = db.transaction((sale: Sale) => {
  const size = db
    .prepare('SELECT id, item_id FROM sizes WHERE id = ?')
    .get(sale.sizeId) as { id: string; item_id: string } | undefined
  if (!size) throw new HttpError(404, 'Referenced size not found')
  if (size.item_id !== sale.itemId) {
    throw new HttpError(400, 'Size does not belong to the referenced item')
  }
  db.prepare(
    `INSERT INTO sales (id, item_id, size_id, buyer_name, fulfillment, datetime,
       sale_price, paid, notes, created_at)
     VALUES (@id, @item_id, @size_id, @buyer_name, @fulfillment, @datetime,
       @sale_price, @paid, @notes, @created_at)`,
  ).run({
    id: sale.id,
    item_id: sale.itemId,
    size_id: sale.sizeId,
    buyer_name: sale.buyerName,
    fulfillment: sale.fulfillment,
    datetime: sale.datetime,
    sale_price: numberOr0(sale.salePrice),
    paid: sale.paid,
    notes: sale.notes,
    created_at: now(),
  })
  // Inventory stays in sync: this specific unit is now Sold.
  db.prepare('UPDATE sizes SET status = ? WHERE id = ?').run('Sold', sale.sizeId)
})

export function updateSale(id: string, patch: Partial<Sale>): void {
  const current = db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as
    | SaleRow
    | undefined
  if (!current) throw new HttpError(404, 'Sale not found')
  db.prepare(
    `UPDATE sales SET buyer_name = @buyer_name, fulfillment = @fulfillment,
       datetime = @datetime, sale_price = @sale_price, paid = @paid,
       notes = @notes WHERE id = @id`,
  ).run({
    id,
    buyer_name: patch.buyerName ?? current.buyer_name,
    fulfillment: patch.fulfillment ?? current.fulfillment,
    datetime: patch.datetime ?? current.datetime,
    sale_price:
      patch.salePrice !== undefined
        ? numberOr0(patch.salePrice)
        : current.sale_price,
    paid: patch.paid ?? current.paid,
    notes: patch.notes ?? current.notes,
  })
}

export function deleteSale(id: string): void {
  const info = db.prepare('DELETE FROM sales WHERE id = ?').run(id)
  if (info.changes === 0) throw new HttpError(404, 'Sale not found')
}

/** Wholesale replace (Restore). Transactional: all-or-nothing. */
export const replaceState = db.transaction((state: AppState) => {
  db.prepare('DELETE FROM sales').run()
  db.prepare('DELETE FROM sizes').run()
  db.prepare('DELETE FROM items').run()
  for (const item of state.items) insertItem(item)
  const insertSaleRow = db.prepare(
    `INSERT INTO sales (id, item_id, size_id, buyer_name, fulfillment, datetime,
       sale_price, paid, notes, created_at)
     VALUES (@id, @item_id, @size_id, @buyer_name, @fulfillment, @datetime,
       @sale_price, @paid, @notes, @created_at)`,
  )
  for (const sale of state.sales) {
    insertSaleRow.run({
      id: sale.id,
      item_id: sale.itemId,
      size_id: sale.sizeId,
      buyer_name: sale.buyerName,
      fulfillment: sale.fulfillment,
      datetime: sale.datetime,
      sale_price: numberOr0(sale.salePrice),
      paid: sale.paid,
      notes: sale.notes,
      created_at: now(),
    })
  }
})

export function seedState(state: AppState): void {
  replaceState(state)
}

/** Small typed error so routes can map to HTTP status codes cleanly. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
