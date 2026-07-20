/**
 * ResponsiveDataView — formalizes the "render both, let CSS pick one" pattern
 * that DutySlotsPage already used correctly (`md:hidden` mobile block +
 * `hidden md:block` desktop block) instead of a JS `isMobile` conditional.
 * Rendering both avoids a hydration/layout flash on first paint and needs no
 * client-only media-query state — the tradeoff (both trees mount) is the same
 * one the existing, already-proven pattern already made.
 *
 * `mobile`/`desktop` take already-built JSX, not a per-item render callback —
 * most screens in this app group/paginate/filter their data before render
 * (e.g. DutySlotsPage's morning/afternoon session grouping), so a flat
 * per-item `(item) => <Card/>` shape doesn't fit most real usage here. Build
 * the JSX with your own `.map()`/grouping first, then hand the result in.
 */
// Static per-breakpoint class pairs, not string interpolation — Tailwind
// generates CSS by scanning source files for complete, literal class-name
// strings (see docs/UI_ARCHITECTURE.md §5's dynamic-class prohibited
// pattern). A `` `${breakpoint}:hidden` `` template literal here would have
// been the exact same silent-failure bug caught in ResponsiveSheet.
const BREAKPOINT_CLASSES = {
  sm: { mobile: 'sm:hidden', desktop: 'hidden sm:block' },
  md: { mobile: 'md:hidden', desktop: 'hidden md:block' },
  lg: { mobile: 'lg:hidden', desktop: 'hidden lg:block' },
};

export default function ResponsiveDataView({ mobile, desktop, breakpoint = 'md' }) {
  const cls = BREAKPOINT_CLASSES[breakpoint] ?? BREAKPOINT_CLASSES.md;
  return (
    <>
      <div className={cls.mobile}>{mobile}</div>
      <div className={cls.desktop}>{desktop}</div>
    </>
  );
}
