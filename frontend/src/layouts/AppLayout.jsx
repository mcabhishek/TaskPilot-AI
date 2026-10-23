import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  CheckSquare,
  Calendar as CalendarIcon,
  FolderKanban,
  FileText,
  Zap,
  Layers,
  BarChart3,
  Settings,
  Bell,
  Plus,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Assistant', path: '/ai', icon: Sparkles, badge: 'AI' },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Calendar', path: '/calendar', icon: CalendarIcon },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Notes', path: '/notes', icon: FileText },
    { name: 'Automation', path: '/automation', icon: Zap },
    { name: 'Integrations', path: '/integrations', icon: Layers },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
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

  return (
    <div className="app-layout">
      {/* Desktop & Mobile Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary-orange), var(--deep-orange))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 2px 6px rgba(249, 115, 22, 0.3)'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>TaskPilot <span style={{ color: 'var(--primary-orange)' }}>AI</span></h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Plan Smarter. Do More.</span>
            </div>
          </div>
          {mobileMenuOpen && (
            <button onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-secondary)' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Quick Action */}
        <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
          <button
            onClick={() => navigate('/ai')}
            className="btn-primary"
            style={{ width: '100%', fontSize: '0.88rem', padding: '0.55rem 0.75rem' }}
          >
            <Sparkles size={16} /> Plan Goal with AI
          </button>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '0.75rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    color: isActive ? 'var(--primary-orange)' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--pale-orange)' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    fontSize: '0.92rem',
                    transition: 'all 0.15s ease',
                  })}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span style={{
                      backgroundColor: 'var(--primary-orange)',
                      color: '#FFF',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-full)'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User Card */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FCFAF7'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--pale-orange)',
              color: 'var(--primary-orange)',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-color)'
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.email || 'user@example.com'}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            style={{ color: 'var(--text-muted)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setMobileMenuOpen(true)}
              style={{ display: 'none', color: 'var(--text-main)' }}
              className="mobile-toggle"
            >
              <Menu size={22} />
            </button>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Workspace
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => navigate('/tasks?action=new')}
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
            >
              <Plus size={16} /> New Task
            </button>

            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                style={{
                  position: 'relative',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: 'var(--primary-orange)',
                    color: '#FFF',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    width: 18,
                    height: 18,
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  width: 320,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 50,
                  padding: '0.75rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} style={{ fontSize: '0.75rem', color: 'var(--primary-orange)', fontWeight: 600 }}>
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        No new notifications
                      </div>
                    ) : (
                      notifications.slice(0, 6).map(notif => (
                        <div key={notif.id} style={{
                          padding: '0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: notif.is_read ? '#FFFFFF' : 'var(--warm-cream)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.8rem'
                        }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.15rem' }}>{notif.title}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.3 }}>{notif.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-body">
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .mobile-toggle {
            display: inline-flex !important;
          }
        }
      `}</style>
    </div>
  );
}
