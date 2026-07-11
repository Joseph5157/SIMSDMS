# Handoff Report

## task_id
001-auth-user-accounts / SIMS_DMS_Problems_29.docx batch: profile module fixes (name/department/designation persistence, cross-user sync, save toast, self-only authorization) — avatar work explicitly excluded from scope

## status
complete

## completed
- **Item 1 — "profile changes don't persist after logout/login": traced end-to-end, does not reproduce as described.** Followed the full chain rather than assuming: `ProfileDrawer.jsx` → `useUpdateProfile` (`useUsers.js`, a real awaited TanStack mutation, not local-state-only) → `PATCH /users/:id/profile` (`users.controller.js`, a real `prisma.user.update`) → `onSuccess` sets `sessionStorage` + `qc.setQueryData(['currentUser'], res.data)` → `/auth/login` does a fresh `prisma.user.findUnique` every time (JWT payload only carries `{ sub, role, session_version }`, never profile fields, so no stale-JWT angle). Verified live in the browser, not just by reading code: seeded a throwaway faculty user, edited name/department/designation, confirmed the DB write via a direct Prisma read, logged out for real (cache clear + redirect), logged back in fresh, and the updated values were there. Could not make the reported bug happen.
  - Found one real, narrower staleness gap while tracing: `useCurrentUser` (`useAuth.js`) seeds `initialData: cachedUser` from a sessionStorage snapshot without `initialDataUpdatedAt`, so TanStack Query treats that snapshot as freshly-fetched and won't refetch `/users/me` for the full 5-minute `staleTime` — meaning a *different, older* tab/session's cached snapshot could mask a real update for a few minutes. Fixed by setting `initialDataUpdatedAt: 0`, so the cached value still paints instantly (no white-screen flash on refresh, the reason the cache exists per its own comment) but is treated as stale immediately, triggering a background refetch on every mount.
- **Item 2 — sync everywhere after save.** Already worked via the existing `setQueryData(['currentUser'], ...)` pattern feeding the single `user` object `App.jsx` passes to every page/`Layout.jsx` — confirmed live (edit, reopen the drawer without reloading, updated values shown immediately). Message/notification sender names are a live server-side join (`sender.name` from the message record at fetch time), not a cached client snapshot, so they were never at risk. No new state mechanism added, per the instruction not to invent one.
- **Item 3 — save toast.** A toast already existed ("Profile updated."); reworded to the requested exact copy "Profile updated successfully" in `ProfileDrawer.jsx`. Toasts already auto-dismiss after 3.5s (`Toast.jsx`) — no new toast system needed or added. Left the separate avatar-select toast ("Avatar updated.") untouched, per the avatar exclusion.
- **Item 4 — real, confirmed authorization gap, now fixed.** The documented API spec (`SIMS_API_Endpoints_v2.0.md`: "PATCH /users/:id/profile | All Auth | Update own profile") says this is a self-only endpoint for every role. The code only enforced that for faculty (`403` if `targetId !== actorId`); for admin/super_admin there was no ownership check at all — the old comment literally said "Admin+ can update anyone's basic info." No client code exercised this (only `ProfileDrawer.jsx` calls it, always with the caller's own `user.id`), so it was live, unused attack surface, not a working feature: any admin/super_admin could edit another user's name/department/designation/title/avatar/email by changing the `:id` in the URL.
  - Fixed by requiring `targetId === actorId` for every role, matching the "own profile" spec. Also removed the "admin+ can also update email" carve-out entirely (folded `email` into the rejected-sensitive-fields list) since `ProfileDrawer.jsx` always shows email as disabled ("Managed by administrators") for every role — no legitimate caller ever exercised that branch either.
  - Verified live, not just read: logged in as a real admin test account, used `fetch()` from within that authenticated browser session to `PATCH` a *different* user's profile — got `403 FORBIDDEN` after the fix (previously would have been `200`). Confirmed self-edit still works (`200`) for the same admin account, so no regression to the legitimate path.

## failed_or_blocked
- None.

## commands_run
```
cd client && npx vite build                                      # clean
cd client && npx eslint src/hooks/useAuth.js src/components/ProfileDrawer.jsx
  # 1 pre-existing error (react-hooks/set-state-in-effect in ProfileDrawer.jsx's seed-form
  # useEffect) — confirmed via `git stash` that it exists on the unmodified file too, unrelated
  # to this batch's changes
node --check server/controllers/users.controller.js                # clean

# Behavioral verification (dev DB/server already running from a prior session this branch):
# seeded throwaway users via Prisma directly, drove real login/profile-edit/logout/login cycles
# through two isolated Chrome DevTools MCP browser contexts, and issued an authenticated
# in-page fetch() PATCH against another user's profile to confirm the 403.
# All test fixtures cleaned up via Prisma after each verification pass.
```

## constraints_discovered
- `TanStack Query`'s `initialData` is treated as "just fetched" (fresh) unless `initialDataUpdatedAt` is explicitly passed — a cache seeded purely to avoid a UI flash on refresh (as `sim_user_cached`/`useCurrentUser` is, per its own code comment) can silently suppress a legitimate background refetch for the full `staleTime` window if that detail is missed. Worth checking on any other hook in this app that combines `initialData` from a manual cache with a nonzero `staleTime`.
- The documented API spec (`SIMS_API_Endpoints_v2.0.md`) and the inline code comments in `users.routes.js`/`users.controller.js` had drifted apart for this endpoint — the spec was right, the code and its own comments described the (wrong) implemented behavior as intentional. Worth treating the spec doc as the source of truth over inline comments when the two disagree, at least until confirming with the owner which one is stale.

## deviations_from_constitution
- None.

## files_touched
- `client/src/components/ProfileDrawer.jsx` (toast copy only)
- `client/src/hooks/useAuth.js` (`useCurrentUser` — `initialDataUpdatedAt: 0`)
- `server/controllers/users.controller.js` (`updateProfile` — self-only for every role, `email` moved to rejected sensitive fields)
- `server/routes/users.routes.js` (route comment corrected to match)

## open_questions_for_owner
- None — all four items resolved or confirmed already correct, no avatar code touched.
