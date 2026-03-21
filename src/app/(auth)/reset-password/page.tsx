import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'

import ResetPasswordForm from './ResetPasswordForm'

interface ResetPasswordPageProps {
  searchParams: Promise<{ code?: string }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { code } = await searchParams

  if (!code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <svg
              className="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Invalid reset link</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This password reset link is missing or invalid. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <svg
              className="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Expired or invalid link
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This password reset link has expired or has already been used. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <ResetPasswordForm />
    </div>
  )
}
