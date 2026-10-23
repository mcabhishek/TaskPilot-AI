import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import AIAssistant from './pages/AIAssistant'
import Notes from './pages/Notes'
import Automation from './pages/Automation'
import Projects from './pages/Projects'
import Integrations from './pages/Integrations'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

export default function App() {
  return <Routes>
    <Route path="/" element={<Landing/>}/>
    <Route element={<AppShell/>}>
      <Route path="/dashboard" element={<Dashboard/>}/>
      <Route path="/tasks" element={<Tasks/>}/>
      <Route path="/calendar" element={<Calendar/>}/>
      <Route path="/ai-assistant" element={<AIAssistant/>}/>
      <Route path="/notes" element={<Notes/>}/>
      <Route path="/automation" element={<Automation/>}/>
      <Route path="/projects" element={<Projects/>}/>
      <Route path="/integrations" element={<Integrations/>}/>
      <Route path="/analytics" element={<Analytics/>}/>
      <Route path="/settings" element={<Settings/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
  </Routes>
}
