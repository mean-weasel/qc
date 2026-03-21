import { cn } from '@/lib/utils'

interface PageContainerProps {
  title?: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PageContainer({
  title,
  description,
  action,
  children,
  className,
}: PageContainerProps): React.ReactNode {
  return (
    <div id="main-content" className="mx-auto w-full max-w-6xl">
      {title && (
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('space-y-6', className)}>{children}</div>
    </div>
  )
}
