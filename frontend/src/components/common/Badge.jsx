import React from 'react';
import { AlertCircle, Clock, CheckCircle2, MinusCircle, AlertTriangle } from 'lucide-react';

export function PriorityBadge({ priority = 'MEDIUM' }) {
  const p = priority?.toUpperCase() || 'MEDIUM';

  const icons = {
    URGENT: AlertCircle,
    HIGH: AlertTriangle,
    MEDIUM: Clock,
    LOW: MinusCircle,
  };

  const Icon = icons[p] || Clock;

  return (
    <span className={`badge badge-${p.toLowerCase()}`}>
      <Icon size={12} />
      <span>{p}</span>
    </span>
  );
}

export function StatusBadge({ status = 'TODO' }) {
  const s = status?.toUpperCase() || 'TODO';
  const labelMap = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    BLOCKED: 'Blocked',
    DONE: 'Completed',
  };

  const classNameMap = {
    TODO: 'badge-todo',
    IN_PROGRESS: 'badge-progress',
    BLOCKED: 'badge-blocked',
    DONE: 'badge-done',
  };

  return (
    <span className={`badge ${classNameMap[s] || 'badge-todo'}`}>
      <span>{labelMap[s] || s}</span>
    </span>
  );
}
