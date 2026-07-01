/**
 * Table — thin Mantine wrappers with same export names as the deleted Table.jsx.
 * This is the reference pattern for all Phase 3 page migrations.
 *
 * Mobile strategy: Table.ScrollContainer for horizontal scroll (the default for
 * pages with no explicit card-list layout). Pages that already have a
 * md:hidden / md:block card-list split can keep that — wrap only the desktop
 * table half with this Table component.
 *
 * Exports: Table, Th, Td, Tr, EmptyRow  (same names as before)
 */
import { Table as MTable, Paper, Text, Center, Stack } from '@mantine/core';

/** Outer card shell + horizontal scroll container. */
export function Table({ children, minWidth = 500 }) {
  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
      <MTable.ScrollContainer minWidth={minWidth}>
        <MTable striped={false} highlightOnHover={false} withRowBorders={false}>
          {children}
        </MTable>
      </MTable.ScrollContainer>
    </Paper>
  );
}

/** Header cell — 10px uppercase, muted, slate-50 background. */
export function Th({ children, className }) {
  return (
    <MTable.Th
      className={className}
      style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-muted)',
        backgroundColor: 'var(--surface-page)', whiteSpace: 'nowrap',
        padding: '10px 16px',
      }}
    >
      {children}
    </MTable.Th>
  );
}

/** Data cell — 13px slate-700, bottom border for row dividers. */
export function Td({ children, className }) {
  return (
    <MTable.Td
      className={className}
      style={{
        fontSize: 13, color: 'var(--text-secondary)',
        padding: '10px 16px',
        borderBottom: '1px solid var(--divider)',
      }}
    >
      {children}
    </MTable.Td>
  );
}

/** Row — use for clickable rows (passes onClick + cursor). */
export function Tr({ children, onClick, className }) {
  return (
    <MTable.Tr
      onClick={onClick}
      className={className}
      style={{
        cursor: onClick ? 'pointer' : undefined,
        transition: onClick ? 'background-color 100ms' : undefined,
      }}
    >
      {children}
    </MTable.Tr>
  );
}

/** Empty / loading row — centred 📭 + message, spans all columns. */
export function EmptyRow({ cols, message = 'No records found.' }) {
  return (
    <MTable.Tr>
      <MTable.Td colSpan={cols} style={{ padding: 0, borderBottom: 'none' }}>
        <Center py="xl">
          <Stack align="center" gap="xs">
            <Text style={{ fontSize: 32, opacity: 0.4, lineHeight: 1 }}>📭</Text>
            <Text size="sm" c="dimmed">{message}</Text>
          </Stack>
        </Center>
      </MTable.Td>
    </MTable.Tr>
  );
}

export default Table;
