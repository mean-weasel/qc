# Browser Workflows

> Workflow documentation for QC (Quality Couple) relationship wellness app
> Last updated: 2026-03-09
> App URL: https://tryqc.co
> Test account: neonwatty@gmail.com

## Quick Reference

| #   | Workflow                              | Purpose                                        | Steps |
| --- | ------------------------------------- | ---------------------------------------------- | ----- |
| 1   | Landing Page Experience               | Verify marketing page, CTAs, responsive layout | 5     |
| 2   | Signup & Onboarding                   | Create account, complete 7-step wizard         | 9     |
| 3   | Login & Navigation                    | Log in, navigate all pages, verify layout      | 5     |
| 4   | Partner Invite Acceptance             | Accept invite token, join couple               | 4     |
| 5   | Dark Mode Toggle                      | Switch themes, verify UI updates               | 3     |
| 6   | Notes CRUD                            | Create, filter, edit, bulk delete notes        | 7     |
| 7   | Check-in Preparation (Bookends)       | Prepare topics before a check-in session       | 5     |
| 8   | Check-in Session                      | Full wizard from warm-up to completion         | 10    |
| 9   | Growth & Milestones                   | Create milestones, timeline, progress, gallery | 7     |
| 10  | Love Languages                        | Add, edit, privacy, discoveries, delete        | 7     |
| 11  | Love Actions                          | Add, complete, filter, delete actions          | 6     |
| 12  | Reminders                             | Create, snooze, toggle, filter, delete         | 6     |
| 13  | Requests                              | Send, respond, convert, delete requests        | 6     |
| 14  | Settings - Profile & Relationship     | Update profile, view partner, resend invite    | 5     |
| 15  | Settings - Session Rules & Categories | Configure check-in rules, manage categories    | 5     |
| 16  | Empty States                          | Verify empty state messaging on all pages      | 4     |
| 17  | Note Editor UX                        | Dialog close, errors, char/tag limits          | 5     |
| 18  | Navigation Mobile                     | Bottom tab bar, More drawer, responsive        | 4     |
| 19  | Real-time Partner Sync                | Verify live sync of partner changes            | 5     |
| 20  | Settings - Notifications & Personal.  | Notification toggles, theme, data export       | 4     |

---

## Core Workflows

### Workflow 1: Landing Page Experience

> Tests the public marketing landing page including hero section, feature grid, social proof, and responsive layout.

**Prerequisites:** Not logged in (or use incognito window).

1. Verify hero section
   - Navigate to https://tryqc.co
   - Verify the hero section loads with a headline, subheading, and illustration/animation
   - Verify a primary CTA button ("Start your journey" or "Sign Up") is visible above the fold
   - Verify a secondary CTA ("Learn more") is visible and scrolls to the features section
   - Verify the navigation bar shows the QC logo on the left and Sign In / Sign Up links on the right

2. Verify feature grid
   - Scroll down to the feature grid section (or click "Learn more")
   - Verify feature cards load with icons, titles, and short descriptions
   - Verify feature pill buttons are visible (MessageCircle, Heart, TrendingUp icons)
   - Verify each card has a hover state with subtle elevation or color change

3. Verify additional sections
   - Scroll to the "How It Works" section
   - Verify step-by-step explanation with numbered items
   - Scroll to the social proof section
   - Verify testimonials or metrics are displayed
   - Scroll to the footer
   - Verify footer links are present: Privacy Policy (/privacy), Terms of Service (/terms)

4. Verify CTAs navigate correctly
   - Click the primary "Start your journey" / Sign Up button
   - Verify navigation to /signup
   - Navigate back to /
   - Click "Sign In" in the navigation bar
   - Verify navigation to /login

5. Verify web platform conventions
   - Verify the page loads quickly with no layout shift
   - Verify no auto-playing video or audio
   - Verify scroll animations are subtle and don't block content
   - Verify responsive layout: resize to 375px width and verify single-column stacking
   - Verify responsive layout: resize to 1280px width and verify multi-column grid
   - Verify the page is fully functional without relying on JavaScript for core content visibility

---

### Workflow 2: Signup & Onboarding

> Tests the complete new user journey from account creation through the 7-step onboarding wizard to landing on the dashboard.

**Prerequisites:** A fresh email address not already registered. Email confirmation is disabled in Supabase auth settings.

1. Navigate to signup page
   - Navigate to https://tryqc.co/signup
   - Verify the "Create your account" heading is visible
   - Verify the form has Display name, Email, and Password fields
   - Verify OAuth buttons (Google, GitHub) are visible with a divider ("or continue with")
   - Verify a "Sign in" link to /login is present at the bottom
   - Verify autofocus is on the first input field

2. Fill out and submit the signup form
   - Type a display name in the "Display name" field
   - Type a valid email address in the "Email" field
   - Type a password (at least 8 characters) in the "Password" field
   - Click the "Create account" button
   - Verify the button shows a loading state during submission
   - Verify the "Check your email" confirmation screen appears with the entered email

