/** Presentation-only formatting helpers. */

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const USD_CENTS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function money(n: number, { cents = false } = {}): string {
  return (cents ? USD_CENTS : USD).format(Number.isFinite(n) ? n : 0)
}

/** Signed money for profit (e.g. "+$95" / "−$10"). */
export function signedMoney(n: number): string {
  const sign = n < 0 ? '−' : '+'
  return `${sign}${money(Math.abs(n))}`
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
