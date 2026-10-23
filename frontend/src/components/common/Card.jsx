import React from 'react';

export function Card({ children, className = '', interactive = false, style = {}, ...props }) {
  return (
    <div
      className={`card ${interactive ? 'card-interactive' : ''} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, subtext, icon: Icon, color = 'var(--primary-orange)', trend }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '1.15rem' }}>
      <div>
        <div className="text-label" style={{ marginBottom: '0.35rem' }}>{label}</div>
        <div className="text-metric">{value}</div>
        {subtext && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {subtext}
          </div>
        )}
      </div>

      {Icon && (
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--surface-secondary)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          flexShrink: 0
        }}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );
}
