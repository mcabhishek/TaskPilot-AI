import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: 'var(--text-xs)', color: 'var(--secondary-text)', marginBottom: '0.4rem' }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {item.path && !isLast ? (
              <Link to={item.path} style={{ color: 'var(--secondary-text)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--secondary-text)'}>
                {item.label}
              </Link>
            ) : (
              <span style={{ color: isLast ? 'var(--primary-text)' : 'var(--secondary-text)', fontWeight: isLast ? 600 : 400 }}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight size={12} color="var(--text-muted)" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
      <div>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <h1 className="heading-page">{title}</h1>
        {subtitle && <p style={{ fontSize: 'var(--text-base)', color: 'var(--secondary-text)', marginTop: '0.2rem' }}>{subtitle}</p>}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
}

export function UserAvatar({ name = 'User', size = 32 }) {
  const initial = name ? name.charAt(0).toUpperCase() : 'U';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--soft-peach)',
        color: 'var(--primary-orange)',
        fontWeight: 600,
        fontSize: Math.round(size * 0.42),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border)',
        flexShrink: 0
      }}
    >
      {initial}
    </div>
  );
}
