# Frontend Features Testing Checklist

**Project**: SIMS Discipline Management System  
**Date**: 2026-06-14  
**Scope**: Features 6-10 (Dark Mode, Accessibility, Mobile Nav, Notifications, PWA Offline)

---

## Feature 6: Dark Mode Testing

### Theme Toggle
- [ ] Bell icon visible in desktop sidebar user block
- [ ] Bell icon visible in mobile drawer
- [ ] Clicking bell cycles: Light → Dark → System → Light
- [ ] Icon changes: ☀️ (Light) → 🌙 (Dark) → 🖥️ (System)
- [ ] Label updates correctly

### Persistence
- [ ] Reload page → theme persists
- [ ] Close browser → reopen → theme persists
- [ ] Open incognito → different theme doesn't affect main window
- [ ] Multiple tabs → change theme in one → updates in all

### CSS Variables & Visual Testing
- [ ] Light mode: Primary bg white, text dark, borders light
- [ ] Dark mode: Primary bg dark, text light, borders dark
- [ ] All pages apply correct colors in both modes
- [ ] No hardcoded colors visible
- [ ] Focus indicators visible in both modes

---

## Feature 7: Accessibility Audit Testing

### ARIA Labels & Attributes
- [ ] All icon-only buttons have aria-label
- [ ] Form inputs have aria-invalid when error present
- [ ] Error messages have role="alert"
- [ ] Error ID linked with aria-describedby
- [ ] Toasts have aria-live (polite/assertive)
- [ ] Modals have aria-labelledby pointing to title
- [ ] Navigation has aria-label

### Keyboard Navigation
- [ ] Tab through all pages → every interactive element reachable
- [ ] Enter/Space: Activate buttons
- [ ] Escape: Close modals, drawers, toasts
- [ ] No keyboard traps

### Focus Management
- [ ] Focus ring visible on all buttons, inputs, links
- [ ] Focus ring contrast ≥ 3:1
- [ ] Focus indicator clear in both light and dark modes

### Screen Reader Testing
- [ ] NVDA announces button labels via aria-label
- [ ] Screen reader announces form errors
- [ ] Modal title announced when modal opens
- [ ] Navigation landmarks announced

### Color Contrast
- [ ] All text ≥ 4.5:1 contrast (WCAG AA)
- [ ] Focus rings ≥ 3:1 contrast
- [ ] axe DevTools audit: zero color violations

---

## Feature 8: Mobile Navigation Drawer Testing

### Drawer Opening/Closing
- [ ] Mobile only: Drawer hidden on desktop (≥768px)
- [ ] "More" button (☰) visible on mobile tab bar
- [ ] Clicking "More" slides drawer up smoothly
- [ ] Drawer closes on overlay click
- [ ] Drawer closes on close button (X) click
- [ ] Drawer closes on Escape key

### Animations & Performance
- [ ] Drawer slides up smoothly (280ms)
- [ ] Overlay fades in (280ms)
- [ ] No jank or stuttering on animation
- [ ] Animations work at 60fps

### Drawer Contents & Functionality
- [ ] User avatar, name, role displayed
- [ ] 3-column navigation grid with all links
- [ ] Theme toggle button works
- [ ] Logout button works
- [ ] Click nav item → navigate & close drawer
- [ ] Active item highlighted

### Touch & Responsive
- [ ] All buttons ≥ 44px height
- [ ] All interactive areas ≥ 44×44px
- [ ] Tab bar sticky at bottom
- [ ] Works on various screen sizes (375px - 768px)
- [ ] Works in portrait and landscape

---

## Feature 9: Notification Bell Testing

### Bell Icon & Badge
- [ ] Bell icon visible in header on all pages
- [ ] Badge shows unread count (1-9)
- [ ] Badge shows "9+" for 10+ unread
- [ ] Badge hidden when 0 unread
- [ ] Badge color is red

### Dropdown Panel
- [ ] Click bell → dropdown opens
- [ ] Click outside → dropdown closes
- [ ] Click bell again → toggles dropdown
- [ ] Dropdown positioned top-right of bell
- [ ] Shows last 10 notifications
- [ ] Empty state: "No notifications"

