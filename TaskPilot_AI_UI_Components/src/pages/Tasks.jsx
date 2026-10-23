import { useMemo, useState } from 'react'
import { Plus, SlidersHorizontal, CalendarDays, Trash2 } from 'lucide-react'
import { PageHeader, Badge, SearchInput, FilterButton, EmptyState } from '../components/UI'

const seed = [
 {id:1,title:'Complete OS notes',priority:'High',status:'In progress',due:'Oct 23, 2026',tone:'high',done:false},
 {id:2,title:'Design dashboard UI',priority:'Medium',status:'In progress',due:'Oct 24, 2026',tone:'medium',done:true},
 {id:3,title:'API integration',priority:'Medium',status:'Todo',due:'Oct 25, 2026',tone:'medium',done:false},
 {id:4,title:'Prepare presentation',priority:'Low',status:'Todo',due:'Oct 26, 2026',tone:'low',done:false},
 {id:5,title:'Read research paper',priority:'Low',status:'Completed',due:'Oct 27, 2026',tone:'low',done:true},
 {id:6,title:'Update documentation',priority:'Medium',status:'Todo',due:'Oct 28, 2026',tone:'medium',done:false},
]
export default function Tasks() {
 const [tasks,setTasks] = useState(seed)
 const [tab,setTab] = useState('All')
 const [query,setQuery] = useState('')
 const [showForm,setShowForm] = useState(false)
 const [title,setTitle] = useState('')
 const [priority,setPriority] = useState('Medium')
 const filtered = useMemo(()=>tasks.filter(t=>{
   const matches = t.title.toLowerCase().includes(query.toLowerCase())
   const tabMatch = tab==='All' || (tab==='Completed' ? t.done : tab==='Today' ? t.due==='Oct 23, 2026'&&!t.done : !t.done&&t.due!=='Oct 23, 2026')
   return matches&&tabMatch
 }),[tasks,query,tab])
 function addTask(e){e.preventDefault();if(!title.trim())return;setTasks(p=>[{id:Date.now(),title:title.trim(),priority,status:'Todo',due:'No due date',tone:priority.toLowerCase(),done:false},...p]);setTitle('');setShowForm(false)}
 return <div className="page-stack">
  <PageHeader title="My Tasks" subtitle="Organize and track your tasks efficiently." action="Add Task" onAction={()=>setShowForm(!showForm)}/>
  {showForm&&<form className="inline-form card" onSubmit={addTask}><input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="What needs to get done?" required/><select value={priority} onChange={e=>setPriority(e.target.value)}><option>High</option><option>Medium</option><option>Low</option></select><button className="btn btn-primary" type="submit">Save task</button><button className="btn btn-secondary" type="button" onClick={()=>setShowForm(false)}>Cancel</button></form>}
  <div className="toolbar"><div className="tabs">{['All','Today','Upcoming','Completed'].map(t=><button key={t} onClick={()=>setTab(t)} className={tab===t?'tab-active':''}>{t} <span>{t==='All'?tasks.length:t==='Completed'?tasks.filter(x=>x.done).length:t==='Today'?tasks.filter(x=>x.due==='Oct 23, 2026'&&!x.done).length:tasks.filter(x=>!x.done&&x.due!=='Oct 23, 2026').length}</span></button>)}</div><div className="toolbar-right"><SearchInput placeholder="Search tasks..."/><FilterButton><SlidersHorizontal size={15}/> Filters</FilterButton></div></div>
  <div className="card table-card"><div className="table-scroll"><table><thead><tr><th className="check-col"></th><th>Task</th><th>Priority</th><th>Status</th><th>Due date</th><th></th></tr></thead><tbody>
   {filtered.map(t=><tr key={t.id}><td><button className={`check-box ${t.done?'checked':''}`} onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,done:!x.done,status:!x.done?'Completed':'Todo'}:x))} aria-label="Complete task">{t.done?'✓':''}</button></td><td><span className={t.done?'task-title task-done':''}>{t.title}</span></td><td><Badge tone={t.tone}>{t.priority}</Badge></td><td><Badge tone={t.done?'success':t.status==='In progress'?'info':'neutral'}>{t.done?'Completed':t.status}</Badge></td><td className="due-cell"><CalendarDays size={14}/>{t.due}</td><td><button className="icon-btn danger-hover" aria-label="Delete task" onClick={()=>setTasks(p=>p.filter(x=>x.id!==t.id))}><Trash2 size={15}/></button></td></tr>)}
  </tbody></table>{filtered.length===0&&<EmptyState title="No tasks found" text="Try another search or create a task."/ >}</div></div>
  <p className="footnote">UI starter data is local to this browser session. Connect the task service to persist records in PostgreSQL.</p>
 </div>
}
