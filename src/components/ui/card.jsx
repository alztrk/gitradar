import { cn } from '../../lib/utils'

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'minimal-card rounded-xl bg-[var(--card-bg)] shadow-xs',
        className,
      )}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5', className)} {...props} />
}
