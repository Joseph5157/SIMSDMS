import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { notifications } from '@mantine/notifications';

export default function PWAUpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) return;
    notifications.show({
      id: 'pwa-update',
      title: 'Update available',
      message: 'A new version of SIMS DMS is ready.',
      color: 'blue',
      autoClose: false,
      withCloseButton: false,
      withBorder: true,
      styles: { root: { cursor: 'pointer' } },
      onClick: () => {
        notifications.hide('pwa-update');
        updateServiceWorker(true);
      },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}
