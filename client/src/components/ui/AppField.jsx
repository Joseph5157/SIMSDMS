import { Select, TextInput, NumberInput } from '@mantine/core';

// ── AppField family ──────────────────────────────────────────────────────
// Thin wrappers around Mantine's own accessible primitives — Mantine already
// gives consistent label/description/required/error/disabled styling, so
// these don't reimplement that. What they bake in once, instead of leaving
// every call site to remember it, is the small set of mobile-specific gotchas
// this codebase has already hit in production:
//
//   AppSelect       — comboboxProps={{ withinPortal:false }} by default.
//                      Without this, a Select inside a Radix/vaul overlay
//                      (ResponsiveSheet, BottomDrawer, StudentSearchOverlay)
//                      renders its dropdown into a portal outside the
//                      overlay's stacking context and becomes untappable on
//                      mobile — see the 2026-07-11 "Mantine Select in Drawer"
//                      fix this reproduces for every future overlay-hosted
//                      Select, not just the ones that already got patched.
//   AppNumberInput  — inputMode="decimal" by default, so mobile keyboards
//                      show a numeric layout instead of the full alphabet.

export function AppSelect({ comboboxProps, ...props }) {
  return (
    <Select
      comboboxProps={{ withinPortal: false, ...comboboxProps }}
      {...props}
    />
  );
}

export function AppTextInput(props) {
  return <TextInput {...props} />;
}

export function AppNumberInput({ inputMode = 'decimal', ...props }) {
  return <NumberInput inputMode={inputMode} {...props} />;
}
