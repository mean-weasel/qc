# Trust Builder Audit: QC (Quality Couple)

> Generated 2026-03-16 | Audience: General consumers (couples) | Monetization: Freemium (planned) | Live app: https://tryqc.co/

## Executive Summary

**Opportunities identified:** 13
**Must-Build:** 3 | **Should-Build:** 4 | **Nice-to-Have:** 3 | **Backlog:** 3

**Top 3 opportunities:**

1. Interactive Demo / Sample Check-In — lets couples experience QC's core value before creating an account (Unique Advantage vs. competitors)
2. Free Relationship Assessment Quiz — no-login, client-side communication styles quiz with PDF export (Differentiated vs. Gottman's simpler quiz)
3. Conversation Starters Generator — web-based, topic-filtered prompts with no app download required (Differentiated vs. Gottman Card Decks)

**Competitive verification:** Completed — 5 competitors analyzed (Gottman, Paired, Lasting, Relish, Coral)

QC has a strong technical foundation — couple-scoped RLS, privacy-first architecture, clean UI — but currently offers **zero free value** to visitors. Every feature requires email signup + couple creation. Users must commit blind before seeing any product UI. This is the single biggest trust gap. The opportunities below create a trust-building funnel from "curious visitor" to "active couple" by offering genuine free value at every stage.

## Current Trust Signals

| Trust Signal            | Present | Notes                                                                                                                                                     |
| ----------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free offering exists    | **No**  | All features gated behind signup + couple creation. Landing page is read-only marketing.                                                                  |
| Privacy messaging       | **Yes** | Landing page displays "Privacy-first design" and "No data selling, ever" badges. Privacy policy is thorough (8 sections, names infrastructure providers). |
| No-signup experience    | **No**  | Nothing interactive available without an account. No demos, previews, or tools.                                                                           |
| Transparent methodology | **No**  | No disclosure of what frameworks or research the check-in structure is based on. No team/about page.                                                      |
| Social proof            | **No**  | No testimonials, user counts, press mentions, or app store ratings displayed.                                                                             |

**Trust posture: 1/5** — Privacy messaging is the only active trust signal. The app's strong technical privacy (RLS, couple-scoped data, no data selling) is invisible to users who haven't signed up.

## Opportunities (Prioritized)

### Must-Build

These directly address the primary trust gap (no free value) and are feasible with the existing stack.

---

#### 1. Interactive Demo / Sample Check-In

**Trust rationale:** Couples considering a relationship app face a high emotional barrier — "Will this feel awkward? Will it actually help?" A guided demo lets both partners experience a full check-in flow with sample data before any commitment. No competitor offers this; every rival forces app download or payment first. This is QC's strongest potential differentiator.

**What users get free:** A guided walkthrough of a complete check-in session at `/demo/checkin` — category selection, warm-up prompts, discussion turn-taking, reflection, and action item creation — populated with realistic sample data. Runs entirely client-side. Both partners can try it on their own devices independently.

**Technical approach:**

- Create route at `src/app/demo/checkin/page.tsx` (add `/demo/*` to public routes in middleware)
- Reuse existing check-in components (`src/components/checkin/`) with a `DemoCheckInProvider` that wraps `CheckInContext` with mock data instead of Supabase calls
- Mock data layer: hardcoded sample categories, prompts, and example responses in a `src/app/demo/mock-data.ts` file
- No Supabase dependency — all state managed in React context with `useState`
- Timer uses existing `useSessionTimer` hook (already client-side with sessionStorage)
- Celebration animation at completion uses existing `canvas-confetti` dependency
- CTA at completion: "Love this? Sign up to do real check-ins with your partner" linking to `/signup`

**Funnel to paid:** Users who complete the demo have experienced the core product. The completion CTA is a natural upgrade prompt — not a paywall, but an invitation. Users who sign up after a demo have 3-5x higher activation rates than cold signups (industry benchmark for interactive demos).

**Complexity:** Low — all components exist; primary work is the mock data layer and a new route. No new dependencies needed.

**Competitive edge:** **Unique Advantage** — no competitor (Gottman, Paired, Lasting, Coral) offers a web-based product demo without app download or payment.

---

#### 2. Free Relationship Assessment Quiz

**Trust rationale:** Couples want personalized insights before committing to an app. A communication styles quiz delivers immediate, tangible value — "here's how you two communicate differently" — with zero friction. Privacy-first: everything runs client-side, nothing leaves the device. The PDF export creates a shareable artifact that drives word-of-mouth.

**What users get free:** A 2-3 minute assessment at `/tools/relationship-quiz` based on established communication frameworks. Each partner completes independently. Results are compared client-side via a shareable link (URL params or localStorage key). Generates a visual comparison chart and actionable tips. PDF export available via client-side generation.

**Technical approach:**

- New route at `src/app/tools/relationship-quiz/page.tsx` (add to public routes in middleware)
- Zod schema for quiz responses (reuse existing `src/lib/validation.ts` patterns)
- Client-side scoring algorithm: weighted scoring across communication dimensions (assertiveness, empathy, directness, conflict style)
- Partner sharing: generate a unique local key stored in localStorage; partner visits `/tools/relationship-quiz?join=<key>` to compare results
- Comparison visualization using `recharts` (already installed) — radar chart showing both partners' profiles
- PDF export via `jsPDF` + `html2canvas` (new dependencies, ~50KB combined)
- Framer Motion animations for quiz flow (existing `src/lib/animations.ts` variants)
- CTA: "Save your results and track growth over time — create a free account"

**Funnel to paid:** The quiz creates a "moment of insight" that couples want to preserve. Saving results requires signup. Tracking how communication patterns change over time (via repeated quizzes) requires the full app. The quiz also generates SEO traffic for "relationship communication quiz" and related terms.

**Complexity:** Low-Medium — new pages and scoring logic, but straightforward tech. Primary effort is question design and scoring calibration.

**Competitive edge:** **Differentiated** — Gottman offers a simpler "How Well Do You Know Your Partner" quiz but with no communication-style analysis, no partner comparison, and no PDF export.

---

#### 3. Conversation Starters Generator

**Trust rationale:** The #1 barrier to couple check-ins is "what do we even talk about?" A free conversation starters tool removes this anxiety and demonstrates QC's expertise in facilitating couple communication. Web-based with no download required — unlike Gottman's Card Decks app.

**What users get free:** Select a topic category (communication, finances, intimacy, future plans, conflict resolution, fun/connection) and get 5-10 curated conversation starters with follow-up questions at `/tools/conversation-starters`. Topic categories mirror QC's existing category taxonomy. Entirely client-side with curated content.

**Technical approach:**

- New route at `src/app/tools/conversation-starters/page.tsx` (add to public routes)
- Content structure: JSON file organized by QC's existing category system (`src/app/tools/conversation-starters/prompts.json`)
- 50-100 curated prompts across 6-8 categories, each with 2-3 follow-up questions
- Randomized selection with "shuffle" button using client-side `Math.random()`
- Optional "relationship stage" filter (dating, engaged, married, long-term) for personalization
- Responsive card-based UI using existing Radix UI + Tailwind patterns
- Share button: copies a prompt to clipboard for texting to partner
- CTA: "Want structured sessions with these prompts? Try a QC check-in"

**Funnel to paid:** The starters are a taste of QC's structured approach. Users who engage with prompts are primed for the full check-in experience. The tool also captures SEO traffic for "conversation starters for couples" (high-volume search term). Each prompt card can include a subtle "Used in QC Check-Ins" badge linking to the demo.

**Complexity:** Low — content curation is the main effort. Tech is simple (JSON + card UI).

**Competitive edge:** **Differentiated** — Gottman Card Decks (1000+ prompts) is the closest competitor but requires an app download. QC's web-based, instantly accessible format with topic filtering is more accessible. Adding relationship-stage personalization creates further separation.

---

### Should-Build

Strong trust impact, achievable in the medium term.

---

#### 4. Love Language Compatibility Score

**Trust rationale:** Love languages are a well-known framework couples already search for. Showing how partners' languages align — with specific action suggestions for gaps — demonstrates the app's intelligence and makes existing data more valuable.

**What users get free:** Post-signup feature: a compatibility analysis on the `/love-languages` page showing alignment percentage, areas of strength, and growth opportunities. Specific suggestions like "He values Acts of Service, you express Words of Affirmation — try leaving a note with a helpful action this week."

**Technical approach:**

- Add scoring logic to `src/contexts/LoveLanguagesContext.tsx`
- Algorithm: compare both partners' ranked love languages, calculate alignment score (weighted overlap), identify gaps
- Display as a new section in `src/app/(app)/love-languages/page.tsx` using existing Radix UI components
- Action suggestions generated from gap analysis mapped to existing `love_actions` table entries
- No new infrastructure — uses existing data and context

**Funnel to paid:** Part of freemium core experience. Drives engagement with the love languages feature, which increases retention. Premium tier could unlock deeper analysis (trend over time, seasonal patterns).

**Complexity:** Low — scoring algorithm + UI section. Uses existing data.

**Competitive edge:** **Differentiated** — no active competitor offers love language compatibility analysis.

---

#### 5. Couple Communication Heatmap

**Trust rationale:** "See your growth" builds trust in the app's long-term value. Data-driven couples (QC's "lovers who like systems" audience) want visual proof their investment is paying off. An evolving heatmap makes abstract relationship growth concrete.

