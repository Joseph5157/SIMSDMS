# Spec 033 — 21st.dev Pilot & Pattern Adoption

Status: planning only. No MCP connection verified, no candidate chosen, no code adapted yet.

Authority: `CONSTITUTION.md` §2 (tech stack) and
`specs/031-ui-architecture-design-system-decision/031-21st-dev-policy.md` govern this spec. This
document does not reopen or restate that policy — it sequences one small, bounded pilot under it.
Spec 032 (UI System Implementation & Migration) is closed; see
`specs/032-ui-system-implementation-migration/handoff.md`.

## 1. Purpose and scope

Now that Design System V2 is implemented and stable, evaluate 21st.dev as a **pattern source**,
not a component library, through one small pilot — not another audit or redesign project. 21st.dev
is a registry: components are searched/previewed, then their code (or a generation prompt) is
copied into this repo and adapted, rather than installing one monolithic package.

**If the pilot succeeds**, 21st.dev becomes an available tool for future feature-local visual
patterns, used the same disciplined way again. **If it does not**, Design System V2 as shipped by
Spec 032 is completely unaffected — nothing about this spec is load-bearing for the app.

## 2. Where 21st.dev may help (good candidates)

Non-core, feature-local presentational patterns where SIMS DMS currently has no strong shared
primitive:

- Activity/timeline presentations
- Richer empty states
- Compact information panels
- Dashboard composites
- Filter/toolbar layouts
- Responsive summary cards
- Polished visual compositions for areas without an established pattern

## 3. Where 21st.dev must NOT be used

These already have established ownership in this codebase (`docs/UI_ARCHITECTURE.md`,
`docs/MOBILE_PATTERNS.md`, `031-canonical-component-matrix.md`) and are out of scope for
replacement by anything sourced from 21st.dev:

`AppButton` · form/select primitives (AppSelect/AppTextInput/AppNumberInput, native Mantine
controls) · `ResponsiveSheet` · `FormModal` · `ConfirmDialog` · `Toast` · core `Table` behavior ·
the navigation shell (`Layout.jsx`) · focus management · typography/icons/tokens.

## 4. Non-negotiable rule

**Never run a shadcn install command in this repo.** 21st.dev components are published in shadcn
registry format and may reference shadcn primitives, but SIMS DMS does not use shadcn as its core
primitive system — the shadcn scaffold that once existed here (`components.json`, `lib/utils.ts`,
`clsx`, `tailwind-merge`) was removed as dead weight in Spec 032 Milestone 7 precisely because it
had no real consumer; do not reintroduce it as an install-time side effect of pulling in a 21st.dev
component.

Every candidate's actual code, dependency list, primitives, accessibility behavior, dark-mode
assumptions, and icon/font usage must be inspected before any decision. Reject (or recreate only
the useful visual idea with SIMS's existing stack) any candidate that would require installing
shadcn tooling, introducing a competing primitive, or adding a second theme system — this mirrors
`031-21st-dev-policy.md`'s own "Poor candidate categories" list.

## 5. Pilot phases

### 033-A — Connect + search only

Set up the 21st.dev MCP/CLI for Claude Code and verify Claude can search and inspect the catalog.
**Do not install anything.**

- The connection step (21st.dev account + API key, `claude mcp add` or equivalent) is the owner's
  to perform — Claude does not have a 21st.dev credential and cannot self-provision one.
- Once connected, verification is: Claude can run a search query against the 21st.dev
  MCP/CLI and receive real component metadata/code back (not a hypothetical description).
- Completion criteria: a documented, successful search-and-inspect round trip, nothing else
  changed in the repo.

### 033-B — Choose one pilot area

Pick **one** isolated presentational area — an activity/recent-events panel or an
information-summary composite are good first choices, not another core primitive.

Claude searches 21st.dev for 3-5 candidates and records them in a table:

| Candidate | Why useful | Dependencies | New primitives required | Accessibility | Dark mode | Adaptation effort |
| --- | --- | --- | --- | --- | --- | --- |

No coding in this phase. The owner picks one candidate from the table before 033-C begins.

### 033-C — Adapt, don't install blindly

Rebuild/adapt the chosen pattern's *visual idea* inside SIMS DMS's own code, not as a dropped-in
package:

- Public Sans / DM Mono only (no new font load)
- Tabler icons only (no Lucide, no new icon set)
- Existing color/spacing/radius tokens (`index.css` `@theme`, no new raw palette)
- Light + dark, verified in both
- 360px mobile, verified
- No competing button/form/modal/table system introduced
- No new global CSS or theme layer
- No unnecessary Radix/shadcn dependency — pull in only what the adapted code actually needs, and
  only after checking it isn't already covered by an existing primitive
- Preserve accessibility (labels, keyboard reachability, focus order) — do not regress below what
  a native/existing-primitive equivalent would provide

Because 21st.dev components are copied rather than installed as a library, the adapted code can be
freely rewritten to fit SIMS conventions instead of being locked to an upstream API.

### 033-D — Verify and decide

Live-browser verification (light/dark, 360px + desktop, keyboard/focus), then answer explicitly:

1. Is this visibly better than what existed before?
2. Does it feel like SIMS DMS, or like a pasted-in foreign pattern?
3. Did it add dependency complexity?
4. Is the result easier or harder to maintain than the alternative of building it from scratch with
   existing primitives?
5. Would this approach be worth reusing elsewhere?

Classify the outcome as one of:

- **ADOPT PATTERN** — keep as shipped, this becomes a normal part of the codebase.
- **ADOPT WITH CHANGES** — keep the idea, but note what still needs revision before it's fully at
  home in SIMS DMS.
- **DO NOT ADOPT** — revert; document why, so the same dead end isn't tried again.

Only after a documented 033-D outcome does 21st.dev get used again for a second pattern — this
spec does not pre-authorize a broader rollout.

## 6. What this spec is not

- Not a redesign of any existing page.
- Not an audit of the whole app for "21st.dev opportunities."
- Not authorization to install 21st.dev-sourced code for anything in §3's excluded list.
- Not a commitment to keep using 21st.dev if the pilot's 033-D verdict is DO NOT ADOPT.

## 7. Completion criteria for this spec

- 033-A's connection verified and documented.
- 033-B's candidate table recorded and an owner decision made.
- 033-C's adaptation implemented, or the spec stopped early with a documented reason (e.g. no
  candidate cleared the non-negotiable rule).
- 033-D's verdict recorded.
- A handoff report filed at `specs/033-21st-dev-pilot-pattern-adoption/handoff.md` per standing
  project convention, once any phase produces code or a verified connection.
