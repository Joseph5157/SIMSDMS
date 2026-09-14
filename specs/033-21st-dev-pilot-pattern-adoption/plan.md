# Spec 033 — 21st.dev Pilot & Pattern Adoption

Status: **CLOSED (2026-09-14).** 033-A through 033-D complete. Owner verdict: ADOPT WITH CHANGES.
See `specs/033-21st-dev-pilot-pattern-adoption/handoff.md` for the implementation record.

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

**Verified 2026-09-14.** Owner connected the 21st.dev Magic MCP (`mcp__magic__*` tools). Ran
`mcp__magic__search(query: "activity timeline panel", type: "component")` and received 5 real
component results with ids, descriptions, preview URLs, and install commands (e.g. id 857
"Timeline" by manuarora700, id 5157 by preetsuthar17). This is real catalog metadata, not a
hypothetical description — round trip confirmed. Nothing installed; no repo code touched. 033-A
is done. 033-B (choosing one pilot area and building the 3-5 candidate table) is next and needs an
owner decision on which area to target before candidates are pulled.

### 033-B — Choose one pilot area

Pick **one** isolated presentational area — an activity/recent-events panel or an
information-summary composite are good first choices, not another core primitive.

**2026-09-14 note:** owner's first instinct ("dashboard summary composite") mostly collides with
`031-21st-dev-policy.md`'s poor-candidate category "generic dashboard hero/stat-card/report
catalogues that repeat the 030-E visual-density signals" — a search for that area returned almost
entirely generic KPI/stat-card components (id 19070, 7841, 4245/4435/4237, 4403, 8371), which the
030-E audit already flagged as overused in SIMS's dashboards. Narrowed instead to a
non-generic **dashboard activity/recent-events composite**, which is on the spec's own
good-candidate list and isn't a stat-card repeat.

Claude searches 21st.dev for 3-5 candidates and records them in a table:

| Candidate | Why useful | Dependencies | New primitives required | Accessibility | Dark mode | Adaptation effort |
| --- | --- | --- | --- | --- | --- | --- |
| **Dashboard Activities** (id 8372, uniquesonu) — code inspected | Recent-activity card feed matching the "activity/recent-events panel" good-candidate | `framer-motion`, `lucide-react`, shadcn `Card`/`CardHeader`/`CardContent`/`Separator`, `@radix-ui/react-separator`, `cn`/`lib/utils` | Reintroduces the shadcn scaffold (`cn`, `lib/utils`) removed in Spec 032 M7; adds a new animation library; adds Lucide | Icons marked `aria-hidden`; no other a11y treatment (no live-region for feed updates, no keyboard nav) | Uses shadcn CSS-var tokens (`bg-card`, `text-muted-foreground`, etc.), not SIMS's `@theme` tokens — would need full retokenization | High — fails 3 of the non-negotiable rules outright (Lucide, animation lib, shadcn scaffold); only the layout idea (icon-chip + message + timestamp row) is salvageable |
| **Activity List** (id 7632, lavikatiyar) — code inspected | Transaction/activity list with avatar + amount + date columns; simpler than above, no chart | `framer-motion` (stagger/spring entrance), `cn`/`lib/utils`; no Lucide, no Radix, no shadcn subcomponents (self-contained JSX) | Reintroduces `cn`/shadcn convention; adds a new animation library | Plain `<img>` avatars with `alt`; no ARIA list semantics beyond native `<ul>/<li>`; no reduced-motion guard on the spring animation | Uses shadcn tokens (`bg-card`, `text-destructive`, `text-emerald-500` hardcoded) — would need retokenization; hardcoded green/red isn't SIMS's status-color convention | Medium — smaller surface than Dashboard Activities; still needs framer-motion stripped (replace with CSS transition or nothing) and full retokenization, but structurally close to something Table/Card + Tailwind could reproduce natively |
| **Incident Status Timeline** (id 24943, cnippet-dev) — metadata only, quota exhausted | Collapsible status-badge timeline with timestamps/update messages — maps well onto a violation-status history view, which SIMS doesn't have a shared pattern for | Unconfirmed; registry convention across every inspected candidate so far is shadcn `cn`/Card + often Radix/Lucide/framer-motion, so assume the same until inspected | Unconfirmed pending inspection | Unconfirmed | Unconfirmed | Unconfirmed — most promising *idea* fit for SIMS's actual domain (violation/incident history), but needs code inspection before any effort estimate is real |
| **Chrono Board** (id 9216, dhileepkumargm) — metadata only, quota exhausted | Timeline/feed dashboard bundle (3 named sub-patterns: PulseLine/ChronoBoard/BeaconFeed) surfacing system events/alerts | Unconfirmed, same caveat as above | Unconfirmed | Unconfirmed | Unconfirmed | Unconfirmed — marketing-heavy description suggests a bigger, more opinionated bundle than a single focused pattern; likely higher adaptation effort than Incident Status Timeline |

