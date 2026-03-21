import { PageContainer } from '@/components/layout/PageContainer'
import { Skeleton } from '@/components/ui/skeleton'

export default function CheckInLoading() {
  return (
    <PageContainer title="Check-In" description="Loading your session..." className="space-y-8">
      {/* Session rules skeleton */}
      <Skeleton variant="card" className="h-16" />

      {/* Quick start + categories skeleton */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Skeleton variant="card" className="h-48" />
        <Skeleton variant="card" className="h-48" />
      </div>

      {/* Recent check-ins skeleton */}
      <Skeleton variant="card" className="h-32" />
    </PageContainer>
  )
}
