import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  isDangerous = false,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-slate-600 text-[13px] leading-snug" role={isDangerous ? 'alert' : undefined}>
        {message}
      </p>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant={isDangerous ? 'danger' : 'primary'}
          type="button"
          onClick={onConfirm}
          loading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
