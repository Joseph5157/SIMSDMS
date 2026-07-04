import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from './ui/Toast';

export default function PWAUpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  const toast = useToast();

  useEffect(() => {
    if (!needRefresh) return;
    toast({
      message: 'Update available — tap to refresh SIMS DMS.',
      type: 'info',
      persistent: true,
      onClick: () => updateServiceWorker(true),
    });
  }, [needRefresh, updateServiceWorker, toast]);

  return null;
}