3. Log in with the new account
   - Navigate to https://tryqc.co/login
   - Type the email used in step 2 in the "Email" field
   - Type the password used in step 2 in the "Password" field
   - Click the "Sign in" button
   - Verify redirect to /onboarding (since user has no couple yet)

4. Onboarding Step 1 - Display name
   - Verify the onboarding page loads with a progress indicator showing step 1 of 7
   - Verify the display name field is pre-filled from signup
   - Confirm or edit the display name
   - Click "Continue"
   - Verify the progress indicator advances to step 2

5. Onboarding Step 2 - Partner email
   - Verify the partner email step is shown
   - Type a partner email address (any valid email format)
   - Click "Continue"
   - Verify the progress indicator advances to step 3

6. Onboarding Step 3 - Relationship date
   - Verify the relationship start date step is shown
   - Optionally select a date using the date picker
   - Click "Continue"

7. Onboarding Steps 4-5 - Love languages & preferences
   - Verify the love languages quiz step is shown (step 4)
   - Select love language preferences from the options presented
   - Click "Continue"
   - Verify the preferences quiz step is shown (step 5)
   - Answer preference questions
   - Click "Continue"

8. Onboarding Steps 6-7 - Reminders & tour
   - Verify the reminder setup step is shown (step 6)
   - Optionally configure a default check-in reminder
   - Click "Continue"
   - Verify the tour step is shown (step 7)
   - Review the app tour highlights
   - Click "Get Started" or the final submit button

9. Verify onboarding completion
   - Verify redirect to /dashboard
   - Verify the dashboard loads with the QC sidebar navigation
   - Verify the user's display name appears in the header
   - Verify the partner invite was sent (check couple_invites table or verify invite UI in settings)
   - Verify browser back button from dashboard does not return to onboarding

---

### Workflow 3: Login & Navigation

> Tests logging in with an existing account and navigating through all sidebar pages to verify layout and accessibility.

**Prerequisites:** An existing account with a couple (e.g., neonwatty@gmail.com).

1. Log in to existing account
   - Navigate to https://tryqc.co/login
   - Verify the email and password fields accept browser autofill
   - Type email in the "Email" field
   - Type password in the "Password" field
   - Click "Sign in"
   - Verify the button shows a loading state
   - Verify redirect to /dashboard
   - Verify the sidebar navigation is visible with all 8 items

2. Navigate through main pages (first 4)
   - Click "Dashboard" in the sidebar
   - Verify the Dashboard page loads with stats cards and quick actions grid
   - Verify the URL is /dashboard
   - Click "Check-in" in the sidebar
   - Verify the Check-in page loads with category cards and "Start Now" button
   - Verify the URL is /checkin
   - Click "Notes" in the sidebar
   - Verify the Notes page loads with search bar and filter pills (All/Shared/Private/Drafts)
   - Verify the URL is /notes
   - Click "Growth" in the sidebar
   - Verify the Growth page loads with view toggles (Timeline/Progress/Memories)
   - Verify the URL is /growth

3. Navigate remaining pages
   - Click "Reminders" in the sidebar
   - Verify the Reminders page loads with "New Reminder" button
   - Verify the URL is /reminders
   - Click "Love Languages" in the sidebar
   - Verify the Love Languages page loads with "My Languages" / "Partner's" / "Discoveries" tabs
   - Verify the URL is /love-languages
   - Click "Requests" in the sidebar
   - Verify the Requests page loads with "Received" / "Sent" tabs
   - Verify the URL is /requests
   - Click "Settings" in the sidebar
   - Verify the Settings page loads with Profile / Relationship / Session Rules tabs
   - Verify the URL is /settings

4. Verify header elements
   - Verify the QC heart logo and "QC" text are visible in the header
   - Verify the theme toggle (sun/moon icon) is visible
   - Verify the user avatar pair (overlapping circles with initials) is in the header
   - Verify the user's display name is shown (desktop only)

5. Verify web platform conventions
   - Verify all interactive elements have hover states (buttons, nav items, cards)
   - Verify browser back button works correctly between pages
   - Verify the URL updates when navigating to each page
   - Verify each page URL is deep-linkable (reload the page and verify it loads correctly)
   - Verify keyboard navigation: Tab moves through sidebar items logically

---

### Workflow 4: Partner Invite Acceptance

> Tests the invite link flow for a partner joining an existing couple.

**Prerequisites:** A valid invite token from a completed onboarding. Check couple_invites table for a pending token.

1. Navigate to the invite link
   - Navigate to https://tryqc.co/invite/{token}
   - If not logged in: verify redirect to signup page with redirect param back to invite
   - If logged in: verify the invite acceptance page loads

2. Verify invite details
   - Verify the inviter's name is displayed
   - Verify an "Accept Invite" or "Join" button is visible
   - Verify the couple name or relationship context is shown

3. Accept the invite
   - Click the accept/join button
   - Verify the button shows a loading state
   - Verify redirect to /dashboard after acceptance
   - Verify the couple data loads (partner info visible in header avatar pair)

