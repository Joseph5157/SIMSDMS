<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/003-admin-duty-timing-settings/plan.md`
<!-- SPECKIT END -->

## Project Constitution

Read `CONSTITUTION.md` at the project root before taking any action on this codebase. It is the single source of truth for the SIMS Discipline Management System.

## UI Architecture

Read `docs/UI_ARCHITECTURE.md` and `docs/MOBILE_PATTERNS.md` before adding or changing any
frontend component. Summary of the enforced rules (full detail + rationale in those files):

- Use shared components from `client/src/components/ui/`. Do not create new raw buttons,
  inputs, modals, drawers, or confirmation dialogs when a Mantine or shared-component
  equivalent exists.
- Mantine owns interactive/accessibility behavior. Tailwind owns responsive layout and spacing.
- Do not add a new UI or icon library without an explicit `CONSTITUTION.md` §2 amendment.
  `@tabler/icons-react` is the only icon library for new code — `lucide-react` is deprecated.
- Do not import `@radix-ui/react-dialog`, `framer-motion`, or `vaul` directly in
  `client/src/pages/**` or `client/src/components/**` (outside the internal implementation of
  `ResponsiveSheet` once it exists) — see `CONSTITUTION.md` §2.
- Do not add static inline `style={{ ... }}` objects for fixed values — inline `style` is for
  runtime-computed values only (e.g. a progress-bar width).
- Every new list/data screen must implement an explicit mobile rendering strategy (card, compact
  row, or scroll table) per the decision table in `docs/MOBILE_PATTERNS.md` — don't default to
  horizontal scroll.
- Preserve accessibility, focus management, keyboard handling, and safe-area behavior already
  established in the codebase (`useKeyboardInset`, `repositionInputs={false}`, etc.) when
  touching overlay/drawer code.

## Handoff Reports

Before starting any new task, read the most recent `specs/<feature-folder>/handoff.md` for the
relevant feature (if one exists) before touching code.

When finishing any task — a full feature or a single implementation step — fill out
`specs/_templates/handoff.md` and save it to `specs/<feature-folder>/handoff.md`, overwriting the
previous handoff for that feature.
