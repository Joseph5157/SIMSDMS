# SIMS DMS — Ruthless UX/UI Audit

> Two passes. First as a conversion-obsessed designer who's scaled SaaS past $10M ARR.
> Second as a first-time faculty member clicking through the app for the first time.
> Every item is actionable and file-referenced so Claude Code can implement the fixes.

---

## Pass 1: Designer Teardown

### The Brutal Truth

This app has **strong bones** — the design token system is thoughtful (index.css is legit), the component library covers the right patterns, the PWA config is production-grade. But the execution leaks everywhere. You have a design system defined in CSS variables that half the codebase ignores. You have Mantine installed but barely used. You have Tailwind configured but most pages are 100% inline styles. The result: a UI that looks "close enough" on each page but never feels *cohesive*.

A user doesn't consciously register that your login page uses `borderRadius: 14` while your cards use `var(--radius-xl)` which is also `14px` — but their brain registers the *inconsistency* in how things feel across screens. That's the vibe-coded AI-project smell. Let's fix it.

---

## CRITICAL — Fix Before Showing This to Anyone

### C1. Login page has zero product marketing
**Files:** `client/src/pages/auth/LoginPage.jsx`
**Problem:** The login page is the #1 page every user sees first. Right now it's a dark card with a logo, "SIMS DMS", and a form. There's no value prop, no context, no reason to care. A faculty member who just got an invite link lands here and sees... a form. For a college discipline system they may not want to use. You get one shot at first impression.
**Fix:**
- Add a one-line tagline under the logo: "Discipline duty tracking for SIMS College of Pharmacy"
- Add a subtle background pattern or the college shield watermark to the dark container
- Show the session status ("Morning session active" or "23 faculty on duty today") as social proof above the form — make it feel alive, not like a dead admin panel