**What users get free:** Interactive heatmap on the `/growth` page showing check-in frequency, mood trends, and category engagement over time. Color-coded by intensity. Clickable to drill into specific time periods.

**Technical approach:**

- Add heatmap component to `src/app/(app)/growth/page.tsx`
- Use `recharts` (already installed) or a lightweight heatmap library
- Data source: existing `getCheckInMoodHistory()` function + category participation data
- Build on existing `GrowthProgressBars` component patterns
- Calendar-style heatmap (GitHub contribution graph pattern) showing daily check-in activity

**Funnel to paid:** Premium tier could unlock advanced analytics: trend predictions, comparison to relationship benchmarks, exportable reports.

**Complexity:** Low — existing charting library + existing data queries.

**Competitive edge:** **Unique Advantage** — no competitor offers ongoing visual analytics of relationship patterns. Gottman's Assessment is a one-time $45 report.

---

#### 6. Printable Couple's Templates & Workbooks

**Trust rationale:** Demonstrates expertise and generosity. Free downloadable resources position QC as a relationship authority, not just an app. Content marketing play that builds SEO traffic and email list.

**What users get free:** Downloadable PDFs at `/tools/templates`:

- "30-Day Communication Challenge" — daily prompts for building communication habits
- "Love Language Discovery Workbook" — guided exercises for identifying each partner's languages
- "Annual Relationship Review" — structured reflection template for year-end conversations
- "Date Night Idea Generator" — categorized date ideas with planning checklists