### Notification Features
- [ ] Each notification shows: title, message, timestamp
- [ ] Blue dot on unread notifications
- [ ] Timestamps formatted correctly ("5m ago", "2h ago", etc.)
- [ ] Offline indicator shows when disconnected
- [ ] Real-time updates appear immediately

### Notification Interaction
- [ ] Click unread notification → marks as read
- [ ] Blue dot disappears after reading
- [ ] Unread count decreases
- [ ] Click navigates to actionUrl if present
- [ ] Read notifications look different

### Full Notifications Page
- [ ] "View all notifications" link works
- [ ] Page shows table: Type | Title | Message | Date | Status | Actions
- [ ] Type badges colored correctly
- [ ] Filters work: All, Unread, by Type
- [ ] Pagination works correctly
- [ ] Mark all read button works
- [ ] Delete read button works
- [ ] Per-notification actions work

---

## Feature 10: PWA Offline Support Testing

### Service Worker Registration
- [ ] DevTools → Application → Service Workers
- [ ] Service worker registered and active
- [ ] Status: "activated and running"
- [ ] No errors in console

### Cache Storage
- [ ] DevTools → Storage → Cache Storage
- [ ] sims-dms-v1 cache visible
- [ ] Assets cached: index.html, main.js, main.css, fonts
- [ ] API responses cached separately

### Offline Behavior
- [ ] Go offline → banner appears at top (mobile only)
- [ ] Previously visited pages load from cache
- [ ] Data displays normally when offline
- [ ] Navigation works with cached pages
- [ ] Search/filter works on cached data
- [ ] Come back online → banner shows "Back online"
- [ ] Data syncs automatically

### Caching Strategies
- [ ] API calls: NetworkFirst (network → cache fallback)
- [ ] Assets: CacheFirst (cache → network fallback)
- [ ] HTML: NetworkFirst with 3s timeout
- [ ] Stale data shown with confidence

### Offline Banner
- [ ] Mobile only (hidden on desktop)
- [ ] Shows when offline: "📡 You're offline — changes will sync"
- [ ] Shows when online: "Back online — syncing changes"
- [ ] Dismiss button (X) works
- [ ] Auto-hides after 2s coming online
- [ ] Accessible: role="status", aria-live="polite"

### DevTools Testing
- [ ] Toggle offline in DevTools → app works
- [ ] Toggle back online → app syncs
- [ ] Slow 3G simulation → uses timeout strategy
- [ ] No console errors when offline

### Real Device Testing
- [ ] Turn off WiFi on phone → offline works
- [ ] Turn WiFi back on → syncs
- [ ] Close app → reopen → data present
- [ ] Multiple pages accessible offline

---

## Cross-Feature Integration

### Dark Mode + Accessibility
- [ ] Focus rings visible in both modes
- [ ] Focus ring contrast ≥ 3:1 in both modes
- [ ] All a11y features work in both modes

### Dark Mode + Mobile Navigation
- [ ] Drawer colors correct in dark mode
- [ ] Tab bar colors correct in dark mode
- [ ] Smooth animations in both modes

### Notifications + Accessibility
- [ ] Bell button has aria-label
- [ ] Toasts have aria-live
- [ ] Notification list keyboard accessible

### Offline + All Features
- [ ] Dark mode persists offline
- [ ] Mobile drawer works offline
- [ ] Notifications show cached data offline
- [ ] Accessibility features work offline

---

## Performance & Compatibility

### Performance
- [ ] JS bundle < 650KB minified
- [ ] CSS bundle < 60KB minified
- [ ] First Contentful Paint < 2s (online)
- [ ] Offline load < 1s (from cache)
- [ ] No jank or stuttering

### Browser Compatibility
- [ ] Chrome latest
- [ ] Firefox latest
- [ ] Safari latest
- [ ] Edge latest
- [ ] iOS Safari
- [ ] Android Chrome

### Regression Testing
- [ ] Authentication (login/logout) works
- [ ] Student management works
- [ ] User management works
- [ ] All existing features still work
- [ ] No console errors

---

## Sign-Off

**Tested by**: _________________  
**Date**: _________________  
**Status**: ⭕ Not Started | 🔵 In Progress | ✅ Complete

**Issues Found**:
```
[List any bugs or issues here]
```

**Notes**:
```
[Additional notes or observations]
```

