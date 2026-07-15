import { useRef, type ChangeEvent } from 'react'
import { useStore } from '../store/store.tsx'
import { Logo } from './Logo.tsx'
import { Button } from './ui.tsx'

export type Tab = 'gallery' | 'grid' | 'sales' | 'finances'

const TABS: { id: Tab; label: string }[] = [
  { id: 'gallery', label: 'My Clothes' },
  { id: 'grid', label: 'Item Grid' },
  { id: 'sales', label: 'Sales & Delivery' },
  { id: 'finances', label: 'Finances' },
]

export function TopNav({
  active,
  onChange,
}: {
  active: Tab
  onChange: (t: Tab) => void
}) {
  const { backup, restore, logout, status, notify } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  async function onRestoreFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed?.items) || !Array.isArray(parsed?.sales)) {
        notify('That file is not a valid ThreadsOC backup.', 'error')
        return
      }
      const count = parsed.items.length
      if (
        !window.confirm(
          `Restore ${count} item(s)? This replaces ALL current inventory and sales.`,
        )
      ) {
        return
      }
      await restore({ items: parsed.items, sales: parsed.sales })
    } catch {
      notify('Could not read that backup file.', 'error')
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line-strong bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Logo />

        <nav className="order-3 -mx-4 flex w-screen gap-1 overflow-x-auto px-4 pb-0.5 sm:order-2 sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0">
          {TABS.map((tab) => {
            const on = tab.id === active
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                aria-current={on ? 'page' : undefined}
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition sm:text-sm ${
                  on
                    ? 'bg-ink text-white'
                    : 'text-ink-soft hover:bg-line/60 hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
          {status === 'offline' && (
            <span
              title="Server unreachable — showing your last cached copy."
              className="hidden items-center gap-1.5 rounded-full border border-pending/30 bg-pending-bg px-2.5 py-1 text-xs font-semibold text-pending sm:inline-flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-pending" /> Offline
            </span>
          )}
          <Button variant="outline" onClick={backup}>
            Backup
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Restore
          </Button>
          <Button variant="ghost" onClick={logout} title="Sign out">
            ⏻
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onRestoreFile}
          />
        </div>
      </div>
    </header>
  )
}
