import { useMemo, useState } from 'react'
import { Plus, Search, FileText, BookOpen, BriefcaseBusiness, UserRound, FlaskConical, Save, Sparkles } from 'lucide-react'
import { PageHeader, Badge, EmptyState } from '../components/UI'

const seed=[
 {id:1,title:'Data Structures Notes',category:'Study',date:'Oct 23',body:'## 1. Arrays\n\nAn array is a linear data structure that stores elements of the same type in contiguous memory locations.\n\n### Key properties\n- Constant-time indexed access\n- Fixed size in many languages\n- Efficient iteration'},
 {id:2,title:'Spring Boot Notes',category:'Projects',date:'Oct 20',body:'## Spring Boot\n\nA framework for building Java applications with sensible defaults and auto-configuration.'},
 {id:3,title:'MCA Exam Preparation',category:'Personal',date:'Oct 18',body:'## Revision plan\n\nReview core topics, solve practice questions, and reserve time for mock tests.'},
 {id:4,title:'Research Papers',category:'Research',date:'Oct 08',body:'## Research reading\n\nRecord the paper question, method, dataset, results and limitations.'},
]
const cats=[['All Notes',FileText],['Study',BookOpen],['Projects',BriefcaseBusiness],['Personal',UserRound],['Research',FlaskConical]]
export default function Notes(){
 const [notes,setNotes]=useState(seed),[active,setActive]=useState(1),[category,setCategory]=useState('All Notes'),[query,setQuery]=useState('')
 const current=notes.find(n=>n.id===active)
 const filtered=useMemo(()=>notes.filter(n=>(category==='All Notes'||n.category===category)&&n.title.toLowerCase().includes(query.toLowerCase())),[notes,category,query])
 function update(field,value){setNotes(p=>p.map(n=>n.id===active?{...n,[field]:value}:n))}
 function create(){const n={id:Date.now(),title:'Untitled note',category:'Personal',date:'Just now',body:''};setNotes(p=>[n,...p]);setActive(n.id);setCategory('All Notes')}
 return <div className="page-stack"><PageHeader title="Notes" subtitle="Organize your ideas, study notes, and documents." action="New Note" onAction={create}/>
  <div className="notes-layout card">
   <aside className="notes-categories"><h4>Categories</h4>{cats.map(([label,Icon])=><button key={label} onClick={()=>setCategory(label)} className={category===label?'category-active':''}><Icon size={15}/>{label}<span>{label==='All Notes'?notes.length:notes.filter(n=>n.category===label).length}</span></button>)}</aside>
   <section className="notes-list"><label className="search-input"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search notes..."/></label>{filtered.map(n=><button key={n.id} className={`note-list-item ${active===n.id?'note-selected':''}`} onClick={()=>setActive(n.id)}><span className="note-file-icon"><FileText size={17}/></span><span><strong>{n.title}</strong><small>{n.category} · {n.date}</small></span></button>)}{!filtered.length&&<p className="muted pad-sm">No matching notes.</p>}</section>
   <section className="note-editor">{current?<><div className="editor-toolbar"><Badge tone="neutral">{current.category}</Badge><button className="btn btn-secondary" onClick={()=>alert('Connect this action to your AI provider.')}><Sparkles size={14}/> AI help</button><button className="icon-btn" onClick={()=>alert('Connect note persistence to the backend.')} aria-label="Save note"><Save size={16}/></button></div><input className="note-title-input" value={current.title} onChange={e=>update('title',e.target.value)} aria-label="Note title"/><div className="note-meta">Last edited {current.date}</div><textarea className="note-body-input" value={current.body} onChange={e=>update('body',e.target.value)} aria-label="Note content" placeholder="Start writing your note..."/><div className="editor-footer">Markdown supported in the connected editor · Changes currently stay in this UI session.</div></>:<EmptyState title="Select a note" text="Choose a note or create a new one."/>}</section>
  </div>
 </div>
}
