/** Black square "V" mark beside the INVENTORY wordmark. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span className="grid h-8 w-8 place-items-center rounded-[5px] bg-ink font-display text-lg font-bold leading-none text-white">
        V
      </span>
      {!compact && (
        <span className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
          Inventory
        </span>
      )}
    </div>
  )
}
