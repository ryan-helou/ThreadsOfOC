/**
 * Single-service entry point. One Express app both serves the built React
 * client (in production) and exposes the JSON API. Keeping it to one service
 * keeps the Railway footprint — and bill — minimal.
 */
import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { AppState, Item, Sale, SizeEntry } from '../../shared/types.ts'
import {
  AVAILABILITY,
  FULFILLMENT,
  PAID_STATUS,
  BACKUP_VERSION,
} from '../../shared/types.ts'
import { generateId, validateSaleFinancials } from '../../shared/helpers.ts'
import {
  HttpError,
  deleteItem,
  deleteSale,
  deleteSize,
  insertItem,
  insertSale,
  insertSize,
  isEmpty,
  readState,
  replaceState,
  seedState,
  updateItem,
  updateSale,
  updateSize,
} from './db.ts'
import { login, requireAuth } from './auth.ts'
import { buildSeedState } from './seed.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3001
const IS_PROD = process.env.NODE_ENV === 'production'

// Seed once, only when the store is empty.
if (isEmpty()) {
  seedState(buildSeedState())
  // eslint-disable-next-line no-console
  console.log('[seed] Empty database — inserted starter inventory.')
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '20mb' })) // photos travel as data: URIs

/* --------------------------------------------------- validation guards --- */

function str(v: unknown, field: string, { max = 2000, allowEmpty = true } = {}): string {
  if (typeof v !== 'string') throw new HttpError(400, `${field} must be a string`)
  const t = v.trim()
  if (!allowEmpty && !t) throw new HttpError(400, `${field} is required`)
  if (t.length > max) throw new HttpError(400, `${field} is too long`)
  return t
}
function oneOf<T extends readonly string[]>(v: unknown, allowed: T, field: string): T[number] {
  if (typeof v !== 'string' || !allowed.includes(v)) {
    throw new HttpError(400, `${field} must be one of: ${allowed.join(', ')}`)
  }
  return v as T[number]
}
function money(v: unknown, field: string): number {
  const n = Number(v)
  if (v === '' || v === null || v === undefined || !Number.isFinite(n)) {
    throw new HttpError(400, `${field} must be a number`)
  }
  return n
}

function parseSize(body: Record<string, unknown>): SizeEntry {
  return {
    id: generateId('size'),
    sizeLabel: str(body.sizeLabel, 'Size', { max: 20 }),
    status: oneOf(body.status ?? 'Available', AVAILABILITY, 'Status'),
    cost: money(body.cost ?? 0, 'Cost'),
    salePrice: money(body.salePrice ?? 0, 'Sale price'),
    note: str(body.note ?? '', 'Note'),
  }
}

/* ------------------------------------------------------------- routes --- */

const ok = (res: Response) => res.json({ state: readState() })

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: BACKUP_VERSION })
})

app.post('/api/login', (req, res, next) => {
  try {
    const password = str(req.body?.password, 'Password', { allowEmpty: false })
    res.json({ token: login(password) })
  } catch (err) {
    next(err)
  }
})

// Everything below requires a valid session token.
const api = express.Router()
api.use(requireAuth)

api.get('/state', (_req, res) => ok(res))

api.post('/items', (req, res) => {
  const b = req.body ?? {}
  const rawSizes = Array.isArray(b.sizes) ? b.sizes : []
  const item: Item = {
    id: generateId('item'),
    name: str(b.name, 'Name', { max: 200, allowEmpty: false }),
    brand: str(b.brand ?? '', 'Brand', { max: 100 }),
    photo: str(b.photo ?? '', 'Photo', { max: 5_000_000 }),
    referenceUrl: b.referenceUrl ? str(b.referenceUrl, 'Reference URL', { max: 2000 }) : undefined,
    sizes: rawSizes.map((s: Record<string, unknown>) => parseSize(s)),
  }
  insertItem(item)
  ok(res)
})

api.patch('/items/:id', (req, res) => {
  const b = req.body ?? {}
  updateItem(req.params.id, {
    ...(b.name !== undefined && { name: str(b.name, 'Name', { max: 200, allowEmpty: false }) }),
    ...(b.brand !== undefined && { brand: str(b.brand, 'Brand', { max: 100 }) }),
    ...(b.photo !== undefined && { photo: str(b.photo, 'Photo', { max: 5_000_000 }) }),
    ...(b.referenceUrl !== undefined && {
      referenceUrl: str(b.referenceUrl, 'Reference URL', { max: 2000 }),
    }),
  })
  ok(res)
})

api.delete('/items/:id', (req, res) => {
  deleteItem(req.params.id)
  ok(res)
})

api.post('/items/:id/sizes', (req, res) => {
  insertSize(req.params.id, parseSize(req.body ?? {}))
  ok(res)
})

api.patch('/sizes/:id', (req, res) => {
  const b = req.body ?? {}
  updateSize(req.params.id, {
    ...(b.sizeLabel !== undefined && { sizeLabel: str(b.sizeLabel, 'Size', { max: 20 }) }),
    ...(b.status !== undefined && { status: oneOf(b.status, AVAILABILITY, 'Status') }),
    ...(b.cost !== undefined && { cost: money(b.cost, 'Cost') }),
    ...(b.salePrice !== undefined && { salePrice: money(b.salePrice, 'Sale price') }),
    ...(b.note !== undefined && { note: str(b.note, 'Note') }),
  })
  ok(res)
})

