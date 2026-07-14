import { useState, type FormEvent } from 'react'
import type { Availability, Item } from '../../shared/types.ts'
import { AVAILABILITY } from '../../shared/types.ts'
import { sanitizeUrl } from '../../shared/helpers.ts'
import { useStore } from '../store/store.tsx'
import { fileToDataUrl } from '../lib/image.ts'
import { Button, Field, Modal, Select, TextInput } from './ui.tsx'

/** Create a new item, or edit an existing one's core details. */
export function ItemFormModal({
  existing,
  onClose,
}: {
  existing?: Item
  onClose: () => void
}) {
  const { createItem, updateItem, notify, busy } = useStore()
  const editing = Boolean(existing)

  const [name, setName] = useState(existing?.name ?? '')
  const [brand, setBrand] = useState(existing?.brand ?? '')
  const [referenceUrl, setReferenceUrl] = useState(existing?.referenceUrl ?? '')
  const [photo, setPhoto] = useState(existing?.photo ?? '')

  // Create-only: one starting size unit.
  const [sizeLabel, setSizeLabel] = useState('M')
  const [status, setStatus] = useState<Availability>('Available')
  const [cost, setCost] = useState('')
  const [salePrice, setSalePrice] = useState('')

  async function onPickPhoto(file: File | undefined) {
    if (!file) return
    try {
      setPhoto(await fileToDataUrl(file))
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not load image', 'error')
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      notify('Give the item a name.', 'error')
      return
    }
    if (referenceUrl.trim() && !sanitizeUrl(referenceUrl)) {
      notify('Reference must be a valid http(s) link.', 'error')
      return
    }

    let okDone = false
    if (editing && existing) {
      okDone = await updateItem(existing.id, {
        name: name.trim(),
        brand: brand.trim(),
        referenceUrl: referenceUrl.trim(),
        ...(photo !== existing.photo && { photo }),
      })
    } else {
      okDone = await createItem({
        name: name.trim(),
        brand: brand.trim(),
        photo,
        referenceUrl: referenceUrl.trim() || undefined,
        sizes: [
          {
            sizeLabel: sizeLabel.trim(),
            status,
            cost: Number(cost) || 0,
            salePrice: Number(salePrice) || 0,
            note: '',
          },
        ],
      })
    }
    if (okDone) onClose()
  }

  return (
    <Modal
      title={editing ? 'Edit item' : 'New item'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="item-form" disabled={busy}>
            {editing ? 'Save' : 'Add item'}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={onSubmit} className="space-y-4">
        <div className="flex gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2">
            {photo ? (
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-xs text-muted">
                No photo
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <label className="cursor-pointer">
              <span className="inline-flex items-center rounded-md border border-line-strong bg-surface px-3 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-surface-2">
                {photo ? 'Replace photo' : 'Add photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickPhoto(e.target.files?.[0])}
              />
            </label>
            <span className="mt-1 text-xs text-muted">JP/PNG, auto-resized.</span>
          </div>
        </div>

        <Field label="Name">
          <TextInput
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Hellstar Spiral Tee"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand / label">
            <TextInput
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Hellstar"
            />
          </Field>
          <Field label="Reference URL" hint="Optional listing link">
            <TextInput
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>

        {!editing && (
          <fieldset className="rounded-lg border border-line p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              First size unit
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Size">
                <TextInput value={sizeLabel} onChange={(e) => setSizeLabel(e.target.value)} />
              </Field>
              <Field label="Status">
                <Select value={status} onChange={(e) => setStatus(e.target.value as Availability)}>
                  {AVAILABILITY.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Cost">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Sale $">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
          </fieldset>
        )}
      </form>
    </Modal>
  )
}
