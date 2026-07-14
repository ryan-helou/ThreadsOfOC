import { useState, type KeyboardEvent } from 'react'
import type { Item } from '../../shared/types.ts'
import { sanitizeUrl } from '../../shared/helpers.ts'
import { useStore } from '../store/store.tsx'
import { fileToDataUrl } from '../lib/image.ts'
import { SizeBubble } from './Chip.tsx'

export function ItemCard({ item, onEdit }: { item: Item; onEdit: (item: Item) => void }) {
  const { updateItem, deleteItem, notify } = useStore()
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(item.name)
  const ref = sanitizeUrl(item.referenceUrl)

  async function commitName() {
    setEditingName(false)
    const next = draftName.trim()
    if (next && next !== item.name) await updateItem(item.id, { name: next })
    else setDraftName(item.name)
  }

  function onNameKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void commitName()
    if (e.key === 'Escape') {
      setDraftName(item.name)
      setEditingName(false)
    }
  }

  async function onReplacePhoto(file: File | undefined) {
    if (!file) return
    try {
      const photo = await fileToDataUrl(file)
      await updateItem(item.id, { photo })
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not load image', 'error')
    }
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-line-strong hover:shadow-lift">
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        {item.photo ? (
          <img
            src={item.photo}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm font-medium text-muted">
            No photo
          </div>
        )}

        {/* Scrim for chip legibility over busy photos. */}
        {item.sizes.length > 0 && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />
            <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex flex-wrap gap-1">
              {item.sizes.map((s) => (
                <SizeBubble key={s.id} sizeLabel={s.sizeLabel} status={s.status} />
              ))}
            </div>
          </>
        )}

        {/* Hover actions. */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <label className="cursor-pointer rounded-md bg-ink/90 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur transition hover:bg-black">
            Photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onReplacePhoto(e.target.files?.[0])}
            />
          </label>
          <button
            onClick={() => onEdit(item)}
            className="rounded-md bg-ink/90 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur transition hover:bg-black"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="flex items-center gap-2">
          <span className="eyebrow text-[0.625rem]">{item.brand || 'Unbranded'}</span>
          {ref && (
            <a
              href={ref}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[11px] font-bold uppercase tracking-wide text-ink-soft underline decoration-dotted underline-offset-2 transition hover:text-ink"
            >
              reference ↗
            </a>
          )}
        </div>

        {editingName ? (
          <input
            value={draftName}
            autoFocus
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={onNameKey}
            className="w-full rounded border border-line-strong bg-surface px-1.5 py-0.5 font-display text-lg font-semibold uppercase outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraftName(item.name)
              setEditingName(true)
            }}
            title="Click to rename"
            className="text-left font-display text-lg font-semibold uppercase leading-tight text-ink decoration-dotted underline-offset-4 hover:underline"
          >
            {item.name || 'Untitled'}
          </button>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-line pt-2.5">
          <span className="text-xs font-medium text-muted">
            {item.sizes.length} size{item.sizes.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => {
              if (window.confirm(`Delete “${item.name}” and all its sizes?`)) {
                void deleteItem(item.id)
              }
            }}
            className="text-[11px] font-bold uppercase tracking-wide text-muted transition hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}
