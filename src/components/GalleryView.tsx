import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import type { Item } from '../../shared/types.ts'
import { useStore } from '../store/store.tsx'
import { fileToDataUrl } from '../lib/image.ts'
import { Button } from './ui.tsx'
import { ItemCard } from './ItemCard.tsx'
import { ItemFormModal } from './ItemFormModal.tsx'

export function GalleryView() {
  const { state, createItem, notify } = useStore()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(0)
  const bulkRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  /** Turn a batch of image files into new draft items. */
  const addPhotosAsItems = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith('image/'))
      if (!images.length) {
        notify('No images found in that drop.', 'error')
        return
      }
      setUploading(images.length)
      let added = 0
      for (const file of images) {
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
        setUploading((n) => n - 1)
      }
      setUploading(0)
      notify(
        `Added ${added} item${added === 1 ? '' : 's'} from photos.`,
        added ? 'success' : 'error',
      )
    },
    [createItem, notify],
  )

  function onBulkPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    void addPhotosAsItems(files)
  }

  /* --- drag & drop anywhere on the gallery --- */
  function onDragEnter(e: DragEvent) {
    if (!e.dataTransfer.types.includes('Files')) return
    dragDepth.current += 1
    setDragging(true)
  }
  function onDragLeave() {
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDragging(false)
    }
  }
  function onDrop(e: DragEvent) {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    void addPhotosAsItems(Array.from(e.dataTransfer.files ?? []))
  }

  return (
    <section
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="relative"
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Gallery · {state.items.length} pieces</p>
          <h1 className="font-poster text-5xl uppercase sm:text-6xl">My Clothes</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => bulkRef.current?.click()} disabled={uploading > 0}>
            {uploading > 0 ? `Uploading ${uploading}…` : '+ Add Photos'}
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
      </header>

      {state.items.length === 0 ? (
        <EmptyState onNew={() => setCreating(true)} onDrop={() => bulkRef.current?.click()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {state.items.map((item) => (
            <ItemCard key={item.id} item={item} onEdit={setEditing} />
          ))}
        </div>
      )}

      {/* Drag overlay */}
      {dragging && (
        <div className="pointer-events-none fixed inset-4 z-50 grid place-items-center rounded-2xl border-2 border-dashed border-ink bg-bg/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="font-poster text-4xl uppercase">Drop to add</div>
            <p className="mt-1 text-sm font-medium text-ink-soft">
              Each photo becomes a new item
            </p>
          </div>
        </div>
      )}

      {creating && <ItemFormModal onClose={() => setCreating(false)} />}
      {editing && <ItemFormModal existing={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}

function EmptyState({ onNew, onDrop }: { onNew: () => void; onDrop: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border-2 border-dashed border-line py-24 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-xl bg-ink text-2xl text-white">
        ↑
      </div>
      <p className="font-poster text-2xl uppercase text-ink">Drop photos here</p>
      <p className="mb-6 mt-1 max-w-sm text-sm text-muted">
        Drag in a batch of images to create items fast, or add one manually.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onDrop}>
          + Add Photos
        </Button>
        <Button onClick={onNew}>+ New Item</Button>
      </div>
    </div>
  )
}
