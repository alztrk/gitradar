import { cn } from '../../lib/utils'

export function Separator({ className, orientation = 'horizontal', ...props }) {
  return (
    <div
      className={cn(
        'shrink-0 bg-[var(--border-color)]',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}
