import { useState, type FormEvent } from 'react'
import { useStore } from '../store/store.tsx'
import { Logo } from './Logo.tsx'
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
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-line bg-surface p-6 shadow-sm"
        >
          <h1 className="mb-1 font-display text-xl font-bold uppercase">Sign in</h1>
          <p className="mb-5 text-sm text-muted">
            Your inventory is private. Enter the owner password to continue.
          </p>
          <Field label="Password">
            <TextInput
              type="password"
              value={password}
              autoFocus
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" disabled={busy || !password} className="mt-5 w-full">
            {busy ? 'Checking…' : 'Enter'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          Threads&nbsp;of&nbsp;OC · streetwear inventory
        </p>
      </div>
    </div>
  )
}
