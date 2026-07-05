import { useState, useEffect } from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import simsLogo from '../assets/sims-logo.png';
import {
  AppShell, Drawer, Group, Box, Text, Stack, Divider,
  UnstyledButton, Avatar, Title, Paper,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLayoutDashboard, IconUsers, IconSchool, IconCalendar,
  IconCalendarEvent, IconClipboardCheck, IconAlertTriangle,
  IconTag, IconArrowsLeftRight, IconMail, IconChartBar,
  IconBolt, IconFileText, IconLogout, IconMenu2,
} from '@tabler/icons-react';
import { useLogout } from '../hooks/useAuth';
import { cycleTheme, getTheme, getThemeIcon, getThemeLabel } from '../lib/theme';
import { ROUTES, ROLES } from '../utils/constants';
import NotificationBell from './NotificationBell';
import classes from './Layout.module.css';

// ── Nav link definitions ───────────────────────────────────────────────────────

const adminLinks = [
  { to: ROUTES.ADMIN_DASHBOARD,       label: 'Dashboard',       Icon: IconLayoutDashboard },
  { to: ROUTES.ADMIN_USERS,           label: 'Users',           Icon: IconUsers },
  { to: ROUTES.ADMIN_STUDENTS,        label: 'Students',        Icon: IconSchool },
  { to: ROUTES.ADMIN_CALENDAR,        label: 'Calendar',        Icon: IconCalendar },
  { to: ROUTES.ADMIN_DUTY_SLOTS,      label: 'Duty Slots',      Icon: IconCalendarEvent },
  { to: ROUTES.ADMIN_ATTENDANCE,      label: 'Attendance',      Icon: IconClipboardCheck },
  { to: ROUTES.ADMIN_VIOLATIONS,      label: 'Student Violations', Icon: IconAlertTriangle },
  { to: ROUTES.ADMIN_VIOLATION_TYPES, label: 'Stu. Viol. Types',   Icon: IconTag },
  { to: ROUTES.ADMIN_COVER_REQUESTS,  label: 'Cover Requests',  Icon: IconArrowsLeftRight },
  { to: ROUTES.ADMIN_MESSAGES,        label: 'Messages',        Icon: IconMail },
  { to: ROUTES.ADMIN_REPORTS,         label: 'Reports',         Icon: IconChartBar },
];

const facultyLinks = [
  { to: ROUTES.FACULTY_DASHBOARD,      label: 'Dashboard',      Icon: IconLayoutDashboard },
  { to: ROUTES.FACULTY_SLOTS,          label: 'My Slots',       Icon: IconCalendarEvent },
  { to: ROUTES.FACULTY_ATTENDANCE,     label: 'Attendance',     Icon: IconClipboardCheck },
  { to: ROUTES.FACULTY_VIOLATIONS,     label: 'Student Violations', Icon: IconAlertTriangle },
  { to: ROUTES.FACULTY_COVER_REQUESTS, label: 'Cover Requests',     Icon: IconArrowsLeftRight },
  { to: ROUTES.FACULTY_MESSAGES,       label: 'Messages',       Icon: IconMail },
];

const superAdminExtra = [
  { to: ROUTES.SUPER_ADMIN_DASHBOARD, label: 'SA Dashboard', Icon: IconBolt },
  { to: ROUTES.SUPER_ADMIN_AUDIT,     label: 'Audit Logs',   Icon: IconFileText },
];

function getLinks(role) {
  if (role === ROLES.FACULTY)     return facultyLinks;
  if (role === ROLES.SUPER_ADMIN) return [...adminLinks, ...superAdminExtra];
  return adminLinks;
}

// ── Bottom tab bar — 4 pinned routes per role ──────────────────────────────────

