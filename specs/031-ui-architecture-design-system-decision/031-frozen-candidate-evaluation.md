# SIMS DMS V2 — Frozen Candidate Evaluation

Both commits remain preserved, unapplied, and outside the audited baseline. This is a V2 compatibility assessment only; it does not authorise cherry-pick, modification, rebase, deletion, or implementation.

| Commit | Candidate | V2 classification | Assessment | Conditions before any future application |
| --- | --- | --- | --- | --- |
| `fa996f2` | OfflineBanner → Alert + AppButton | **ACCEPT WITH REVISION** | V2 makes AppButton canonical for conventional actions and Alert a canonical inline message, so the visual direction is compatible. But OfflineBanner has a persistent root connectivity/sync lifecycle, which V2 preserves as distinct from ordinary Alert/Toast feedback. A change must not collapse that lifecycle, safe-area/z-index behavior, dismissal semantics, or offline readability into a generic alert. | Verify persistent offline behavior, dismissal/reappearance, dark mode, safe area, accessible naming, and whether a dismiss control is better treated as a raw disclosure control than a conventional AppButton action. |
| `91e5b3e` | Student Violation Report mobile card | **ACCEPT WITH REVISION** | V2 requires a mobile-specific result presentation when a report table would clip in a narrow sheet. The candidate is directionally aligned, but it predates V2 and addresses one report surface rather than the whole report-data rule. | Validate schema equivalence, filters, selected-report header, export hierarchy, status/actions, loading/empty/error states, 360/390/412 behavior, dark mode, and whether the card design follows V2 operational density rather than creating a decorative card stack. |

Neither candidate is accepted as-is or rejected. Their future handling belongs in an owner-approved Spec 032 migration plan.

