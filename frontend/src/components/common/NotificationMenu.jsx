import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, ExternalLink, Moon, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';

export function NotificationMenu() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      const items = data.notifications || [];
      const unread = data.unreadCount || 0;

      // Browser Notification delivery for newly arrived unread reminders
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        items.forEach((n) => {
          if (!n.is_read && n.type === 'REMINDER' && !n._deliveredToBrowser) {
            n._deliveredToBrowser = true;
            try {
              new Notification(n.title, {
                body: n.message,
                icon: '/favicon.ico',
              });
            } catch (err) {
              // Notification spawn failure handled gracefully
            }
          }
        });
      }

      setNotifications(items);
      setUnreadCount(unread);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRequestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await api.markNotificationRead(notif.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: 1 } : n)));
      } catch (err) {
        console.error(err);
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  // Inline Quick Actions for Reminders
  const handleSnooze = async (e, reminderId, notifId) => {
    e.stopPropagation();
    try {
      await api.snoozeReminder(reminderId, 15);
      await api.markNotificationRead(notifId);
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteTask = async (e, taskId, notifId) => {
    e.stopPropagation();
    try {
      await api.updateTask(taskId, { status: 'DONE' });
      await api.markNotificationRead(notifId);
      confetti({ particleCount: 40, spread: 60 });
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissReminder = async (e, reminderId, notifId) => {
    e.stopPropagation();
    try {
      await api.dismissReminder(reminderId);
      await api.markNotificationRead(notifId);
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-icon"
        style={{ position: 'relative' }}
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--primary-orange)',
              border: '2px solid var(--surface-primary)',
            }}
          />
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '120%',
            width: 360,
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-dropdown)',
            zIndex: 50,
            padding: '0.65rem',
            animation: 'scaleUp 150ms ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.4rem 0.65rem 0.6rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--primary-text)' }}>
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{ fontSize: 'var(--text-xs)', color: 'var(--primary-orange)', fontWeight: 600 }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Browser Notification Opt-in Prompt */}
          {browserPermission === 'default' && (
            <div
              style={{
                margin: '8px 4px 6px',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Enable system alerts for due reminders
              </div>
              <button
                onClick={handleRequestBrowserPermission}
                className="btn-primary"
                style={{ padding: '3px 8px', fontSize: 10, flexShrink: 0 }}
              >
                Enable
              </button>
            </div>
          )}

          {/* Notification List */}
          <div style={{ maxHeight: 340, overflowY: 'auto', padding: '0.35rem 0' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                No notifications right now
              </div>
            ) : (
              notifications.slice(0, 8).map((notif) => {
                let payload = {};
                try {
                  payload = typeof notif.action_payload === 'string' ? JSON.parse(notif.action_payload) : (notif.action_payload || {});
                } catch {
                  payload = {};
                }

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: notif.is_read ? 'transparent' : 'var(--surface-secondary)',
                      marginBottom: '0.35rem',
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: notif.is_read ? 'transparent' : 'var(--border)',
                      transition: 'background-color 150ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-peach)')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = notif.is_read ? 'transparent' : 'var(--surface-secondary)')
                    }
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--primary-text)' }}>
                        {notif.title}
                      </span>
                      {!notif.is_read && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--primary-orange)' }} />
                      )}
                    </div>

                    <div style={{ color: 'var(--secondary-text)', fontSize: 12, lineHeight: 1.4, marginBottom: payload.reminder_id ? 8 : 0 }}>
                      {notif.message}
                    </div>

                    {/* Interactive Action Buttons for Reminders */}
                    {payload.reminder_id && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 8,
                          paddingTop: 6,
                          borderTop: '1px dashed var(--border)',
                        }}
                      >
                        <button
                          onClick={(e) => handleSnooze(e, payload.reminder_id, notif.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--surface-primary)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                          }}
                          title="Snooze reminder by 15 minutes"
                        >
                          <Moon size={11} /> Snooze 15m
                        </button>

                        {payload.task_id && (
                          <button
                            onClick={(e) => handleCompleteTask(e, payload.task_id, notif.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              fontSize: 11,
                              fontWeight: 600,
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid rgba(39, 132, 91, 0.3)',
                              backgroundColor: 'rgba(39, 132, 91, 0.1)',
                              color: 'var(--color-success)',
                              cursor: 'pointer',
                            }}
                            title="Mark task as completed"
                          >
                            <CheckCircle2 size={11} /> Done
                          </button>
                        )}

                        <button
                          onClick={(e) => handleDismissReminder(e, payload.reminder_id, notif.id)}
                          style={{
                            padding: '3px 8px',
                            fontSize: 11,
                            color: 'var(--text-secondary)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            marginLeft: 'auto',
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
