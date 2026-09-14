// Mantine color-ramp adapter — the one place Mantine's palette hex literals
// live, so App.jsx doesn't carry a second copy of the design system's colors
// buried in its theme setup (Spec 032 Batch 2.1 / 030-H DS-11 / C-R02).
//
// Mantine's `createTheme({ colors })` requires 10 literal hex strings per
// ramp — it cannot read CSS custom properties, so this file cannot become the
// single storage location shared with `client/src/index.css`'s `@theme`
// block. What it *can* do is be the one JS-side declaration (instead of one
// buried inside the large App.jsx) and document, per ramp and per shade
// index, exactly which `index.css` custom property (light-mode block) each
// value must keep matching. When a brand/status color changes, update BOTH
// this file and the matching `index.css` variable(s) named below.
//
// Mantine reserves specific color keys (blue/gray/green/red/yellow/indigo/
// violet) for its own theming API — three of those keys don't match the
// app's own semantic hue names, which is itself a source of the sync
// confusion this adapter exists to remove:
//   Mantine key "gray"   → app calls this hue "slate"
//   Mantine key "green"  → app calls this hue "emerald"
//   Mantine key "yellow" → app calls this hue "amber"
//   Mantine key "violet" → app calls this hue "purple"
// The arrays below keep Mantine's required key names; the comments name the
// app's actual semantic tokens.

export const mantineColors = {
  // == index.css --color-blue-50 .. --color-blue-900 (exact, all 10 shades).
  blue: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],

  // Mantine "gray" == app's "slate": index.css --color-slate-50 .. --color-slate-900 (exact, all 10 shades).
  gray: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],

  // Mantine "green" == app's "emerald" at shades 1/5/6/7/8, which match
  // --color-emerald-tint/-solid/-600/-700/-text exactly. Shades 0 and 2 are
  // NOT the same values as --color-emerald-bg (#f0fdf4) / --color-emerald-border
  // (#bbf7d0) — those two semantic tints were chosen independently in
  // index.css. Do not "correct" shades 0/2 to match without a deliberate
  // visual decision; a change here shifts whatever currently renders with
  // Mantine's green[0]/green[2] (e.g. a light `color="green"` fill/border).
  green: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],

  // == app's --color-red-* semantic aliases, exact at every shade referenced
  // by name: bg=0, border=tint=2, solid=5, 600=6, 700=7.
  red: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],

  // Mantine "yellow" == app's "amber": exact at every shade referenced by
  // name: bg=0, border=tint=2, solid=5, 600=6, 700=7, text=8.
  yellow: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],

  // Secondary + tertiary M3-style accent roles, already used in
  // --brand-gradient (indigo) and the super_admin badge (violet/purple).
  // == app's --color-indigo-* semantic aliases, exact: bg=0, border=2, solid=5, 600=6, text=8.
  indigo: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'],

  // Mantine "violet" == app's "purple": exact at every shade referenced by
  // name: bg=0, border=tint=2, solid=5, text=8.
  violet: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
};
