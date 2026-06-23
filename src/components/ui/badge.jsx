import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-[var(--border-color)] bg-[var(--badge-bg)] text-zinc-800 dark:text-zinc-200',
        subtle: 'border-[var(--border-color)] bg-[var(--badge-bg)] text-zinc-650 dark:text-zinc-455',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
