/**
 * Offline cache. localStorage is ONLY a cache here — never a second source of
 * truth. On boot we render the cached snapshot instantly, then reconcile
 * against the server (the authoritative store) and overwrite the cache.
 */
import type { AppState } from '../../shared/types.ts'

const CACHE_KEY = 'threadsoc.cache.v1'

export function readCache(): AppState | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed?.items) && Array.isArray(parsed?.sales)) {
      return parsed as AppState
    }
    return null
  } catch {
    return null
  }
}

export function writeCache(state: AppState): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded (e.g. many data-URI photos) — non-fatal; server still has it.
  }
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY)
}
