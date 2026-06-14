import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-pressed={dropdownOpen}
        title={`${unreadCount} unread notifications`}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          transition: 'background-color var(--dur-fast)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-slate-100)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Bell size={20} color="var(--color-blue-600)" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 20,
              height: 20,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-red-solid)',
              color: 'white',
              fontSize: 11,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {dropdownOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxHeight: 500,
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-dropdown)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          role="region"
          aria-label="Notifications"
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--divider)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <p style={{
              fontSize: 'var(--text-body)',
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              Notifications
            </p>
            {!isConnected && (
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--color-amber-text)',
                  backgroundColor: 'var(--color-amber-bg)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                Offline
              </span>
            )}
          </div>

          {/* Notifications list */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: 400,
            }}
          >
            {recentNotifications.length === 0 ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 'var(--text-card)',
                }}
              >
                No notifications
              </div>
            ) : (
              recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--divider)',
                    backgroundColor: notif.readAt ? 'transparent' : getNotificationColor(notif.type),
                    cursor: 'pointer',
                    transition: 'background-color var(--dur-fast)',
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 'var(--text-card)',
                        fontWeight: 'var(--weight-semibold)',
                        color: 'var(--text-primary)',
                        margin: '0 0 2px 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {notif.title}
                      </p>
                      <p style={{
                        fontSize: 'var(--text-small)',
                        color: 'var(--text-secondary)',
                        margin: '0 0 4px 0',
                        lineHeight: 'var(--leading-snug)',
                      }}>
                        {notif.message}
                      </p>
                      <p style={{
                        fontSize: 'var(--text-micro)',
                        color: 'var(--text-muted)',
                        margin: 0,
                      }}>
                        {formatTime(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.readAt && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--color-blue-500)',
                          flexShrink: 0,
                          marginTop: 4,
                        }}
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
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--divider)',
                textAlign: 'center',
              }}
            >
              <Link
                to="/notifications"
                onClick={() => setDropdownOpen(false)}
                style={{
                  color: 'var(--color-blue-600)',
                  textDecoration: 'none',
                  fontSize: 'var(--text-card)',
                  fontWeight: 'var(--weight-semibold)',
                  transition: 'color var(--dur-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-blue-700)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-blue-600)')}
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
