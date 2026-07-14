import { useMemo, useState, type FormEvent } from 'react'
import type { Fulfillment, PaidStatus } from '../../shared/types.ts'
import { FULFILLMENT, PAID_STATUS } from '../../shared/types.ts'
import { validateSaleFinancials } from '../../shared/helpers.ts'
import { useStore } from '../store/store.tsx'
import { Button, Field, Modal, SelectMenu, TextInput, Textarea } from './ui.tsx'

interface Sellable {
  itemId: string
  sizeId: string
  label: string
  cost: number
  salePrice: number
}

export function SaleFormModal({ onClose }: { onClose: () => void }) {
  const { state, createSale, notify, busy } = useStore()

  // Selector options come from current inventory (units not yet Sold).
  const sellable = useMemo<Sellable[]>(() => {
    const out: Sellable[] = []
    for (const item of state.items) {
      for (const size of item.sizes) {
        if (size.status === 'Sold') continue
        out.push({
          itemId: item.id,
          sizeId: size.id,
          label: `${item.name} · ${size.sizeLabel || '—'} (${size.status})`,
          cost: size.cost,
          salePrice: size.salePrice,
        })
      }
    }
    return out
  }, [state.items])

  const [sizeId, setSizeId] = useState('')
  const [fulfillment, setFulfillment] = useState<Fulfillment>('Pickup')
  const [buyerName, setBuyerName] = useState('')
  const [datetime, setDatetime] = useState('')
  const [cost, setCost] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [paid, setPaid] = useState<PaidStatus>('Not yet')
  const [notes, setNotes] = useState('')

  const selected = sellable.find((s) => s.sizeId === sizeId)

  function onSelect(id: string) {
    setSizeId(id)
    const s = sellable.find((x) => x.sizeId === id)
    if (s) {
      // Prefill from the unit's recorded numbers so profit is never $0 by default.
      if (s.cost) setCost(String(s.cost))
      if (s.salePrice) setSalePrice(String(s.salePrice))
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selected) {
      notify('Pick an item + size to sell.', 'error')
      return
    }
    const check = validateSaleFinancials({ cost, salePrice })
    if (!check.ok) {
      notify(check.errors.join(' '), 'error')
      return
    }
    const ok = await createSale({
      itemId: selected.itemId,
      sizeId: selected.sizeId,
      buyerName: buyerName.trim(),
      fulfillment,
      datetime,
      salePrice: Number(salePrice),
      cost: Number(cost),
      paid,
      notes: notes.trim(),
    })
    if (ok) onClose()
  }

  return (
    <Modal
      title="New sale"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="sale-form" disabled={busy}>
            Log sale
          </Button>
        </>
      }
    >
      <form id="sale-form" onSubmit={onSubmit} className="space-y-4">
        {/* Fulfillment toggle */}
        <div className="flex gap-2">
          {FULFILLMENT.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFulfillment(f)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold uppercase tracking-wide transition ${
                fulfillment === f
                  ? 'border-ink bg-ink text-white'
                  : 'border-line bg-surface text-ink-soft hover:border-ink-soft'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <Field label="Item + size" hint={sellable.length ? undefined : 'No unsold units available.'}>
          <SelectMenu
            value={sizeId}
            onChange={onSelect}
            placeholder="Select a unit…"
            ariaLabel="Item + size"
            options={sellable.map((s) => ({ value: s.sizeId, label: s.label }))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Buyer name">
            <TextInput value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Buyer" />
          </Field>
          <Field label={`${fulfillment} date & time`}>
            <TextInput type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Cost" hint="Required">
            <TextInput
              type="number"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Sale price" hint="Required">
            <TextInput
              type="number"
              inputMode="decimal"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Paid?">
            <SelectMenu
              value={paid}
              onChange={(v) => setPaid(v as PaidStatus)}
              ariaLabel="Paid?"
              options={PAID_STATUS.map((p) => ({ value: p, label: p }))}
            />
          </Field>
        </div>

        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Meeting spot, deposit, etc." />
        </Field>

        <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-muted">
          Logging this sale marks the selected size as <strong>Sold</strong> automatically.
        </p>
      </form>
    </Modal>
  )
}
