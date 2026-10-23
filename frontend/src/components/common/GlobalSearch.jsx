import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, CheckSquare, Calendar, FolderKanban, FileText, Zap, BarChart3, Settings, X, ArrowRight } from 'lucide-react';

export function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const searchItems = [
    { name: 'Dashboard', path: '/dashboard', icon: BarChart3, category: 'Navigation' },
    { name: 'My Tasks', path: '/tasks', icon: CheckSquare, category: 'Work' },
    { name: 'AI Assistant', path: '/ai', icon: Sparkles, category: 'Intelligence' },
    { name: 'Calendar & Agenda', path: '/calendar', icon: Calendar, category: 'Scheduling' },
    { name: 'Projects & Milestones', path: '/projects', icon: FolderKanban, category: 'Work' },
    { name: 'Notes & Knowledge', path: '/notes', icon: FileText, category: 'Knowledge' },
    { name: 'Automation Engine', path: '/automation', icon: Zap, category: 'Workflows' },
    { name: 'Analytics & Focus', path: '/analytics', icon: BarChart3, category: 'Reports' },
    { name: 'Settings & Security', path: '/settings', icon: Settings, category: 'Preferences' },
  ];

  const filtered = query.trim()
    ? searchItems.filter(item => item.name.toLowerCase().includes(query.toLowerCase()) || item.category.toLowerCase().includes(query.toLowerCase()))
    : searchItems;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 520, padding: 0, overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1.15rem', borderBottom: '1px solid var(--border)' }}>
          <Search size={18} color="var(--text-muted)" style={{ marginRight: '0.65rem' }} />
          <input
            type="text"
            autoFocus
            placeholder="Type a page, command, or shortcut..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ border: 'none', boxShadow: 'none', padding: 0, fontSize: 'var(--text-md)', background: 'transparent' }}
          />
          <button onClick={onClose} style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ maxHeight: 340, overflowY: 'auto', padding: '0.5rem' }}>
          <div style={{ padding: '0.35rem 0.65rem', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Quick Jump
          </div>
          {filtered.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  onClose();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                  transition: 'background-color 150ms ease'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={16} color="var(--primary-orange)" />
                  <span style={{ fontSize: 'var(--text-base)', color: 'var(--primary-text)', fontWeight: 500 }}>{item.name}</span>
                </div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{item.category}</span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: '0.65rem 1rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface-secondary)', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <span>Navigation shortcut</span>
          <span>Press <strong>ESC</strong> to close</span>
        </div>
      </div>
    </div>
  );
}
