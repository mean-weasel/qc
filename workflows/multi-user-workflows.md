# Multi-User Workflows

> Auto-generated multi-user workflow documentation for QC (Quality Couple)
> Last updated: 2026-03-01

## Quick Reference

| Workflow                          | Personas                                    | Purpose                                     | Steps |
| --------------------------------- | ------------------------------------------- | ------------------------------------------- | ----- |
| 1. Invite-to-Signup               | Partner A (host) + Partner B (new user)     | Partner invite and onboarding               | 18    |
| 2. Shared Notes Sync              | Partner A + Partner B                       | Create shared note, verify real-time sync   | 12    |
| 3. Private Notes Isolation        | Partner A + Partner B                       | Private note invisible to partner           | 10    |
| 4. Check-in Session               | Partner A + Partner B                       | Collaborative mood/reflection check-in      | 20    |
| 5. Partner Requests               | Partner A (sender) + Partner B (receiver)   | Send request, accept/decline                | 14    |
| 6. Request-to-Reminder Conversion | Partner A (sender) + Partner B (converter)  | Convert accepted request to reminder        | 16    |
| 7. Session Settings Proposal      | Partner A (proposer) + Partner B (reviewer) | Propose and approve session settings        | 14    |
| 8. Love Languages Sharing         | Partner A + Partner B                       | Share love language, verify privacy         | 14    |
| 9. Love Actions Sync              | Partner A + Partner B                       | Create love actions, verify cross-user sync | 12    |
| 10. Milestones Sync               | Partner A + Partner B                       | Create milestone with photo, verify sync    | 14    |
| 11. Reminders Sync                | Partner A + Partner B                       | Create reminder, verify partner sees it     | 12    |
| 12. Categories Sync               | Partner A + Partner B                       | Create custom category, verify sync         | 10    |
| 13. Simultaneous Edits            | Partner A + Partner B                       | Both edit same entity, last-write-wins      | 12    |
| 14. Privacy Toggle                | Partner A + Partner B                       | Change note from shared to private          | 12    |
| 15. Leave Couple                  | Partner A (leaver) + Partner B (remaining)  | Partner leaves couple                       | 10    |
| 16. Optimistic Update Rollback    | Partner A + Partner B                       | Server error reverts optimistic UI          | 10    |

---

## Two-User Workflows

### Workflow 1: Invite-to-Signup

**Purpose:** Partner A creates a couple and invites Partner B via email. Partner B signs up and joins the couple.

#### Personas

- User A: Couple creator (authenticated, completes onboarding)
- User B: Invited partner (anonymous, then authenticated after signup)

#### Prerequisites

- App running at localhost:3000
- User A has an account but has NOT completed onboarding
- User B has no account yet
- Email delivery configured (or check Supabase `couple_invites` table directly)

#### Steps

1. [User A] Navigate to /login
2. [User A] Enter email and password, click "Sign In" -> redirected to /onboarding
3. [User A] Complete onboarding step 1: enter couple name and anniversary date
4. [User A] Complete onboarding step 2: select relationship quiz answers
5. [User A] Complete onboarding step 3: configure reminder preferences
6. [User A] Enter Partner B's email in the invite field
7. [User A] Click "Send Invite" -> confirmation toast appears
8. [User A] Verify: redirected to /dashboard after onboarding completes
9. [User A] Verify: dashboard shows "Waiting for partner" or similar pending state
10. [User B] Open invite link from email (or navigate to /invite/[token])
11. [User B] Verify: invite page shows couple name and Partner A's name
12. [User B] Click "Accept Invite" or "Join"
13. [User B] If not logged in: redirected to /signup, create account with email/password
14. [User B] After signup/login: redirected back to invite acceptance
15. [User B] Verify: redirected to /dashboard after joining couple
16. [User B] Verify: dashboard shows couple name and Partner A's profile
17. [User A] Refresh /dashboard
18. [User A] Verify: Partner B's name/profile now visible, pending state removed (cross-user sync)

---

