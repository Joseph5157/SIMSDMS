import { NavLink as RouterNavLink } from 'react-router-dom';
import {
  AppShell, Drawer, Group, Box, Text, Stack, Divider,
  UnstyledButton, Avatar, Title, Paper,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLayoutDashboard, IconUsers, IconSchool, IconCalendar,
  IconCalendarEvent, IconClipboardCheck, IconAlertTriangle,
  IconTag, IconArrowsLeftRight, IconMail, IconChartBar,
  IconBolt, IconKey, IconFileText, IconLogout, IconMenu2,
} from '@tabler/icons-react';
import { useLogout } from '../hooks/useAuth';
import { ROUTES, ROLES } from '../utils/constants';
import classes from './Layout.module.css';

// ── Nav link definitions ───────────────────────────────────────────────────────

const adminLinks = [
  { to: ROUTES.ADMIN_DASHBOARD,       label: 'Dashboard',       Icon: IconLayoutDashboard },
  { to: ROUTES.ADMIN_USERS,           label: 'Users',           Icon: IconUsers },
  { to: ROUTES.ADMIN_STUDENTS,        label: 'Students',        Icon: IconSchool },
  { to: ROUTES.ADMIN_CALENDAR,        label: 'Calendar',        Icon: IconCalendar },
  { to: ROUTES.ADMIN_DUTY_SLOTS,      label: 'Duty Slots',      Icon: IconCalendarEvent },
  { to: ROUTES.ADMIN_ATTENDANCE,      label: 'Attendance',      Icon: IconClipboardCheck },
  { to: ROUTES.ADMIN_VIOLATIONS,      label: 'Violations',      Icon: IconAlertTriangle },
  { to: ROUTES.ADMIN_VIOLATION_TYPES, label: 'Viol. Types',     Icon: IconTag },
  { to: ROUTES.ADMIN_COVER_REQUESTS,  label: 'Cover Requests',  Icon: IconArrowsLeftRight },
  { to: ROUTES.ADMIN_MESSAGES,        label: 'Messages',        Icon: IconMail },
  { to: ROUTES.ADMIN_REPORTS,         label: 'Reports',         Icon: IconChartBar },
];

const facultyLinks = [
  { to: ROUTES.FACULTY_DASHBOARD,      label: 'Dashboard',      Icon: IconLayoutDashboard },
  { to: ROUTES.FACULTY_SLOTS,          label: 'My Slots',       Icon: IconCalendarEvent },
  { to: ROUTES.FACULTY_ATTENDANCE,     label: 'Attendance',     Icon: IconClipboardCheck },
  { to: ROUTES.FACULTY_VIOLATIONS,     label: 'Violations',     Icon: IconAlertTriangle },
  { to: ROUTES.FACULTY_COVER_REQUESTS, label: 'Cover Requests', Icon: IconArrowsLeftRight },
  { to: ROUTES.FACULTY_MESSAGES,       label: 'Messages',       Icon: IconMail },
];

const superAdminExtra = [
  { to: ROUTES.SUPER_ADMIN_DASHBOARD, label: 'SA Dashboard', Icon: IconBolt },
  { to: ROUTES.SUPER_ADMIN_SESSIONS,  label: 'Sessions',     Icon: IconKey },
  { to: ROUTES.SUPER_ADMIN_AUDIT,     label: 'Audit Logs',   Icon: IconFileText },
];

function getLinks(role) {
  if (role === ROLES.FACULTY)     return facultyLinks;
  if (role === ROLES.SUPER_ADMIN) return [...adminLinks, ...superAdminExtra];
  return adminLinks;
}

// ── Bottom tab bar — 4 pinned routes per role ──────────────────────────────────

const facultyBottomTabs = [
  { to: ROUTES.FACULTY_DASHBOARD,  label: 'Home',    Icon: IconLayoutDashboard },
  { to: ROUTES.FACULTY_SLOTS,      label: 'Slots',   Icon: IconCalendarEvent },
  { to: ROUTES.FACULTY_ATTENDANCE, label: 'Attend',  Icon: IconClipboardCheck },
  { to: ROUTES.FACULTY_VIOLATIONS, label: 'Violat.', Icon: IconAlertTriangle },
];