**Quota note:** the free-tier `get_component` retrieval is capped at 2/day (resets
2026-09-15T00:00 UTC per the API). Both retrievals today went to the two fully-inspected rows
above. Inspecting the remaining two candidates needs a fresh day's quota (or a paid tier).

**Emerging finding (informs 033-D Q3):** every component whose code was actually pulled — 2 for
2, no exceptions yet — bundled `framer-motion` and shadcn's `cn`/`lib/utils` convention as
load-bearing, non-optional parts of the component, not incidental extras. This matches
`031-21st-dev-policy.md`'s warning about "an unreviewed primitive dependency" and suggests the
realistic 21st.dev workflow for this repo is "borrow the layout idea, discard ~80% of the pasted
code," not "adapt the pasted code." Worth weighing when the owner picks a candidate: expect a
rewrite, not an adaptation.

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

**Done (2026-09-14).** The free-tier quota was exhausted before "Incident Status Timeline" or
"Chrono Board" could be inspected, and both fully-inspected 033-B candidates (Dashboard Activities,
Activity List) failed the non-negotiable rule outright (`framer-motion`, shadcn `cn`/`lib/utils`,
in one case Lucide). Rather than wait on quota or adopt disqualified code, the pilot area was
narrowed to the Faculty Dashboard's existing "Recent activity" feed and 3 from-scratch layout
proposals were drafted — using only SIMS DMS primitives — inspired by the Activity List candidate's
icon-chip/message/timestamp composition rather than its code. Owner picked Proposal 1 with two
revisions (single neutral/brand tonal chip instead of a per-type accent map; no merging of other
dashboard sections into the feed this pilot). Implemented in
`client/src/pages/faculty/DashboardPage.jsx`: `MobileList`/`MobileListItem`, Tabler icons
(`IconAlertTriangle`/`IconMail`/`IconRefresh`), existing `Badge` for status, existing tokens, no new
dependency. Full record in `specs/033-21st-dev-pilot-pattern-adoption/handoff.md`.

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

---

**033-D Owner Verdict (2026-09-14): ADOPT WITH CHANGES**

21st.dev is approved as a bounded pattern and layout inspiration source for SIMS DMS.

Direct component adoption is not the default. Candidate code must first be reviewed against
`031-21st-dev-policy.md`.

When a candidate introduces incompatible primitives, fonts, icons, tokens, animation libraries, or
global styling, the preferred approach is to recreate only the useful composition using existing
SIMS DMS primitives.

The Faculty Dashboard Recent Activity pilot successfully demonstrated this approach:

- no new dependency
- existing `MobileList` / `MobileListItem`
- Tabler icons
- existing Badge/status semantics
- existing SIMS tokens
- light/dark support
- mobile/desktop verification

Therefore, 21st.dev may be used selectively in future work where SIMS DMS has a genuine
presentational gap, but it must not become a competing design system or primitive stack.

Answering the five 033-D questions against that pilot:

1. **Visibly better than before?** Yes — the row is less variable-height, chip color no longer
   competes with the status Badge, and event type reads from icon shape rather than an
   easily-missed background tint.
2. **Feels like SIMS DMS, or a pasted-in foreign pattern?** SIMS DMS — it reuses the exact
   chip-token pair already established by the "Upcoming duties" tile on the same page, and the
   shared `MobileList` primitive used elsewhere in the app.
3. **Added dependency complexity?** None. Zero new packages; only new Tabler icon imports from the
   already-established icon library.
4. **Easier or harder to maintain than building from scratch?** Easier — it *is* built from
   scratch with existing primitives; there was never a foreign implementation to reconcile.
5. **Worth reusing elsewhere?** The workflow (21st.dev pattern → inspect composition → discard
   incompatible implementation stack → rebuild with SIMS Design System V2 primitives) is worth
   reusing; the specific chip/row markup is reusable wherever another compact activity-style feed
   is needed.

**Spec 033 is CLOSED.**

## 6. What this spec is not

- Not a redesign of any existing page.
- Not an audit of the whole app for "21st.dev opportunities."
- Not authorization to install 21st.dev-sourced code for anything in §3's excluded list.
- Not a commitment to keep using 21st.dev if the pilot's 033-D verdict is DO NOT ADOPT.

## 7. Completion criteria for this spec

- [x] 033-A's connection verified and documented.
- [x] 033-B's candidate table recorded and an owner decision made.
- [x] 033-C's adaptation implemented, or the spec stopped early with a documented reason (e.g. no
      candidate cleared the non-negotiable rule) — implemented via from-scratch SIMS-primitive
      rebuild after both fully-inspected candidates failed the non-negotiable rule.
- [x] 033-D's verdict recorded — **ADOPT WITH CHANGES**.
- [x] A handoff report filed at `specs/033-21st-dev-pilot-pattern-adoption/handoff.md` per standing
      project convention.

**Spec 033: CLOSED (2026-09-14).**
