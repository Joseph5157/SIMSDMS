// Theme management utility
const STORAGE_KEY = 'app-theme';
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

/**
 * Get system preference for dark mode
 * @returns {boolean} true if system prefers dark mode
 */
export function getSystemPreference() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get the current theme setting from localStorage
 * @returns {string} 'light', 'dark', or 'system'
 */
export function getTheme() {
  if (typeof window === 'undefined') return THEMES.LIGHT;
  return localStorage.getItem(STORAGE_KEY) ?? THEMES.SYSTEM;
}

/**
 * Resolve effective theme (accounts for 'system' setting)
 * @returns {string} 'light' or 'dark' (never 'system')
 */
export function getEffectiveTheme() {
  const theme = getTheme();
  if (theme === THEMES.SYSTEM) {
    return getSystemPreference() ? THEMES.DARK : THEMES.LIGHT;
  }
  return theme;
}

/**
 * Apply theme to document and save to localStorage
 * @param {string} theme - 'light', 'dark', or 'system'
 */
export function setTheme(theme) {
  if (!Object.values(THEMES).includes(theme)) {
    console.warn(`Invalid theme: ${theme}. Using 'system'.`);
    theme = THEMES.SYSTEM;
  }

  // Save to localStorage
  localStorage.setItem(STORAGE_KEY, theme);

  // Apply to DOM
  applyTheme();

  // Dispatch custom event for other listeners
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

/**
 * Apply the effective theme to the HTML element
 */
function applyTheme() {
  const effectiveTheme = getEffectiveTheme();
  const html = document.documentElement;

  if (effectiveTheme === THEMES.DARK) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

/**
 * Initialize theme on app startup
 * Sets up listeners for system preference changes and storage changes
 */
export function initializeTheme() {
  if (typeof window === 'undefined') return;

  // Apply initial theme
  applyTheme();

  // Listen for system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemPreferenceChange = () => {
    if (getTheme() === THEMES.SYSTEM) {
      applyTheme();
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: getEffectiveTheme() } }));
    }
  };

  // Modern API
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemPreferenceChange);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handleSystemPreferenceChange);
  }

  // Listen for storage changes (theme changed in another tab)
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      applyTheme();
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: getEffectiveTheme() } }));
    }
  });
}

/**
 * Cycle through themes: light → dark → system → light
 */
export function cycleTheme() {
  const current = getTheme();
  const themes = Object.values(THEMES);
  const currentIndex = themes.indexOf(current);
  const nextIndex = (currentIndex + 1) % themes.length;
  setTheme(themes[nextIndex]);
}

/**
 * Get theme icon for display
 * @returns {string} emoji representing current theme
 */
export function getThemeIcon() {
  const theme = getTheme();
  switch (theme) {
    case THEMES.LIGHT:
      return '☀️';
    case THEMES.DARK:
      return '🌙';
    case THEMES.SYSTEM:
      return '🖥️';
    default:
      return '🖥️';
  }
}

/**
 * Get theme label for display
 * @returns {string} human-readable theme name
 */
export function getThemeLabel() {
  const theme = getTheme();
  switch (theme) {
    case THEMES.LIGHT:
      return 'Light';
    case THEMES.DARK:
      return 'Dark';
    case THEMES.SYSTEM:
      return 'System';
    default:
      return 'System';
  }
}
