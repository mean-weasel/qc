'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { deleteAccount } from '@/app/(app)/settings/delete-account-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function DeleteAccountPanel(): React.ReactElement {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  function handleFirstClick() {
    setConfirming(true)
  }

  function handleCancel() {
    setConfirming(false)
    setPassword('')
  }

  async function handleDelete() {
    if (!password) {
      toast.error('Please enter your password to confirm deletion.')
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteAccount({ password })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Account deleted. Goodbye!')
        router.push('/login')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!confirming ? (
          <Button variant="destructive" onClick={handleFirstClick}>
            Delete My Account
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">Enter your password to confirm account deletion:</p>
            <Input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isDeleting}
              autoComplete="current-password"
            />
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || !password}>
                {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isDeleting}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
