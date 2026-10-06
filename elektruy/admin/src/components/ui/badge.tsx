import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', {
  variants: {
    variant: {
      default: 'bg-primary/10 text-primary',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/20 text-amber-800',
      destructive: 'bg-destructive/10 text-destructive',
      muted: 'bg-muted text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
