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
    <Modal.Root
      opened={opened}
      onClose={onClose}
      size={size}
      fullScreen={isMobile}
      centered
      zIndex={115}
    >
      <Modal.Overlay />
      <Modal.Content
        style={{
          display: 'flex', flexDirection: 'column',
          maxHeight: isMobile ? '100dvh' : '85dvh',
        }}
      >
        <Modal.Header style={{ flexShrink: 0 }}>
          <Modal.Title>{title}</Modal.Title>
          <Modal.CloseButton />
        </Modal.Header>

        {/* Scrollable body — fields only, so the footer below is always reachable */}
        <Modal.Body style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
        </Modal.Body>

        {/* Sticky footer — always visible, never requires scrolling to reach */}
        <Group
          justify="flex-end" gap="sm" p="md"
          style={{
            flexShrink: 0,
            borderTop: '1px solid var(--divider)',
            backgroundColor: 'var(--surface-card)',
            paddingBottom: 'max(var(--mantine-spacing-md), env(safe-area-inset-bottom))',
          }}
        >
          <Button variant="default" type="button" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button type="submit" form={id} loading={loading}>
            {submitLabel}
          </Button>
        </Group>
      </Modal.Content>
    </Modal.Root>
  );
}
