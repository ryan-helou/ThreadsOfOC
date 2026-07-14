/** Small styled primitives shared across views. Typed, minimal, bold. */
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Variant = 'primary' | 'ghost' | 'outline' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-ink text-white border border-ink hover:bg-black active:translate-y-px',
  ghost: 'bg-transparent text-ink hover:bg-line/60',
  outline: 'bg-surface text-ink border border-line-strong hover:bg-surface-2',
  danger:
    'bg-transparent text-muted border border-line hover:border-red-400 hover:text-red-600',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

const FIELD =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-ink-soft focus:ring-2 focus:ring-ink/10 placeholder:text-muted/70'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${FIELD} resize-y ${props.className ?? ''}`} />
}

/** Status tones for menu dots; keyed to the CSS color tokens in index.css. */
export type SelectTone = 'avail' | 'pending' | 'sold' | 'muted'

const DOT: Record<SelectTone, string> = {
  avail: 'bg-avail',
  pending: 'bg-pending',
  sold: 'bg-sold',
  muted: 'bg-muted',
}

export type SelectOption = {
  value: string
  label: string
  tone?: SelectTone
  disabled?: boolean
}

/**
 * Custom dropdown that renders its OWN styled menu instead of the OS-native
 * <select> popup (which ignores all app styling). Portal-rendered + fixed
 * positioning so it escapes scroll/overflow clipping inside tables and modals.
 */
export function SelectMenu({
  value,
  onChange,
  options,
  className = '',
  placeholder = 'Select…',
  ariaLabel,
  size = 'md',
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
  placeholder?: string
  ariaLabel?: string
  size?: 'sm' | 'md'
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [above, setAbove] = useState(false)
  const [active, setActive] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)
  const pad = size === 'sm' ? 'px-1.5 py-1 text-sm' : 'px-3 py-2 text-sm'

  function place() {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setRect(r)
    const estimated = Math.min(options.length, 6) * 36 + 8
    setAbove(r.bottom + estimated > window.innerHeight && r.top > estimated)
  }

  function openMenu() {
    place()
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  // Close on outside click / scroll / resize; reposition is cheap enough.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !menuRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    const onScroll = () => setOpen(false)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  useLayoutEffect(() => {
    if (open) menuRef.current?.focus()
  }, [open])

  function pick(opt: SelectOption) {
    if (opt.disabled) return
    onChange(opt.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openMenu()
    }
  }

  function onMenuKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const opt = options[active]
      if (opt) pick(opt)
    }
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onTriggerKey}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-line bg-surface text-left text-ink outline-none transition hover:border-ink-soft focus:border-ink-soft focus:ring-2 focus:ring-ink/10 ${pad} ${className}`}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {selected?.tone && (
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[selected.tone]}`} />
          )}
          <span className={`truncate ${selected ? '' : 'text-muted/70'}`}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <svg
          viewBox="0 0 10 6"
          className={`h-1.5 w-2.5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M1 1l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={onMenuKey}
            style={{
              position: 'fixed',
              left: rect.left,
              width: Math.max(rect.width, 160),
              ...(above
                ? { bottom: window.innerHeight - rect.top + 4 }
                : { top: rect.bottom + 4 }),
            }}
            className="z-[60] max-h-60 overflow-auto rounded-lg border border-line-strong bg-surface p-1 shadow-lift outline-none"
          >
            {options.map((opt, i) => {
              const isSel = opt.value === value
              const isActive = i === active
              return (
                <button
                  type="button"
                  key={opt.value}
                  role="option"
                  aria-selected={isSel}
                  disabled={opt.disabled}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(opt)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    isActive ? 'bg-surface-2' : ''
                  } ${isSel ? 'font-semibold' : 'font-normal'}`}
                >
                  {opt.tone && (
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[opt.tone]}`} />
                  )}
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isSel && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M2.5 6.5l2.5 2.5 4.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-xl border border-line bg-surface shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-xl font-bold uppercase">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-xl leading-none text-muted hover:bg-line/60"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
