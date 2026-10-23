import { useState } from 'react'
import { Sparkles, Send, CalendarDays, NotebookPen, BookOpen, Brain, ListChecks, WandSparkles, Bot } from 'lucide-react'
import { PageHeader, Card } from '../components/UI'

const suggestions=[
 {label:'Plan my study schedule',Icon:CalendarDays,prompt:'Help me create a realistic study schedule for this week.'},
 {label:'Summarize notes',Icon:NotebookPen,prompt:'Help me summarize my notes into key points.'},
 {label:'Explain a concept',Icon:BookOpen,prompt:'Explain a difficult concept in simple terms.'},
 {label:'Generate a quiz',Icon:Brain,prompt:'Create a short practice quiz for my revision.'},
 {label:'Break down this task',Icon:ListChecks,prompt:'Break a large task into smaller actionable steps.'},
 {label:'Improve writing',Icon:WandSparkles,prompt:'Help me improve a piece of writing.'},
]
export default function AIAssistant(){
 const [input,setInput]=useState(''),[messages,setMessages]=useState([])
 function send(text=input){if(!text.trim())return;setMessages(p=>[...p,{role:'user',text:text.trim()},{role:'assistant',text:'This UI is ready to connect to your configured AI backend. Once connected, TaskPilot AI can return a structured plan for you to review and approve before creating tasks.'}]);setInput('')}
 return <div className="page-stack ai-page">
  <PageHeader title="AI Assistant" subtitle="Your intelligent productivity companion."/>
  <div className="assistant-workspace">
   <div className="assistant-welcome"><div className="bot-orb"><Bot size={30}/><Sparkles size={15}/></div><span className="eyebrow orange-eyebrow">YOUR PRODUCTIVITY PARTNER</span><h2>Hi Abhishek! How can I help you today?</h2><p>Tell me what you're working on. I'll help you turn it into a clear plan.</p></div>
   {messages.length===0?<div className="suggestion-grid">{suggestions.map(({label,Icon,prompt})=><button className="suggestion-card" key={label} onClick={()=>send(prompt)}><span className="suggestion-icon"><Icon size={18}/></span><strong>{label}</strong><span className="suggestion-arrow">↗</span></button>)}</div>:<div className="chat-messages">{messages.map((m,i)=><div key={i} className={`chat-message ${m.role}`}>{m.role==='assistant'&&<span className="chat-avatar"><Sparkles size={15}/></span>}<p>{m.text}</p></div>)}</div>}
   <form className="chat-composer" onSubmit={e=>{e.preventDefault();send()}}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask anything about your work..." aria-label="Message the AI assistant"/><button type="button" className="icon-btn" aria-label="Attach file" onClick={()=>alert('File upload can be added when backend storage is configured.')}>＋</button><button className="send-btn" type="submit" aria-label="Send message"><Send size={17}/></button></form>
   <small className="ai-disclaimer">Review AI suggestions before saving or taking action. AI responses can be inaccurate.</small>
  </div>
 </div>
}
