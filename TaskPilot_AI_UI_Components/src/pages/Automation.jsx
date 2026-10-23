import { useState } from 'react'
import { Mail, CalendarDays, Sparkles, RefreshCw, Bell, Clock3, Plus, Zap, ChevronRight, Play, Pause } from 'lucide-react'
import { PageHeader, Card, Badge } from '../components/UI'

const templates=[['Daily study plan','Generate a daily study plan',Sparkles,'purple'],['Task reminder','Remind me about upcoming tasks',Bell,'orange'],['Project update','Create a weekly progress summary',RefreshCw,'blue']]
const actions=[['Create task','Add a task to your workspace',Plus],['AI action','Run an approved AI step',Sparkles],['Update project','Update project progress',RefreshCw],['Add to calendar','Create a calendar item',CalendarDays],['Notification','Send an in-app notification',Bell],['Delay','Wait before continuing',Clock3]]
export default function Automation(){
 const [workflows,setWorkflows]=useState([{id:1,name:'Overdue task reminder',trigger:'Task becomes overdue',action:'Create in-app notification',enabled:true},{id:2,name:'Daily planning prompt',trigger:'Every morning',action:'Create a planning task',enabled:false}])
 const [selected,setSelected]=useState('Task becomes overdue')
 function add(){setWorkflows(p=>[{id:Date.now(),name:'New workflow',trigger:selected,action:'Create in-app notification',enabled:false},...p])}
 return <div className="page-stack"><PageHeader title="Workflow Automation" subtitle="Automate repetitive tasks with smart workflows." action="New Workflow" onAction={add}/>
  <div className="automation-layout">
   <Card title="Templates" subtitle="Start with a ready-made idea"><div className="template-list">{templates.map(([name,desc,Icon,tone])=><button className="template-item" key={name} onClick={()=>{setWorkflows(p=>[{id:Date.now(),name,trigger:'Scheduled',action:desc,enabled:false},...p])}}><span className={`quick-icon ${tone}-soft`}><Icon size={17}/></span><span><strong>{name}</strong><small>{desc}</small></span><ChevronRight size={15}/></button>)}</div></Card>
   <Card title="Workflow builder" subtitle="Trigger → Condition → Action"><div className="workflow-canvas">
    <div className="workflow-step trigger"><span className="step-icon"><Zap size={16}/></span><div><small>TRIGGER</small><strong>{selected}</strong></div><select value={selected} onChange={e=>setSelected(e.target.value)}><option>Task becomes overdue</option><option>Task is created</option><option>Task status changes</option><option>Scheduled</option></select></div>
    <div className="flow-line"><span/></div><div className="workflow-step condition"><span className="step-icon"><RefreshCw size={16}/></span><div><small>CONDITION</small><strong>Task is not completed</strong></div><Badge tone="success">Required</Badge></div>
    <div className="flow-line"><span/></div><div className="workflow-step action-step"><span className="step-icon"><Bell size={16}/></span><div><small>ACTION</small><strong>Create in-app notification</strong></div><Badge tone="neutral">Selected</Badge></div>
    <button className="btn btn-primary full-width" onClick={add}><Plus size={15}/> Save workflow</button>
   </div></Card>
   <Card title="Available actions" subtitle="Actions available in this UI"><div className="action-grid">{actions.map(([name,desc,Icon])=><div className="available-action" key={name}><span className="action-icon"><Icon size={16}/></span><strong>{name}</strong><small>{desc}</small></div>)}</div></Card>
  </div>
  <Card title="Your workflows" subtitle="Enable or pause your workflow definitions"><div className="workflow-table">{workflows.map(w=><div className="workflow-row" key={w.id}><span className="workflow-status"><span className={w.enabled?'status-live':'status-paused'}/></span><div className="workflow-row-main"><strong>{w.name}</strong><small>{w.trigger} → {w.action}</small></div><Badge tone={w.enabled?'success':'neutral'}>{w.enabled?'Enabled':'Paused'}</Badge><button className="btn btn-secondary" onClick={()=>setWorkflows(p=>p.map(x=>x.id===w.id?{...x,enabled:!x.enabled}:x))}>{w.enabled?<Pause size={14}/>:<Play size={14}/>} {w.enabled?'Pause':'Enable'}</button></div>)}</div><p className="footnote">UI workflow definitions only. Connect the backend scheduler and execution engine before treating these workflows as operational.</p></Card>
 </div>
}
