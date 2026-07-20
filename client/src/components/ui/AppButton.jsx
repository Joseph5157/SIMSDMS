import { Button, ActionIcon } from '@mantine/core';

// ── variant → Mantine props ─────────────────────────────────────────────
// One place that owns "what does a primary/secondary/danger/ghost action
// look like", instead of every call site repeating color/variant/touch-
// target boilerplate (e.g. the styles={{root:{minHeight:'var(--control-min)'}}}
// pattern previously copy-pasted per Button call — see docs/UI_ARCHITECTURE.md
// §3 component inventory).
const VARIANT_PROPS = {
  primary:   { variant: 'filled', color: 'blue' },
  secondary: { variant: 'default' },
  danger:    { variant: 'filled', color: 'red' },
  ghost:     { variant: 'subtle' },
};

/**
 * AppButton — canonical button for Mantine-backed usage sites.
 *
 * Variants (per docs/UI_ARCHITECTURE.md):
 *   primary   — main completion action. One per visual region.
 *   secondary — alternative action, lower emphasis than primary.
 *   danger    — destructive action. Pair with ConfirmDialog when irreversible.
 *   ghost     — low-emphasis local action. Keeps Mantine's default visible
 *               focus ring (never override it away).
 *   icon      — compact icon-only action. `aria-label` is required (not
 *               optional) since there's no visible text for a screen reader
 *               to announce.
 *
 * Every variant gets the 44px touch-target floor baked in once here, so
 * individual call sites don't need to remember `--control-min` themselves.
 */
export default function AppButton({
  variant = 'primary',
  children,
  icon,
  'aria-label': ariaLabel,
  style,
  ...props
}) {
  if (variant === 'icon') {
    if (!ariaLabel) {
      throw new Error('AppButton variant="icon" requires an aria-label (no visible text for screen readers to announce).');
    }
    return (
      <ActionIcon
        variant="default"
        aria-label={ariaLabel}
        style={{ minWidth: 'var(--control-min)', minHeight: 'var(--control-min)', ...style }}
        {...props}
      >
        {icon}
      </ActionIcon>
    );
  }

  const variantProps = VARIANT_PROPS[variant] ?? VARIANT_PROPS.primary;

  return (
    <Button
      {...variantProps}
      style={{ minHeight: 'var(--control-min)', ...style }}
      {...props}
    >
      {children}
    </Button>
  );
}
