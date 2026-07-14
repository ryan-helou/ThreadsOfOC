import { useState, type FormEvent } from 'react'
import { useStore } from '../store/store.tsx'
import { Button, Field, TextInput } from './ui.tsx'

export function Login() {
  const { login, busy } = useStore()
  const [password, setPassword] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await login(password)
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        {/* Oversized poster lockup as the hero. */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-xl bg-ink font-poster text-4xl leading-none text-white shadow-sm">
            V
          </div>
          <h1 className="font-poster text-5xl uppercase leading-none">Inventory</h1>
          <p className="eyebrow mt-2">Threads of OC · Streetwear</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-line bg-surface p-6 shadow-card"
        >
          <Field label="Owner password">
            <TextInput
              type="password"
              value={password}
              autoFocus
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" disabled={busy || !password} className="mt-4 w-full">
            {busy ? 'Checking…' : 'Enter'}
          </Button>
          <p className="mt-3 text-center text-xs text-muted">
            Your inventory is private to this account.
          </p>
        </form>
      </div>
    </div>
  )
}
