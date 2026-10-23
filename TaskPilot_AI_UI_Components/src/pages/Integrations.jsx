import { useState } from 'react'
import { Search, ExternalLink, Check, Plug, CalendarDays, Github, HardDrive, MessageSquare, LayoutGrid, Database } from 'lucide-react'
import { PageHeader, Badge, SearchInput } from '../components/UI'

const seed=[
 {name:'Google Calendar',desc:'Sync events and deadlines.',category:'Productivity',Icon:CalendarDays,color:'google'},
 {name:'Notion',desc:'Connect notes and databases.',category:'Productivity',Icon:LayoutGrid,color:'notion'},
 {name:'Slack',desc:'Receive team notifications.',category:'Communication',Icon:MessageSquare,color:'slack'},
 {name:'GitHub',desc:'Link repositories and issues.',category:'Development',Icon:Github,color:'github'},
 {name:'Google Drive',desc:'Access your cloud files.',category:'Storage',Icon:HardDrive,color:'drive'},
 {name:'Trello',desc:'Import boards and cards.',category:'Productivity',Icon:Database,color:'trello'},
]
export default function Integrations(){
 const [items,setItems]=useState(seed.map(x=>({...x,connected:['Google Calendar','Google Drive'].includes(x.name)}))),[category,setCategory]=useState('All'),[query,setQuery]=useState('')
 const categories=['All','Productivity','Communication','Storage','Development','AI Tools']
 const shown=items.filter(x=>(category==='All'||x.category===category)&&x.name.toLowerCase().includes(query.toLowerCase()))
 return <div className="page-stack"><PageHeader title="Integrations" subtitle="Connect your favorite tools and services."/><div className="integration-toolbar"><div className="tabs">{categories.map(c=><button key={c} className={category===c?'tab-active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><SearchInput placeholder="Search integrations..."/></div>
  <div className="integration-grid">{shown.map(item=><article className="card integration-card" key={item.name}><div className="integration-card-head"><span className={`provider-logo provider-${item.color}`}><item.Icon size={23}/></span>{item.connected&&<Badge tone="success"><Check size={12}/> Connected</Badge>}</div><h3>{item.name}</h3><p>{item.desc}</p><button className={`btn ${item.connected?'btn-connected':'btn-secondary'} full-width`} onClick={()=>alert(`Connect ${item.name} to a real provider OAuth/API flow before enabling this action.`)}>{item.connected?'Manage connection':'Connect'} <ExternalLink size={14}/></button></article>)}</div>
  <div className="notice"><Plug size={17}/><span><strong>Secure by design.</strong> Provider connections require server-side authorization and secure token storage. The displayed connection states are starter UI examples, not verified live connections.</span></div>
 </div>
}
