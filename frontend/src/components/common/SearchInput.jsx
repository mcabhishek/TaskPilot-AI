import React from 'react';
import { Search, X } from 'lucide-react';

export function SearchInput({ value, onChange, placeholder = 'Search...', onClear, style = {}, className = '' }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', ...style }} className={className}>
      <Search
        size={15}
        color="var(--text-muted)"
        style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none' }}
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ paddingLeft: '2.25rem', paddingRight: value ? '2rem' : '0.85rem' }}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          style={{ position: 'absolute', right: '0.65rem', color: 'var(--text-muted)', display: 'flex' }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function FilterBar({ children, className = '', style = {} }) {
  return (
    <div
      className={`card ${className}`}
      style={{
        padding: '0.85rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        flexWrap: 'wrap',
        ...style
      }}
    >
      {children}
    </div>
  );
}
