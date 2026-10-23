import React from 'react';
import { PrimaryButton } from './Button';

export function EmptyState({ icon: Icon, title, description, actionText, onAction, secondaryActionText, onSecondaryAction }) {
  return (
    <div className="card" style={{
      textAlign: 'center',
      padding: '3.5rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      borderStyle: 'dashed'
    }}>
      {Icon && (
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--soft-peach)',
          color: 'var(--primary-orange)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem'
        }}>
          <Icon size={26} />
        </div>
      )}

      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--primary-text)', marginBottom: '0.35rem' }}>
        {title}
      </h3>

      {description && (
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--secondary-text)', maxWidth: 420, marginBottom: actionText ? '1.5rem' : '0' }}>
          {description}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {actionText && (
          <PrimaryButton onClick={onAction}>
            {actionText}
          </PrimaryButton>
        )}
        {secondaryActionText && (
          <button onClick={onSecondaryAction} className="btn-secondary">
            {secondaryActionText}
          </button>
        )}
      </div>
    </div>
  );
}

export function LoadingSkeleton({ count = 3, height = 64 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, width: '100%' }} />
      ))}
    </div>
  );
}
