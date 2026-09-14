import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist']),
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['vite.config.js'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Dev-only Fast-Refresh hint, not a correctness rule. A few UI primitives
      // deliberately co-locate a hook/context/style-helper with their component
      // (Toast is imported in many files); forcing a split there is churn with
      // no runtime benefit. Keep as a warning so the lint gate stays green.
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // CONSTITUTION.md §2 / docs/UI_ARCHITECTURE.md: Tabler is the only icon
    // library, and Radix/Framer/Vaul are internal to the overlay primitives —
    // feature code (pages, components) reaches for ResponsiveSheet instead of
    // branching on isMobile to pick between two overlay libraries.
    files: ['src/pages/**/*.{js,jsx}', 'src/components/**/*.{js,jsx}'],
    ignores: [
      // Canonical internal implementation — the one file allowed to import
      // Radix Dialog + Framer Motion directly.
      'src/components/ui/ResponsiveSheet.jsx',
      // Documented exception: nests as its own Dialog.Root inside
      // ResponsiveSheet (Radix's focus-scope stack needs a real nested root —
      // see the file's header comment for why this can't route through
      // ResponsiveSheet like every other overlay).
      'src/components/ui/StudentSearchOverlay.jsx',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'framer-motion', message: 'Use ResponsiveSheet (client/src/components/ui/ResponsiveSheet.jsx) instead of importing Framer Motion directly.' },
          { name: 'vaul', message: 'Vaul was replaced by ResponsiveSheet (client/src/components/ui/ResponsiveSheet.jsx) — do not reintroduce it.' },
          { name: 'lucide-react', message: 'Tabler (@tabler/icons-react) is the only icon library for new code — see CONSTITUTION.md §2.' },
        ],
        patterns: [
          // Milestone 7 (Spec 032): the prior rule only named the one Radix
          // package already installed (@radix-ui/react-dialog), so importing
          // any other Radix subpackage directly (e.g. @radix-ui/react-popover)
          // went unflagged — CONSTITUTION.md §2 restricts Radix generally, not
          // just that one entry point. A glob closes that gap.
          { group: ['@radix-ui/*'], message: 'Radix is internal shared-overlay infrastructure (ResponsiveSheet / the documented StudentSearchOverlay exception only) — see CONSTITUTION.md §2 and docs/UI_ARCHITECTURE.md. Do not import any @radix-ui/* package directly in feature code.' },
        ],
      }],
    },
  },
  {
    files: ['vite.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
])