### C2. Inline styles everywhere — the design system is ornamental
**Files:** LoginPage.jsx, ChangePasswordPage.jsx, AdminDashboardPage.jsx, DashboardPage.jsx, ReportsPage.jsx, SuperAdminDashboardPage.jsx, NotificationsPage.jsx, StatCard.jsx, Alert.jsx, NotificationBell.jsx, CreateUserDrawer.jsx, ComposeDrawer.jsx, UploadStudentsDrawer.jsx
**Problem:** You built 60+ CSS variables in index.css and a full Tailwind theme. Then ~70% of the UI uses inline `style={{}}` with hardcoded hex values. This means:
- No hover/focus/active states (inline styles can't do pseudo-classes)
- No responsive behavior (inline styles can't do media queries)
- No dark mode support (inline styles bypass CSS variable overrides)
- No consistency — the same blue appears as `#2563eb`, `#3b82f6`, `var(--brand)`, `var(--color-blue-600)`, and `blue-600` in Tailwind
**Fix:** Migrate all inline styles to Tailwind utility classes using your existing CSS variable tokens. This is the single highest-leverage change. Every other fix becomes easier once you have a consistent styling layer. Priority order:
1. LoginPage.jsx + ChangePasswordPage.jsx (first impression)
2. All drawer components (CreateUser, Compose, Upload, ViolationType)
3. Dashboard pages (Admin + Faculty)
4. Remaining pages

### C3. Mobile bottom nav active state is wrong color
**File:** `client/src/components/Layout.module.css`
**Problem:** Bottom tab bar active icon uses `#60a5fa` (blue-400) while every other active/brand element uses `#2563eb` (blue-600 / `var(--brand)`). On a white bottom bar, blue-400 looks washed out and uncertain. The active tab should feel *decisive*.
**Fix:** Change active bottom tab color from `#60a5fa` to `var(--brand)` (`#2563eb`). Also increase the stroke-width difference — current is 1.5 vs 2, make it 1.5 vs 2.5 for clearer active state.

### C4. Row action menus are inaccessible and fragile
**File:** `client/src/pages/admin/UsersPage.jsx`
**Problem:** The "..." action menu on each table row is a custom absolute-positioned div with click-outside detection via a document event listener. It's not keyboard accessible, doesn't trap focus, doesn't have ARIA roles, and the z-index stacking can break inside scroll containers. This is the primary interaction for user management — the most critical admin flow.
**Fix:** Replace with Mantine `Menu` component (already in your deps). It handles positioning, keyboard nav, focus trap, ARIA roles, and z-index correctly out of the box. Apply the same fix to any other row-action menus.

### C5. Faculty dashboard hero has hardcoded gradient + no fallback
**File:** `client/src/pages/faculty/DashboardPage.jsx`
**Problem:** The "Today's Duty" hero card uses `background: linear-gradient(135deg, #2563eb, #4f46e5)` inline. This:
- Bypasses the design system's `var(--brand-gradient-deep)` which is literally the same value
- Has a decorative circle with `rgba(255,255,255,0.12)` positioned at top: -40, right: -30 that clips on small screens
- The "Check In" button uses `background: rgba(255,255,255,0.2)` which has poor contrast on the gradient
**Fix:**
- Use `var(--brand-gradient-deep)` instead of hardcoded gradient
- Clip the decorative circle with `overflow: hidden` on the container
- Give the CTA button a solid white background with brand text, or at minimum `rgba(255,255,255,0.25)` with a 1px white border for better contrast

### C6. Slot picker calendar is visually overwhelming
**File:** `client/src/pages/faculty/SlotPickerPage.jsx`
**Problem:** The slot picker is the core faculty interaction — they pick their duty slots here. But the calendar grid has:
- Tiny 8px dots for morning/afternoon sessions that are hard to tap on mobile
- 5 different color states (blue, orange, green, slate, highlighted) with no persistent legend visible during selection
- The session picker panel appears *below* the calendar, requiring scroll on mobile — the user loses context of which date they tapped
- No animation or transition when selecting a date — it just snaps
**Fix:**
- Increase dot size to 12px with 44px tap targets (WCAG minimum)
- Show legend inline at the top of the calendar, not below
- On mobile, show the session picker as a bottom sheet (you already have Vaul for this) so it overlays rather than pushes content
- Add a subtle scale + background transition on date tap (150ms)

### C7. No loading states on critical flows
**Files:** AdminDashboardPage.jsx, DashboardPage.jsx, CalendarPage.jsx, SlotPickerPage.jsx
**Problem:** Dashboard pages show a blank white screen while data loads. The faculty dashboard — the page they see every single morning — just shows nothing until the API responds. On a slow network (common in college campuses), this is 2-5 seconds of white screen, which feels broken.
**Fix:**
- Add skeleton loading to both dashboard pages matching the final layout shape (stat cards + hero + lists)
- Use the existing `Skeleton`, `CardSkeleton`, `TableRowSkeleton` components — they're already built, just not wired up on dashboards
- For the slot picker calendar, show a 7x5 skeleton grid while loading

### C8. Four separate drawer implementations with inconsistent UX
**Files:** CreateUserDrawer.jsx, ComposeDrawer.jsx, UploadStudentsDrawer.jsx, ViolationTypeDrawer.jsx
**Problem:** Each drawer re-implements the same pattern from scratch: drag handle, header with close button, scrollable body, sticky footer with cancel/submit. But they each do it slightly differently:
- CreateUserDrawer: 9x1 drag handle, 20px top padding
- ComposeDrawer: 36x4 drag handle, 12px margin-top
- UploadStudentsDrawer: Same as CreateUser
- ViolationTypeDrawer: Same drag handle size but different footer padding
- Close button sizes: 32x32 (Compose, ViolationType) vs 28x28 (CreateUser)
- Footer button heights: 48px (some) vs 44px (others)
**Fix:** Extract a shared `<BottomDrawer>` component that standardizes: drag handle (36x4), header (title + subtitle + close), scrollable body, sticky footer with safe-area padding. Each feature drawer only provides the form content.

---

## HIGH IMPACT — Visible Polish That Builds Trust

### H1. Font size chaos — 11 different hardcoded sizes
**Files:** Nearly every component
**Problem:** Your design system defines a clean typography scale: `--text-stat` (40px) down to `--text-nano` (9px). But components use hardcoded pixel values everywhere: 10, 11, 12, 13, 14, 15, 17, 18, 20, 22, 36. The text-[11px] on Badge and the fontSize: 11 on StatCard labels are especially problematic — they're below WCAG AA minimum (12px for body text).
**Fix:**
- Replace all hardcoded font sizes with the corresponding CSS variable
- Map: 10→`--text-nano`+1, 11→`--text-micro`, 12→`--text-small`, 13→`--text-card`, 14→`--text-body`, 15→`--text-card-lg`, 18→`--text-page-title`, 22→`--text-h2`
- Increase Badge font-size from 11px to 12px (`--text-small`)
- Increase section labels from 10px to 11px (`--text-micro`)

### H2. Border radius roulette
**Files:** StatCard.jsx, Alert.jsx, drawers, LoginPage.jsx, ChangePasswordPage.jsx
**Problem:** You have 8 radius tokens defined (`--radius-sm` through `--radius-full`). But inline styles use hardcoded values: 4, 6, 8, 10, 12, 14, 16, 20. Some of these match your tokens (14 = `--radius-xl`), some don't (10 doesn't exist in your scale).
**Fix:** Audit every `borderRadius` inline style and replace with the nearest token. Where a value doesn't match any token, round to the nearest one. 10→`--radius-md` (8) or `--radius-lg` (12). Consistency beats precision.

### H3. Tables render twice — mobile cards + desktop table
**Files:** UsersPage, StudentsPage, DutySlotsPage, ViolationsPage, ViolationTypesPage, CoverRequestsPage, SessionResetPage, AuditLogsPage
**Problem:** Every data page renders the full dataset *twice* — once as mobile cards (`md:hidden`) and once as a desktop table (`hidden md:block`). This means:
- Double the DOM nodes (performance on large lists)
- Double the maintenance surface (bugs appear on one view but not the other)
- Two separate UI patterns to keep visually consistent
This is fine for MVP, but it's tech debt that compounds.
**Fix (phased):**
- Short term: Extract the mobile card for each entity into a named component (e.g., `<UserCard>`, `<StudentCard>`) to reduce duplication
- Medium term: Consider a responsive `<DataList>` component that renders cards on mobile and rows on desktop from a single column definition

### H4. Empty states are emoji-only — looks like a prototype
**File:** `client/src/components/ui/EmptyState.jsx`
**Problem:** Every empty state shows a single emoji (default: 📭) at 32px with 0.4 opacity, a title, and a message. This looks like a placeholder that was never replaced. Linear, Notion, and every serious SaaS uses illustrated empty states or at minimum styled SVG icons.
**Fix:**
- Replace emoji with simple SVG illustrations or Lucide icons at 48-64px
- Increase the visual weight — the current 0.4 opacity makes them invisible
- Add a primary CTA button below the message where applicable (e.g., "No students yet" → "Upload Students" button)

### H5. Notification bell dropdown clips on mobile
**File:** `client/src/components/NotificationBell.jsx`
**Problem:** The notification dropdown uses `width: min(360px, calc(100vw - 24px))`, `maxHeight: 500px`, `position: absolute`, `right: 0`. On mobile screens (320-375px), this means:
- The dropdown extends past the left edge of the screen
- 500px max-height can be taller than the viewport
- No scroll indicator that there's more content
**Fix:**
- On mobile (< 640px), render notifications as a full-screen slide-down panel or navigate to /notifications
- On desktop, keep the dropdown but add `max-height: min(500px, 70vh)` and a scroll shadow indicator

### H6. Reports page is a wall of cards with no hierarchy
**File:** `client/src/pages/admin/ReportsPage.jsx`
**Problem:** 16 report types displayed as a 4-column grid of identical cards with emoji icons. No grouping, no hierarchy, no indication of which reports are most used. The user has to read all 16 labels to find what they want. This is the admin's analytics hub — it should surface insights, not make them hunt.
**Fix:**
- Group reports into categories: "Attendance" (4), "Violations" (4), "Coverage" (3), "Students" (3), "System" (2)
- Show section headers for each group
- Pin the 3 most common reports (monthly attendance, violation types, duty coverage) at the top as larger cards
- Replace emoji with consistent Lucide icons

### H7. Messages page thread bubbles lack sender distinction
**File:** `client/src/pages/shared/MessagesPage.jsx`
**Problem:** Sent messages are blue background, received are white. But there's no avatar, no name label on each bubble, and the alignment (right for sent, left for received) is the only differentiator. In a thread with multiple messages, it's hard to scan who said what.
**Fix:**
- Add the sender's initials or avatar above each message bubble (or at least on the first message in a consecutive sequence from the same sender)
- Show timestamps on each message, not just the thread header
- Add a subtle tail/arrow on bubbles pointing to the sender side

### H8. Pagination is primitive
**File:** `client/src/components/ui/Pagination.jsx`
**Problem:** "← Prev" and "Next →" text buttons with "Showing X-Y of Z" text. No page numbers, no jump-to-page, no items-per-page selector. For tables with 100+ records (students, violations), this means clicking through 10+ pages sequentially.
**Fix:**
- Show page numbers (1, 2, 3 ... 8, 9, 10) with current page highlighted
- Add items-per-page selector (10, 25, 50) on tables that can have large datasets (Students, Violations, Audit Logs)
- Keep the "Showing X-Y of Z" summary

### H9. Tab components are custom and inaccessible
**Files:** `client/src/pages/shared/MessagesPage.jsx`, `client/src/pages/faculty/CoverRequestsPage.jsx`
**Problem:** Both pages implement custom tab bars with `<button>` elements styled inline. Neither has `role="tablist"`, `role="tab"`, `aria-selected`, or keyboard arrow-key navigation. These are core navigation patterns that assistive technology expects to work a specific way.
**Fix:** Use Mantine's `Tabs` component (already in deps) or at minimum add proper ARIA roles:
- Container: `role="tablist"`
- Each tab: `role="tab"`, `aria-selected="true/false"`, `tabIndex={isActive ? 0 : -1}`
- Tab panels: `role="tabpanel"`, `aria-labelledby={tabId}`

### H10. Calendar page date buttons have no accessible labels
**File:** `client/src/pages/admin/CalendarPage.jsx`, `client/src/pages/faculty/SlotPickerPage.jsx`
**Problem:** Calendar date cells are `<button>` elements showing just the day number (e.g., "15"). Screen readers announce "button 15" with no month/year context. The blocked/available/picked states are communicated only through color.
**Fix:**
- Add `aria-label` with full date: "December 15, 2026"
- Add `aria-pressed="true"` for selected dates
- Add `aria-disabled="true"` for past dates
- Include state in label: "December 15, 2026 — blocked" or "December 15, 2026 — available, morning and afternoon"

---

## Pass 2: First-Time User Walkthrough

### "I'm Dr. Sharma. The dean just told me I have to use this app for discipline duty."

**Step 1: I get a Telegram message with a link.**
> I tap it. I see a dark login screen with "SIMS DMS" and a pharmacy logo. No idea what DMS stands for (it's below in tiny text). I type my email and the password from the message. I'm in.

- **U1. What is this app?** The login page doesn't explain what I'm about to use. I'm already reluctant — I don't need another app. A single subtitle would help: "Track your discipline duty attendance, record violations, and manage cover requests."
  - **Severity:** Critical — first impression determines adoption
  - **File:** `client/src/pages/auth/LoginPage.jsx`

**Step 2: I land on the faculty dashboard.**
> There's a gradient blue card saying "Morning Session" with "Check In" and "Record Violation" buttons. Below it are three number cards (Slots: 0, Violations: 0, Unread: 0) and empty lists. Everything is zero. I have no idea what to do first.

- **U2. Zero-state dashboard gives no guidance.** When all counts are 0 and no slots are assigned, the dashboard should show an onboarding checklist or at least a message: "You haven't been assigned any duty slots yet. Your admin will assign slots through the calendar." Instead, it shows empty cards that make me think something's broken.
  - **Severity:** High — users abandon apps that feel empty/broken on first use
  - **File:** `client/src/pages/faculty/DashboardPage.jsx`

**Step 3: I tap "My Slots" in the bottom nav.**
> I see a calendar with colored dots. I have no idea what the colors mean. I scroll down and find a legend, but by the time I've scrolled past the calendar, I've forgotten which dates I was looking at. I tap a date and a panel appears below the fold — I have to scroll to see it.

- **U3. Slot picker has high learning curve.** The calendar interaction model requires reading a legend, understanding 5 color states, and scrolling between the grid and the picker. This is the daily-use feature — it should be obvious.
  - **Severity:** Critical — this is the core daily interaction
  - **File:** `client/src/pages/faculty/SlotPickerPage.jsx`

**Step 4: I tap "Attendance" in the bottom nav.**
> I see grouped cards under "Today", "Upcoming", and "Past". The today card shows my slot with a "Check In" button. I tap it. Something happens (mutation fires), but the feedback is... the button disappears and a time appears. Did it work? I'm not sure.

- **U4. Check-in confirmation is too subtle.** After tapping "Check In", the button transforms to show the check-in time. There's no toast, no animation, no confirmation dialog. For an attendance system where the check-in time is legally significant (it determines "late" status), the user needs clear feedback: "Checked in at 9:03 AM".
  - **Severity:** High — users will tap check-in multiple times if unsure it worked
  - **File:** `client/src/pages/faculty/AttendancePage.jsx`

**Step 5: I tap "Violations" in the bottom nav.**
> I see "Record Violation" button. I tap it. A modal opens with: Student search → Duty & Violation → Fine → Notes. The student search is a text input. I start typing a name and get a dropdown. Good. I select a student. Then I need to pick "Duty Slot" from a dropdown of my slots. Then "Violation Type" from another dropdown. Then fine amount auto-fills. Then optional remarks. This is 5+ fields for what should be a quick "I caught a student" interaction.

- **U5. Violation recording has too much friction.** Faculty record violations during active duty — they're standing in a hallway, phone in one hand. The form should be 2 taps: pick student, pick violation type. The duty slot should auto-select (it's the current active slot). The fine should auto-fill from the violation type. Remarks should be optional and collapsed.
  - **Severity:** High — friction here means violations don't get recorded
  - **File:** `client/src/pages/faculty/ViolationRecorderPage.jsx`

**Step 6: I tap "Cover Requests" in the bottom nav (but it's not in the bottom nav).**
> Wait, there are only 4 icons in the bottom bar plus a hamburger menu. Cover Requests is hidden behind the hamburger. I tap the hamburger... a drawer slides in with the full nav. I tap "Cover Requests". Now I see two tabs: "Open Broadcasts" and "My Requests".

- **U6. Cover Requests is buried.** The bottom nav shows: Dashboard, My Slots, Attendance, Violations. Cover Requests and Messages are in the hamburger menu. But cover requests are time-sensitive — if a faculty member is sick and posts a broadcast, other faculty need to see it immediately. It should be surfaced in the dashboard or via push notification, not hidden behind a menu.
  - **Severity:** High — missed cover requests mean unattended duty slots
  - **File:** `client/src/components/Layout.jsx`

**Step 7: I tap the hamburger and find "Messages".**
> Split panel view. On mobile, I see the list. I tap a message. The thread opens, but the list disappears. I want to go back — there's a "← Back" button. OK. The compose button opens a drawer. I type a message and send. The drawer closes. But I don't see my sent message in the "Sent" tab immediately — I have to tap "Sent" tab and wait for a refetch.

- **U7. Messages don't feel real-time.** After sending a message, the user expects to see it immediately. The query cache should be invalidated on send, or optimistically updated. The current "send → close drawer → manually switch to Sent tab → wait for refetch" flow feels broken.
  - **Severity:** Medium — functional but feels unreliable
  - **File:** `client/src/pages/shared/MessagesPage.jsx`

**Step 8: I try to check out at end of duty but I'm late. I was in a meeting.**
> The dashboard hero shows my slot but no check-out button because the slot window has passed. Where do I check out? I go to Attendance page. The card shows my slot but the button says... nothing? The system auto-clocked me out? I see "Auto clocked-out" in small text. Nobody told me this would happen.

- **U8. Auto clock-out happens silently.** The system auto-clocks out faculty after the session window, but there's no notification, no warning ("Your duty session ends in 15 minutes"), and the "Auto clocked-out" label is a tiny muted text below the time. Faculty who get auto-clocked are marked as such in reports — they should at least get a push notification before it happens.
  - **Severity:** Medium — impacts attendance records without user awareness
  - **File:** `client/src/pages/faculty/AttendancePage.jsx`, `client/src/pages/faculty/DashboardPage.jsx`

---

## NICE TO HAVE — Polish That Makes It Feel Pro

### N1. Dark mode is built but disabled
**File:** `client/src/lib/theme.js`, `client/src/index.css`
**Problem:** You have a complete dark mode color system in index.css with inverted surfaces, text, and status colors. The theme.js has cycling logic (light → dark → system). But it's disabled with a comment "dark mode temporarily disabled". This is free polish — the work is done.
**Fix:** Re-enable the theme toggle. Add it to the sidebar footer (desktop) and the drawer menu (mobile). Use the existing `cycleTheme()` function.

### N2. Page transitions are instant — feels like a website, not an app
**Files:** App.jsx (router), Layout.jsx
**Problem:** Navigating between pages is an instant swap — no transition, no animation. PWAs that feel like native apps use subtle page transitions (150-200ms fade or slide).
**Fix:** Wrap route outlets in a `<motion.div>` (framer-motion) or CSS `@starting-style` transition with a 150ms opacity fade. Keep it subtle — the goal is to avoid the jarring "page jump" feel.

### N3. No pull-to-refresh on mobile
**Problem:** PWA users expect pull-to-refresh. Currently, the only way to refresh data is to wait for stale cache or navigate away and back.
**Fix:** Add a pull-to-refresh interaction on dashboard and list pages that triggers a `queryClient.invalidateQueries()` for the current page's data.

### N4. Buttons don't have press feedback on mobile
**Files:** All button elements using inline styles
**Problem:** Inline-styled buttons can't have `:active` pseudo-class styling. On mobile, tapping a button gives no visual feedback — no press state, no scale-down, no ripple.
**Fix:** After migrating to Tailwind classes (C2), add `active:scale-[0.97]` and `active:opacity-90` to interactive buttons. This is one line of Tailwind per button but makes the app feel *responsive*.

### N5. StatCard numbers don't animate
**File:** `client/src/components/ui/StatCard.jsx`
**Problem:** Dashboard stat numbers (slot count, violation count, etc.) appear instantly. Apps like Linear and Vercel animate these from 0 to the final value on page load. It's a subtle delight that makes data feel dynamic.
**Fix:** Add a simple count-up animation using `useEffect` + `requestAnimationFrame` or a library like `react-countup`. Duration: 400-600ms, ease-out.

### N6. No keyboard shortcuts for power users
**Problem:** Admins who use this daily would benefit from keyboard shortcuts: `n` for new user, `/` for search, `g d` for go to dashboard, etc.
**Fix:** Add a global keyboard handler with a `?` shortcut to show the shortcut overlay. Start with 5-6 shortcuts for the most common actions.

### N7. Violation recorder could have quick-add mode
**File:** `client/src/pages/faculty/ViolationRecorderPage.jsx`
**Problem:** During duty rounds, faculty might record 3-5 violations in quick succession. The current flow (open modal → fill 5 fields → submit → modal closes → open modal again) is slow.
**Fix:** Add a "Quick Add" toggle that keeps the modal open after submission, clears the student field but preserves the duty slot and violation type selection. Show a toast confirmation instead of closing the modal.

### N8. Admin dashboard could show a sparkline trend
**File:** `client/src/pages/admin/AdminDashboardPage.jsx`
**Problem:** The admin dashboard shows today's numbers but no trend. "24 present" means nothing without context — is that up or down from last week?
**Fix:** Add a tiny 7-day sparkline next to the attendance stat (or a simple +/-% badge). Use the completion-rate report data that already exists.

### N9. Breadcrumb is underused
**File:** `client/src/components/Breadcrumb.jsx`
**Problem:** Breadcrumb component exists but is only used on 2 pages (Students, Notifications). Deeper pages like Violation Types, Cover Requests, and Calendar have no breadcrumb — users lose context of where they are in the admin hierarchy.
**Fix:** Add breadcrumbs to all admin sub-pages: `Admin → Users`, `Admin → Calendar`, etc.

### N10. Upload students result could be more detailed
**File:** `client/src/components/UploadStudentsDrawer.jsx`
**Problem:** After bulk upload, the result shows "Added: X · Updated: Y · Deactivated: Z" and error count. But if there are errors, the user has no way to see *which* rows failed or *why*. They have to guess, fix the Excel file, and re-upload.
**Fix:** Show a collapsible error table below the summary: Row number, Student name (if parseable), Error reason. This saves faculty 2-3 re-upload cycles.

---

## Implementation Priority Matrix

| # | Issue | Impact | Effort | Do First? |
|---|-------|--------|--------|-----------|
| C1 | Login has no product context | Conversion | Low | Yes |
| C2 | Inline styles bypass design system | Everything | High | Yes (phased) |
| C3 | Bottom nav active color wrong | Polish | Low | Yes |
| C4 | Row menus inaccessible | Accessibility | Medium | Yes |
| C5 | Hero gradient hardcoded | Consistency | Low | Yes |
| C6 | Slot picker overwhelming | Core UX | Medium | Yes |
| C7 | No loading skeletons on dashboards | Perceived speed | Low | Yes |
| C8 | Four duplicate drawer impls | Maintainability | Medium | After C2 |
| H1 | Font size chaos | Visual consistency | Medium | With C2 |
| H2 | Border radius inconsistency | Visual consistency | Low | With C2 |
| H3 | Double-render tables | Performance/maintenance | High | Later |
| H4 | Emoji empty states | Perceived quality | Low | Yes |
| H5 | Notification dropdown clips mobile | Mobile UX | Medium | Yes |
| H6 | Reports wall of cards | Findability | Medium | Yes |
| H7 | Message threads lack sender info | Readability | Low | Yes |
| H8 | Primitive pagination | Data navigation | Medium | Yes |
| H9 | Tabs lack ARIA roles | Accessibility | Low | Yes |
| H10 | Calendar dates unlabeled | Accessibility | Low | Yes |
| U2 | Zero-state dashboard empty | Onboarding | Low | Yes |
| U4 | Check-in feedback too subtle | Confidence | Low | Yes |
| U5 | Violation form too many fields | Speed | Medium | Yes |
| U6 | Cover Requests buried | Discoverability | Low | Yes |
| U7 | Messages don't feel real-time | Reliability | Low | Yes |
| U8 | Auto clock-out silent | Awareness | Medium | Later |
| N1 | Dark mode disabled | Delight | Low | Optional |
| N2 | No page transitions | App feel | Low | Optional |
| N3 | No pull-to-refresh | PWA feel | Medium | Optional |
| N4 | No button press feedback | Touch feel | Low | With C2 |
| N5 | Numbers don't animate | Delight | Low | Optional |
| N6 | No keyboard shortcuts | Power users | Medium | Optional |
| N7 | No quick-add violation mode | Speed | Medium | Optional |
| N8 | No sparkline trends | Context | Medium | Optional |
| N9 | Breadcrumb underused | Navigation | Low | Optional |
| N10 | Upload errors not detailed | Error recovery | Low | Optional |

---

## Recommended Attack Order

**Sprint 1 (Quick Wins):** C1, C3, C5, C7, H1, H2, H4, H10, U2, U4
**Sprint 2 (Core UX):** C4, C6, H5, H6, H8, H9, U5, U6, U7
**Sprint 3 (System):** C2 (inline→Tailwind migration, phased by page), C8, N4
**Sprint 4 (Polish):** H3, H7, U8, N1, N2, N5
**Backlog:** N3, N6, N7, N8, N9, N10
