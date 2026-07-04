# Handoff Report

> Filled out by Claude Code at the end of every task — whether a full feature or a single
> implementation step — and saved to `specs/<feature-folder>/handoff.md`, overwriting the
> previous report for that feature.

## task_id
001-auth-user-accounts / Mantine usage audit follow-up: remove confirmed duplication
(redundant toast system, redundant Skeleton), document Mantine in CONSTITUTION.md.
Decision (explicit, from project owner): keep Mantine for Modal/Drawer focus handling and
form primitives — do not remove the library or touch the Modal/BottomDrawer split.

## status
complete

## completed
1. **Folded the one-off Mantine `notifications.show()` call into the existing `useToast()`
   system** (`client/src/components/PWAUpdatePrompt.jsx`). This was the only call site using
   `@mantine/notifications`'s imperative API — everywhere else in the app already used the
   custom `ToastProvider`/`useToast()` context (21 files), so two toast systems were running
   in parallel for exactly one message (the PWA update banner).
   - Extended `client/src/components/ui/Toast.jsx`'s `toast()` to accept `persistent` (skip
     the 3.5s auto-dismiss) and `onClick` (make the whole toast clickable, dismissing on
     click) — the minimum needed to match the removed Mantine notification's behavior
     (stayed open until tapped, tapping triggered the SW update). Added `e.stopPropagation()`
     on the inner dismiss (✕) button so it doesn't also fire the toast's own `onClick`.
   - Removed `<Notifications position="bottom-right" zIndex={9999} />` and its
     `@mantine/notifications` import from `client/src/App.jsx`.
   - `PWAUpdatePrompt` now calls `useToast()`, so it had to move from being a sibling of
     `<ToastProvider>` to a child of it in `App.jsx` (it was previously rendered *outside*
     `ToastProvider`, which would have made `useToast()` return `null` there).
   - Also removed the now-dead `import '@mantine/notifications/styles.css'` from
     `client/src/main.jsx` — found while verifying nothing else references the package;
     harmless to leave but unused once the `<Notifications>` component was gone.
   - Left `@mantine/notifications` in `client/package.json`/lockfile untouched — not asked to
     uninstall the package, only to remove the import/usage, which is now fully done (zero
     references left under `client/src`).
2. **Standardized on the custom `Skeleton`** (`client/src/pages/faculty/SlotPickerPage.jsx`
   was the only file importing Mantine's `Skeleton` directly instead of the app's own
   `ui/Skeleton.jsx`, used everywhere else). Swapped the import and translated all 4 call
   sites' Mantine props to the custom component's `width`/`height`/`className` API:
   - `radius={12}` → `className="rounded-xl"` (Tailwind's 12px radius, exact match)
   - `radius={8}` → `className="rounded-lg"` (8px, exact match)
   - `radius={4}` → no override needed (custom `Skeleton`'s default `rounded` class is
     already 4px)
   - `mb={16}` → `className="mb-4"` (16px)
   - `display="inline-block"` → `className="inline-block"`
3. **Left the Modal/Drawer split untouched** — `FormModal.jsx`/`ConfirmDialog.jsx` still wrap
   Mantine `Modal`, form drawers still use custom `BottomDrawer` (vaul) with Mantine form
   inputs inside. No changes made here per explicit instruction.
4. **Documented Mantine in `CONSTITUTION.md` §2** (Frontend table) — added a row for
   `@mantine/core`/`@mantine/hooks` alongside Tailwind CSS, with a one-line note on the
   division of labor (Tailwind for styling/layout, Mantine specifically for accessible form
   primitives + Modal/Drawer focus handling). Closes the doc-drift flagged in the prior
   audit without changing the actual architecture.

## failed_or_blocked
(none)

## commands_run
```
npx eslint src/App.jsx src/main.jsx src/components/ui/Toast.jsx src/components/PWAUpdatePrompt.jsx src/pages/faculty/SlotPickerPage.jsx
# 1 pre-existing error (react-refresh/only-export-components on useToast/ToastProvider
# sharing a file) — confirmed via git stash that it fires identically on the unmodified
# file, not introduced by this change.
npx vite build
# clean build, no errors. Pre-existing >500kB chunk-size warning is unrelated to this change.
git diff -- CONSTITUTION.md client/src/App.jsx client/src/main.jsx client/src/components/PWAUpdatePrompt.jsx client/src/components/ui/Toast.jsx client/src/pages/faculty/SlotPickerPage.jsx
```

## constraints_discovered
- `PWAUpdatePrompt` was rendered as a sibling of `ToastProvider` in `App.jsx`, not a child —
  an easy thing to miss when folding its notification call over to `useToast()`, since the
  hook would silently return `null` instead of erroring. Confirmed the new placement (inside
  `ToastProvider`, still outside `ErrorBoundary`) preserves the original mount order relative
  to everything else.
- The app's custom `Skeleton` (`ui/Skeleton.jsx`) only accepts `width`/`height`/`className` —
  no `radius`/`display`/margin props like Mantine's version. Confirmed each Mantine prop used
  in `SlotPickerPage.jsx` has an exact Tailwind utility-class equivalent before swapping, so
  no visual regression from the translation (rounded-lg/rounded-xl map 1:1 to Mantine's
  radius=8/12 scale; default `rounded` already matches radius=4).

## deviations_from_constitution
None — this task's own change *is* the CONSTITUTION.md update (documenting Mantine), not a
deviation from it.

## files_touched
- `CONSTITUTION.md`
- `client/src/App.jsx`
- `client/src/main.jsx`
- `client/src/components/PWAUpdatePrompt.jsx`
- `client/src/components/ui/Toast.jsx`
- `client/src/pages/faculty/SlotPickerPage.jsx`
- `specs/001-auth-user-accounts/handoff.md` (this file — overwritten)

## open_questions_for_owner
- Not yet visually verified in a running browser (only lint + production build checked) —
  worth a quick manual check that: (a) the PWA-update toast still appears and updates the SW
  on tap next time a new build is deployed, (b) `SlotPickerPage`'s skeleton loading states
  look right on faculty's slot-picker calendar.
- (carried forward, unrelated) No path exists to create a second Super Admin account
  (FR-016); retired routes now 404 instead of 410.
- (carried forward, unrelated) `sims-dms-dev-db`/Docker Desktop and earlier dev processes may
  still be running in the background from prior sessions.
