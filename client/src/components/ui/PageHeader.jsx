import { Group, Box, Title, Text } from '@mantine/core';

/**
 * PageHeader — consistent page title with optional subtitle and action.
 * Uses Title order={2} across all pages for consistent typography hierarchy.
 */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <Group justify="space-between" align="flex-start" mb="lg" pb="md"
      style={{ borderBottom: '1px solid var(--border)', minWidth: 0 }}
    >
      <Box style={{ minWidth: 0, flex: 1 }}>
        <Title order={2} style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }} lineClamp={1}>
          {title}
        </Title>
        {subtitle && (
          <Text size="xs" c="dimmed" mt={2} lineClamp={1}>{subtitle}</Text>
        )}
      </Box>
      {action && <Box style={{ flexShrink: 0 }}>{action}</Box>}
    </Group>
  );
}
