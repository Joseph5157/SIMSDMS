# Handoff Report

## task_id
021-student-search-overlay — "Student Search Experience Redesign: full-screen overlay for all
Record Student Violation popups (Admin & Faculty)", plus the follow-up mobile-keyboard fixes.

## status
complete — build-verified and desktop-browser-verified. The mobile soft-keyboard timing itself is
NOT verifiable from the test harness (see failed_or_blocked) — needs one on-device tap to confirm.

## completed
### The overlay (commit `db044a3`)
- New reusable component `client/src/components/ui/StudentSearchOverlay.jsx`: a full-screen
  (mobile) / large centered panel (desktop) student picker rendered via `createPortal` to
  `document.body` at z-index 1200 (above every modal/drawer). Header with back button + "Select
  Student" title; auto-focused search box (`fontSize:16` to avoid iOS zoom); debounced live search
  (250ms via `useDebouncedValue`, gated at ≥2 chars by the existing `useStudentSearch`→
  `/students/search`, which matches name OR reg, partials included); large scrollable result list of
  ≥60px touch-target cards showing Name · Reg No · Course label (b_pharm→B.Pharm etc.) · Year N ·
  academic year. Tapping a card calls `onSelect(student)`. Keyboard-aware: the scroll list gets
  `paddingBottom = useKeyboardInset()` so the last rows are never hidden behind the soft keyboard.
  Body scroll locked while open; Escape/back/backdrop close.
- Rewired `client/src/components/faculty/RecordViolationModal.jsx` (the single shared component
  behind ALL three popups — Faculty Dashboard, Admin Student Violations, and the admin-override
  popup): removed the embedded `<input>` + absolutely-positioned dropdown. The Student field is now
  a button showing the picked student ("Name (REG)") or a placeholder; tapping it opens the overlay.
  Selecting sets `form.student_id` + `studentLabel` and closes the overlay. Quick-add re-opens the
  overlay for the next student. Overlay rendered in both the mobile (BottomDrawer) and desktop
  (FormModal) return paths. One shared component ⇒ ticket's "one standard component everywhere" is
  satisfied with no per-portal duplication.

### Mobile keyboard fixes (follow-ups, same day)
1. **`c6074f6` — keyboard wasn't opening on mobile.** Effect/`setTimeout` focus runs after the tap
   gesture ends, so iOS/Android won't raise the keyboard. Fix: the opener (`openStudentSearch` in
   RecordViolationModal) mounts the overlay synchronously with `flushSync` then focuses the input
   while still inside the tap handler. The overlay accepts an `inputRef` the opener drives.