const adminBottomTabs = [
  { to: ROUTES.ADMIN_DASHBOARD,   label: 'Home',       Icon: IconLayoutDashboard },
  { to: ROUTES.ADMIN_STUDENTS,    label: 'Students',   Icon: IconSchool },
  { to: ROUTES.ADMIN_VIOLATIONS,  label: 'Violations', Icon: IconAlertTriangle },
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
      <Icon size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      <span>{label}</span>
    </RouterNavLink>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────────

export default function Layout({ user, children }) {
  const [navOpened, { open: openNav, close: closeNav }] = useDisclosure(false);
  const logout     = useLogout();
  const links      = getLinks(user?.role);
  const bottomTabs = getBottomTabs(user?.role);

  const sidebarContent = (
    <Stack h="100%" gap={0} style={{ overflow: 'hidden' }}>
      <Box className={classes.brand}>
        <Group gap={8} wrap="nowrap">
          <Box className={classes.brandMark}>🎓</Box>
          <Text fw={700} size="sm" c="white" style={{ letterSpacing: '-0.01em' }}>
            SIMS DMS
          </Text>
        </Group>
        <Text size="xs" c="dimmed" mt={2} pl={36}>
          {getRoleLabel(user?.role)}
        </Text>
      </Box>

      <Divider color="rgba(255,255,255,0.08)" />

      <Stack gap={2} p={8} style={{ flex: 1, overflowY: 'auto' }}>
        {links.map((link) => (
          <NavItem key={link.to} {...link} onClick={closeNav} />
        ))}
      </Stack>

      <Divider color="rgba(255,255,255,0.08)" />

      <Box p={10}>
        <Group gap={8} mb={6} px={4}>
          <Avatar size={28} radius="xl" color="blue" style={{ flexShrink: 0 }}>
            {getInitials(user?.name)}
          </Avatar>
          <Text size="xs" fw={600} c="gray.3" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name}
          </Text>
        </Group>
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

        {/* Main content */}
        <AppShell.Main
          style={{
            backgroundColor: 'var(--surface-page)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            minHeight: '100dvh',
          }}
        >
          <div className={classes.pageContent}>
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
            style={{ flex: 1, textDecoration: 'none' }}
          >
            {({ isActive }) => (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                height: '100%', gap: 3, padding: '0 2px',
                color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.45)',
                borderTop: isActive ? '2px solid #60a5fa' : '2px solid transparent',
                transition: 'color 0.15s',
              }}>
                <tab.Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
                <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, letterSpacing: '0.01em' }}>
                  {tab.label}
                </span>
              </div>
            )}
          </RouterNavLink>
        ))}

        {/* Menu button — opens full nav drawer */}
        <button
          onClick={openNav}
          style={{
            flex: 1, border: 'none', background: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 3, padding: '0 2px',
            color: 'rgba(255,255,255,0.45)',
            borderTop: '2px solid transparent',
          }}
        >
          <IconMenu2 size={22} strokeWidth={1.5} />
          <span style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.01em', color: 'inherit', fontFamily: 'inherit' }}>
            Menu
          </span>
        </button>
      </div>
    </>
  );
}

// ── Shared layout exports ──────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, action }) {
  return (
    <Group justify="space-between" align="flex-start" mb="lg" pb="md"
      style={{ borderBottom: '1px solid var(--border)', minWidth: 0 }}
    >
      <Box style={{ minWidth: 0, flex: 1 }}>
        <Title order={2} style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }} lineClamp={1}>
          {title}
        </Title>
        {subtitle && (
          <Text size="xs" c="dimmed" mt={5} lineClamp={1}>{subtitle}</Text>
        )}
      </Box>
      {action && <Box style={{ flexShrink: 0 }}>{action}</Box>}
    </Group>
  );
}

export function Card({ children, className = '' }) {
  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }} className={className}>
      {children}
    </Paper>
  );
}

export function CardHeader({ children, action }) {
  return (
    <Box
      px="md" py="sm"
      style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-page)' }}
    >
      <Group justify="space-between" gap="sm">
        <Text size="sm" fw={600} c="gray.7">{children}</Text>
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
