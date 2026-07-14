/**
 * Typed API client. Every mutation returns the fresh authoritative AppState, so
 * the store never has to reconcile field-by-field — it just adopts what the
 * server sends back. The auth token is held in localStorage and attached as a
 * Bearer header; no write-capable secret is ever baked into the bundle.
 */
import type { AppState, Item, Sale, SizeEntry } from '../../shared/types.ts'

const TOKEN_KEY = 'threadsoc.token'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  const body = res.headers.get('content-type')?.includes('application/json')
    ? await res.json().catch(() => ({}))
    : {}
  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`)
  }
  return body as T
}

type StateResponse = { state: AppState }
const state = (r: StateResponse) => r.state

/** Payload for creating an item (ids are minted server-side). */
export interface NewItemInput {
  name: string
  brand: string
  photo: string
  referenceUrl?: string
  sizes?: Array<Omit<SizeEntry, 'id'>>
}

export const api = {
  async health(): Promise<{ ok: boolean }> {
    return request('/health')
  },

  async login(password: string): Promise<string> {
    const { token } = await request<{ token: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
    return token
  },

  async getState(): Promise<AppState> {
    return request<StateResponse>('/state').then(state)
  },

  async createItem(input: NewItemInput): Promise<AppState> {
    return request<StateResponse>('/items', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then(state)
  },

  async updateItem(
    id: string,
    patch: Partial<Pick<Item, 'name' | 'brand' | 'photo' | 'referenceUrl'>>,
  ): Promise<AppState> {
    return request<StateResponse>(`/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }).then(state)
  },

  async deleteItem(id: string): Promise<AppState> {
    return request<StateResponse>(`/items/${id}`, { method: 'DELETE' }).then(state)
  },

  async addSize(itemId: string, size: Omit<SizeEntry, 'id'>): Promise<AppState> {
    return request<StateResponse>(`/items/${itemId}/sizes`, {
      method: 'POST',
      body: JSON.stringify(size),
    }).then(state)
  },

  async updateSize(id: string, patch: Partial<Omit<SizeEntry, 'id'>>): Promise<AppState> {
    return request<StateResponse>(`/sizes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }).then(state)
  },

  async deleteSize(id: string): Promise<AppState> {
    return request<StateResponse>(`/sizes/${id}`, { method: 'DELETE' }).then(state)
  },

  async createSale(
    input: Omit<Sale, 'id'> & { cost: number },
  ): Promise<AppState> {
    return request<StateResponse>('/sales', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then(state)
  },

  async updateSale(id: string, patch: Partial<Omit<Sale, 'id'>>): Promise<AppState> {
    return request<StateResponse>(`/sales/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }).then(state)
  },

  async deleteSale(id: string): Promise<AppState> {
    return request<StateResponse>(`/sales/${id}`, { method: 'DELETE' }).then(state)
  },

  async restore(snapshot: AppState): Promise<AppState> {
    return request<StateResponse>('/state', {
      method: 'PUT',
      body: JSON.stringify(snapshot),
    }).then(state)
  },
}
