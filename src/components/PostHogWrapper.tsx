'use client'

import dynamic from 'next/dynamic'

const PostHogProvider = dynamic(() => import('./PostHogProvider').then((mod) => mod.PostHogProvider), { ssr: false })

export function PostHogWrapper({ children }: { children: React.ReactNode }): React.ReactNode {
  return <PostHogProvider>{children}</PostHogProvider>
}
