import { Group, Button, Text } from '@mantine/core';

export default function Pagination({ meta, page, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  const from = (page - 1) * meta.limit + 1;
  const to   = Math.min(page * meta.limit, meta.total);
  return (
    <Group justify="space-between" pt="md">
      <Text size="xs" c="dimmed">Showing {from}–{to} of {meta.total}</Text>
      <Group gap="xs">
        <Button variant="default" size="xs" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</Button>
        <Button variant="default" size="xs" disabled={page >= meta.pages} onClick={() => onPage(page + 1)}>Next →</Button>
      </Group>
    </Group>
  );
}
