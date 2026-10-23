import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  return <div className="app-shell">
    <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    <div className="app-main">
      <Topbar onMenu={() => setMenuOpen(true)} />
      <main className="page-content"><Outlet /></main>
    </div>
  </div>
}
