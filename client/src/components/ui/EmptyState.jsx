import { Stack, Text, Center } from '@mantine/core';

/**
 * EmptyState — "no data" placeholder. emoji + title + message + optional action.
 * Use inside tables or as a standalone block.
 */
export default function EmptyState({ emoji = '📭', title, subtitle, message, action }) {
  const body = message ?? subtitle;
  return (
    <Center py={48} px="md">
      <Stack align="center" gap="xs">
        <Text style={{ fontSize: 32, opacity: 0.4, lineHeight: 1 }}>{emoji}</Text>
        {title && (
          <Text size="sm" fw={600} c="dimmed">{title}</Text>
        )}
        {body && (
          <Text size="sm" c="dimmed" ta="center">{body}</Text>
        )}
        {action}
      </Stack>
    </Center>
  );
}
