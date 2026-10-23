import { useState } from 'react'
import { Check, Clock3, CircleAlert, CircleCheck, Plus, Sparkles, NotebookPen, FolderKanban, ArrowUpRight, Play, Pause, RotateCcw } from 'lucide-react'
import { Card, Badge, PageHeader, EmptyState } from '../components/UI'

const initialTasks = [
  {id:1,title:'Complete OS notes',priority:'High',tone:'high',time:'10:00 AM',done:false},
  {id:2,title:'UI design review',priority:'Medium',tone:'medium',time:'1:00 PM',done:true},
  {id:3,title:'Project documentation',priority:'Low',tone:'low',time:'3:30 PM',done:false},
  {id:4,title:'Weekly planning',priority:'Medium',tone:'medium',time:'5:00 PM',done:false},
]
export default function Dashboard() {
  const [tasks,setTasks] = useState(initialTasks)
  const [seconds,setSeconds] = useState(25*60)
  const [running,setRunning] = useState(false)
  const done = tasks.filter(t=>t.done).length
  const fmt = n => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`
  return <div className="page-stack">
    <PageHeader title="Good afternoon, Abhishek! 👋" subtitle="Here's your productivity overview for today." />
    <div className="stats-grid">
      <div className="stat-card"><span className="stat-icon stat-blue"><Check size={18}/></span><div><strong>{tasks.length+8}</strong><span>Total tasks</span></div><small className="stat-foot">In your workspace</small></div>
      <div className="stat-card"><span className="stat-icon stat-green"><CircleCheck size={18}/></span><div><strong>{done+7}</strong><span>Completed</span></div><small className="stat-foot">This week</small></div>
      <div className="stat-card"><span className="stat-icon stat-orange"><Clock3 size={18}/></span><div><strong>{tasks.length-done}</strong><span>In progress</span></div><small className="stat-foot">Needs attention</small></div>
      <div className="stat-card"><span className="stat-icon stat-red"><CircleAlert size={18}/></span><div><strong>1</strong><span>Overdue</span></div><small className="stat-foot">Review deadline</small></div>
    </div>
    <div className="dashboard-grid">
      <Card title="Today's Tasks" subtitle="Your focus for the day" action="View all">
        <div className="task-list">
          {tasks.map(task=><div className={`task-row ${task.done?'task-done':''}`} key={task.id}>
            <button className={`check-box ${task.done?'checked':''}`} onClick={()=>setTasks(prev=>prev.map(t=>t.id===task.id?{...t,done:!t.done}:t))} aria-label="Toggle task">{task.done&&<Check size={13}/>}</button>
            <span className="task-title">{task.title}</span><Badge tone={task.tone}>{task.priority}</Badge><time>{task.time}</time>
          </div>)}
        </div>
      </Card>
      <Card title="Focus timer" subtitle="One thing at a time">
        <div className="timer-wrap"><div className="timer-ring"><div><strong>{fmt(seconds)}</strong><small>FOCUS SESSION</small></div></div>
          <div className="timer-actions"><button className="btn btn-primary" onClick={()=>setRunning(!running)}>{running?<Pause size={15}/>:<Play size={15}/>} {running?'Pause':'Start focus'}</button><button className="icon-btn" onClick={()=>{setSeconds(1500);setRunning(false)}} aria-label="Reset timer"><RotateCcw size={16}/></button></div>
          <div className="timer-presets"><button onClick={()=>setSeconds(1500)}>Pomodoro</button><button onClick={()=>setSeconds(300)}>Short break</button><button onClick={()=>setSeconds(900)}>Long break</button></div>
        </div>
      </Card>
      <Card title="Quick actions" subtitle="Get started in a few clicks" className="span-2">
        <div className="quick-actions">
          <a href="/tasks" className="quick-action"><span className="quick-icon orange-soft"><Plus/></span><span><strong>New task</strong><small>Create a task quickly</small></span><ArrowUpRight size={15}/></a>
          <a href="/ai-assistant" className="quick-action"><span className="quick-icon purple-soft"><Sparkles/></span><span><strong>Ask AI</strong><small>Get instant help</small></span><ArrowUpRight size={15}/></a>
          <a href="/notes" className="quick-action"><span className="quick-icon blue-soft"><NotebookPen/></span><span><strong>New note</strong><small>Write something</small></span><ArrowUpRight size={15}/></a>
          <a href="/projects" className="quick-action"><span className="quick-icon green-soft"><FolderKanban/></span><span><strong>New project</strong><small>Start a project</small></span><ArrowUpRight size={15}/></a>
        </div>
      </Card>
      <Card title="A small reminder" className="quote-card"><p>“Small steps every day lead to big results.”</p><span>Make today count.</span></Card>
    </div>
  </div>
}
