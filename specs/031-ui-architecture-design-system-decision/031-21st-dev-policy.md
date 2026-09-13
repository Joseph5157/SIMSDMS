# SIMS DMS V2 — 21st.dev Policy

## Rule

**21st.dev is a pattern/component source, not the SIMS DMS design system.** It may inform a reviewed implementation after Spec 032 is authorised; it cannot establish a new primitive, visual language, dependency, or global styling model by accident.

## Non-negotiable review requirements

Every candidate must:

1. Adapt to SIMS semantic tokens, light/dark behavior, Public Sans/DM Mono, and Tabler.
2. Respect existing breakpoint ownership, mobile safe areas, and the approved overlay/table rules.
3. Meet keyboard, focus, label, contrast, touch-target, and reduced-motion requirements.
4. Avoid a global theme, raw independent colour palette, font load, icon library, or CSS reset.
5. Avoid a competing button, field, dialog, table, toast, or navigation primitive unless an owner explicitly approves an architecture exception.
6. Be checked against existing shared primitives first; a duplicate is rejected unless it adds a demonstrated capability unavailable in the canonical owner.
7. Be assessed for dependency, bundle, maintenance, and dark-mode impact before adoption.

## Good candidate categories

- Non-core visual patterns that can be rebuilt using existing primitives and tokens.
- Focused decorative-but-functional detail patterns after visual policy review, such as an operational empty illustration treatment.
- Specialized data presentation or utility layout patterns where shared Table, responsive rules, and accessibility requirements remain intact.
- Internal inspiration for composition, hierarchy, or interaction—not necessarily source code adoption.

## Poor candidate categories

- Buttons, form fields, dialogs/sheets, menus, toasts, tables, navigation, authentication UI, global themes, font systems, icon systems, and token systems already owned by V2.
- Generic dashboard hero/stat-card/report catalogues that repeat the 030-E visual-density signals.
- Components requiring shadcn, Radix feature imports, Lucide, a new animation library, a new CSS framework, or an unreviewed primitive dependency.
- Any pattern that cannot meet current responsive, dark-mode, safe-area, or keyboard requirements.

## Adoption process

1. Identify the semantic job and existing V2 owner.
2. Document why existing primitives do not meet the need.
3. Review the candidate against the non-negotiable requirements.
4. Implement only under authorised Spec 032 scope, adapting to V2 tokens and primitives.
5. Verify desktop/mobile, light/dark, keyboard/focus, and bundle/dependency impact.
6. Treat the result as feature-local unless an explicit owner decision promotes it to a canonical primitive.

No marketplace component is selected, installed, or imported by this policy.