Gated behind email capture only (not full app signup).

**Technical approach:**

- New route at `src/app/tools/templates/page.tsx` (add to public routes)
- PDF generation via `jsPDF` + `html2canvas` (client-side, zero server cost per download)
- HTML templates rendered in hidden div, converted to PDF on download click
- Email capture form connected to Resend (existing email infrastructure in `src/lib/email/`)
- Templates stored as React components for easy iteration

**Funnel to paid:** Email capture → nurture sequence ("Here's your workbook! BTW, QC helps you do this digitally with your partner...") → app signup. SEO traffic for "couples communication worksheet" and similar terms drives top-of-funnel awareness.

**Complexity:** Low-Medium — content creation is the main effort. Tech is straightforward.

**Competitive edge:** **Unique Advantage** — no competitor offers free downloadable couple's workbooks. Gottman sells physical books ($30+). Paired sells card games ($25+).

---

#### 7. Offline Mode with Sync Indicators

**Trust rationale:** Reliability is a stated trust dimension. "Works even without internet" demonstrates commitment to the user experience and reinforces privacy (data persists locally first). Essential for couples using the app during travels or in low-signal areas.

**What users get free:** Read-only access to notes, reminders, and love language profiles when offline. Visual sync status indicator in the app header. Write queue that syncs when connection returns.

**Technical approach:**

- Service Worker for caching static assets and read-only data
- IndexedDB via Dexie.js for local data persistence
- Sync indicator component in `src/components/layout/` app shell
- Leverage existing Supabase Realtime subscription infrastructure for reconnection sync
- Staged rollout: Phase 1 (read-only cache), Phase 2 (offline writes with queue)

**Funnel to paid:** Offline write capabilities could be gated as a premium feature. Basic read-only offline is free.

**Complexity:** High — significant architectural addition, but can be staged. Phase 1 (read-only) is medium complexity.

---

### Nice-to-Have

Lower priority but strategically interesting.

---

#### 8. Annual Relationship Report Card

**Trust rationale:** Celebrates couple progress and validates their time investment. Creates an emotional annual ritual tied to the app. Powerful retention driver — couples look forward to their "year in review."

**What users get free:** Auto-generated PDF report from existing data: check-in count, mood trend chart, milestones achieved, love language discoveries, top discussion categories, growth highlights. Triggered on relationship anniversary or year-end.

