import { Paper, Box, Group, Text } from '@mantine/core';

/**
 * DataCard — section container. Wraps content in a white bordered card.
 * Optional header with title + action, optional padding control.
 */
export default function DataCard({ title, action, children, noPadding = false, className }) {
  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }} className={className}>
      {title && (
        <Box
          px="md" py="sm"
          style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-page)' }}
        >
          <Group justify="space-between" gap="sm" align="center">
            <Text size="sm" fw={600} c="gray.7">{title}</Text>
            {action}
          </Group>
        </Box>
      )}
      <Box p={noPadding ? 0 : 'md'}>
        {children}
      </Box>
    </Paper>
  );
}
