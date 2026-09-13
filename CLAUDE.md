<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/032-ui-system-implementation-migration/032-migration-batch-plan.md`
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
  `@tabler/icons-react` is the established library for new third-party icon use; do not add
  `lucide-react` (the 030 baseline found no direct production Lucide imports).
- Do not import `@radix-ui/react-dialog`, `framer-motion`, or `vaul` directly in feature pages.
  Radix/Framer are internal shared-overlay infrastructure: `ResponsiveSheet` and the current
  nested `StudentSearchOverlay` exception. Do not copy or broaden that exception — see
  `CONSTITUTION.md` §2 and `docs/UI_ARCHITECTURE.md`.
- Do not add static inline `style={{ ... }}` objects for fixed values — inline `style` is for
  runtime-computed values only (e.g. a progress-bar width).
- Every new list/data screen must implement an explicit mobile rendering strategy (card, compact
  row, or scroll table) per the decision table in `docs/MOBILE_PATTERNS.md` — don't default to
  horizontal scroll.
- Preserve accessibility, focus management, keyboard handling, and safe-area behavior already
  established in the codebase (`useKeyboardInset`, `repositionInputs={false}`, etc.) when
  touching overlay/drawer code. The 030-D audit found focus-return gaps in tested FormModal and
  ConfirmDialog cases; verify behavior rather than assuming it is already uniform.

## Handoff Reports

Before starting any new task, read the most recent `specs/<feature-folder>/handoff.md` for the
relevant feature (if one exists) before touching code.

When finishing any task — a full feature or a single implementation step — fill out
`specs/_templates/handoff.md` and save it to `specs/<feature-folder>/handoff.md`, overwriting the
previous handoff for that feature.
