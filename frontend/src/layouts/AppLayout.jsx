import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar as CalendarIcon,
  Sparkles,
  FolderKanban,
  FileText,
  Zap,
  Layers,
  BarChart3,
  Settings,
  Plus,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  Mic
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/common/PageHeader';
import { NotificationMenu } from '../components/common/NotificationMenu';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { PrimaryButton, SecondaryButton } from '../components/common/Button';
import { VoiceAssistantModal } from '../components/common/VoiceAssistantModal';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState(false);

  const navGroups = [
    {
      label: 'Main',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'My Tasks', path: '/tasks', icon: CheckSquare },
        { name: 'Calendar', path: '/calendar', icon: CalendarIcon },
      ]
    },
    {
      label: 'Intelligence',
      items: [
        { name: 'AI Assistant', path: '/ai', icon: Sparkles, badge: 'AI' },
        { name: 'Notes', path: '/notes', icon: FileText },
        { name: 'Projects', path: '/projects', icon: FolderKanban },
      ]
    },
    {
      label: 'Operations',
      items: [
        { name: 'Automation', path: '/automation', icon: Zap },
        { name: 'Integrations', path: '/integrations', icon: Layers },
        { name: 'Analytics', path: '/analytics', icon: BarChart3 },
        { name: 'Settings', path: '/settings', icon: Settings },
      ]
    }
  ];

  // Map route to page title
  const getPageTitle = () => {
    const p = location.pathname;
    if (p.includes('/tasks')) return 'My Tasks';
    if (p.includes('/calendar')) return 'Calendar';
    if (p.includes('/ai')) return 'AI Assistant';
    if (p.includes('/notes')) return 'Notes';
    if (p.includes('/projects')) return 'Projects';
    if (p.includes('/automation')) return 'Automation';
    if (p.includes('/integrations')) return 'Integrations';
    if (p.includes('/analytics')) return 'Analytics';
    if (p.includes('/settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <div className="app-layout">
      {/* Global Search Palette */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Desktop & Mobile Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div style={{
          padding: '1.15rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(232, 117, 50, 0.3)'
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-text)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                TaskPilot <span style={{ color: 'var(--primary-orange)' }}>AI</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--secondary-text)', fontWeight: 500 }}>
                Plan Smarter. Do More.
              </div>
            </div>
          </div>

          {mobileOpen && (
            <button onClick={() => setMobileOpen(false)} style={{ color: 'var(--secondary-text)' }}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Action Button */}
        <div style={{ padding: '0.85rem 1rem 0.35rem' }}>
          <button
            onClick={() => {
              navigate('/ai');
              setMobileOpen(false);
            }}
            className="btn-primary"
            style={{ width: '100%', fontSize: 'var(--text-sm)', padding: '0.55rem 0.75rem' }}
          >
            <Sparkles size={15} /> Plan with AI
          </button>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '0.65rem 0.75rem', overflowY: 'auto' }}>
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: '1rem' }}>
              <div style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '0 0.65rem 0.35rem'
              }}>
                {group.label}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.65rem',
                        borderRadius: 'var(--radius-md)',
                        color: isActive ? 'var(--primary-orange)' : 'var(--secondary-text)',
                        backgroundColor: isActive ? 'var(--soft-peach)' : 'transparent',
                        fontWeight: isActive ? 600 : 500,
                        textDecoration: 'none',
                        fontSize: 'var(--text-sm)',
                        transition: 'all 140ms ease',
                      })}
                      onMouseEnter={e => {
                        if (!e.currentTarget.classList.contains('active')) {
                          e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                          e.currentTarget.style.color = 'var(--primary-text)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!e.currentTarget.classList.contains('active')) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--secondary-text)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <Icon size={16} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span style={{
                          backgroundColor: 'var(--primary-orange)',
                          color: '#FFFFFF',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.4rem',
                          borderRadius: 'var(--radius-full)'
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Card */}
        <div style={{
          padding: '0.85rem 1rem',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--surface-primary)',
          position: 'relative'
        }}>
          <div
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: 'var(--radius-md)',
              transition: 'background-color 150ms ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
              <UserAvatar name={user?.name} size={30} />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary-text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user?.name || 'Alex Rivera'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--secondary-text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user?.email || 'demo@taskpilot.ai'}
                </div>
              </div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </div>

          {/* User popup menu */}
          {userMenuOpen && (
            <div style={{
              position: 'absolute',
              bottom: '105%',
              left: 12,
              right: 12,
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-dropdown)',
              padding: '0.35rem',
              zIndex: 50
            }}>
              <button
                onClick={() => {
                  navigate('/settings');
                  setUserMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.45rem 0.65rem',
                  fontSize: 'var(--text-sm)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--primary-text)'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Profile & Settings
              </button>
              <button
                onClick={logout}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.45rem 0.65rem',
                  fontSize: 'var(--text-sm)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--error)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--error-bg)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button
              onClick={() => setMobileOpen(true)}
              style={{ display: 'none', color: 'var(--primary-text)' }}
              className="mobile-toggle"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <span style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--primary-text)' }}>
              {getPageTitle()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Quick Search Shortcut Bar */}
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.35rem 0.75rem',
                color: 'var(--secondary-text)',
                fontSize: 'var(--text-xs)'
              }}
              title="Search workspace (Ctrl + K)"
            >
              <Search size={14} />
              <span className="search-text-label">Search anything...</span>
              <kbd style={{
                backgroundColor: 'var(--surface-primary)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '0.1rem 0.35rem',
                fontSize: '0.68rem',
                fontFamily: 'inherit'
              }}>
                Ctrl K
              </kbd>
            </button>

            {/* Quick Create Task Action */}
            <button
              onClick={() => navigate('/tasks?action=new')}
              className="btn-primary"
              style={{ fontSize: 'var(--text-xs)', padding: '0.4rem 0.85rem' }}
            >
              <Plus size={14} /> Create Task
            </button>

            {/* Alexa-Style Voice Assistant Trigger */}
            <button
              onClick={() => setVoiceAssistantOpen(true)}
              className="btn-icon"
              title="Alexa-Style Productivity Assistant"
              style={{
                backgroundColor: 'var(--surface-peach)',
                color: 'var(--primary-orange)',
                border: '1px solid rgba(232, 117, 50, 0.25)',
              }}
            >
              <Mic size={16} />
            </button>

            {/* Notifications Menu */}
            <NotificationMenu />
          </div>
        </header>

        {/* Global Voice Assistant Modal */}
        <VoiceAssistantModal
          isOpen={voiceAssistantOpen}
          onClose={() => setVoiceAssistantOpen(false)}
        />

        {/* Page Content Viewport */}
        <main className="page-body">
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .mobile-toggle {
            display: inline-flex !important;
          }
          .search-text-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
