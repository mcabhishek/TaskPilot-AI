import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

export function NotificationMenu() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 25000);
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

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await api.markNotificationRead(notif.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
      } catch (err) {
        console.error(err);
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
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
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 8,
            height: 8,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--primary-orange)',
            border: '2px solid var(--surface-primary)'
          }} />
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '120%',
          width: 320,
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-dropdown)',
          zIndex: 50,
          padding: '0.5rem',
          animation: 'scaleUp 150ms ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.65rem 0.4rem', borderBottom: '1px solid var(--border-subtle)' }}>
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

          <div style={{ maxHeight: 290, overflowY: 'auto', padding: '0.35rem 0' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                No notifications right now
              </div>
            ) : (
              notifications.slice(0, 6).map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: notif.is_read ? 'transparent' : 'var(--surface-secondary)',
                    marginBottom: '0.25rem',
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--soft-peach)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = notif.is_read ? 'transparent' : 'var(--surface-secondary)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--primary-text)' }}>
                      {notif.title}
                    </span>
                    {!notif.is_read && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--primary-orange)' }} />
                    )}
                  </div>
                  <div style={{ color: 'var(--secondary-text)', fontSize: 'var(--text-xs)', lineHeight: 1.4 }}>
                    {notif.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
