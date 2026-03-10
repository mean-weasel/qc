/**
 * Multi-User Workflows: Skipped Destructive Tests
 *
 * These workflows are SKIPPED because they would modify shared test data,
 * require external services (email delivery), or depend on features that
 * need dedicated test infrastructure.
 */

import { test } from '@playwright/test'

test.describe('Skipped Multi-User Workflows — Destructive / External Dependencies', () => {
  test.skip('Workflow 1: Invite-to-Signup — partner invite creates new couple', async () => {
    // SKIP: This workflow requires actual email delivery (Resend) to verify
    // the invite link. It also creates new couples and user accounts, which
    // would pollute the shared test database and break other tests that
    // depend on a known set of users and couples.
    //
    // Steps that would be tested:
    // 1. Alice sends a partner invite from /settings
    // 2. Invite email is delivered with a unique token link
    // 3. New user signs up via the invite link at /invite/[token]
    // 4. New user is automatically joined to Alice's couple
    // 5. Both users see each other on the dashboard
  })

  test.skip('Workflow 4: Check-in Session — real-time multi-user session', async () => {
    // SKIP: Check-in sessions require two users to be simultaneously
    // connected with real-time Supabase subscriptions. The session flow
    // involves timed turns, mood selections, and celebration animations
    // that are difficult to synchronize reliably in a CI environment.
    //
    // Steps that would be tested:
    // 1. Alice starts a new check-in session from /checkin
    // 2. Bob receives a real-time notification and joins
    // 3. Both partners take turns sharing (timed turns)
    // 4. Both partners select mood ratings
    // 5. Session completes with celebration animation
    // 6. Check-in summary appears on both dashboards
  })

  test.skip('Workflow 6: Request-to-Reminder Conversion', async () => {
    // SKIP: This workflow depends on the "Convert to Reminder" feature
    // which requires a request to be in a specific state and the conversion
    // UI to be available. The feature availability varies based on couple
    // settings and may not be consistently testable.
    //
    // Steps that would be tested:
    // 1. Alice creates a request for Bob at /requests
    // 2. Bob views the request in their inbox
    // 3. Bob clicks "Convert to Reminder"
    // 4. A new reminder is created at /reminders with the request content
    // 5. Both partners see the reminder on their reminders page
  })

  test.skip('Workflow 12: Categories Sync — tag changes sync between partners', async () => {
    // SKIP: The QC app uses a tag-based system (free-form text tags on notes)
    // rather than discrete categories with separate CRUD. Tag sync between
    // partners happens implicitly through note visibility (shared notes show
    // their tags to both partners). There is no standalone "categories" UI
    // to test synchronization against.
    //
    // Steps that would be tested:
    // 1. Alice creates a note with specific tags
    // 2. Bob sees the note with those tags
    // 3. Alice edits the note to change tags
    // 4. Bob sees the updated tags after reload
  })

  test.skip('Workflow 15: Leave Couple — partner leaves shared couple', async () => {
    // SKIP: This is a destructive operation that would break ALL other
    // multi-user tests. Leaving a couple removes the couple_id from the
    // user's profile, which means they can no longer access any shared
    // data (notes, check-ins, milestones, etc.). The test database would
    // need to be fully re-seeded after this test.
    //
    // Steps that would be tested:
    // 1. Alice navigates to /settings
    // 2. Alice clicks "Leave Couple" in danger zone
    // 3. Alice confirms the destructive action
    // 4. Alice is redirected to /onboarding (no couple)
    // 5. Bob's dashboard shows partner has left
    // 6. Shared data is no longer accessible to either user
  })
})
