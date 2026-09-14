import { useEffect, useState } from 'react';
import { IconWifi, IconWifiOff, IconX } from '@tabler/icons-react';
import { useOnline } from '../hooks/useOnline';
import Alert from './ui/Alert';
import AppButton from './ui/AppButton';

export default function OfflineBanner() {
  const { isOnline } = useOnline();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      // Reacting to a genuinely external signal (network status) — there's no
      // non-effect way to drive this plus the 2s hide-delay timer below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowBanner(true);
    } else {
      // Keep banner visible for 2 seconds after coming back online
      const timer = setTimeout(() => setShowBanner(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!showBanner) return null;

  return (
    <div className="md:hidden fixed inset-x-0 top-0 z-[70]">
      <Alert
        tone="warning"
        icon={
          isOnline
            ? <IconWifi size={18} stroke={1.9} color="var(--color-amber-solid)" />
            : <IconWifiOff size={18} stroke={1.9} color="var(--color-amber-solid)" />
        }
        role="status"
        aria-live="polite"
        aria-label={isOnline ? 'Back online' : 'You are offline'}
        className="rounded-none border-x-0 border-t-0"
        action={
          <AppButton
            variant="icon"
            aria-label="Dismiss offline banner"
            icon={<IconX size={16} />}
            onClick={() => setShowBanner(false)}
          />
        }
      >
        {isOnline
          ? 'Back online — syncing changes'
          : "You're offline — changes will sync when connection returns"}
      </Alert>
    </div>
  );
}
