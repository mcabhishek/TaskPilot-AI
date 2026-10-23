import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from './Button';

export function Modal({ isOpen, onClose, title, children, maxWidth = 580 }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth, padding: '1.75rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--primary-text)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-muted)', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmationDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', destructive = false }) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={440}>
      <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
        {destructive && (
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--error-bg)',
            color: 'var(--error)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={18} />
          </div>
        )}
        <p style={{ color: 'var(--secondary-text)', fontSize: 'var(--text-base)', lineHeight: 1.5 }}>
          {message}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <SecondaryButton onClick={onClose}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          onClick={() => {
            onConfirm();
            onClose();
          }}
          style={{ backgroundColor: destructive ? 'var(--error)' : 'var(--primary-orange)' }}
        >
          {confirmText}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