4. Verify couple connection
   - Navigate to /settings
   - Click the "Relationship" tab
   - Verify the partner's name appears
   - Verify the couple name and relationship start date are shown
   - Navigate to /dashboard
   - Verify stats and quick actions are available

---

### Workflow 5: Dark Mode Toggle

> Tests switching between light and dark themes and verifying persistence.

1. Verify initial theme state
   - Navigate to https://tryqc.co/dashboard
   - Note the current theme (light or dark based on system preference)
   - Verify the theme toggle icon is visible in the header (sun or moon icon)

2. Toggle to opposite theme
   - Click the theme toggle button in the header
   - Verify the background color changes (light: white/gray, dark: dark gray/black)
   - Verify text colors invert appropriately
   - Verify sidebar colors update
   - Verify card/widget backgrounds update
   - Verify there is no flash of unstyled content during transition

3. Toggle back and verify persistence
   - Click the theme toggle again
   - Verify the theme returns to the original state
   - Reload the page
   - Verify the theme persists after reload (stored in localStorage/cookie)

---

## Feature Workflows

### Workflow 6: Notes CRUD

> Tests the full lifecycle of notes: create, read, filter, edit, bulk delete with tags and privacy settings.

**Prerequisites:** Logged in with an active couple.

1. Navigate to Notes page
   - Click "Notes" in the sidebar
   - Verify the Notes page loads
   - Verify the filter pills are visible: All, Shared, Private, Drafts
   - Verify the "+ New Note" button is visible (gradient pink/coral)
   - Verify the search bar is present

2. Create a shared note
   - Click the "+ New Note" button
   - Verify the New Note dialog/modal opens with animation
   - Verify the privacy selector shows: Shared, Private, Draft
   - Click "Shared" in the privacy selector
   - Click in the textarea and type "This is a test shared note"
   - Click in the "Add tags" input and type "test" then press Enter
   - Verify the tag "#test" appears as a badge
   - Verify the word count shows "7 words" and character count updates
   - Click the "Save" button
   - Verify the dialog closes automatically
   - Verify a success toast appears
   - Verify the note appears in the note list as a card with "Shared" badge

3. Create a private note
   - Click "+ New Note"
   - Click "Private" in the privacy selector
   - Type "This is a private note" in the textarea
   - Click "Save"
   - Verify the dialog closes
   - Verify the note appears with a "Private" badge and lock icon

4. Create a draft note
   - Click "+ New Note"
   - Verify "Draft" is the default privacy selection
   - Type "This is a draft" in the textarea
   - Click "Save"
   - Verify the note appears with "Draft" badge

5. Filter notes by privacy
   - Click "Shared" filter pill
   - Verify only the shared note is visible
   - Click "Private" filter pill
   - Verify only the private note is visible
   - Click "Drafts" filter pill
   - Verify only the draft note is visible
   - Click "All" filter pill
   - Verify all three notes are visible

6. Edit a note
   - Click on the shared note card to open it
   - Verify the Edit Note dialog opens with existing content pre-filled
   - Clear the text and type "Updated shared note content"
   - Click "Update"
   - Verify the dialog closes
   - Verify the note card shows the updated content

7. Delete notes
   - Hover over the draft note card
   - Verify a delete (trash) icon appears
   - Click the delete icon
   - Verify the note is removed from the list
   - Verify the note count decreases

---

### Workflow 7: Check-in Preparation (Bookends)

> Tests the pre-check-in topic preparation flow including quick topics, custom topics, and agenda preview.

**Prerequisites:** Logged in with an active couple.

1. Open preparation modal
   - Navigate to /checkin
   - Verify the "Prepare Topics" button is visible (with FileText icon)
   - Click "Prepare Topics"
   - Verify the Preparation Modal dialog opens with animation
   - Verify the title "Prepare for Your Check-In" is visible

