import { Plus, Search, ChevronDown, ArrowUpRight, MoreHorizontal, Check } from 'lucide-react'

export function PageHeader({title, subtitle, action, onAction, actionIcon=true}) {
  return <div className="page-header">
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {action && <button className="btn btn-primary" onClick={onAction}>{actionIcon && <Plus size={16}/>} {action}</button>}
  </div>
}
export function Card({title, subtitle, action, children, className=''}) {
  return <section className={`card ${className}`}>
    {(title || action) && <div className="card-head"><div>{title && <h3>{title}</h3>}{subtitle && <p>{subtitle}</p>}</div>{action && <button className="text-action">{action} <ArrowUpRight size={14}/></button>}</div>}
    {children}
  </section>
}
export function Badge({children, tone='neutral'}) { return <span className={`badge badge-${tone}`}>{children}</span> }
export function EmptyState({title='Nothing here yet', text='Create your first item to get started.'}) {
  return <div className="empty-state"><div className="empty-icon"><Check size={20}/></div><strong>{title}</strong><p>{text}</p></div>
}
export function SearchInput({placeholder='Search...'}) { return <label className="search-input"><Search size={16}/><input placeholder={placeholder}/></label> }
export function FilterButton({children='Filters'}) { return <button className="btn btn-secondary">{children}<ChevronDown size={15}/></button> }
export function MoreButton() { return <button className="icon-btn" aria-label="More options"><MoreHorizontal size={18}/></button> }
