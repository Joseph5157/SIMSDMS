# SIMS DMS V2 — Canonical Component Matrix

This matrix is normative for new and migrated UI. “Migration needed” means future Spec 032 planning, not an instruction to change current code now.

| Concern | Canonical implementation | Direct use allowed? | Exceptions | Future migration needed? |
| --- | --- | --- | --- | --- |
| Conventional feature action | `AppButton` | Direct Mantine only for documented library/shared-primitive need. | Raw shell/composite controls are not feature CTAs. | Yes — normal CTAs converge gradually. |
| Primary/secondary/danger action | `AppButton` semantic variants | No new direct/raw equivalent. | Danger always uses approved confirmation where consequential. | Yes. |
| Icon-only action | `AppButton` icon mode or established shared icon control | Direct Mantine ActionIcon for a documented library-specific/row-menu case. | Close/menu/calendar/pagination triggers may be raw semantic buttons. | Yes where a conventional action is currently raw. |
| Navigation | Router Link/NavLink | N/A. | External anchor for external destination with safe target handling. | No broad migration. |
| Tabs/toggles/disclosure | Native semantic button or Mantine primitive appropriate to composite behavior | Yes. | Must expose selected/expanded state and keyboard behavior. | Review only when touched. |
| Pagination | Shared `Pagination` | Internal raw buttons are allowed. | Table/list pagination must preserve labels and 44px-class hit areas. | No broad migration. |
| Standard text/number/textarea field | Direct Mantine TextInput/NumberInput/Textarea | Yes — canonical direct use. | App wrappers only if a material shared contract is added. | No. |
| Overlay-hosted select | `AppSelect` | Direct Mantine Select only where portal behavior is proven safe. | Native select for simple platform-appropriate set. | Yes where a Radix overlay currently bypasses portal safety. |
| Ordinary page/filter select | Direct Mantine Select | Yes. | Native select for small static native-appropriate set. | No. |
| Native typed input | Native input | Yes. | Password, search, file, date, time, checkbox/radio, or other native-specialized behavior. | No. |
| Labels/help/errors | Mantine field association or semantic native label/description/error relationship | Yes. | Placeholder is never a label. | Review on migration. |
| Responsive task overlay | `ResponsiveSheet` | No feature Radix/Framer imports. | StudentSearchOverlay is shared bounded exception. | Keep; migrate legacy raw footer actions later. |
| Create/edit form overlay | `FormModal` | Direct Mantine Modal only with documented mismatch. | Complex task flow may use ResponsiveSheet. | Verify focus return when touched. |
| Confirmation | `ConfirmDialog` | No new `window.confirm`. | Direct Modal only if confirmation contract cannot fit and is documented. | Yes for any reachable legacy bypass. |
| Anchored menu | Mantine Menu | Yes. | Custom dropdown only for defined search/selection behavior. | No broad migration. |
| Nested student search | `StudentSearchOverlay` | Direct Radix/Framer only inside this shared component. | No feature copies. | Preserve pending long-term review. |
| Desktop table | Shared `Table` | No direct feature Mantine Table. | Specialized analytical raw table only when semantic structure cannot fit. | Yes for new ordinary tables. |
| Mobile operational data | Page-specific compact rows/cards with shared status/action language | Yes. | ResponsiveDataView optional coordinator. | Reports and affected pages planned in 032. |
| Mobile read-only comparison | Shared Table in visible scroll container | Yes. | Never a clipped narrow-sheet table. | Yes for Reports defect. |
| Toast | Custom `Toast` | No Mantine Notifications. | None without new owner decision. | No broad migration. |
| Inline feedback | Custom `Alert` | Mantine Alert only inside an established shared primitive contract. | OfflineBanner retains connectivity lifecycle. | Review future local ad hoc messages. |
| Page/card empty | `EmptyState` | Yes when the container requires a distinct semantic layout. | Table uses EmptyRow. | Gradual. |
| Table empty/loading/error | `EmptyRow`, `ErrorRow` | No ad hoc table equivalents. | None. | Gradual. |
| Non-table data failure | `ErrorBlock` | Alert when contextual explanation/action is more appropriate. | Fatal render failure remains ErrorBoundary. | Gradual. |
| Known-shape loading | Skeleton family | Local loader for indeterminate mutation/route wait. | Do not skeletonize unknown structure. | Gradual. |
| Offline | `OfflineBanner` | No replacement with ordinary Toast/Alert. | N/A. | Candidate review only. |
| Page hierarchy | `PageHeader` variants | Specialized dashboard/task headers permitted. | Must preserve hierarchy and page/task clarity. | No forced migration. |
| Status / role | `Badge` | Compact local chip only for non-overlapping semantic role. | Do not use decorative metadata pills. | Gradual. |
| Metrics | `StatCard` | Local metric surface only for materially different analytic content. | No rainbow arbitrary accents. | Dashboard work later. |
| Charts | Mantine Charts with Recharts peer | Direct page use allowed for current narrow analytics scope. | No new chart library or wrapper unless a later decision proves need. | No. |
| Icons | Tabler | App-specific SVG/logo permitted. | Emoji only exceptional content cue, never UI system. | Gradual in Reports/dashboards. |
| Typography | Public Sans / DM Mono | N/A. | No new UI font. | No. |

