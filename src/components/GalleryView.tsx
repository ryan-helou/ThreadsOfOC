import { useRef, useState, type ChangeEvent } from 'react'
import type { Item } from '../../shared/types.ts'
import { useStore } from '../store/store.tsx'
import { fileToDataUrl } from '../lib/image.ts'
import { Button } from './ui.tsx'
import { ItemCard } from './ItemCard.tsx'
import { ItemFormModal } from './ItemFormModal.tsx'

export function GalleryView() {
  const { state, createItem, notify, busy } = useStore()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const bulkRef = useRef<HTMLInputElement>(null)

  /** Bulk "Add Photo": each selected image becomes a new draft item. */
  async function onBulkPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    let added = 0
    for (const file of files) {
      try {
        const photo = await fileToDataUrl(file)
        const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
        const ok = await createItem({
          name: name || 'New item',
          brand: '',
          photo,
          sizes: [{ sizeLabel: 'M', status: 'Available', cost: 0, salePrice: 0, note: '' }],
        })
        if (ok) added++
      } catch {
        /* skip unreadable files */
      }
    }
    notify(`Added ${added} item${added === 1 ? '' : 's'} from photos.`, added ? 'success' : 'error')
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
            My Clothes
          </h1>
          <p className="text-sm text-muted">
            {state.items.length} item{state.items.length === 1 ? '' : 's'} in the gallery
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => bulkRef.current?.click()} disabled={busy}>
            + Add Photos
          </Button>
          <Button onClick={() => setCreating(true)}>+ New Item</Button>
          <input
            ref={bulkRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onBulkPhotos}
          />
        </div>
      </div>

      {state.items.length === 0 ? (
        <EmptyState onNew={() => setCreating(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {state.items.map((item) => (
            <ItemCard key={item.id} item={item} onEdit={setEditing} />
          ))}
        </div>
      )}

      {creating && <ItemFormModal onClose={() => setCreating(false)} />}
      {editing && <ItemFormModal existing={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-line py-20 text-center">
      <p className="mb-3 font-display text-xl font-semibold uppercase text-ink-soft">
        No items yet
      </p>
      <p className="mb-5 max-w-sm text-sm text-muted">
        Add your first piece, or drop in a batch of photos to create items fast.
      </p>
      <Button onClick={onNew}>+ New Item</Button>
    </div>
  )
}
