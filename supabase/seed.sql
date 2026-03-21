-- =============================================================================
-- QC Seed Data for Local Development
-- =============================================================================
-- Creates a full test scenario with two users (Alice & Bob) in a couple,
-- plus check-ins, notes, action items, milestones, love languages, reminders,
-- requests, and session settings.
--
-- Fixed UUIDs for predictable E2E test references:
--   User A (Alice):  aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
--   User B (Bob):    bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
--   Couple:          cccccccc-cccc-4ccc-8ccc-cccccccccccc
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Auth Users
-- -----------------------------------------------------------------------------
-- Insert directly into auth.users for local Supabase.
-- The on_auth_user_created trigger will auto-create profiles,
-- and on_profile_created trigger will auto-create subscriptions.
-- -----------------------------------------------------------------------------

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'alice@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Alice"}'::jsonb,
    now(),
    now(),
    '', '', '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'bob@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Bob"}'::jsonb,
    now(),
    now(),
    '', '', '', '', '', '', '', ''
  ),
  -- User C (Charlie): no couple, used for onboarding E2E tests
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'authenticated',
    'authenticated',
    'charlie@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Charlie"}'::jsonb,
    now(),
    now(),
    '', '', '', '', '', '', '', ''
  ),
  -- User D (Diana): no couple, used for invite acceptance E2E tests
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'diana@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Diana"}'::jsonb,
    now(),
    now(),
    '', '', '', '', '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- Also insert identities so Supabase auth login works
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"alice@test.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"bob@test.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","email":"charlie@test.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '{"sub":"11111111-1111-4111-8111-111111111111","email":"diana@test.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Couple
-- -----------------------------------------------------------------------------

INSERT INTO public.couples (id, name, relationship_start_date, settings, created_at)
VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'Alice & Bob',
  '2023-06-15',
  '{"theme":"default","notifications":true}'::jsonb,
  now() - INTERVAL '6 months'
)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Link profiles to the couple and set display names
-- -----------------------------------------------------------------------------
-- The trigger from migration 00001 created bare profiles with just id + email.
-- We update them to add display_name, avatar_url, and couple_id.
-- -----------------------------------------------------------------------------

UPDATE public.profiles
SET
  display_name = 'Alice',
  avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
  couple_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

UPDATE public.profiles
SET
  display_name = 'Bob',
  avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
  couple_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

-- -----------------------------------------------------------------------------
-- 4. Couple Invite (accepted -- mirrors the onboarding flow)
-- -----------------------------------------------------------------------------

