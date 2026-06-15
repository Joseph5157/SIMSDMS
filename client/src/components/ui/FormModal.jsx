import { Modal, Stack, Group, Button, Alert } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconAlertCircle } from '@tabler/icons-react';

/**
 * FormModal — create/edit form dialog.
 * - loading: disables submit + shows spinner
 * - error: renders an Alert above the form children
 * - fullScreen on mobile (≤640px) automatically
 * - size prop passed through to Modal
 */
export default function FormModal({
  opened,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  error,
  size = 'md',
  formId,
}) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const id = formId ?? 'form-modal-form';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size={size}
      fullScreen={isMobile}
      centered
    >
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" radius="md">
          {error}
        </Alert>
      )}

      <form id={id} onSubmit={onSubmit}>
        <Stack gap="md">
          {children}
        </Stack>
      </form>

      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="default" type="button" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button type="submit" form={id} loading={loading}>
          {submitLabel}
        </Button>
      </Group>
    </Modal>
  );
}