**Technical approach:**

- New component in `src/app/(app)/growth/` or `src/app/(app)/dashboard/`
- Data aggregation from existing queries (mood history, milestones, check-in stats)
- PDF generation via `jsPDF` + `html2canvas`
- Shareable social card (image) for Instagram/social sharing

**Funnel to paid:** Premium tier could unlock monthly reports, deeper insights, custom designs, printed physical copies.

**Complexity:** Low-Medium.

---

#### 9. Client-Side Mood Sentiment on Notes

**Trust rationale:** Adds AI intelligence to the notes feature without compromising privacy. Sentiment analysis runs entirely in-browser — no note content is ever sent to external servers. Shows couples emotional patterns in their reflections.

**What users get free:** Real-time emotional tone badge when writing notes (e.g., "Reflective," "Grateful," "Concerned"). Trend visualization of sentiment over time on the growth page.

**Technical approach:**

- Hugging Face `@huggingface/transformers` for client-side sentiment analysis (distilbert-base-uncased-finetuned-sst-2-english, ~67MB)
- Integrate with existing note editor in `src/hooks/useNoteEditor.ts`
- Lazy-load model on first note edit to avoid impacting initial page load
- Display sentiment badge on `Note` component cards
- Aggregate sentiment data in growth charts via existing `recharts`

**Funnel to paid:** Premium could unlock detailed pattern analysis, AI-generated reflection prompts, cross-partner sentiment comparison.

**Complexity:** Medium — model loading, performance optimization, and graceful degradation for low-powered devices.

---

#### 10. Relationship Timeline Maker

**Trust rationale:** Emotional engagement tool that celebrates the couple's history. Creates a visual narrative of their relationship that deepens investment in the app.

**What users get free:** Interactive visual timeline of milestones with photos, dates, and notes. Draggable layout. Exportable as PDF or shareable image.

**Technical approach:**

- Enhance existing timeline components in `src/components/growth/`
- Canvas API for rendering exportable timeline image
- Integration with existing milestone data and `milestone-photos` storage bucket
- `jsPDF` for PDF export

**Funnel to paid:** Premium photo storage limits, custom timeline templates, printed physical timelines.

**Complexity:** Medium.

---

### Backlog

Worth revisiting as the product matures.

---

#### 11. Browser Extension for Relationship Reminders

**Trust rationale:** Persistent free tool that keeps QC top-of-mind. Reminds couples of scheduled check-ins, anniversaries, and reminders without opening the app.

**What users get free:** Chrome/Firefox extension showing upcoming reminders and check-in prompts. Clicking opens the app.

**Technical approach:** Manifest V3 extension polling a lightweight API endpoint or reading from cached local data.

**Funnel to paid:** Drives repeat app engagement. Premium could enable quick-defer and snooze features.

**Complexity:** Medium.

---

#### 12. Values Alignment Quiz

