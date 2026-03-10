/**
 * Multi-User Workflows: Skipped Edge Case Tests
 *
 * These workflows are SKIPPED because they require special infrastructure
 * (network simulation, precise timing control) that is unreliable in CI.
 */

import { test } from '@playwright/test'

test.describe('Skipped Multi-User Workflows — Edge Cases', () => {
  test.skip('Workflow 13: Simultaneous Edits — both partners edit same note', async () => {
    // SKIP: Race condition timing is unreliable in CI environments.
    // This test requires both partners to submit edits to the same shared
    // note within milliseconds of each other, which cannot be deterministically
    // controlled in Playwright. The outcome depends on database transaction
    // ordering and Supabase Realtime propagation latency.
    //
    // Steps that would be tested:
    // 1. Alice and Bob both navigate to /notes
    // 2. Both open the same shared note in the edit modal
    // 3. Alice changes the content to "Alice's version"
    // 4. Bob changes the content to "Bob's version"
    // 5. Both click Update at approximately the same time
    // 6. Verify last-write-wins: one version persists
    // 7. Both partners see the same final content after reload
    //
    // To test manually: use two browser windows side-by-side and
    // coordinate clicks as closely as possible.
  })

  test.skip('Workflow 16: Optimistic Update Rollback — offline partner sees rollback', async () => {
    // SKIP: This test requires network throttling or offline simulation
    // (e.g., via Chrome DevTools Protocol or Playwright's route.abort()).
    // Simulating offline state reliably across two browser contexts while
    // maintaining Supabase auth session integrity is fragile and produces
    // flaky results in CI.
    //
    // Steps that would be tested:
    // 1. Alice creates a shared note (online, succeeds)
    // 2. Alice's network is throttled/disconnected
    // 3. Alice attempts to update the note (optimistic UI shows update)
    // 4. The server request fails due to network error
    // 5. Alice's UI rolls back to the previous content
    // 6. Bob's /notes page still shows the original note (unaffected)
    // 7. Alice reconnects and retries the update successfully
    // 8. Bob sees the updated note after reload
    //
    // To test manually: use Chrome DevTools Network tab to toggle
    // offline mode while performing note operations.
  })
})