2. **`d1419b2` → `debee46` — crash + revert.** To remove the *remaining* keyboard delay I toggled
   vaul's `Drawer.Root modal` prop. **This crashed with React #300 "rendered fewer hooks than
   expected"** — vaul 1.1.2's own `Drawer.Overlay` calls `useCallback` AFTER `if (!modal) return
   null`, so flipping `modal` true→false at runtime drops a hook. Reverted; **vaul's `modal` must
   stay static** (warning comment added to `BottomDrawer.jsx`).
3. **`76fbfcb` — final delay fix (the actual root cause).** The delay was vaul's Radix `FocusScope`
   stealing focus from the body-portaled overlay input (keyboard rose → got dismissed by the steal →
   reappeared a beat later). Fix: on mobile, wrap the overlay panel in a trapped Radix `FocusScope`
   (`@radix-ui/react-focus-scope`, already present transitively via vaul). Mounting a trapped
   FocusScope registers on Radix's focus-scope stack and PAUSES the parent vaul scope, so it stops
   stealing; with the flushSync gesture-focus the input holds and the keyboard opens immediately.
   `onMountAutoFocus`/`onUnmountAutoFocus` are preventDefault'd so FocusScope doesn't move focus off
   the input. Implemented via a `MaybeFocusScope({active,children})` helper, gated
   `pauseParentTrap={isMobile}` from RecordViolationModal.

## failed_or_blocked
- **The mobile soft keyboard itself was not exercised on a real device this session.** The
  chrome-devtools connection rejects `resize_page` (`Browser.setContentsSize` unsupported) and has no
  soft keyboard, so I could only verify the DESKTOP path + the focus *mechanism* (that focus lands on
  and holds on the input synchronously after a tap). The Radix scope-pausing is the standard nested-
  modal mechanism, so this should work — but a real phone tap is the final confirmation. If it still
  lags on device, the next lever is rebuilding the overlay as a true Radix `Dialog` (nests natively
  with vaul) instead of a hand-rolled portal.

## live_verification (desktop)
Admin → Student Violations → "+ Record Student Violation" → tapped the Student field: overlay opens,
search box focused. Partial reg "SIMS23B" → both students appear instantly as cards
("B.Pharm · Year 3 · 2025-26"). Selected Diya Patel → overlay closed, field showed
"Diya Patel (SIMS23B002)" → picked "Missing ID card" (fine ₹50) → submit → recorded (DB row: Diya
Patel / Missing ID card / admin recorder / duty_slot_id null). Quick-add flow re-opens the overlay.
Focus lands on the search input synchronously after the tap. Zero console errors on every path,
including no React #300 after the fixes. Faculty popup uses the identical shared component.

## constraints_discovered
- `useStudentSearch` already 400s below 2 chars and matches name OR registration_number
  (case-insensitive `contains`) — partial-name/partial-reg search work with no backend change.
- `@mantine/hooks` exposes `useDebouncedValue` (250ms debounce).
- `RecordViolationModal` is the ONLY violation-recording popup component (admin page + faculty
  dashboard + faculty violations page all import it). No other popup to migrate.
- **Mobile focus/keyboard rules learned (reusable):**
  - Mobile browsers raise the soft keyboard only when `input.focus()` runs synchronously inside the
    tap gesture. For a portal that mounts on a state change, use `flushSync` in the opener then focus.
  - **Never pass a dynamic `modal` to a vaul `Drawer.Root`** — vaul calls a hook after
    `if (!modal) return null`, so toggling it at runtime throws React #300.
  - A trapped Radix `FocusScope` pauses parent *Radix* focus scopes (vaul), but does NOT coordinate
    with a *Mantine* modal's trap — nesting one inside a Mantine parent makes them fight (focus lands
    on the Mantine close button). Hence `FocusScope` is gated to mobile (vaul) only; desktop keeps
    plain Mantine handling.
  - Toggling Mantine Modal `trapFocus` true→false fires its focus-RETURN (yanks focus to the close
    button) — don't toggle it; the static default is fine.

## deviations_from_constitution
None — pure frontend UI change, no schema/endpoint changes.

## files_touched
- client/src/components/ui/StudentSearchOverlay.jsx (new; overlay + flushSync inputRef +
  MaybeFocusScope)
- client/src/components/faculty/RecordViolationModal.jsx (rewired student field, flushSync opener,
  pauseParentTrap={isMobile})
- client/src/components/ui/BottomDrawer.jsx (warning comment: vaul `modal` must stay static)
- client/src/components/ui/FormModal.jsx (optional `trapFocus` prop added; currently unused by the
  record popup after the toggle was removed — harmless, defaults to Mantine's default true)

## open_questions_for_owner
- **Verify the mobile keyboard on a real phone** — the one thing I couldn't test. Tap the Student
  field in the Record Student Violation popup; the keyboard should rise immediately with no flicker.
- On desktop the overlay is a centered command-palette panel (not literally edge-to-edge); the
  record modal's own close button takes focus behind the overlay (pre-existing Mantine trap
  behaviour, harmless — the search box is one click away). Say if you want desktop full-screen and/or
  the input auto-focused on desktop too.
- Result cards show Name / Reg / Course / Year / Academic Year. Ticket mentioned "Section" and
  "Status" — no section column exists and search returns only active students, so both were omitted.
- Deploy: all commits on `005-duty-reassignment` (Railway auto-deploys); pushed.
