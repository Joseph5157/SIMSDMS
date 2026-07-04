import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications, useMarkAsRead } from '../hooks/useNotifications';

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function getNotificationColor(type) {
  switch (type) {
    case 'duty_assigned':
      return 'var(--color-blue-50)';
    case 'cover_request':
      return 'var(--color-amber-bg)';
    case 'violation':
      return 'var(--color-red-bg)';
    case 'message':
      return 'var(--color-cyan-bg)';
    default:
      return 'var(--color-slate-50)';
  }
}

export default function NotificationBell() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, isConnected } = useNotifications();
  const markAsRead = useMarkAsRead();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !buttonRef.current?.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const recentNotifications = notifications.slice(0, 10);

  return (
    <div className="relative inline-block">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => {
          if (window.innerWidth < 640) {
            navigate('/notifications');
            return;
          }
          setDropdownOpen(!dropdownOpen);
        }}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-pressed={dropdownOpen}
        title={`${unreadCount} unread notifications`}
        className="bg-transparent border-none cursor-pointer w-11 h-11 flex items-center justify-center relative rounded-[var(--radius-md)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-slate-100)]"
      >
        <Bell size={20} color="var(--color-blue-600)" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-[var(--color-red-solid)] text-white text-[length:var(--text-micro)] font-bold flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 z-50 flex flex-col overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-card)] border border-[var(--border)] shadow-[var(--shadow-dropdown)]"
          style={{
            top: 'calc(100% + 8px)',
            width: 'min(360px, calc(100vw - 24px))',
            maxHeight: 500,
          }}
          role="region"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--divider)]">
            <p className="text-[length:var(--text-body)] font-[var(--weight-semibold)] text-[color:var(--text-primary)] m-0">
              Notifications
            </p>
            {!isConnected && (
              <span className="text-[length:var(--text-micro)] text-[color:var(--color-amber-text)] bg-[var(--color-amber-bg)] px-1.5 py-0.5 rounded-[var(--radius-sm)]">
                Offline
              </span>
            )}
          </div>

          {/* Notifications list */}
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {recentNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[color:var(--text-muted)] text-[length:var(--text-card)]">
                No notifications
              </div>
            ) : (
              recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="px-4 py-3 border-b border-[var(--divider)] cursor-pointer transition-colors duration-[var(--dur-fast)]"
                  style={{
                    backgroundColor: notif.readAt ? 'transparent' : getNotificationColor(notif.type),
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = notif.readAt
                      ? 'var(--color-slate-50)'
                      : getNotificationColor(notif.type);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notif.readAt ? 'transparent' : getNotificationColor(notif.type);
                  }}
                  onClick={() => {
                    if (!notif.readAt) {
                      markAsRead(notif.id);
                    }
                    if (notif.actionUrl) {
                      window.location.href = notif.actionUrl;
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[length:var(--text-card)] font-[var(--weight-semibold)] text-[color:var(--text-primary)] m-0 mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                        {notif.title}
                      </p>
                      <p className="text-[length:var(--text-small)] text-[color:var(--text-secondary)] m-0 mb-1 leading-[var(--leading-snug)]">
                        {notif.message}
                      </p>
                      <p className="text-[length:var(--text-micro)] text-[color:var(--text-muted)] m-0">
                        {formatTime(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.readAt && (
                      <div
                        className="w-2 h-2 rounded-full bg-[var(--color-blue-500)] shrink-0 mt-1"
                        title="Unread"
                        aria-label="Unread"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-[var(--divider)] text-center">
              <Link
                to="/notifications"
                onClick={() => setDropdownOpen(false)}
                className="text-[color:var(--color-blue-600)] no-underline text-[length:var(--text-card)] font-[var(--weight-semibold)] transition-colors duration-[var(--dur-fast)] hover:text-[color:var(--color-blue-700)]"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
