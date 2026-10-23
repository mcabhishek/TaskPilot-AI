import { Bell, Search, Menu, Plus } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const titles = {
  '/dashboard':'Dashboard', '/tasks':'My Tasks', '/calendar':'Calendar',
  '/ai-assistant':'AI Assistant', '/notes':'Notes', '/automation':'Workflow Automation',
  '/projects':'Projects', '/integrations':'Integrations', '/analytics':'Analytics', '/settings':'Settings'
}
export default function Topbar({ onMenu }) {
  const location = useLocation()
  const title = titles[location.pathname] || 'Dashboard'
  return <header className="topbar">
    <button className="icon-btn mobile-menu" onClick={onMenu} aria-label="Open navigation"><Menu size={19}/></button>
    <div className="crumb"><span>Workspace</span><b>/</b><strong>{title}</strong></div>
    <div className="top-actions">
      <label className="global-search"><Search size={16}/><input placeholder="Search tasks, notes, projects..." /></label>
      <button className="icon-btn" aria-label="Notifications"><Bell size={18}/><i className="notification-dot"/></button>
      <div className="avatar avatar-small">AM</div>
    </div>
  </header>
}
