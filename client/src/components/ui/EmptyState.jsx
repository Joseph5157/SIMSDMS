import { Stack, Text, Center } from '@mantine/core';
import { Inbox } from 'lucide-react';

/**
 * EmptyState — "no data" placeholder. icon/emoji + title + message + optional action.
 * Pass `icon` (a Lucide icon component) for a polished look, or `emoji` for backward compat.
 */
export default function EmptyState({ icon: Icon, emoji = '📭', title, subtitle, message, action }) {
  const body = message ?? subtitle;
  return (
    <Center py={48} px="md">
      <Stack align="center" gap="xs">
        {Icon ? (
          <Icon size={48} strokeWidth={1.5} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
        ) : (
          <Text style={{ fontSize: 32, opacity: 0.5, lineHeight: 1 }}>{emoji}</Text>
        )}
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
