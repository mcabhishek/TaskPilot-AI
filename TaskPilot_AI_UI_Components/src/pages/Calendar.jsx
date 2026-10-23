import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { PageHeader, Card } from '../components/UI'

const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December']
export default function Calendar() {
 const [month,setMonth]=useState(9),[year,setYear]=useState(2026),[view,setView]=useState('Month'),[selected,setSelected]=useState(23)
 const first=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate()
 function shift(n){let d=new Date(year,month+n,1);setMonth(d.getMonth());setYear(d.getFullYear())}
 const events={8:['DSA Class'],13:['Project Meeting'],16:['UI Design'],18:['Gym'],20:['Research'],22:['Documentation'],23:['Complete OS notes','Project discussion']}
 return <div className="page-stack">
  <PageHeader title="Calendar" subtitle="Plan your day, week, or month." action="Add event" onAction={()=>alert('Connect this action to your event form.')}/>
  <div className="calendar-layout">
   <Card className="calendar-card">
    <div className="calendar-toolbar"><div className="month-controls"><button className="icon-btn" onClick={()=>shift(-1)}><ChevronLeft size={17}/></button><button className="icon-btn" onClick={()=>{setMonth(9);setYear(2026)}}><ChevronRight size={17}/></button><strong>{monthNames[month]} {year}</strong></div><div className="segmented">{['Month','Week','Day'].map(v=><button key={v} onClick={()=>setView(v)} className={view===v?'selected':''}>{v}</button>)}</div></div>
    <div className="calendar-grid">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div className="calendar-weekday" key={d}>{d}</div>)}
    {Array.from({length:first},(_,i)=><div className="calendar-cell blank" key={`b${i}`}/>)}
    {Array.from({length:days},(_,i)=>{const day=i+1;return <button className={`calendar-cell ${selected===day?'selected-day':''} ${day===23&&month===9&&year===2026?'today-cell':''}`} key={day} onClick={()=>setSelected(day)}><span className="calendar-day-number">{day}</span>{(events[day]||[]).slice(0,2).map((e,j)=><span className={`calendar-event event-${j}`} key={e}>{e}</span>)}</button>})}
    </div>
   </Card>
   <Card title={`${monthNames[month]} ${selected}, ${year}`} subtitle="Your schedule">
    <div className="agenda-list">{(events[selected]||[]).map((e,i)=><div className="agenda-item" key={e}><span className={`agenda-dot dot-${i}`}/><div><strong>{e}</strong><small>{i===0?'10:00 AM – 11:00 AM':'1:00 PM – 2:00 PM'}</small></div></div>)}
    {!(events[selected]||[]).length&&<div className="agenda-empty">Nothing scheduled for this day.</div>}</div>
    <button className="btn btn-secondary full-width" onClick={()=>alert('Connect this action to the event form.')}><Plus size={15}/> Add schedule</button>
   </Card>
  </div>
 </div>
}
