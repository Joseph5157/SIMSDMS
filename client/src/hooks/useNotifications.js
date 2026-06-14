import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

export function useNotifications() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const backoffRef = useRef(1000); // Start with 1 second

  // Fetch initial notifications
  const { data = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/notifications');
        if (!res.ok) throw new Error('Failed to fetch notifications');
        return res.json();
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
        return [];
      }
    },
  });

  // Calculate unread count
  const unreadCount = data?.filter(n => !n.readAt)?.length || 0;

  // Setup EventSource for real-time updates
  useEffect(() => {
    const connectEventSource = () => {
      try {
        eventSourceRef.current = new EventSource('/api/notifications/stream');
        setIsConnected(true);
        backoffRef.current = 1000; // Reset backoff on successful connection

        eventSourceRef.current.addEventListener('notification', (event) => {
          try {
            const notification = JSON.parse(event.data);
            // Add to cache
            queryClient.setQueryData(['notifications'], (old) => {
              if (!old) return [notification];
              return [notification, ...old];
            });
          } catch (err) {
            console.error('Failed to parse notification:', err);
          }
        });

        eventSourceRef.current.onerror = () => {
          setIsConnected(false);
          eventSourceRef.current?.close();
          // Reconnect with exponential backoff
          backoffRef.current = Math.min(backoffRef.current * 1.5, 30000); // Max 30s
          reconnectTimeoutRef.current = setTimeout(connectEventSource, backoffRef.current);
        };
      } catch (err) {
        console.error('Failed to connect EventSource:', err);
        setIsConnected(false);
        // Retry with backoff
        backoffRef.current = Math.min(backoffRef.current * 1.5, 30000);
        reconnectTimeoutRef.current = setTimeout(connectEventSource, backoffRef.current);
      }
    };

    connectEventSource();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [queryClient]);

  return {
    notifications: data || [],
    unreadCount,
    isConnected,
    isLoading,
  };
}

/**
 * Mark a notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      // Update cache
      queryClient.setQueryData(['notifications'], (old) => {
        if (!old) return [];
        return old.map((n) =>
          n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
        );
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  return markAsRead;
}

/**
 * Delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  const deleteNotification = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      // Remove from cache
      queryClient.setQueryData(['notifications'], (old) => {
        if (!old) return [];
        return old.filter((n) => n.id !== notificationId);
      });
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  return deleteNotification;
}
