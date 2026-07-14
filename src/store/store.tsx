/**
 * Central state store. Holds the one AppState the whole UI reads from, plus all
 * mutating actions. The server is authoritative: actions call the API, receive
 * the fresh state back, and adopt it. localStorage is a boot-time cache only.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppState, Item, Sale, SizeEntry } from '../../shared/types.ts'
import { BACKUP_VERSION, type BackupFile } from '../../shared/types.ts'
import { ApiError, api, getToken, setToken, type NewItemInput } from '../lib/api.ts'
import { clearCache, readCache, writeCache } from '../lib/cache.ts'

type Status = 'booting' | 'ready' | 'offline'
type ToneKind = 'info' | 'success' | 'error'
export interface Toast {
  id: number
  message: string
  kind: ToneKind
}

const EMPTY: AppState = { items: [], sales: [] }

interface StoreValue {
  state: AppState
  status: Status
  isAuthed: boolean
  busy: boolean
  toasts: Toast[]
  dismissToast: (id: number) => void
  notify: (message: string, kind?: ToneKind) => void

  login: (password: string) => Promise<boolean>
  logout: () => void
  refresh: () => Promise<void>

  createItem: (input: NewItemInput) => Promise<boolean>
  updateItem: (
    id: string,
    patch: Partial<Pick<Item, 'name' | 'brand' | 'photo' | 'referenceUrl'>>,
  ) => Promise<boolean>
  deleteItem: (id: string) => Promise<boolean>

  addSize: (itemId: string, size: Omit<SizeEntry, 'id'>) => Promise<boolean>
  updateSize: (id: string, patch: Partial<Omit<SizeEntry, 'id'>>) => Promise<boolean>
  deleteSize: (id: string) => Promise<boolean>

  createSale: (input: Omit<Sale, 'id'> & { cost: number }) => Promise<boolean>
  updateSale: (id: string, patch: Partial<Omit<Sale, 'id'>>) => Promise<boolean>
  deleteSale: (id: string) => Promise<boolean>

  backup: () => void
  restore: (snapshot: AppState) => Promise<boolean>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => readCache() ?? EMPTY)
  const [status, setStatus] = useState<Status>('booting')
  const [isAuthed, setIsAuthed] = useState<boolean>(() => Boolean(getToken()))
  const [busy, setBusy] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, kind: ToneKind = 'info') => {
      const id = ++toastId.current
      setToasts((t) => [...t, { id, message, kind }])
      window.setTimeout(() => dismissToast(id), kind === 'error' ? 6000 : 3000)
    },
    [dismissToast],
  )

  const applyState = useCallback((next: AppState) => {
    setState(next)
    writeCache(next)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    clearCache()
    setIsAuthed(false)
    setState(EMPTY)
  }, [])

  const refresh = useCallback(async () => {
    if (!getToken()) return
    try {
      const next = await api.getState()
      applyState(next)
      setStatus('ready')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout()
      } else {
        // Server unreachable — keep the cached snapshot, mark offline.
        setStatus('offline')
      }
    }
  }, [applyState, logout])

  // Reconcile against the server whenever we hold a session.
  useEffect(() => {
    if (isAuthed) void refresh()
    else setStatus('ready')
  }, [isAuthed, refresh])

  const login = useCallback(
    async (password: string): Promise<boolean> => {
      setBusy(true)
      try {
        const token = await api.login(password)
        setToken(token)
        setIsAuthed(true)
        return true
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Login failed', 'error')
        return false
      } finally {
        setBusy(false)
      }
    },
    [notify],
  )

  /** Run a mutating API call, adopt the returned state, surface any error. */
  const run = useCallback(
    async (fn: () => Promise<AppState>, successMsg?: string): Promise<boolean> => {
      setBusy(true)
      try {
        const next = await fn()
        applyState(next)
        setStatus('ready')
        if (successMsg) notify(successMsg, 'success')
        return true
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          notify('Session expired — please sign in again.', 'error')
          logout()
        } else {
          notify(err instanceof Error ? err.message : 'Something went wrong', 'error')
        }
        return false
      } finally {
        setBusy(false)
      }
    },
    [applyState, logout, notify],
  )

  const backup = useCallback(() => {
    const payload: BackupFile = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      items: state.items,
      sales: state.sales,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `threadsoc-backup-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
    notify('Backup downloaded.', 'success')
  }, [state, notify])

  const value = useMemo<StoreValue>(
    () => ({
      state,
      status,
      isAuthed,
      busy,
      toasts,
      dismissToast,
      notify,
      login,
      logout,
      refresh,
      createItem: (input) => run(() => api.createItem(input), 'Item added.'),
      updateItem: (id, patch) => run(() => api.updateItem(id, patch)),
      deleteItem: (id) => run(() => api.deleteItem(id), 'Item deleted.'),
      addSize: (itemId, size) => run(() => api.addSize(itemId, size)),
      updateSize: (id, patch) => run(() => api.updateSize(id, patch)),
      deleteSize: (id) => run(() => api.deleteSize(id), 'Row deleted.'),
      createSale: (input) => run(() => api.createSale(input), 'Sale logged — item marked Sold.'),
      updateSale: (id, patch) => run(() => api.updateSale(id, patch)),
      deleteSale: (id) => run(() => api.deleteSale(id), 'Sale removed.'),
      backup,
      restore: (snapshot) => run(() => api.restore(snapshot), 'Backup restored.'),
    }),
    [
      state, status, isAuthed, busy, toasts, dismissToast, notify,
      login, logout, refresh, run, backup,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>')
  return ctx
}
