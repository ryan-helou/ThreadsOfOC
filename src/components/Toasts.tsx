import { useStore } from '../store/store.tsx'

const KIND = {
  info: 'border-line-strong bg-ink text-white',
  success: 'border-avail/30 bg-avail-bg text-avail',
  error: 'border-red-300 bg-red-50 text-red-700',
}

export function Toasts() {
  const { toasts, dismissToast } = useStore()
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm font-medium shadow-lg ${KIND[t.kind]}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