api.delete('/sizes/:id', (req, res) => {
  deleteSize(req.params.id)
  ok(res)
})

api.post('/sales', (req, res) => {
  const b = req.body ?? {}
  // The old-app bug fix: a sale cannot be logged without real cost + sale numbers.
  const check = validateSaleFinancials({ cost: b.cost, salePrice: b.salePrice })
  if (!check.ok) throw new HttpError(400, check.errors.join(' '))

  const sale: Sale = {
    id: generateId('sale'),
    itemId: str(b.itemId, 'Item', { allowEmpty: false }),
    sizeId: str(b.sizeId, 'Size', { allowEmpty: false }),
    buyerName: str(b.buyerName ?? '', 'Buyer name', { max: 200 }),
    fulfillment: oneOf(b.fulfillment ?? 'Pickup', FULFILLMENT, 'Fulfillment'),
    datetime: str(b.datetime ?? '', 'Datetime', { max: 40 }),
    salePrice: money(b.salePrice, 'Sale price'),
    paid: oneOf(b.paid ?? 'Not yet', PAID_STATUS, 'Paid status'),
    notes: str(b.notes ?? '', 'Notes'),
  }
  // Keep the size's own cost/sale in sync with what the sale recorded, so the
  // grid's realized-profit math matches the sale.
  updateSize(sale.sizeId, { cost: money(b.cost, 'Cost'), salePrice: sale.salePrice })
  insertSale(sale) // flips the size to Sold in one transaction
  ok(res)
})

api.patch('/sales/:id', (req, res) => {
  const b = req.body ?? {}
  updateSale(req.params.id, {
    ...(b.buyerName !== undefined && { buyerName: str(b.buyerName, 'Buyer name', { max: 200 }) }),
    ...(b.fulfillment !== undefined && { fulfillment: oneOf(b.fulfillment, FULFILLMENT, 'Fulfillment') }),
    ...(b.datetime !== undefined && { datetime: str(b.datetime, 'Datetime', { max: 40 }) }),
    ...(b.salePrice !== undefined && { salePrice: money(b.salePrice, 'Sale price') }),
    ...(b.paid !== undefined && { paid: oneOf(b.paid, PAID_STATUS, 'Paid status') }),
    ...(b.notes !== undefined && { notes: str(b.notes, 'Notes') }),
  })
  ok(res)
})

api.delete('/sales/:id', (req, res) => {
  deleteSale(req.params.id)
  ok(res)
})

// Restore: replace the whole authoritative state from a backup file.
api.put('/state', (req, res) => {
  const b = req.body ?? {}
  if (!Array.isArray(b.items) || !Array.isArray(b.sales)) {
    throw new HttpError(400, 'Backup must contain items[] and sales[] arrays')
  }
  const state: AppState = {
    items: (b.items as Item[]).map((it) => ({
      id: str(it.id ?? generateId('item'), 'Item id'),
      name: str(it.name ?? '', 'Name', { max: 200 }),
      brand: str(it.brand ?? '', 'Brand', { max: 100 }),
      photo: str(it.photo ?? '', 'Photo', { max: 5_000_000 }),
      referenceUrl: it.referenceUrl ? str(it.referenceUrl, 'Reference URL') : undefined,
      sizes: (Array.isArray(it.sizes) ? it.sizes : []).map((s: SizeEntry) => ({
        id: str(s.id ?? generateId('size'), 'Size id'),
        sizeLabel: str(s.sizeLabel ?? '', 'Size', { max: 20 }),
        status: oneOf(s.status ?? 'Available', AVAILABILITY, 'Status'),
        cost: money(s.cost ?? 0, 'Cost'),
        salePrice: money(s.salePrice ?? 0, 'Sale price'),
        note: str(s.note ?? '', 'Note'),
      })),
    })),
    sales: (b.sales as Sale[]).map((s) => ({
      id: str(s.id ?? generateId('sale'), 'Sale id'),
      itemId: str(s.itemId ?? '', 'Item'),
      sizeId: str(s.sizeId ?? '', 'Size'),
      buyerName: str(s.buyerName ?? '', 'Buyer name', { max: 200 }),
      fulfillment: oneOf(s.fulfillment ?? 'Pickup', FULFILLMENT, 'Fulfillment'),
      datetime: str(s.datetime ?? '', 'Datetime', { max: 40 }),
      salePrice: money(s.salePrice ?? 0, 'Sale price'),
      paid: oneOf(s.paid ?? 'Not yet', PAID_STATUS, 'Paid status'),
      notes: str(s.notes ?? '', 'Notes'),
    })),
  }
  replaceState(state)
  ok(res)
})

app.use('/api', api)

/* -------------------------------------------------- static + fallback --- */

if (IS_PROD) {
  const clientDir = join(__dirname, '../../dist')
  if (existsSync(clientDir)) {
    app.use(express.static(clientDir))
    // SPA fallback for any non-API route.
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(join(clientDir, 'index.html'))
    })
  } else {
    // eslint-disable-next-line no-console
    console.warn('[static] dist/ not found — run `npm run build` before start.')
  }
}

/* ------------------------------------------------------ error handler --- */

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof HttpError ? err.status : 500
  const message = err instanceof Error ? err.message : 'Unexpected error'
  if (status >= 500) console.error('[error]', err)
  res.status(status).json({ error: message })
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on :${PORT} (${IS_PROD ? 'production' : 'dev'})`)
})
