import React from 'react';
import { Loader2 } from 'lucide-react';

export function PrimaryButton({ children, icon: Icon, loading, disabled, className = '', ...props }) {
  return (
    <button
      className={`btn-primary ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon && <Icon size={16} />}
      <span>{children}</span>
    </button>
  );
}

export function SecondaryButton({ children, icon: Icon, loading, disabled, className = '', ...props }) {
  return (
    <button
      className={`btn-secondary ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon && <Icon size={16} />}
      <span>{children}</span>
    </button>
  );
}

export function GhostButton({ children, icon: Icon, className = '', ...props }) {
  return (
    <button className={`btn-ghost ${className}`} {...props}>
      {Icon && <Icon size={16} />}
      <span>{children}</span>
    </button>
  );
}

export function IconButton({ icon: Icon, title, className = '', size = 16, ...props }) {
  return (
    <button className={`btn-icon ${className}`} title={title} aria-label={title} {...props}>
      {Icon && <Icon size={size} />}
    </button>
  );
}
