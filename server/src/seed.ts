/**
 * First-run seed data, built from the reseller's Drive photos (bundled under
 * /public/seed). Only inserted when the database is empty, so it never clobbers
 * real data on redeploy.
 */
import type { AppState, Availability, Item, Sale, SizeEntry } from '../../shared/types.ts'
import { generateId } from '../../shared/helpers.ts'

interface SeedSize {
  size: string
  status: Availability
  cost: number
  sale: number
  soldTo?: string
  note?: string
}

function makeItem(
  name: string,
  brand: string,
  photo: string,
  sizes: SeedSize[],
  referenceUrl?: string,
): Item {
  const sizeEntries: SizeEntry[] = sizes.map((s) => ({
    id: generateId('size'),
    sizeLabel: s.size,
    status: s.status,
    cost: s.cost,
    salePrice: s.sale,
    soldTo: s.soldTo ?? '',
    note: s.note ?? '',
  }))
  return {
    id: generateId('item'),
    name,
    brand,
    photo,
    referenceUrl,
    sizes: sizeEntries,
  }
}

export function buildSeedState(): AppState {
  const items: Item[] = [
    makeItem('Black Denim Tears Shorts', 'Denim Tears', '/seed/black-denim-tears-short.jpg', [
      { size: 'M', status: 'Available', cost: 120, sale: 220 },
      { size: 'L', status: 'Pending', cost: 120, sale: 230 },
    ]),
    makeItem('Grey Denim Tears Shorts', 'Denim Tears', '/seed/grey-denim-tears-shorts.jpg', [
      { size: 'S', status: 'Available', cost: 115, sale: 210 },
      { size: 'M', status: 'Sold', cost: 115, sale: 225, soldTo: 'Marcus O.', note: 'Sold at pop-up' },
    ]),
    makeItem('Navy Denim Tears Shorts', 'Denim Tears', '/seed/navy-denim-tears-shorts.jpg', [
      { size: 'L', status: 'Available', cost: 118, sale: 215 },
    ]),
    makeItem('Bape Black Text Tee', 'Bape', '/seed/bape-black-writing.jpg', [
      { size: 'M', status: 'Available', cost: 85, sale: 160 },
      { size: 'L', status: 'Available', cost: 85, sale: 160 },
    ]),
    makeItem('Hellstar Spiral B/W Tee', 'Hellstar', '/seed/hellstar-spiral-bw.jpg', [
      { size: 'S', status: 'Sold', cost: 60, sale: 130, soldTo: 'Dee (IG)', note: 'Instagram buyer' },
      { size: 'M', status: 'Available', cost: 60, sale: 135 },
      { size: 'L', status: 'Pending', cost: 60, sale: 140 },
    ]),
    makeItem('Hellstar Sport B/W Tee', 'Hellstar', '/seed/hellstar-sport-bw.jpg', [
      { size: 'M', status: 'Available', cost: 65, sale: 140 },
    ]),
    makeItem('Bape Black Camo Tee', 'Bape', '/seed/bape-black-camo.jpg', [
      { size: 'L', status: 'Available', cost: 90, sale: 175 },
      { size: 'XL', status: 'Available', cost: 90, sale: 175 },
    ]),
    makeItem('Hellstar Metallic Tee', 'Hellstar', '/seed/hellstar-metallic.jpg', [
      { size: 'M', status: 'Sold', cost: 70, sale: 155, soldTo: 'Jayden R.', note: 'Delivered locally' },
    ]),
    makeItem('Bape White Logo Tee', 'Bape', '/seed/bape-white-black-logo.jpg', [
      { size: 'S', status: 'Available', cost: 80, sale: 150 },
      { size: 'M', status: 'Available', cost: 80, sale: 150 },
    ]),
    makeItem('Burberry x Bape Tee', 'Bape', '/seed/burberry-bape.jpg', [
      { size: 'M', status: 'Pending', cost: 140, sale: 260 },
    ]),
    makeItem('Hellstar Blue/Black Tee', 'Hellstar', '/seed/hellstar-blue-black.jpg', [
      { size: 'L', status: 'Available', cost: 62, sale: 135 },
    ]),
    makeItem('Bape Classic Tee', 'Bape', '/seed/bape-classic.jpg', [
      { size: 'M', status: 'Available', cost: 78, sale: 145 },
      { size: 'L', status: 'Sold', cost: 78, sale: 150, soldTo: 'Marcus O.', note: 'Repeat customer' },
    ]),
    makeItem('Bape White Text Tee', 'Bape', '/seed/bape-white-black-writing.jpg', [
      { size: 'S', status: 'Available', cost: 82, sale: 155 },
    ]),
  ]

  // Give each already-sold unit a dated sale record so the Finances dashboard
  // has real history to chart. Dates are fixed for a deterministic demo.
  const soldDates = [
    '2026-03-08T15:00',
    '2026-04-22T18:30',
    '2026-05-14T13:00',
    '2026-06-27T17:15',
  ]
  const sales: Sale[] = []
  let i = 0
  for (const item of items) {
    for (const size of item.sizes) {
      if (size.status !== 'Sold') continue
      sales.push({
        id: generateId('sale'),
        itemId: item.id,
        sizeId: size.id,
        buyerName: size.soldTo,
        fulfillment: i % 2 === 0 ? 'Pickup' : 'Delivery',
        datetime: soldDates[i % soldDates.length],
        salePrice: size.salePrice,
        paid: i % 3 === 0 ? 'Not yet' : 'Paid',
        notes: size.note,
      })
      i++
    }
  }

  return { items, sales }
}