**Trust rationale:** Similar to the relationship assessment quiz (#2) but focused on shared values (family, finances, spirituality, adventure). Addresses fundamental relationship questions.

**What users get free:** Free assessment at `/tools/values-quiz` with shareable results.

**Technical approach:** Same architecture as #2 — Zod validation, client-side scoring, recharts visualization.

**Funnel to paid:** Save results, track changes over time, guided discussion prompts.

**Complexity:** Low. Build after validating that the quiz pattern (#2) drives signups.

---

#### 13. Mood Quick-Pulse Notifications

**Trust rationale:** Low-friction way to build mood data over time. 10-second micro check-ins via web push notifications.

**What users get free:** Optional push notifications ("How's your mood today?") opening a 1-question form. Aggregates into mood history.

**Technical approach:** Web Notifications API + existing reminder scheduling infrastructure.

**Funnel to paid:** Premium could unlock partner mood sharing, trend alerts, AI insights.

**Complexity:** Low. Dependent on having an active user base first.

---

## Technology Catalog Matches

| Opportunity           | Technology                          | Category              | Notes                                                    |
| --------------------- | ----------------------------------- | --------------------- | -------------------------------------------------------- |
| Demo Check-In         | React Context + existing components | Client-Side App       | Reuses 100% of existing check-in UI with mock data layer |
| Relationship Quiz     | Zod + recharts + jsPDF              | Client-Side Tools     | All client-side; no server dependency                    |
| Conversation Starters | JSON content + Radix UI             | Content Tools         | Curated content, no ML needed                            |
| Love Language Score   | Custom scoring algorithm            | Client-Side Algorithm | Simple weighted overlap calculation                      |
| Communication Heatmap | recharts (installed)                | Data Visualization    | GitHub-style contribution heatmap                        |
| Printable Templates   | jsPDF + html2canvas                 | Content Marketing     | Client-side PDF generation                               |
| Offline Mode          | Service Worker + Dexie.js           | PWA                   | Staged rollout possible                                  |
| Report Card           | jsPDF + existing data queries       | Data Export           | Aggregates existing analytics                            |
| Mood Sentiment        | @huggingface/transformers           | Client-Side AI/ML     | 67MB model, lazy-loaded                                  |
| Timeline Maker        | Canvas API + milestone data         | Data Visualization    | Enhances existing growth feature                         |

## Competitive Landscape

| Competitor                   | Free Offerings                                                                              | Trust Signals                                                                                             | Overlap with Proposed                 | Differentiation Notes                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gottman** (gottman.com)    | Free "Know Your Partner" quiz (web), Card Decks app (1000+ free prompts), blog, newsletters | 50+ years research, "Einstein of Love" media, 38M relationships, 135K+ clinicians, HIPAA, press logos     | Quiz (#2), Conversation Starters (#3) | Gottman's quiz is simpler (no communication-style analysis, no PDF). Card Decks requires app download. QC's web-based approach is more accessible. |
| **Paired** (paired.com)      | 1 free daily activity in-app, blog/magazine, 7-day premium trial                            | 4.7 stars/190K reviews, Apple Editors' Choice, Google Play Awards, 4M+ couples, expert panel, press logos | None directly                         | All features require app download. No web-based free tools. Strong social proof QC should eventually match.                                        |
| **Lasting** (getlasting.com) | "Take the quiz" redirects to app store, free trial in-app                                   | 3M couples, 94% stronger relationships, therapist recommendations, Talkspace company                      | None                                  | No web-based tools at all. Everything gated behind app download.                                                                                   |
| **Coral** (getcoral.app)     | Blog (70+ articles), community discussions, app free trial                                  | FDA notation, 4.6 stars, 1M+ downloads, Apple App of the Day, press logos, Kinsey Institute experts       | None                                  | Different domain (intimacy focus). Strong content marketing via blog.                                                                              |
| **Relish** (hellorelish.com) | **Defunct** — website no longer resolves                                                    | N/A                                                                                                       | N/A                                   | One fewer competitor in the space.                                                                                                                 |

### Key Competitive Insights

1. **Every competitor forces app download** — QC's web-first, no-login tools would be genuinely unique in the space
2. **No competitor offers an interactive product demo** — the demo check-in is the single strongest differentiator
3. **Gottman dominates free content** but requires app downloads for interactive tools — QC can win on accessibility
4. **Social proof is table stakes** — Paired (4M+ couples), Lasting (3M), Coral (1M+) all display user counts prominently. QC needs this eventually.
5. **Relish is defunct** — market opportunity for a modern alternative

## Next Steps

1. **Build the Interactive Demo Check-In** (`/demo/checkin`) — Highest impact, lowest effort. Reuses existing components with a mock data layer. Target: 1-2 weeks. This is the single most impactful thing QC can do to convert visitors to signups.

2. **Build the Conversation Starters tool** (`/tools/conversation-starters`) — Quick content-driven win. Captures SEO traffic for high-volume "conversation starters for couples" queries. Target: 1 week (content curation is the main effort).

3. **Build the Relationship Assessment Quiz** (`/tools/relationship-quiz`) — Slightly more complex but creates the strongest lead-generation artifact (shareable PDF). Target: 2-3 weeks.

4. **Add Love Language Compatibility Score** to the existing `/love-languages` page — Quick enhancement to existing feature that increases engagement. Target: 1 week.

5. **Create first printable template** ("30-Day Communication Challenge" PDF) — Content marketing play to start building email list and SEO authority. Target: 1-2 weeks.

6. **Address social proof gap** — Start collecting and displaying user testimonials, couple counts, and app store ratings on the landing page. This is not a "trust builder" feature per se, but every competitor does it and its absence undermines the trust signals that are present.

### Recommended Build Sequence

```
Week 1-2:  Demo Check-In + Conversation Starters (parallel)
Week 3-4:  Relationship Quiz + Love Language Score (parallel)
Week 5-6:  First printable template + Communication Heatmap
Week 7+:   Offline mode (Phase 1), Report Card, remaining backlog
```