const facultyBottomTabs = [
  { to: ROUTES.FACULTY_DASHBOARD,      label: 'Home',   Icon: IconLayoutDashboard },
  { to: ROUTES.FACULTY_SLOTS,          label: 'Slots',  Icon: IconCalendarEvent },
  { to: ROUTES.FACULTY_ATTENDANCE,     label: 'Attend', Icon: IconClipboardCheck },
  { to: ROUTES.FACULTY_VIOLATIONS,     label: 'Issues', Icon: IconAlertTriangle },
  { to: ROUTES.FACULTY_COVER_REQUESTS, label: 'Cover',  Icon: IconArrowsLeftRight },
];

const adminBottomTabs = [
  { to: ROUTES.ADMIN_DASHBOARD,   label: 'Home',       Icon: IconLayoutDashboard },
  { to: ROUTES.ADMIN_STUDENTS,    label: 'Students',   Icon: IconSchool },
  { to: ROUTES.ADMIN_VIOLATIONS,  label: 'Stu. Viol.', Icon: IconAlertTriangle },
  { to: ROUTES.ADMIN_ATTENDANCE,  label: 'Live',       Icon: IconClipboardCheck },
];

function getBottomTabs(role) {
  if (role === ROLES.FACULTY) return facultyBottomTabs;
  return adminBottomTabs;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRoleLabel(role) {
  if (role === ROLES.SUPER_ADMIN) return 'Super Admin';
  if (role === ROLES.ADMIN)       return 'Admin Panel';
  if (role === ROLES.FACULTY)     return 'Faculty Portal';
  return '';
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Sidebar nav link ───────────────────────────────────────────────────────────

function NavItem({ to, label, Icon, onClick }) {
  return (
    <RouterNavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `${classes.navItem} ${isActive ? classes.navItemActive : ''}`
      }
    >
      <Icon size={16} strokeWidth={1.75} className="shrink-0" />
      <span>{label}</span>
    </RouterNavLink>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────────

export default function Layout({ user, children }) {
  const [navOpened, { open: openNav, close: closeNav }] = useDisclosure(false);
  const location = useLocation();
  const logout   = useLogout();
  const [theme, setThemeState] = useState(() => getTheme());

  useEffect(() => {
    function handleThemeChange() { setThemeState(getTheme()); }
    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);
  const links      = getLinks(user?.role);
  const bottomTabs = getBottomTabs(user?.role);

  const sidebarContent = (
    <Stack h="100%" gap={0} className="overflow-hidden">
      <Box className={classes.brand}>
        <Group gap={8} wrap="nowrap">
          <img src={simsLogo} alt="SIMS" className={`${classes.brandMark} w-full h-full object-contain`} />
          <Text fw={700} size="sm" c="white" className="tracking-[-0.01em]">
            SIMS DMS
          </Text>
        </Group>
        <Text size="xs" c="dimmed" mt={2} pl={36}>
          {getRoleLabel(user?.role)}
        </Text>
      </Box>

      <Divider color="rgba(255,255,255,0.08)" />

      <Stack gap={2} p={8} className="flex-1 overflow-y-auto">
        {links.map((link) => (
          <NavItem key={link.to} {...link} onClick={closeNav} />
        ))}
      </Stack>

      <Divider color="rgba(255,255,255,0.08)" />

      <Box p={10}>
        <Group gap={8} mb={6} px={4}>
          <Avatar size={28} radius="xl" color="blue" className="shrink-0">
            {getInitials(user?.name)}
          </Avatar>
          <Text size="xs" fw={600} c="gray.3" className="overflow-hidden text-ellipsis whitespace-nowrap">
            {user?.name}
          </Text>
        </Group>
        <UnstyledButton
          onClick={cycleTheme}
          className="flex items-center gap-1.5 w-full py-[7px] px-2.5 rounded-[7px] text-xs font-medium text-[color:var(--text-muted)] bg-transparent border-none cursor-pointer mb-1.5 transition-[background-color,color] duration-150 hover:bg-[var(--surface-sidebar-hover)] hover:text-[color:var(--text-on-dark)]"
        >
          <span className="text-[13px]">{getThemeIcon()}</span>
          {getThemeLabel()} mode
        </UnstyledButton>
        <UnstyledButton onClick={() => logout.mutate()} className={classes.logoutBtn}>
          <IconLogout size={13} strokeWidth={2} />
          Log out
        </UnstyledButton>
      </Box>
    </Stack>
  );

  return (
    <>
      {/* Mobile nav drawer — slides in from left when Menu is tapped */}
      <Drawer
        opened={navOpened}
        onClose={closeNav}
        position="left"
        size={240}
        withCloseButton={false}
        padding={0}
        styles={{
          content: { backgroundColor: 'var(--surface-sidebar)' },
          body:    { padding: 0, height: '100%' },
        }}
        hiddenFrom="sm"
      >
        {sidebarContent}
      </Drawer>

      <AppShell
        navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: true } }}
        padding={0}
      >
        {/* Sidebar — desktop only (≥ 640px) */}
        <AppShell.Navbar style={{ backgroundColor: 'var(--surface-sidebar)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          {sidebarContent}
        </AppShell.Navbar>

        {/* Mobile top header — hamburger + title + notifications */}
        <div className={classes.mobileHeader}>
          <button
            onClick={openNav}
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-transparent border-none cursor-pointer text-[var(--text-primary)] hover:bg-[var(--color-slate-100)] transition-colors"
            aria-label="Open menu"
          >
            <IconMenu2 size={22} strokeWidth={1.75} />
          </button>
          <span className="text-sm font-bold text-[color:var(--text-primary)] tracking-[-0.01em]">
            SIMS DMS
          </span>
          <NotificationBell />
        </div>

        {/* Main content */}
        <AppShell.Main
          style={{
            background: 'var(--page-canvas)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            minHeight: '100dvh',
          }}
        >
          <div key={location.pathname} className={classes.pageContent}>
            {children}
          </div>
        </AppShell.Main>
      </AppShell>

      {/* ── Bottom tab bar — fixed, mobile only (hidden ≥ 640px via CSS) ── */}
      <div className={classes.bottomBar}>
        {bottomTabs.map((tab) => (
          <RouterNavLink
            key={tab.to}
            to={tab.to}
            className="flex-1 no-underline"
          >
            {({ isActive }) => (
              <div
                className="flex flex-col items-center justify-center h-full gap-[3px] px-0.5 transition-colors duration-150"
                style={{
                  color: isActive ? 'var(--brand)' : 'rgba(255,255,255,0.45)',
                  borderTop: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                }}
              >
                <tab.Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className={`text-[length:var(--text-micro)] tracking-[0.01em] ${isActive ? 'font-semibold' : 'font-normal'}`}>
                  {tab.label}
                </span>
              </div>
            )}
          </RouterNavLink>
        ))}
      </div>
    </>
  );
}

// ── Shared layout exports ──────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, action }) {
  return (
    <Stack align="center" gap={4} py="lg" mb="md"
      className="border-b border-b-[var(--border)] text-center"
    >
      <Title order={2} className="text-[length:var(--text-h2)] font-bold leading-[1.3]">
        {title}
      </Title>
      {subtitle && (
        <Text size="xs" c="dimmed">{subtitle}</Text>
      )}
      {action && <Box mt={6}>{action}</Box>}
    </Stack>
  );
}

export function Card({ children, className = '' }) {
  return (
    <Paper withBorder radius="md" className={`overflow-hidden ${className}`}>
      {children}
    </Paper>
  );
}

export function CardHeader({ children, action }) {
  return (
    <Box
      px="md" py="sm"
      className="border-b border-b-[var(--border)] bg-[var(--surface-page)]"
    >
      <Group justify="space-between" gap="sm">
        <Text size="sm" fw={600} className="text-[color:var(--text-secondary)]">{children}</Text>
        {action}
      </Group>
    </Box>
  );
}

export function CardBody({ children, className = '' }) {
  return (
    <Box p="md" className={className}>
      {children}
    </Box>
  );
}
