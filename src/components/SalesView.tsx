import { useMemo, useState } from 'react'
import type { PaidStatus, Sale } from '../../shared/types.ts'
import { PAID_STATUS } from '../../shared/types.ts'
import { useStore } from '../store/store.tsx'
import { formatDateTime, money } from '../lib/format.ts'
import { Button, Select } from './ui.tsx'
import { SaleFormModal } from './SaleFormModal.tsx'

export function SalesView() {
  const { state } = useStore()
  const [creating, setCreating] = useState(false)

  // Resolve item/size labels once for display.
  const labelFor = useMemo(() => {
    const map = new Map<string, { item: string; size: string; photo: string }>()
    for (const item of state.items) {
      for (const size of item.sizes) {
        map.set(size.id, { item: item.name, size: size.sizeLabel, photo: item.photo })
      }
    }
    return map
  }, [state.items])

  return (
    <section>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">
            Fulfillment · {state.sales.length} logged
          </p>
          <h1 className="font-poster text-5xl uppercase sm:text-6xl">Sales &amp; Delivery</h1>
        </div>
        <Button onClick={() => setCreating(true)}>+ New Sale</Button>
      </header>

      {state.sales.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line py-20 text-center">
          <p className="mb-3 font-display text-xl font-semibold uppercase text-ink-soft">
            No sales yet
          </p>
          <p className="mb-5 max-w-sm text-sm text-muted">
            Log a sale to mark inventory as sold and track pickups &amp; deliveries.
          </p>
          <Button onClick={() => setCreating(true)}>+ New Sale</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.sales
            .slice()
            .reverse()
            .map((sale) => (
              <SaleCard
                key={sale.id}
                sale={sale}
                label={labelFor.get(sale.sizeId)}
              />
            ))}
        </div>
      )}

      {creating && <SaleFormModal onClose={() => setCreating(false)} />}
    </section>
  )
}

function SaleCard({
  sale,
  label,
}: {
  sale: Sale
  label?: { item: string; size: string; photo: string }
}) {
  const { updateSale, deleteSale } = useStore()
  const paidTone =
    sale.paid === 'Paid'
      ? 'bg-avail-bg text-avail border-avail/25'
      : 'bg-pending-bg text-pending border-pending/25'

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex items-center gap-3 border-b border-line p-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
          {label?.photo ? (
            <img src={label.photo} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-semibold uppercase leading-tight">
            {label?.item ?? 'Unknown item'}
          </div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted">
            <span className="font-mono">{label?.size || '—'}</span> · {sale.fulfillment}
          </div>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${paidTone}`}>
          {sale.paid === 'Paid' ? 'Paid' : 'Unpaid'}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 p-3 text-sm">
        <Row label="Buyer" value={sale.buyerName || '—'} />
        <Row label="Price" value={money(sale.salePrice)} mono />
        <Row label={sale.fulfillment} value={formatDateTime(sale.datetime)} mono />
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Paid?</dt>
          <dd>
            <Select
              value={sale.paid}
              onChange={(e) => updateSale(sale.id, { paid: e.target.value as PaidStatus })}
              className="mt-0.5 py-1 text-xs"
            >
              {PAID_STATUS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </dd>
        </div>
      </dl>

      {sale.notes && (
        <p className="border-t border-line px-3 py-2 text-sm text-ink-soft">{sale.notes}</p>
      )}

      <div className="mt-auto flex justify-end border-t border-line px-3 py-2">
        <button
          onClick={() => {
            if (window.confirm('Remove this sale? (Inventory status is not changed back.)')) {
              void deleteSale(sale.id)
            }
          }}
          className="text-xs font-semibold uppercase tracking-wide text-muted hover:text-red-600"
        >
          Delete
        </button>
      </div>
    </article>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className={`text-ink ${mono ? 'font-mono text-[13px] font-bold' : 'font-medium'}`}>
        {value}
      </dd>
    </div>
  )
}