INSERT INTO public.couple_invites (id, couple_id, invited_by, invited_email, token, status, created_at, expires_at)
VALUES
  -- Accepted invite: Alice invited Bob (already linked)
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bob@test.com',
    'aabbccdd-eeee-4fff-8aaa-bbbbccccdddd',
    'accepted',
    now() - INTERVAL '6 months',
    now() - INTERVAL '5 months 23 days'
  ),
  -- Pending invite: Alice invited Diana (for invite acceptance E2E tests)
  (
    '22222222-2222-4222-8222-222222222222',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'diana@test.com',
    'aabbccdd-1234-4567-8901-aabbccddeeff',
    'pending',
    now(),
    now() + INTERVAL '7 days'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. Check-ins (3 completed sessions)
-- -----------------------------------------------------------------------------
-- Each check-in has categories, mood ratings, and a reflection.
-- Spread over the last few weeks to give the dashboard some history.
-- -----------------------------------------------------------------------------

INSERT INTO public.check_ins (id, couple_id, started_at, completed_at, status, categories, mood_before, mood_after, reflection)
VALUES
  -- Check-in 1: Communication focus, 2 weeks ago
  (
    'a1111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    now() - INTERVAL '14 days',
    now() - INTERVAL '14 days' + INTERVAL '35 minutes',
    'completed',
    ARRAY['communication', 'appreciation'],
    3,
    4,
    'We talked about how we can communicate better when stressed. Agreed to use "I feel" statements more.'
  ),
  -- Check-in 2: Intimacy & quality time, 7 days ago
  (
    'b2222222-2222-4222-8222-222222222222',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    now() - INTERVAL '7 days',
    now() - INTERVAL '7 days' + INTERVAL '25 minutes',
    'completed',
    ARRAY['intimacy', 'quality-time'],
    4,
    5,
    'Great session! We planned a weekly date night and discussed ways to be more present together.'
  ),
  -- Check-in 3: Goals & growth, 2 days ago
  (
    'c3333333-3333-4333-8333-333333333333',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    now() - INTERVAL '2 days',
    now() - INTERVAL '2 days' + INTERVAL '40 minutes',
    'completed',
    ARRAY['goals', 'growth', 'finances'],
    3,
    4,
    'Discussed our savings goals and how to support each other''s personal growth. Feeling aligned.'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. Notes (4 notes -- mix of shared, private, and draft)
-- -----------------------------------------------------------------------------

INSERT INTO public.notes (id, couple_id, author_id, check_in_id, content, privacy, tags, category_id, created_at, updated_at)
VALUES
  -- Shared note from check-in 1
  (
    'aaaa1111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'a1111111-1111-4111-8111-111111111111',
    'We both agreed that pausing before reacting during arguments would help. Alice suggested a 10-second rule.',
    'shared',
    ARRAY['communication', 'conflict-resolution'],
    'communication',
    now() - INTERVAL '14 days',
    now() - INTERVAL '14 days'
  ),
  -- Private note by Bob from check-in 2
  (
    'aaaa2222-2222-4222-8222-222222222222',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'b2222222-2222-4222-8222-222222222222',
    'I want to plan something special for our anniversary. Maybe a weekend getaway?',
    'private',
    ARRAY['date-ideas', 'anniversary'],
    'intimacy',
    now() - INTERVAL '7 days',
    now() - INTERVAL '7 days'
  ),
  -- Shared note from check-in 3
  (
    'aaaa3333-3333-4333-8333-333333333333',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'c3333333-3333-4333-8333-333333333333',
    'Savings target: $5,000 by end of year. Alice will research high-yield accounts, Bob will track monthly expenses.',
    'shared',
    ARRAY['finances', 'goals'],
    'goals',
    now() - INTERVAL '2 days',
    now() - INTERVAL '2 days'
  ),
  -- Standalone draft note (not linked to a check-in)
  (
    'aaaa4444-4444-4444-8444-444444444444',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    NULL,
    'Things I appreciate about Alice: her patience, how she always makes coffee in the morning, her laugh.',
    'draft',
    ARRAY['gratitude', 'appreciation'],
    NULL,
    now() - INTERVAL '1 day',
    now() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. Action Items (3 items -- mix of completed and pending)
-- -----------------------------------------------------------------------------

INSERT INTO public.action_items (id, couple_id, check_in_id, title, description, assigned_to, due_date, completed, completed_at, created_at)
VALUES
  -- Completed: from check-in 1
  (
    'd4444444-4444-4444-8444-444444444444',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'a1111111-1111-4111-8111-111111111111',
    'Practice "I feel" statements this week',
    'Both partners try using "I feel [emotion] when [situation]" format during disagreements.',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    (now() - INTERVAL '7 days')::date,
    true,
    now() - INTERVAL '8 days',
    now() - INTERVAL '14 days'
  ),
  -- Pending: from check-in 2
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'b2222222-2222-4222-8222-222222222222',
    'Plan weekly date night for Friday',
    'Bob picks the restaurant this week. Alternate each week.',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    (now() + INTERVAL '3 days')::date,
    false,
    NULL,
    now() - INTERVAL '7 days'
  ),
  -- Pending: from check-in 3
  (
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'c3333333-3333-4333-8333-333333333333',
    'Research high-yield savings accounts',
    'Compare rates from at least 3 banks and share findings by next check-in.',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    (now() + INTERVAL '5 days')::date,
    false,
    NULL,
    now() - INTERVAL '2 days'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. Milestones (3 milestones -- different categories and rarities)
-- -----------------------------------------------------------------------------

INSERT INTO public.milestones (id, couple_id, title, description, category, icon, achieved_at, rarity, points, photo_url)
VALUES
  -- First check-in milestone
  (
    '55555555-5555-4555-8555-555555555555',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'First Check-In',
    'Completed your very first relationship check-in together.',
    'communication',
    'MessageCircle',
    now() - INTERVAL '14 days',
    'common',
    10,
    NULL
  ),
  -- Anniversary milestone
  (
    '66666666-6666-4666-8666-666666666666',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '6-Month Anniversary',
    'Celebrated 6 months of being together!',
    'milestone',
    'Heart',
    now() - INTERVAL '1 month',
    'rare',
    50,
    NULL
  ),
  -- Growth streak milestone
  (
    '77777777-7777-4777-8777-777777777777',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'Three in a Row',
    'Completed 3 check-ins without missing a scheduled session.',
    'growth',
    'TrendingUp',
    now() - INTERVAL '2 days',
    'epic',
    100,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. Reminders (2 reminders)
-- -----------------------------------------------------------------------------

INSERT INTO public.reminders (id, couple_id, created_by, title, message, category, frequency, scheduled_for, is_active, notification_channel, custom_schedule)
VALUES
  -- Weekly check-in reminder
  (
    '88888888-8888-4888-8888-888888888881',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Weekly Check-In',
    'Time for your weekly relationship check-in! Take 30 minutes to connect.',
    'check-in',
    'weekly',
    now() + INTERVAL '3 days',
    true,
    'both',
    NULL
  ),
  -- Anniversary reminder
  (
    '88888888-8888-4888-8888-888888888882',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Anniversary Coming Up!',
    'Your 1-year anniversary is approaching. Start planning something special!',
    'special-date',
    'once',
    '2024-06-15T09:00:00Z',
    true,
    'email',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 10. Requests (2 requests -- one pending, one accepted)
-- -----------------------------------------------------------------------------

INSERT INTO public.requests (id, couple_id, requested_by, requested_for, title, description, category, priority, status, suggested_date, created_at)
VALUES
  -- Pending: Bob requests a date night
  (
    '99999999-9999-4999-8999-999999999991',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Plan a Surprise Date Night',
    'I would love if we could do something spontaneous this weekend -- dealer''s choice!',
    'date-night',
    'high',
    'pending',
    (now() + INTERVAL '5 days')::date,
    now() - INTERVAL '1 day'
  ),
  -- Accepted: Alice requests a conversation
  (
    '99999999-9999-4999-8999-999999999992',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Talk About Summer Travel Plans',
    'Can we sit down and discuss where we want to travel this summer? I have some ideas.',
    'conversation',
    'medium',
    'accepted',
    (now() + INTERVAL '2 days')::date,
    now() - INTERVAL '3 days'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 11. Love Languages (1 profile per user, shared visibility)
-- -----------------------------------------------------------------------------

INSERT INTO public.love_languages (id, couple_id, user_id, title, description, category, privacy, importance, examples, tags, created_at, updated_at)
VALUES
  -- Alice's primary love language
  (
    'aabbccdd-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Words of Affirmation',
    'I feel most loved when Bob tells me what he appreciates about me or leaves sweet notes.',
    'words',
    'shared',
    'essential',
    ARRAY['Leave a love note on the fridge', 'Text a compliment during the day', 'Say "I appreciate you" after dinner'],
    ARRAY['verbal', 'notes', 'daily'],
    now() - INTERVAL '3 months',
    now() - INTERVAL '1 week'
  ),
  -- Alice's secondary love language
  (
    'aabbccdd-1111-4111-8111-222222222222',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Quality Time',
    'Undivided attention -- no phones, just us -- means the world to me.',
    'time',
    'shared',
    'high',
    ARRAY['Weekly date night', 'Morning coffee together', 'Evening walk after dinner'],
    ARRAY['presence', 'attention', 'together'],
    now() - INTERVAL '3 months',
    now() - INTERVAL '2 weeks'
  ),
  -- Bob's primary love language
  (
    'aabbccdd-2222-4222-8222-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Acts of Service',
    'When Alice helps me with something without me asking, it makes me feel incredibly loved.',
    'acts',
    'shared',
    'essential',
    ARRAY['Cook a favorite meal', 'Handle an errand I have been putting off', 'Make the bed in the morning'],
    ARRAY['helping', 'thoughtful', 'daily'],
    now() - INTERVAL '3 months',
    now() - INTERVAL '1 week'
  ),
  -- Bob's secondary love language
  (
    'aabbccdd-2222-4222-8222-222222222222',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Physical Touch',
    'Hugs, holding hands, and physical closeness help me feel connected.',
    'touch',
    'shared',
    'high',
    ARRAY['Hold hands while walking', 'Hug when coming home', 'Sit close on the couch'],
    ARRAY['closeness', 'affection', 'daily'],
    now() - INTERVAL '3 months',
    now() - INTERVAL '2 weeks'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 12. Love Actions (5 actions linked to love languages)
-- -----------------------------------------------------------------------------

INSERT INTO public.love_actions (id, couple_id, linked_language_id, title, description, status, frequency, difficulty, completed_count, last_completed_at, created_at)
VALUES
  -- Action for Alice's "Words of Affirmation"
  (
    'aabbcc11-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aabbccdd-1111-4111-8111-111111111111',
    'Write a morning appreciation text',
    'Send Alice a text each morning with one thing you appreciate about her.',
    'recurring',
    'weekly',
    'easy',
    5,
    now() - INTERVAL '1 day',
    now() - INTERVAL '2 months'
  ),
  -- Action for Alice's "Words of Affirmation"
  (
    'aabbcc11-1111-4111-8111-222222222222',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aabbccdd-1111-4111-8111-111111111111',
    'Leave a sticky note on the bathroom mirror',
    'Write a short love note and leave it where Alice will find it.',
    'completed',
    'surprise',
    'easy',
    2,
    now() - INTERVAL '5 days',
    now() - INTERVAL '1 month'
  ),
  -- Action for Alice's "Quality Time"
  (
    'aabbcc11-1111-4111-8111-333333333333',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aabbccdd-1111-4111-8111-222222222222',
    'Phone-free dinner once a week',
    'Put both phones in another room and have an uninterrupted dinner together.',
    'planned',
    'weekly',
    'easy',
    0,
    NULL,
    now() - INTERVAL '1 week'
  ),
  -- Action for Bob's "Acts of Service"
  (
    'aabbcc22-2222-4222-8222-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aabbccdd-2222-4222-8222-111111111111',
    'Cook Bob''s favorite pasta dish',
    'Surprise Bob by making his favorite carbonara on a weeknight.',
    'suggested',
    'monthly',
    'moderate',
    0,
    NULL,
    now() - INTERVAL '3 days'
  ),
  -- Action for Bob's "Physical Touch"
  (
    'aabbcc22-2222-4222-8222-222222222222',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aabbccdd-2222-4222-8222-222222222222',
    'Welcome-home hug ritual',
    'Greet each other with a long hug when the other gets home from work.',
    'recurring',
    'weekly',
    'easy',
    12,
    now() - INTERVAL '1 day',
    now() - INTERVAL '2 months'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 13. Session Settings (1 record for the couple)
-- -----------------------------------------------------------------------------

INSERT INTO public.session_settings (id, couple_id, session_duration, timeouts_per_partner, timeout_duration, turn_based_mode, turn_duration, allow_extensions, warm_up_questions, cool_down_time)
VALUES (
  'dddddddd-1111-4111-8111-111111111111',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  30,      -- 30 minutes
  2,       -- 2 timeouts per partner
  2,       -- 2-minute timeouts
  false,   -- free-form (not turn-based)
  120,     -- 2-minute turns (if enabled)
  true,    -- allow session extensions
  true,    -- show warm-up questions
  3        -- 3-minute cool-down
)
ON CONFLICT (couple_id) DO NOTHING;

COMMIT;
