'use client'

import { useState } from 'react'
import Link from 'next/link'

import { updatePassword } from './actions'

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const result = await updatePassword({ password })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <svg
            className="h-6 w-6 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Password updated</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
        <Link
          href="/login"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Set a new password</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Enter your new password below.</p>
      </div>

      {error && (
        <div
          className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            aria-required="true"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-base min-h-[44px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            aria-required="true"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-base min-h-[44px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            placeholder="Repeat your new password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-base min-h-[44px] font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
