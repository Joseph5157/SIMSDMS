#!/usr/bin/env python3
"""030-D headless Chromium audit runner.

This script only performs read-only navigation and opens/closes controls. It
does not submit product mutations. Evidence is written beneath evidence/030-D.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, sync_playwright


SPEC_DIR = Path(__file__).resolve().parents[1]
EVIDENCE_DIR = SPEC_DIR / "evidence" / "030-D"
SCREENSHOT_DIR = EVIDENCE_DIR / "screenshots"
BASE_URL = os.environ.get("AUDIT_BASE_URL", "http://localhost:5173")

ACCOUNTS = {
    "faculty": (
        os.environ.get("AUDIT_FACULTY_EMAIL", "e2e.faculty@sims.test"),
        os.environ.get("AUDIT_FACULTY_PASSWORD", "E2eTest1234!"),
    ),
    "admin": (
        os.environ.get("AUDIT_ADMIN_EMAIL", "e2e.admin@sims.test"),
        os.environ.get("AUDIT_ADMIN_PASSWORD", "AdminTest1234!"),
    ),
    "super-admin": (
        os.environ.get("AUDIT_SUPERADMIN_EMAIL", "e2e.superadmin@sims.test"),
        os.environ.get("AUDIT_SUPERADMIN_PASSWORD", "SuperAdminTest1234!"),
    ),
}

ROUTES = {
    "admin": [
        ("dashboard", "/admin/dashboard"),
        ("users", "/admin/users"),
        ("students", "/admin/students"),
        ("calendar", "/admin/calendar"),
        ("duty-slots", "/admin/duty-slots"),
        ("attendance", "/admin/attendance"),
        ("violations", "/admin/violations"),
        ("flagged-violations", "/admin/flagged-violations"),
        ("reports", "/admin/reports"),
        ("messages", "/admin/messages"),
        ("settings", "/admin/settings"),
        ("notifications", "/notifications"),
        ("change-password", "/change-password"),
    ],
    "faculty": [
        ("dashboard", "/faculty/dashboard"),
        ("my-slots", "/faculty/slots"),
        ("all-duties", "/faculty/all-duties"),
        ("attendance", "/faculty/attendance"),
        ("violations", "/faculty/violations"),
        ("messages", "/faculty/messages"),
        ("notifications", "/notifications"),
        ("change-password", "/change-password"),
    ],
    "super-admin": [
        ("dashboard", "/super-admin/dashboard"),
        ("audit-logs", "/super-admin/audit"),
        ("admin-dashboard", "/admin/dashboard"),
        ("admin-users", "/admin/users"),
        ("admin-reports", "/admin/reports"),
        ("admin-settings", "/admin/settings"),
    ],
}

VIEWPORTS = {
    "mobile-360": {"width": 360, "height": 800},
    "mobile-390": {"width": 390, "height": 844},
    "mobile-412": {"width": 412, "height": 915},
    "boundary-639": {"width": 639, "height": 900},
    "boundary-640": {"width": 640, "height": 900},
    "boundary-641": {"width": 641, "height": 900},
    "boundary-767": {"width": 767, "height": 900},
    "boundary-768": {"width": 768, "height": 900},
    "tablet-1024": {"width": 1024, "height": 900},
    "desktop-1280": {"width": 1280, "height": 900},
    "desktop-1440": {"width": 1440, "height": 1000},
}


class AuditRun:
    def __init__(self) -> None:
        self.captures: list[dict[str, Any]] = []
        self.interactions: list[dict[str, Any]] = []
        self.runtime_events: list[dict[str, Any]] = []
        self.failures: list[dict[str, Any]] = []
        self.screenshots: list[str] = []

    def event(self, page: Page, kind: str, detail: str) -> None:
        self.runtime_events.append(
            {
                "kind": kind,
                "detail": detail[:1200],
                "url": page.url,
                "viewport": page.viewport_size,
            }
        )

    def bind_runtime_listeners(self, page: Page) -> None:
        page.on(
            "console",
            lambda msg: self.event(page, f"console-{msg.type}", msg.text)
            if msg.type in ("error", "warning")
            else None,
        )
        page.on("pageerror", lambda error: self.event(page, "page-error", str(error)))
        page.on(
            "requestfailed",
            lambda request: self.event(
                page,
                "request-failed",
                f"{request.method} {request.url} :: {request.failure}",
            ),
        )
        page.on(
            "response",
            lambda response: self.event(
                page,
                "http-error",
                f"{response.status} {response.request.method} {response.url}",
            )
            if response.status >= 400 and response.url.startswith(BASE_URL)
            else None,
        )

    def set_theme(self, page: Page, theme: str) -> None:
        page.evaluate(
            """theme => {
              localStorage.setItem('app-theme', theme);
              document.documentElement.classList.toggle('dark', theme === 'dark');
              window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
            }""",
            theme,
        )

    def settle(self, page: Page, timeout_ms: int = 12000) -> None:
        try:
            page.wait_for_load_state("networkidle", timeout=timeout_ms)
        except PlaywrightTimeoutError:
            self.event(page, "settle-timeout", f"networkidle not reached in {timeout_ms} ms")
        page.wait_for_timeout(900)

    def goto(self, page: Page, route: str, theme: str) -> None:
        page.goto(f"{BASE_URL}{route}", wait_until="domcontentloaded", timeout=30000)
        self.set_theme(page, theme)
        page.reload(wait_until="domcontentloaded", timeout=30000)
        self.settle(page)

    def login(self, page: Page, role: str) -> None:
        email, password = ACCOUNTS[role]
        page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded", timeout=30000)
        self.settle(page)
        page.locator("#login-email").fill(email)
        page.locator("#login-password").fill(password)
        page.get_by_role("button", name="Sign in", exact=True).click()
        expected = "/faculty/dashboard" if role == "faculty" else "/admin/dashboard"
        page.wait_for_url(re.compile(re.escape(expected)), timeout=20000)
        self.settle(page)

    def page_metrics(self, page: Page) -> dict[str, Any]:
        return page.evaluate(
            """() => {
              const visible = (el) => {
                const s = getComputedStyle(el);
                const r = el.getBoundingClientRect();
                return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0;
              };
              const label = (el) => (
                el.getAttribute('aria-label') || el.getAttribute('title') ||
                el.innerText || el.value || el.getAttribute('placeholder') || el.tagName
              ).trim().replace(/\s+/g, ' ').slice(0, 100);
              const interactiveSelector = 'button,a[href],input,select,textarea,[role="button"],[role="tab"],[role="menuitem"]';
              const interactives = [...document.querySelectorAll(interactiveSelector)].filter(visible);
              const smallTargets = interactives.map((el) => {
                const r = el.getBoundingClientRect();
                return { tag: el.tagName, label: label(el), width: Math.round(r.width), height: Math.round(r.height) };
              }).filter((x) => x.width < 44 || x.height < 44);
              const nameless = interactives.filter((el) => {
                if (!['BUTTON', 'A'].includes(el.tagName) && !el.getAttribute('role')) return false;
                return !label(el);
              }).map((el) => ({ tag: el.tagName, html: el.outerHTML.slice(0, 240) }));
              const truncated = [...document.querySelectorAll('button,a,label,th,td,p,span')].filter(visible).filter((el) => {
                const s = getComputedStyle(el);
                return el.scrollWidth > el.clientWidth + 2 && s.overflow !== 'visible';
              }).slice(0, 30).map((el) => ({ tag: el.tagName, label: label(el), client: el.clientWidth, scroll: el.scrollWidth }));
              const tables = [...document.querySelectorAll('table')].filter(visible).map((el) => {
                const r = el.getBoundingClientRect();
                let parent = el.parentElement;
                while (parent && parent !== document.body && parent.scrollWidth <= parent.clientWidth + 1) parent = parent.parentElement;
                return {
                  width: Math.round(r.width),
                  right: Math.round(r.right),
                  viewportWidth: innerWidth,
                  overflowContainer: parent && parent !== document.body ? {
                    clientWidth: parent.clientWidth,
                    scrollWidth: parent.scrollWidth,
                    overflowX: getComputedStyle(parent).overflowX,
                  } : null,
                };
              });
              const fixed = [...document.querySelectorAll('*')].filter(visible).filter((el) => ['fixed', 'sticky'].includes(getComputedStyle(el).position)).slice(0, 30).map((el) => {
                const r = el.getBoundingClientRect();
                return { tag: el.tagName, label: label(el), position: getComputedStyle(el).position, top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), z: getComputedStyle(el).zIndex };
              });
              return {
                title: document.title,
                h1: [...document.querySelectorAll('h1')].filter(visible).map(label),
                h2: [...document.querySelectorAll('h2')].filter(visible).map(label).slice(0, 12),
                themeClass: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                bodyTextSample: document.body.innerText.trim().replace(/\s+/g, ' ').slice(0, 500),
                viewport: { width: innerWidth, height: innerHeight },
                document: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
                horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
                interactiveCount: interactives.length,
                smallTargetCount: smallTargets.length,
                smallTargets: smallTargets.slice(0, 40),
                namelessInteractiveCount: nameless.length,
                namelessInteractives: nameless.slice(0, 20),
                truncatedCount: truncated.length,
                truncated,
                tableCount: tables.length,
                tables,
                dialogCount: [...document.querySelectorAll('[role="dialog"]')].filter(visible).length,
                alertCount: [...document.querySelectorAll('[role="alert"]')].filter(visible).length,
                fixed,
                fonts: {
                  body: getComputedStyle(document.body).fontFamily,
                  bodySize: getComputedStyle(document.body).fontSize,
                },
              };
            }"""
        )

    def screenshot(self, page: Page, name: str, full_page: bool = True) -> str:
        path = SCREENSHOT_DIR / f"030-D-{name}.png"
        page.screenshot(path=str(path), full_page=full_page, animations="disabled")
        relative = path.relative_to(SPEC_DIR).as_posix()
        self.screenshots.append(relative)
        return relative

    def capture(
        self,
        page: Page,
        *,
        role: str,
        slug: str,
        route: str,
        viewport: str,
        theme: str,
        full_page: bool = True,
    ) -> None:
        try:
            page.set_viewport_size(VIEWPORTS[viewport])
            self.goto(page, route, theme)
            metrics = self.page_metrics(page)
            screenshot = self.screenshot(page, f"{role}-{slug}-{viewport}-{theme}", full_page)
            self.captures.append(
                {
                    "status": "VERIFIED",
                    "role": role,
                    "slug": slug,
                    "requestedRoute": route,
                    "finalUrl": page.url,
                    "viewport": viewport,
                    "theme": theme,
                    "screenshot": screenshot,
                    "metrics": metrics,
                }
            )
        except Exception as error:  # evidence must retain partial failures
            self.failures.append(
                {
                    "kind": "capture",
                    "role": role,
                    "slug": slug,
                    "route": route,
                    "viewport": viewport,
                    "theme": theme,
                    "error": repr(error),
                }
            )

    def interaction(self, name: str, page: Page, callback) -> None:
        started = datetime.now(timezone.utc).isoformat()
        try:
            result = callback() or {}
            self.interactions.append({"name": name, "status": "VERIFIED", "started": started, **result})
        except Exception as error:
            self.interactions.append(
                {"name": name, "status": "NOT VERIFIED", "started": started, "error": repr(error), "url": page.url}
            )

    def overlay_state(self, page: Page) -> dict[str, Any]:
        return page.evaluate(
            """() => {
              const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter((el) => {
                const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
                return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
              });
              return {
                dialogCount: dialogs.length,
                dialogs: dialogs.map((el) => {
                  const r = el.getBoundingClientRect();
                  return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), text: el.innerText.replace(/\s+/g, ' ').slice(0, 240) };
                }),
                bodyOverflow: getComputedStyle(document.body).overflow,
                activeElement: {
                  tag: document.activeElement?.tagName,
                  text: (document.activeElement?.getAttribute('aria-label') || document.activeElement?.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100),
                },
              };
            }"""
        )

    def run_auth_evidence(self, browser) -> None:
        context = browser.new_context(viewport=VIEWPORTS["mobile-390"], service_workers="block")
        page = context.new_page()
        self.bind_runtime_listeners(page)
        self.capture(page, role="unauthenticated", slug="login", route="/login", viewport="mobile-390", theme="light")
        self.capture(page, role="unauthenticated", slug="login", route="/login", viewport="desktop-1440", theme="dark")

        def invalid_login():
            page.set_viewport_size(VIEWPORTS["mobile-390"])
            self.goto(page, "/login", "light")
            page.locator("#login-email").fill(ACCOUNTS["faculty"][0])
            page.locator("#login-password").fill("known-invalid-audit-password")
            page.get_by_role("button", name="Sign in", exact=True).click()
            page.get_by_text(re.compile("Invalid email or password")).wait_for(timeout=10000)
            screenshot = self.screenshot(page, "unauthenticated-invalid-login-mobile-390-light")
            return {
                "url": page.url,
                "errorVisible": True,
                "focusAfterSubmit": page.evaluate("document.activeElement?.id || document.activeElement?.tagName"),
                "screenshot": screenshot,
            }

        self.interaction("unauthenticated-invalid-login", page, invalid_login)
        context.close()

    def run_role_pages(self, browser, role: str) -> None:
        context = browser.new_context(viewport=VIEWPORTS["desktop-1440"], service_workers="block")
        page = context.new_page()
        self.bind_runtime_listeners(page)
        try:
            self.login(page, role)
        except Exception as error:
            self.failures.append({"kind": "login", "role": role, "error": repr(error)})
            context.close()
            return

        for slug, route in ROUTES[role]:
            self.capture(page, role=role, slug=slug, route=route, viewport="mobile-390", theme="light")
            self.capture(page, role=role, slug=slug, route=route, viewport="desktop-1440", theme="dark")

        if role == "admin":
            self.run_admin_interactions(page)
        elif role == "faculty":
            self.run_faculty_interactions(page)
        elif role == "super-admin":
            self.run_super_admin_interactions(page)
        context.close()

    def run_admin_interactions(self, page: Page) -> None:
        def mobile_nav():
            page.set_viewport_size(VIEWPORTS["mobile-390"])
            self.goto(page, "/admin/dashboard", "light")
            trigger = page.get_by_role("button", name="Open menu")
            trigger.focus()
            trigger.press("Enter")
            page.get_by_role("dialog").wait_for(timeout=5000)
            opened = self.overlay_state(page)
            screenshot = self.screenshot(page, "admin-mobile-navigation-open-mobile-390-light", False)
            page.keyboard.press("Escape")
            page.get_by_role("dialog").wait_for(state="hidden", timeout=5000)
            return {"opened": opened, "focusReturned": trigger.evaluate("el => el === document.activeElement"), "screenshot": screenshot}

        self.interaction("mobile-navigation-drawer-keyboard-escape-focus-return", page, mobile_nav)

        def theme_switch():
            page.set_viewport_size(VIEWPORTS["desktop-1440"])
            self.goto(page, "/admin/dashboard", "light")
            button = page.get_by_role("button", name=re.compile("Light|Dark"))
            before = page.evaluate("document.documentElement.classList.contains('dark')")
            button.click()
            page.wait_for_timeout(350)
            after = page.evaluate("document.documentElement.classList.contains('dark')")
            return {"beforeDark": before, "afterDark": after, "focusRetained": button.evaluate("el => el === document.activeElement")}

        self.interaction("theme-switch-control", page, theme_switch)

        def notification_dropdown():
            page.set_viewport_size(VIEWPORTS["desktop-1440"])
            self.goto(page, "/admin/dashboard", "light")
            trigger = page.locator("button").filter(has=page.locator("svg")).filter(has_text="").nth(0)
            candidates = page.locator('button[aria-label*="notification" i], button[aria-label*="message" i]')
            if candidates.count():
                trigger = candidates.first
            else:
                trigger = page.locator("header button").last
            trigger.click()
            page.wait_for_timeout(300)
            screenshot = self.screenshot(page, "admin-notification-dropdown-desktop-1440-light", False)
            open_text = page.locator("body").inner_text()
            page.keyboard.press("Escape")
            page.wait_for_timeout(250)
            return {"openedTextContainsNotifications": "notification" in open_text.lower(), "focusReturned": trigger.evaluate("el => el === document.activeElement"), "screenshot": screenshot}

        self.interaction("notification-dropdown-open-escape-focus", page, notification_dropdown)

        def profile_sheet(viewport: str, theme: str):
            def execute():
                page.set_viewport_size(VIEWPORTS[viewport])
                self.goto(page, "/admin/dashboard", theme)
                trigger = page.get_by_role("button", name="Open profile settings")
                trigger.click()
                page.get_by_role("dialog").wait_for(timeout=6000)
                opened = self.overlay_state(page)
                screenshot = self.screenshot(page, f"responsive-sheet-profile-{viewport}-{theme}", False)
                page.keyboard.press("Escape")
                page.get_by_role("dialog").wait_for(state="hidden", timeout=5000)
                return {"viewport": viewport, "opened": opened, "focusReturned": trigger.evaluate("el => el === document.activeElement"), "screenshot": screenshot}
            return execute

        for viewport, theme in [("mobile-390", "dark"), ("boundary-639", "light"), ("boundary-640", "light")]:
            self.interaction(f"responsive-sheet-profile-{viewport}", page, profile_sheet(viewport, theme))

        def form_modal(viewport: str):
            def execute():
                page.set_viewport_size(VIEWPORTS[viewport])
                self.goto(page, "/admin/calendar", "dark")
                trigger = page.get_by_role("button", name="Set Sessions")
                trigger.click()
                page.get_by_role("dialog").wait_for(timeout=6000)
                opened = self.overlay_state(page)
                screenshot = self.screenshot(page, f"form-modal-sessions-{viewport}-dark", False)
                page.keyboard.press("Escape")
                page.get_by_role("dialog").wait_for(state="hidden", timeout=5000)
                return {"viewport": viewport, "opened": opened, "focusReturned": trigger.evaluate("el => el === document.activeElement"), "screenshot": screenshot}
            return execute

        for viewport in ("boundary-639", "boundary-640", "boundary-641"):
            self.interaction(f"form-modal-boundary-{viewport}", page, form_modal(viewport))

        def confirm_dialog():
            page.set_viewport_size(VIEWPORTS["mobile-390"])
            self.goto(page, "/admin/calendar", "light")
            trigger = page.get_by_role("button", name="Close Window")
            trigger.click()
            page.get_by_role("dialog").wait_for(timeout=5000)
            opened = self.overlay_state(page)
            screenshot = self.screenshot(page, "confirm-dialog-calendar-mobile-390-light", False)
            page.keyboard.press("Escape")
            page.get_by_role("dialog").wait_for(state="hidden", timeout=5000)
            return {"opened": opened, "focusReturned": trigger.evaluate("el => el === document.activeElement"), "screenshot": screenshot}

        self.interaction("confirm-dialog-escape-focus-return", page, confirm_dialog)

        def mantine_menu():
            page.set_viewport_size(VIEWPORTS["desktop-1280"])
            self.goto(page, "/admin/users", "dark")
            trigger = page.get_by_role("button", name="User actions").first
            trigger.focus()
            trigger.press("Enter")
            page.get_by_role("menu").wait_for(timeout=5000)
            page.keyboard.press("ArrowDown")
            active = page.evaluate("({tag: document.activeElement?.tagName, text: document.activeElement?.innerText})")
            screenshot = self.screenshot(page, "mantine-menu-users-desktop-1280-dark", False)
            page.keyboard.press("Escape")
            return {"activeAfterArrow": active, "focusReturned": trigger.evaluate("el => el === document.activeElement"), "screenshot": screenshot}

        self.interaction("mantine-menu-keyboard-escape-focus-return", page, mantine_menu)

        def direct_modal():
            page.set_viewport_size(VIEWPORTS["mobile-412"])
            self.goto(page, "/admin/duty-slots", "light")
            trigger = page.get_by_role("button", name="Reassign").first
            trigger.click()
            page.get_by_role("dialog").wait_for(timeout=5000)
            opened = self.overlay_state(page)
            screenshot = self.screenshot(page, "direct-mantine-modal-duty-slots-mobile-412-light", False)
            page.keyboard.press("Escape")
            return {"opened": opened, "focusReturned": trigger.evaluate("el => el === document.activeElement"), "screenshot": screenshot}

        self.interaction("direct-mantine-modal", page, direct_modal)

        def report_sheet(viewport: str):
            def execute():
                page.set_viewport_size(VIEWPORTS[viewport])
                self.goto(page, "/admin/reports", "light")
                trigger = page.get_by_role("button", name=re.compile("Monthly Attendance", re.I)).first
                trigger.click()
                page.get_by_role("dialog").wait_for(timeout=7000)
                self.settle(page)
                state = self.overlay_state(page)
                metrics = self.page_metrics(page)
                screenshot = self.screenshot(page, f"reports-secondary-sheet-{viewport}-light")
                page.keyboard.press("Escape")
                return {"viewport": viewport, "overlay": state, "metrics": metrics, "screenshot": screenshot}
            return execute

        for viewport in ("mobile-360", "mobile-390", "boundary-639"):
            self.interaction(f"report-sheet-{viewport}", page, report_sheet(viewport))

        def report_inline():
            page.set_viewport_size(VIEWPORTS["boundary-640"])
            self.goto(page, "/admin/reports", "dark")
            trigger = page.get_by_role("button", name=re.compile("Monthly Attendance", re.I)).first
            trigger.click()
            self.settle(page)
            metrics = self.page_metrics(page)
            screenshot = self.screenshot(page, "reports-secondary-inline-boundary-640-dark")
            return {"dialogCount": metrics["dialogCount"], "metrics": metrics, "screenshot": screenshot}

        self.interaction("report-inline-boundary-640", page, report_inline)

        def reports_student_search():
            page.set_viewport_size(VIEWPORTS["desktop-1440"])
            self.goto(page, "/admin/reports", "light")
            search = page.get_by_placeholder(re.compile("Search student by name"))
            search.fill("Aa")
            page.wait_for_timeout(900)
            result = page.get_by_role("button", name=re.compile("Aarav Menon")).first
            result.wait_for(timeout=5000)
            result.focus()
            search.press("Escape")
            page.wait_for_timeout(200)
            screenshot = self.screenshot(page, "reports-custom-student-dropdown-desktop-1440-light", False)
            return {"resultVisibleAfterEscape": result.is_visible(), "focusTag": page.evaluate("document.activeElement?.tagName"), "screenshot": screenshot}

        self.interaction("reports-custom-search-keyboard-dismissal", page, reports_student_search)

        def table_card_boundary(route: str, slug: str, viewport: str):
            def execute():
                page.set_viewport_size(VIEWPORTS[viewport])
                self.goto(page, route, "light")
                metrics = self.page_metrics(page)
                screenshot = self.screenshot(page, f"{slug}-{viewport}-light")
                return {"route": route, "viewport": viewport, "tableCount": metrics["tableCount"], "horizontalOverflow": metrics["horizontalOverflow"], "screenshot": screenshot}
            return execute

        for route, slug in [
            ("/admin/students", "students-boundary"),
            ("/admin/violations", "violations-boundary"),
            ("/admin/duty-slots", "duty-slots-boundary"),
        ]:
            for viewport in ("boundary-767", "boundary-768"):
                self.interaction(f"{slug}-{viewport}", page, table_card_boundary(route, slug, viewport))

        def stale_route():
            page.set_viewport_size(VIEWPORTS["desktop-1280"])
            self.goto(page, "/admin/duty-timing-settings", "light")
            return {"requested": "/admin/duty-timing-settings", "finalUrl": page.url, "afternoonSessionVisible": page.get_by_text("Afternoon session").count() > 0}

        self.interaction("existing-e2e-duty-timing-route", page, stale_route)

        def offline_banner():
            page.set_viewport_size(VIEWPORTS["mobile-390"])
            self.goto(page, "/admin/dashboard", "dark")
            page.context.set_offline(True)
            page.evaluate("window.dispatchEvent(new Event('offline'))")
            page.wait_for_timeout(500)
            text = page.locator("body").inner_text()
            screenshot = self.screenshot(page, "offline-banner-mobile-390-dark", False)
            page.context.set_offline(False)
            page.evaluate("window.dispatchEvent(new Event('online'))")
            return {"offlineTextVisible": "offline" in text.lower(), "screenshot": screenshot}

        self.interaction("offline-banner", page, offline_banner)

    def run_faculty_interactions(self, page: Page) -> None:
        def nested_student_search():
            page.set_viewport_size(VIEWPORTS["mobile-390"])
            self.goto(page, "/faculty/dashboard", "dark")
            trigger = page.get_by_role("button", name=re.compile("Record Student Violation", re.I)).first
            trigger.click()
            page.get_by_role("dialog", name="Record Student Violation").wait_for(timeout=6000)
            outer = self.overlay_state(page)
            student_trigger = page.get_by_role("dialog", name="Record Student Violation").locator("button").filter(has_text=re.compile("Select|Choose|Search", re.I)).first
            student_trigger.click()
            page.get_by_role("dialog", name="Search students").wait_for(timeout=6000)
            nested = self.overlay_state(page)
            search = page.get_by_placeholder(re.compile("Search by name"))
            search.fill("Aa")
            page.wait_for_timeout(900)
            screenshot = self.screenshot(page, "nested-student-search-mobile-390-dark", False)
            page.keyboard.press("Escape")
            page.get_by_role("dialog", name="Search students").wait_for(state="hidden", timeout=5000)
            outerStillOpen = page.get_by_role("dialog", name="Record Student Violation").is_visible()
            page.keyboard.press("Escape")
            return {"outer": outer, "nested": nested, "outerStillOpenAfterNestedEscape": outerStillOpen, "screenshot": screenshot}

        self.interaction("responsive-sheet-nested-student-search", page, nested_student_search)

        def bottom_nav():
            page.set_viewport_size(VIEWPORTS["mobile-360"])
            self.goto(page, "/faculty/dashboard", "light")
            link = page.get_by_role("link", name=re.compile("My Slots", re.I)).last
            box = link.bounding_box()
            link.click()
            page.wait_for_url(re.compile("/faculty/slots"), timeout=10000)
            return {"targetBox": box, "finalUrl": page.url}

        self.interaction("faculty-mobile-bottom-navigation", page, bottom_nav)

        def faculty_boundary(viewport: str):
            def execute():
                page.set_viewport_size(VIEWPORTS[viewport])
                self.goto(page, "/faculty/all-duties", "light")
                metrics = self.page_metrics(page)
                screenshot = self.screenshot(page, f"faculty-all-duties-{viewport}-light")
                return {"viewport": viewport, "tableCount": metrics["tableCount"], "horizontalOverflow": metrics["horizontalOverflow"], "screenshot": screenshot}
            return execute

        for viewport in ("boundary-767", "boundary-768", "tablet-1024"):
            self.interaction(f"faculty-all-duties-{viewport}", page, faculty_boundary(viewport))

    def run_super_admin_interactions(self, page: Page) -> None:
        def admin_equivalent_navigation():
            page.set_viewport_size(VIEWPORTS["desktop-1280"])
            self.goto(page, "/super-admin/dashboard", "light")
            users = page.get_by_role("link", name="Users").first
            users.click()
            page.wait_for_url(re.compile("/admin/users"), timeout=10000)
            return {"finalUrl": page.url, "userManagementVisible": page.get_by_text("User Management").count() > 0}

        self.interaction("super-admin-admin-equivalent-navigation", page, admin_equivalent_navigation)

    def run_forced_state_checks(self, browser) -> None:
        # Use an authenticated admin context, then replace selected GET responses.
        context = browser.new_context(viewport=VIEWPORTS["mobile-390"], service_workers="block")
        page = context.new_page()
        self.bind_runtime_listeners(page)
        try:
            self.login(page, "admin")
        except Exception as error:
            self.failures.append({"kind": "forced-state-login", "error": repr(error)})
            context.close()
            return

        def students_error():
            page.route(re.compile(r".*/api/students(?:\?.*)?$"), lambda route: route.fulfill(status=500, content_type="application/json", body='{"message":"030-D forced audit failure"}'))
            self.capture(page, role="admin", slug="students-forced-error", route="/admin/students", viewport="mobile-390", theme="dark")
            page.unroute(re.compile(r".*/api/students(?:\?.*)?$"))
            return {"errorText": "030-D forced audit failure" in page.locator("body").inner_text()}

        self.interaction("students-forced-safe-api-error", page, students_error)

        def students_empty():
            page.route(re.compile(r".*/api/students(?:\?.*)?$"), lambda route: route.fulfill(status=200, content_type="application/json", body='{"data":[],"pagination":{"page":1,"limit":20,"total":0,"pages":0}}'))
            self.capture(page, role="admin", slug="students-forced-empty", route="/admin/students", viewport="desktop-1440", theme="light")
            page.unroute(re.compile(r".*/api/students(?:\?.*)?$"))
            return {"bodySample": page.locator("body").inner_text()[:500]}

        self.interaction("students-forced-safe-empty", page, students_empty)
        context.close()

    def write_results(self) -> None:
        output = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "baseUrl": BASE_URL,
            "browser": "Chromium headless",
            "captures": self.captures,
            "interactions": self.interactions,
            "runtimeEvents": self.runtime_events,
            "failures": self.failures,
            "screenshots": self.screenshots,
        }
        (EVIDENCE_DIR / "030-D-browser-results.json").write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
        print(json.dumps({
            "captures": len(self.captures),
            "interactions": len(self.interactions),
            "runtimeEvents": len(self.runtime_events),
            "failures": len(self.failures),
            "screenshots": len(self.screenshots),
        }, indent=2))


def main() -> int:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    audit = AuditRun()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        audit.run_auth_evidence(browser)
        for role in ("faculty", "admin", "super-admin"):
            audit.run_role_pages(browser, role)
        audit.run_forced_state_checks(browser)
        browser.close()
    audit.write_results()
    return 0 if not audit.failures else 2


if __name__ == "__main__":
    sys.exit(main())