### Workflow 2: Shared Notes Sync

**Purpose:** Partner A creates a shared note, Partner B sees it appear in real time.

#### Personas

- User A: Note author (authenticated, couple member)
- User B: Partner (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple

#### Steps

1. [User A] Navigate to /notes
2. [User B] Navigate to /notes
3. [User A] Click "New Note" or the add note button
4. [User A] Type "Shared grocery list" in the title field
5. [User A] Type "Milk, eggs, bread" in the note body
6. [User A] Verify: privacy is set to "Shared" (default or select)
7. [User A] Click "Save" -> note appears in User A's notes list
8. [User A] Verify: note card shows "Shared grocery list" with content preview
9. [User B] Verify: "Shared grocery list" note appears in their notes list (cross-user sync)
10. [User B] Click on the note to view it
11. [User B] Verify: note content shows "Milk, eggs, bread"
12. [User B] Verify: note is marked as authored by User A

---

### Workflow 3: Private Notes Isolation

**Purpose:** Partner A creates a private note. Partner B cannot see it.

#### Personas

- User A: Note author (authenticated, couple member)
- User B: Partner (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple

#### Steps

1. [User A] Navigate to /notes
2. [User B] Navigate to /notes
3. [User B] Verify: note count in list (record for comparison)
4. [User A] Click "New Note" or the add note button
5. [User A] Type "My private thoughts" in the title field
6. [User A] Type "Personal reflection content" in the note body
7. [User A] Set privacy to "Private"
8. [User A] Click "Save" -> note appears in User A's notes list
9. [User A] Verify: note shows a lock icon or "Private" badge
10. [User B] Verify: note count has NOT changed — "My private thoughts" does NOT appear (privacy enforced)

---

### Workflow 4: Check-in Session

**Purpose:** Both partners participate in a check-in session with mood tracking, reflection notes, and action items.

#### Personas

- User A: Check-in initiator (authenticated, couple member)
- User B: Partner joining check-in (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple
- No active check-in session in progress

#### Steps

1. [User A] Navigate to /dashboard
2. [User A] Click "Start Check-in" or the check-in quick action
3. [User A] Verify: redirected to /checkin, pre-check-in preparation screen appears
4. [User A] Complete pre-check-in bookend (preparation questions)
5. [User A] Select mood rating (e.g., 4 out of 5)
6. [User A] Verify: mood selection is saved, UI updates
7. [User B] Navigate to /dashboard
8. [User B] Verify: sees active check-in indicator or notification (cross-user sync)
9. [User B] Click to join check-in -> navigated to /checkin
10. [User B] Select mood rating (e.g., 3 out of 5)
11. [User A] Verify: sees Partner B has joined/submitted mood (cross-user sync)
12. [User A] Type reflection notes in the notes section
13. [User A] Click "Add Action Item", type "Plan date night this weekend"
14. [User A] Verify: action item appears in the list
15. [User B] Verify: sees User A's action item appear (cross-user sync)
16. [User B] Type their own reflection notes
17. [User B] Click "Add Action Item", type "Book restaurant reservation"
18. [User A] Verify: sees User B's action item (cross-user sync)
19. [User A] Complete check-in -> post-check-in reflection bookend appears
20. [User A] Verify: check-in summary shows both partners' moods and action items

---

### Workflow 5: Partner Requests

**Purpose:** Partner A sends a request to Partner B. Partner B accepts or declines it.

#### Personas

- User A: Request sender (authenticated, couple member)
- User B: Request receiver (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple

#### Steps

1. [User A] Navigate to /requests
2. [User B] Navigate to /requests
3. [User A] Click "New Request" or the add request button
4. [User A] Type "Can we go for a walk tonight?" in the request field
5. [User A] Click "Send" -> request appears in User A's sent list with "Pending" status
6. [User A] Verify: request card shows "Pending" badge
7. [User B] Verify: new request from User A appears in their inbox (cross-user sync)
8. [User B] Verify: request shows "Can we go for a walk tonight?" with User A's name
9. [User B] Click "Accept" on the request
10. [User B] Verify: request status changes to "Accepted" immediately (optimistic update)
11. [User A] Verify: request status updates to "Accepted" (cross-user sync)
12. [User B] Navigate to /requests
13. [User B] Click "Decline" on a different pending request (if available) or create a new one to decline
14. [User A] Verify: declined request shows "Declined" status (cross-user sync)

---

### Workflow 6: Request-to-Reminder Conversion

**Purpose:** Partner A sends a request, Partner B accepts and converts it into a reminder.

#### Personas

- User A: Request sender (authenticated, couple member)
- User B: Request converter (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple

#### Steps

1. [User A] Navigate to /requests
2. [User A] Click "New Request"
3. [User A] Type "Remember to call Mom on Sunday" in the request field
4. [User A] Click "Send" -> request created with "Pending" status
5. [User B] Navigate to /requests
6. [User B] Verify: sees "Remember to call Mom on Sunday" request (cross-user sync)
7. [User B] Click "Accept" on the request
8. [User B] Verify: request status changes to "Accepted"
9. [User B] Click "Convert to Reminder" on the accepted request
10. [User B] Verify: conversion dialog/form appears with pre-filled details
11. [User B] Set reminder date/time (e.g., Sunday 10:00 AM)
12. [User B] Click "Create Reminder" -> request marked as "Converted"
13. [User B] Navigate to /reminders
14. [User B] Verify: new reminder shows "Remember to call Mom on Sunday" with linked request indicator
15. [User A] Navigate to /reminders
16. [User A] Verify: sees the new reminder created from their request (cross-user sync)

---

### Workflow 7: Session Settings Proposal

**Purpose:** Partner A proposes check-in session settings changes. Partner B reviews and approves or rejects.

#### Personas

- User A: Settings proposer (authenticated, couple member)
- User B: Settings reviewer (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple

#### Steps

1. [User A] Navigate to /settings
2. [User A] Find session settings section
3. [User A] Change a setting (e.g., check-in duration from 15 min to 30 min)
4. [User A] Click "Propose Changes" or "Save"
5. [User A] Verify: proposal submitted confirmation, setting shows "Pending approval" state
6. [User B] Navigate to /dashboard or /settings
7. [User B] Verify: sees proposal banner/notification for session settings change (cross-user sync)
8. [User B] Verify: banner shows "User A proposed: Check-in duration → 30 min"
9. [User B] Click "Accept" on the proposal
10. [User B] Verify: proposal banner disappears, settings updated to new values
11. [User A] Verify: settings now show updated values (30 min duration) (cross-user sync)
12. [User A] Propose another change (e.g., turn-based mode ON)
13. [User B] Verify: new proposal banner appears (cross-user sync)
14. [User B] Click "Reject" -> proposal dismissed, settings unchanged

---

### Workflow 8: Love Languages Sharing

**Purpose:** Partner A adds a love language profile. Both shared and private visibility are tested.

#### Personas

- User A: Love language author (authenticated, couple member)
- User B: Partner (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple

#### Steps

1. [User A] Navigate to /love-languages
2. [User B] Navigate to /love-languages
3. [User A] Click "Add Love Language" or the add button
4. [User A] Select a love language type (e.g., "Words of Affirmation")
5. [User A] Set ranking/priority (e.g., #1)
6. [User A] Set privacy to "Shared"
7. [User A] Click "Save" -> love language appears in User A's profile
8. [User A] Verify: love language card shows "Words of Affirmation" with "Shared" badge
9. [User B] Verify: sees User A's "Words of Affirmation" in partner's profile section (cross-user sync)
10. [User A] Add another love language (e.g., "Quality Time")
11. [User A] Set privacy to "Private"
12. [User A] Click "Save" -> love language appears in User A's profile with lock icon
13. [User B] Verify: does NOT see "Quality Time" in User A's profile (privacy enforced)
14. [User A] Verify: sees both "Words of Affirmation" (shared) and "Quality Time" (private) in own profile

---

### Workflow 9: Love Actions Sync

**Purpose:** Both partners create and view love actions linked to love languages.

#### Personas

- User A: Action creator (authenticated, couple member)
- User B: Partner (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple
- At least one shared love language exists for either partner

#### Steps

1. [User A] Navigate to /love-languages
2. [User B] Navigate to /love-languages
3. [User A] Find a shared love language (e.g., "Words of Affirmation")
4. [User A] Click "Add Action" or the action button on the love language card
5. [User A] Type "Write a love letter" in the action description
6. [User A] Click "Save" -> action appears under the love language
7. [User A] Verify: action card shows "Write a love letter"
8. [User B] Verify: sees "Write a love letter" action under the love language (cross-user sync)
9. [User B] Click "Add Action" on the same or different love language
10. [User B] Type "Plan a surprise date" and save
11. [User A] Verify: sees "Plan a surprise date" action appear (cross-user sync)
12. [User A] Mark "Write a love letter" as completed
13. [User B] Verify: action shows as completed (cross-user sync)

---

### Workflow 10: Milestones Sync

**Purpose:** Partner A creates a milestone with a photo. Partner B sees it in real time.

#### Personas

- User A: Milestone creator (authenticated, couple member)
- User B: Partner (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple
- A test image available for upload

#### Steps

1. [User A] Navigate to /growth
2. [User B] Navigate to /growth
3. [User A] Click "Add Milestone" or the add button
4. [User A] Type "First Anniversary" in the title field
5. [User A] Type "Celebrated one year together!" in the description
6. [User A] Set milestone date
7. [User A] Upload a photo (test image)
8. [User A] Click "Save" -> milestone appears on timeline
9. [User A] Verify: milestone card shows title, description, date, and photo thumbnail
10. [User B] Verify: "First Anniversary" milestone appears on their timeline (cross-user sync)
11. [User B] Click on the milestone to view details
12. [User B] Verify: sees full description and photo
13. [User B] Add their own milestone (e.g., "Moved In Together")
14. [User A] Verify: sees "Moved In Together" appear on timeline (cross-user sync)

---

### Workflow 11: Reminders Sync

**Purpose:** Partner A creates a reminder. Partner B sees it in real time.

#### Personas

- User A: Reminder creator (authenticated, couple member)
- User B: Partner (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple

#### Steps

1. [User A] Navigate to /reminders
2. [User B] Navigate to /reminders
3. [User A] Click "New Reminder" or the add button
4. [User A] Type "Date night Friday" in the reminder field
5. [User A] Set date and time (e.g., Friday 7:00 PM)
6. [User A] Assign to Partner B (or leave unassigned)
7. [User A] Click "Save" -> reminder appears in User A's list
8. [User A] Verify: reminder card shows "Date night Friday" with date/time
9. [User B] Verify: "Date night Friday" reminder appears in their list (cross-user sync)
10. [User B] Verify: reminder shows assigned to them (if assigned)
11. [User B] Mark reminder as complete
12. [User A] Verify: reminder shows as completed (cross-user sync)

---

### Workflow 12: Categories Sync

**Purpose:** Partner A creates a custom note category. Partner B sees it in real time.

#### Personas

- User A: Category creator (authenticated, couple member)
- User B: Partner (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple

#### Steps

1. [User A] Navigate to /notes
2. [User B] Navigate to /notes
3. [User A] Open category management (filter/tag selector or settings)
4. [User A] Click "Add Category" or the add button
5. [User A] Type "Date Ideas" as the category name
6. [User A] Select a color or icon if available
7. [User A] Click "Save" -> category created
8. [User A] Verify: "Date Ideas" appears in category list
9. [User B] Verify: "Date Ideas" category appears in their category list (cross-user sync)
10. [User B] Create a note and assign it to "Date Ideas" category to confirm usability

---

## Edge Case Workflows

### Workflow 13: Simultaneous Edits (Last-Write-Wins)

**Purpose:** Both partners edit the same entity simultaneously. Last write wins.

#### Personas

- User A: Editor (authenticated, couple member)
- User B: Editor (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple
- An existing shared note visible to both

#### Steps

1. [User A] Navigate to /notes
2. [User B] Navigate to /notes
3. [User A] Open an existing shared note (e.g., "Shopping List")
4. [User B] Open the same shared note ("Shopping List")
5. [User A] Edit the note body to "Milk, eggs, bread, cheese"
6. [User B] Edit the note body to "Milk, eggs, bread, butter" (different change)
7. [User A] Click "Save" -> note saved with User A's version
8. [User B] Click "Save" -> note saved with User B's version (overwrites User A's)
9. [User A] Verify: note body now shows "Milk, eggs, bread, butter" (User B's version won) (cross-user sync)
10. [User B] Verify: note body shows "Milk, eggs, bread, butter" (their version)
11. [User A] Verify: no error or conflict notification (last-write-wins is silent)
12. [User A] Edit again to confirm note is still editable after conflict

---

### Workflow 14: Privacy Toggle (Shared to Private)

**Purpose:** Partner A changes a shared note to private. Partner B loses visibility in real time.

#### Personas

- User A: Note author (authenticated, couple member)
- User B: Partner (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple
- User A has a shared note visible to both

#### Steps

1. [User A] Navigate to /notes
2. [User B] Navigate to /notes
3. [User B] Verify: can see User A's shared note (e.g., "Weekend Plans")
4. [User A] Open "Weekend Plans" note for editing
5. [User A] Change privacy from "Shared" to "Private"
6. [User A] Click "Save" -> note updated with private visibility
7. [User A] Verify: note now shows lock icon or "Private" badge
8. [User B] Verify: "Weekend Plans" note disappears from their list (cross-user sync, privacy enforced)
9. [User A] Change privacy back to "Shared"
10. [User A] Click "Save"
11. [User B] Verify: "Weekend Plans" note reappears in their list (cross-user sync)
12. [User B] Click on the note to confirm content is still accessible

---

### Workflow 15: Leave Couple

**Purpose:** Partner A leaves the couple. Partner B remains but couple state changes.

#### Personas

- User A: Leaving partner (authenticated, couple member)
- User B: Remaining partner (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple

#### Steps

1. [User A] Navigate to /settings
2. [User A] Find "Leave Couple" or "Disconnect" option
3. [User A] Click "Leave Couple"
4. [User A] Verify: confirmation dialog appears warning about consequences
5. [User A] Confirm leaving -> couple_id set to NULL on User A's profile
6. [User A] Verify: redirected to /onboarding (no longer part of a couple)
7. [User B] Refresh /dashboard
8. [User B] Verify: partner information no longer shown or shows "Partner left"
9. [User B] Verify: existing couple-scoped data (notes, check-ins, etc.) still accessible
10. [User B] Verify: can send a new invite to re-add a partner

---

### Workflow 16: Optimistic Update Rollback

**Purpose:** A server error causes an optimistic UI update to roll back, showing the correct state.

#### Personas

- User A: Actor experiencing rollback (authenticated, couple member)
- User B: Partner observing (authenticated, couple member)

#### Prerequisites

- Both users logged in with separate browser sessions
- Both users are members of the same couple
- An existing shared note or request visible to both
- Network throttling or server error simulation available

#### Steps

1. [User A] Navigate to /notes
2. [User B] Navigate to /notes
3. [User A] Verify: shared notes are visible (e.g., 3 notes in list)
4. [User A] Simulate network failure (disconnect network or throttle to offline)
5. [User A] Click "Delete" on a shared note
6. [User A] Verify: note disappears immediately from UI (optimistic update)
7. [User A] Wait for server response timeout
8. [User A] Verify: note reappears in the list with error toast (rollback on failure)
9. [User A] Verify: error toast shows appropriate message (e.g., "Failed to delete note")
10. [User B] Verify: note was NEVER removed from their list (server never processed delete)
