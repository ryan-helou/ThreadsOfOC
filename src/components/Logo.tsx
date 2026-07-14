/** Black square "V" mark beside the INVENTORY wordmark. */
export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-11 w-11 text-2xl' : 'h-8 w-8 text-lg'
  const word = size === 'lg' ? 'text-4xl' : 'text-[1.7rem]'
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span
        className={`grid place-items-center rounded-[6px] bg-ink font-poster leading-none text-white shadow-sm ${box}`}
      >
        V
      </span>
      <span className={`font-poster uppercase leading-none text-ink ${word}`}>
        Inventory
      </span>
    </div>
  )
}