2. Select quick topics
   - Verify quick topic suggestion chips are displayed in a grid (10-15 options)
   - Click on 2-3 suggested topic chips
   - Verify selected topics show a checkmark and pink highlight
   - Verify selected topics appear in the "My Topics" list below
   - Verify the chip becomes disabled after selection (can't add duplicates)

3. Add custom topics
   - Locate the custom topic text input
   - Type "Our weekend plans" and press Enter (or click "Add Custom Topic")
   - Verify the custom topic appears in the "My Topics" list
   - Type another custom topic and add it
   - Verify the list updates with both custom and pre-selected topics

4. Manage topic list
   - Verify each topic in "My Topics" has a remove button (X icon)
   - Click the X on one topic
   - Verify it is removed from the list with animation
   - Verify the Agenda Preview section updates (my topics count, estimated time)
   - If partner has prepared topics: verify "Partner Topics" section shows their topics (read-only)

5. Start check-in with topics
   - Verify the "Start Check-In with Topics" button is enabled (requires at least 1 topic)
   - Verify the "Save for Later" button is also visible (outline variant)
   - Click "Start Check-In with Topics"
   - Verify the check-in session starts with prepared topics available
   - Verify the badge on the check-in page shows the prepared topic count

---

### Workflow 8: Check-in Session

> Tests the full check-in wizard from warm-up through completion celebration.

**Prerequisites:** Logged in with an active couple. Session settings configured via SessionSettingsContext.

1. Navigate to Check-in page
   - Click "Check-in" in the sidebar
   - Verify the check-in landing page loads
   - Verify category cards are visible (Emotional Connection, Communication, Physical & Emotional Intimacy, Shared Goals & Future)
   - Verify Session Rules Card shows current settings with "Configure" link
   - Verify "Prepare Topics" and "Start Now" buttons are present

2. Start the check-in session
   - Click "Start Now"
   - Verify the wizard loads at the category selection step
   - Verify the ProgressBar shows the current step highlighted

3. Select categories
   - Click on "Emotional Connection" category card
   - Verify it shows a selected state (visual highlight, checkmark)
   - Click on "Communication" category card
   - Verify both are selected
   - Click "Continue" via NavigationControls
   - Verify transition to the next step with smooth animation

4. Warm-up questions (if enabled)
   - If warm-up questions are enabled in session settings:
   - Verify the warm-up step loads with an icebreaker question
   - Verify the SessionTimer is visible and running
   - Type a response or click "Save & Continue"
   - Verify progression to the Discussion step

5. Category discussion
   - Verify the discussion step loads for the first selected category
   - Verify the category name, icon, and description are displayed
   - Verify a discussion prompt card is shown
   - Click "Shuffle" button to get a different prompt
   - Verify the prompt changes with animation
   - Verify NoteTabs show "Private" and "Shared" tabs
   - Click "Private" tab and type a private note in the textarea
   - Click "Shared" tab and type a shared note
   - Verify auto-save indicator or click "Save Progress"
   - Click "Complete Discussion" (green checkmark)

6. Second category discussion (if multiple selected)
   - Verify the discussion step loads for the second category
   - Repeat discussion flow: read prompt, take notes, complete
   - Click "Continue to Reflection" via NavigationControls

7. Reflection step
   - Verify the reflection step loads
   - Verify a "Write a Reflection" button is visible
   - Click "Write a Reflection"
   - Verify the ReflectionForm opens
   - Select a "before" mood emoji (e.g., the happy face)
   - Select an "after" mood emoji
   - Type something in the gratitude textarea
   - Type something in the key takeaway textarea
   - Toggle the "Share with partner" switch
   - Click "Save Reflection"
   - Verify the saved confirmation appears

8. Action items step
   - Verify the action items step loads
   - Click "Add Action Item"
   - Type an action item title (e.g., "Plan date night this week")
   - Verify it appears in the list
   - Toggle the action item checkbox to mark it complete
   - Verify the completed count updates in the summary card
   - Click "Continue"

9. Completion celebration
   - Verify the CompletionCelebration screen loads with animation
   - Verify session stats are displayed (duration, categories discussed, notes count, action items)
   - Verify "Back to Dashboard" and "Start Another" buttons are visible
   - Click "Back to Dashboard"
   - Verify redirect to /dashboard

10. Verify check-in was recorded
    - Navigate to /dashboard
    - Verify the check-in count stat has increased
    - Verify the streak counter updated (if applicable)
    - Verify the recent activity feed shows the completed check-in

---

### Workflow 9: Growth & Milestones

> Tests creating milestones, viewing timeline/progress/gallery, and managing growth tracking.

**Prerequisites:** Logged in with an active couple.

1. Navigate to Growth page
   - Click "Growth" in the sidebar
   - Verify the Growth page loads
   - Verify stats tiles show (milestones reached, in progress, total points, photos)
   - Verify growth progress bars are visible with category scores and percentages
   - Verify the "New Milestone" button is visible

2. Create a milestone
   - Click "New Milestone"
   - Verify the MilestoneCreator modal opens with animation
   - Type "First Check-in Together" in the title field
   - Type a description in the description field
   - Select a category from the category grid (celebration, love, achievement, etc.)
   - Select a rarity level (common, uncommon, rare, legendary, mythic)
   - Adjust the points slider (5-100 in 5-step increments)
   - Optionally select an emoji or upload a photo
   - Click "Create Milestone"
   - Verify success celebration overlay appears
   - Verify the milestone appears in the timeline view

3. View Timeline
   - Verify the Timeline view shows milestones grouped by month
   - Verify each milestone card shows title, description, category icon, rarity badge, points, and date
   - Click on a milestone card
   - Verify details expand or a detail view opens

4. View Progress
   - Click "Progress" view toggle
   - Verify growth progress bars update with category scores
   - Verify the mood history chart renders with data points from check-ins
   - Hover over a chart data point (desktop)
   - Verify tooltip shows mood value and date

5. View Memories (Photo Gallery)
   - Click "Memories" view toggle
   - Verify the photo gallery view loads
   - Verify filter buttons (All, Photos) are present
   - If photos exist: click on a photo card
   - Verify the lightbox dialog opens with full image, description, date, and rarity badge
   - Verify the lightbox can be closed with X button or Escape key
   - Close the lightbox

6. Upload a photo to a milestone
   - [MANUAL] Click "Add Memory" or edit an existing milestone
   - [MANUAL] Select a photo file from the file picker dialog
   - Note: File upload dialogs cannot be automated by Claude-in-Chrome
   - Verify the photo appears in the milestone card after upload
   - Verify the photo count stat tile updates

7. Verify web platform conventions
   - Verify timeline is scrollable and loads older milestones
   - Verify chart has axis labels and is readable
   - Verify photo thumbnails lazy-load (skeleton then image)
   - Verify responsive layout: cards stack on mobile, chart adapts to viewport

---

### Workflow 10: Love Languages

> Tests adding, editing, toggling privacy, viewing discoveries, and deleting love languages.

**Prerequisites:** Logged in with an active couple.

1. Navigate to Love Languages page
   - Click "Love Languages" in the sidebar
   - Verify the page loads with "My Languages", "Partner's", and "Discoveries" tabs
   - Verify "Add Language" button is visible (Plus icon)

2. Add a love language
   - Click "Add Language"
   - Verify the AddLanguageDialog opens
   - Type "Words of Affirmation" in the title field
   - Type "I feel loved when my partner tells me how they feel" in the description
   - Select "Words of Affirmation" from the category dropdown (words, acts, gifts, time, touch, custom)
   - Select "High" importance
   - Select "Shared" privacy
   - Type an example in the examples input and click Add
   - Type a tag and click Add
   - Click "Add Love Language"
   - Verify the dialog closes
   - Verify the language card appears under "My Languages" in the "Shared with Partner" group

3. Edit a love language
   - Click the Edit button on the newly created language card
   - Verify the dialog opens with existing data pre-filled
   - Change the importance to "Essential"
   - Click "Save Changes"
   - Verify the card updates to show the new importance level (red badge)

4. Toggle privacy
   - Click the Lock/Unlock toggle on the language card
   - Verify the privacy changes from "Shared" to "Private" (lock icon appears)
   - Click "Partner's" tab
   - Verify the language no longer appears (it's now private)
   - Click "My Languages" tab and toggle back to shared

5. View partner's languages
   - Click "Partner's" tab
   - Verify partner's shared languages are displayed (if any)
   - If partner has a language: verify "Suggest Action" button is present on each card
   - Click "Suggest Action" on a partner's language
   - Verify navigation to /love-languages/actions with ?languageId= query param

6. View and manage discoveries
   - Click "Discoveries" tab
   - Verify any auto-generated discoveries from check-ins are shown as DiscoveryCards
   - If a discovery exists: verify "Convert to Language" button is present
   - Click "Convert to Language" on a discovery
   - Verify the ConvertDiscoveryDialog opens pre-filled with discovery data
   - Complete the form and save
   - Verify the discovery is marked as converted (converted_to_language_id set)
   - Verify a new love language card appears under "My Languages"

7. Delete a love language
   - Click the Delete button on a language card
   - Verify a confirmation dialog appears
   - Confirm deletion
   - Verify the card is removed from the list with animation

---

### Workflow 11: Love Actions

> Tests adding, completing, filtering, and deleting love actions.

**Prerequisites:** Logged in with an active couple. At least one love language exists.

1. Navigate to Love Actions page
   - Navigate to https://tryqc.co/love-languages/actions
   - Verify the page loads with tab filters: Pending, Recurring, Completed
   - Verify "Add Action" button is visible

2. Add a love action
   - Click "Add Action"
   - Verify the AddActionDialog opens
   - Type "Write a love letter" in the title field
   - Type a description
   - Select a linked love language from the dropdown
   - Select "Planned" status
   - Select "Once" frequency
   - Select "Easy" difficulty
   - Click "Add Action"
   - Verify the dialog closes
   - Verify the action card appears in the Pending tab

3. Edit an action
   - Click the Edit button on the action card
   - Change difficulty to "Moderate"
   - Click "Save Changes"
   - Verify the card updates with the new difficulty indicator

4. Complete an action
   - Click "Mark Complete" on a pending action card
   - Verify the action moves from Pending to Completed tab
   - Click the "Completed" tab
   - Verify the action appears there with completion info (completed_count, last_completed_at)

5. Filter by status tabs
   - Click "Pending" tab - verify only pending actions show
   - Click "Recurring" tab - verify only recurring actions show (or empty state)
   - Click "Completed" tab - verify only completed actions show

6. Delete an action
   - Click the Delete button on an action card
   - Confirm deletion
   - Verify the card is removed

---

### Workflow 12: Reminders

> Tests creating, snoozing, toggling, filtering, and deleting reminders.

**Prerequisites:** Logged in with an active couple.

1. Navigate to Reminders page
   - Click "Reminders" in the sidebar
   - Verify the page loads
   - Verify filter tabs: All, Upcoming, Overdue, Completed
   - Verify "New Reminder" button is visible

2. Create a reminder
   - Click "New Reminder"
   - Verify the ReminderForm appears
   - Type "Weekly check-in reminder" in the title field (200 chars max)
   - Type "Time to check in with your partner!" in the message field (1000 chars max)
   - Select "Check-in" from the category dropdown (habit, check-in, action-item, special-date, custom)
   - Select "Weekly" from the frequency dropdown (once, daily, weekly, monthly)
   - Set a date/time in the "Scheduled For" datetime-local input
   - Select "Both" from the notification channel dropdown (in-app, email, both, none)
   - Select "Both" from the assign-to dropdown (Both, Me, Partner)
   - Click "Create Reminder"
   - Verify the form closes
   - Verify the reminder card appears in the list with correct details

3. Toggle reminder active/inactive
   - Click the toggle/pause button on the reminder card
   - Verify the reminder shows as inactive/paused state
   - Verify it disappears from "Upcoming" filter and appears under appropriate inactive view
   - Click "All" filter
   - Click "Resume" on the paused reminder
   - Verify it shows as active again

4. Snooze a reminder
   - Click "Snooze" on an active reminder
   - Select a snooze duration (15 min, 1 hour, tomorrow)
   - Verify the reminder shows a snoozed indicator with snooze-until time
   - Click "Unsnooze" to clear the snooze
   - Verify the reminder returns to its normal scheduled state

5. Filter reminders
   - Click "Upcoming" tab - verify only upcoming active reminders show
   - Click "Overdue" tab - verify only past-due reminders show (if any)
   - Click "Completed" tab - verify only completed reminders show
   - Click "All" tab - verify all reminders show

6. Delete a reminder
   - Click "Delete" on a reminder card
   - Verify the reminder is removed from the list
   - Verify the count updates

---

### Workflow 13: Requests

> Tests sending, responding to, converting, and deleting partner requests.

**Prerequisites:** Logged in with an active couple that has both partners.

1. Navigate to Requests page
   - Click "Requests" in the sidebar
   - Verify the page loads with "Received" and "Sent" tabs
   - Verify "New Request" button is visible

2. Create a new request
   - Click "New Request"
   - Verify the RequestForm appears
   - Type "Date Night This Weekend" in the title field (200 chars max)
   - Type "Let's try that new restaurant downtown" in the description field (2000 chars max)
   - Select "Date Night" from the category dropdown (activity, task, reminder, conversation, date-night, custom)
   - Select "Medium" priority (low, medium, high)
   - Optionally set a suggested date
   - Click "Send Request"
   - Verify the form closes
   - Click "Sent" tab
   - Verify the new request appears with "Pending" status

3. View received requests
   - Click "Received" tab
   - Verify any received requests from partner are shown
   - If a pending request exists: verify "Accept" and "Decline" buttons are visible
   - Verify the Accept button is visually prominent (primary style)

4. Respond to a request
   - Click "Accept" on a received pending request
   - Verify the request status changes to "Accepted" immediately (optimistic UI)
   - Verify the Accept/Decline buttons are no longer visible for that request

5. Convert request to reminder
   - If an accepted request exists: look for a "Convert to Reminder" option
   - Click the convert option
   - Verify the request status changes to "Converted"
   - Navigate to /reminders
   - Verify a new reminder was created from the request details

6. Delete a sent request
   - Navigate back to /requests
   - Click "Sent" tab
   - Click "Delete" on a sent request
   - Verify the request is removed from the list

---

### Workflow 14: Settings - Profile & Relationship

> Tests profile editing, relationship info, and partner invite management.

**Prerequisites:** Logged in with an active couple.

1. Navigate to Settings page
   - Click "Settings" in the sidebar
   - Verify the Settings page loads
   - Verify tabs are visible: Profile, Relationship, Session Rules (and others)

2. Update profile settings
   - Click "Profile" tab (should be default)
   - Verify email field is shown (read-only/disabled)
   - Verify display name field is editable
   - Clear the display name and type a new name
   - Optionally update the avatar URL field
   - Click "Save Profile"
   - Verify success toast appears
   - Verify the header updates with the new display name

3. View relationship settings
   - Click "Relationship" tab
   - Verify couple name is displayed
   - Verify relationship start date is displayed (if set)
   - Verify partner info is shown (name, or "Pending invite" if partner hasn't joined)

4. Resend invite (if applicable)
   - If "Resend Invite" button is visible (partner hasn't accepted yet):
   - Click "Resend Invite"
   - Verify success feedback or the invite status updates
   - Verify the pending invite email is displayed
   - If "Cancel Invite" button is visible: note its presence (don't click unless testing)

5. Verify settings persistence
   - Reload the page
   - Navigate back to Settings > Profile
   - Verify the saved display name persisted
   - Navigate to Relationship tab
   - Verify relationship data persisted

---

### Workflow 15: Settings - Session Rules & Categories

> Tests configuring check-in session rules and managing custom categories.

**Prerequisites:** Logged in with an active couple.

1. Navigate to Session Rules
   - Click "Settings" in the sidebar
   - Click "Session Rules" tab
   - Verify the session settings form loads

2. Configure session rules
   - Verify session duration input (5-60 min range)
   - Change the session duration value
   - Verify timeouts per partner input (0-5 range)
   - Verify timeout duration input (1-10 min range)
   - Verify cool down time input (0-15 min range)
   - Toggle the "Turn-based mode" switch
   - If turn-based is enabled: verify turn duration input appears (30-600s)
   - Toggle "Allow extensions" switch
   - Toggle "Warm-up questions" switch
   - Toggle "Pause notifications" switch
   - Toggle "Auto-save drafts" switch
   - Click "Save Session Rules"
   - Verify success toast appears

3. Verify session rules persistence
   - Reload the page
   - Navigate back to Settings > Session Rules
   - Verify all saved values persisted (duration, toggles, etc.)

4. Manage custom categories
   - Navigate to the Categories section (may be a separate tab or within Session Rules)
   - Verify system categories are listed (Emotional Connection, Communication, etc.)
   - Click "Add Category"
   - Verify the CategoryFormDialog opens
   - Type a category name (1-100 chars)
   - Type a description (optional, max 500 chars)
   - Type an icon (max 2 chars, e.g., an emoji)
   - Click "Save"
   - Verify the new category appears in the list
   - Click "Edit" on the new category
   - Change the name and save
   - Verify the card updates

5. Toggle category active/inactive
   - Click the toggle on a custom category
   - Verify it shows as inactive
   - Verify inactive categories are visually distinct
   - Toggle it back to active

---

## Edge Case Workflows

### Workflow 16: Empty States

> Verifies all pages display appropriate empty state messaging when no data exists.

**Prerequisites:** A newly onboarded couple with no data created yet.

1. Verify dashboard empty state
   - Navigate to /dashboard
   - Verify stat cards show zero counts (0 check-ins, 0 notes, etc.)
   - Verify streak display shows 0 with appropriate messaging
   - Verify quick action cards are still clickable and navigate correctly
   - Verify the prep banner suggests starting a check-in

2. Verify list pages empty states
   - Navigate to /notes
   - Verify empty state with illustration/icon + "No notes found" or similar message
   - Verify CTA to create first note is present and clickable
   - Navigate to /growth
   - Verify empty timeline with encouraging message and "New Milestone" CTA
   - Verify progress bars show 0% with category labels still visible
   - Navigate to /reminders
   - Verify empty state when no reminders exist with "New Reminder" CTA

3. Verify relationship features empty states
   - Navigate to /love-languages
   - Verify "No Love Languages Yet" card under "My Languages"
   - Verify "Add Your First Love Language" button is present
   - Click "Partner's" tab
   - Verify empty state message about partner's languages
   - Click "Discoveries" tab
   - Verify empty state for no discoveries
   - Navigate to /love-languages/actions
   - Verify "Add Your First Action" empty state
   - Navigate to /requests
   - Verify empty received and sent tabs with appropriate messaging

4. Verify check-in empty state
   - Navigate to /checkin
   - Verify category cards are still interactive even with no prior check-ins
   - Verify "Start Now" button works from a clean state
   - Verify "Recent Check-ins" section shows empty state or is hidden

---

### Workflow 17: Note Editor UX

> Tests NoteEditor dialog behavior including auto-close, error handling, and input limits.

**Prerequisites:** Logged in with an active couple.

1. Verify dialog opens and closes properly
   - Navigate to /notes
   - Click "+ New Note"
   - Verify dialog opens with animation
   - Click "Cancel"
   - Verify dialog closes
   - Click "+ New Note" again
   - Click the X button in the top-right corner
   - Verify dialog closes
   - Click "+ New Note" again
   - Click the dark overlay outside the dialog
   - Verify dialog closes
   - Press Escape key
   - Verify dialog closes (if it was open)

2. Verify auto-close on successful save
   - Click "+ New Note"
   - Type "Auto-close test note" in the textarea
   - Click "Save"
   - Verify the dialog closes automatically (not staying open)
   - Verify a success toast appears
   - Verify the new note appears in the list

3. Verify character count and limits
   - Click "+ New Note"
   - Type a short message
   - Verify the word count updates (bottom-left of dialog)
   - Verify the character count shows "X/5000"
   - Verify the Save button is enabled when content exists
   - Clear the textarea
   - Verify the Save button is disabled when no content

4. Verify tag management
   - Click "+ New Note"
   - Type "tag1" in the tags input and press Enter
   - Verify "#tag1" appears as a badge
   - Type "TAG1" and press Enter
   - Verify duplicate tags are rejected (case-insensitive)
   - Add tags until reaching 10 tags
   - Verify additional tags cannot be added after 10
   - Click the X on a tag badge
   - Verify the tag is removed

5. Verify privacy selector
   - Click "+ New Note"
   - Verify "Draft" is the default privacy
   - Click "Shared" - verify it highlights
   - Click "Private" - verify it highlights and Shared deselects
   - Type content and click "Save"
   - Verify the saved note has the correct privacy badge

---

### Workflow 18: Navigation Mobile

> Tests mobile navigation patterns including bottom tab bar and More drawer.

**Prerequisites:** Logged in with an active couple. Browser viewport resized to mobile width (< 1024px).

1. Verify mobile bottom navigation
   - Resize browser viewport to 375px width (mobile)
   - Navigate to /dashboard
   - Verify the fixed bottom tab bar appears with 4 items + More button
   - Verify visible items: Dashboard, Check-in, Notes, Growth (each with icon + label)
   - Verify the sidebar is hidden on mobile
   - Verify the active tab (Dashboard) is visually highlighted
   - Click "Check-in" in bottom bar
   - Verify navigation to /checkin
   - Verify the active tab updates to Check-in

2. Verify More drawer
   - Click the "More" button in the bottom tab bar
   - Verify a slide-in drawer opens from the right side (width ~256px)
   - Verify all 8 navigation items are listed with icons: Dashboard, Check-in, Notes, Growth, Reminders, Love Languages, Requests, Settings
   - Verify "Sign Out" button is at the bottom of the drawer
   - Click "Reminders" in the drawer
   - Verify navigation to /reminders
   - Verify the drawer closes after selection
   - Verify the URL updates to /reminders

3. Verify responsive breakpoint transition
   - Resize browser viewport to 1200px width (desktop)
   - Verify the sidebar navigation appears on the left
   - Verify the bottom tab bar disappears
   - Resize back to 375px
   - Verify the bottom tab bar reappears
   - Verify the sidebar hides

4. Verify web platform conventions on mobile
   - Verify all interactive elements have adequate touch target size (min 44x44px)
   - Verify the browser back button works correctly on mobile
   - Verify URLs still update when navigating via bottom tab or More drawer
   - Verify scrolling works properly on long content pages
   - Verify the bottom tab bar does not overlap with iOS Safari's bottom toolbar (safe area inset)
   - Verify the drawer closes on backdrop tap

---

### Workflow 19: Real-time Partner Sync

> Tests that changes made by one partner appear live for the other partner via Supabase Realtime.

**Prerequisites:** Two browser sessions logged in as both partners of the same couple (use two browser windows or incognito).

1. Test notes real-time sync
   - In Partner A's browser: navigate to /notes
   - In Partner B's browser: navigate to /notes
   - In Partner A's browser: create a new shared note "Real-time test note"
   - In Partner B's browser: verify the new note appears in the list without page refresh
   - In Partner A's browser: edit the note content
   - In Partner B's browser: verify the updated content appears

2. Test requests real-time sync
   - In Partner A's browser: navigate to /requests
   - In Partner B's browser: navigate to /requests
   - In Partner A's browser: create a new request for Partner B
   - In Partner B's browser: verify the request appears in "Received" tab without refresh
   - In Partner B's browser: accept the request
   - In Partner A's browser: verify the request status updates to "Accepted" in "Sent" tab

3. Test love languages real-time sync
   - In Partner A's browser: navigate to /love-languages
   - In Partner B's browser: navigate to /love-languages
   - In Partner A's browser: add a new shared love language
   - In Partner B's browser: click "Partner's" tab
   - Verify the new love language appears without refresh

4. Test action items real-time sync
   - Start a check-in in Partner A's browser and add action items
   - In Partner B's browser: verify action items appear in real-time
   - In Partner B's browser: toggle an action item as complete
   - In Partner A's browser: verify the completion status updates

5. Test milestones real-time sync
   - In Partner A's browser: navigate to /growth
   - In Partner B's browser: navigate to /growth
   - In Partner A's browser: create a new milestone
   - In Partner B's browser: verify the milestone appears in the timeline without refresh

---

### Workflow 20: Settings - Notifications & Personalization

> Tests notification preferences, theme selection, and data export functionality.

**Prerequisites:** Logged in with an active couple.

1. Configure notification settings
   - Navigate to /settings
   - Click the "Notifications" tab (or find notification settings section)
   - Verify email notification toggle is present
   - Toggle email notifications on/off and verify state change
   - Verify in-app notification toggle is present
   - Toggle in-app notifications
   - Verify reminder email frequency dropdown (if present)
   - Verify digest email toggle (if present)
   - Verify Do Not Disturb time range picker (if present)
   - Verify changes save (auto-save with toast, or explicit Save button)

2. Personalization settings
   - Navigate to the Personalization section/tab
   - Verify Theme Selector is present (Light/Dark/System options)
   - Select "Dark" theme
   - Verify the app immediately switches to dark mode
   - Select "System" theme
   - Verify the app follows system preference
   - Verify haptic feedback toggle (if present)
   - Verify language/date format selectors (if present)

3. Privacy and data export
   - Navigate to the Privacy section/tab
   - Verify "Export Data" button is present
   - Click "Export Data"
   - [MANUAL] Verify the download dialog appears with CSV/JSON export
   - Note: File download dialogs cannot be automated
   - Verify Privacy Policy link navigates to /privacy
   - Verify Terms of Service link navigates to /terms
   - Verify "Delete Account" button is present in a danger zone section
   - Do NOT click Delete Account (destructive action)

4. Verify settings persistence
   - Reload the page
   - Navigate back to notification settings
   - Verify toggled notification preferences persisted
   - Navigate to personalization
   - Verify theme selection persisted
