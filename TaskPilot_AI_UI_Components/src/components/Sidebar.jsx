import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, CalendarDays, Sparkles, NotebookPen,
  Workflow, FolderKanban, Plug, ChartNoAxesCombined, Settings, Send,
  PanelLeftClose, Menu
} from 'lucide-react'

const links = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', Icon: CheckSquare },
  { to: '/calendar', label: 'Calendar', Icon: CalendarDays },
  { to: '/ai-assistant', label: 'AI Assistant', Icon: Sparkles },
  { to: '/notes', label: 'Notes', Icon: NotebookPen },
  { to: '/automation', label: 'Automation', Icon: Workflow },
  { to: '/projects', label: 'Projects', Icon: FolderKanban },
  { to: '/integrations', label: 'Integrations', Icon: Plug },
  { to: '/analytics', label: 'Analytics', Icon: ChartNoAxesCombined },
]

export default function Sidebar({ open, onClose }) {
  return <>
    {open && <button className="mobile-scrim" onClick={onClose} aria-label="Close menu" />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <NavLink to="/dashboard" className="brand" onClick={onClose}>
        <span className="brand-mark"><Send size={18} fill="currentColor" /></span>
        <span>TaskPilot <b>AI</b></span>
      </NavLink>
      <div className="side-caption">WORKSPACE</div>
      <nav className="side-nav">
        {links.map(({to,label,Icon}) => <NavLink key={to} to={to} onClick={onClose} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <Icon size={17} strokeWidth={2} /><span>{label}</span>
        </NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        <NavLink to="/settings" onClick={onClose} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={17} /><span>Settings</span>
        </NavLink>
        <div className="profile-mini">
          <div className="avatar">AM</div>
          <div className="profile-meta"><strong>Abhishek MC</strong><small>Personal workspace</small></div>
          <PanelLeftClose size={16} className="muted" />
        </div>
      </div>
    </aside>
  </>
}
