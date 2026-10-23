import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Clock,
  Calendar as CalendarIcon,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FolderKanban,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { PrimaryButton, SecondaryButton, IconButton } from '../components/common/Button';
import { PriorityBadge, StatusBadge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { SearchInput, FilterBar } from '../components/common/SearchInput';
import { Modal, ConfirmationDialog } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

export default function Tasks() {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'ALL' | 'TODAY' | 'UPCOMING' | 'IN_PROGRESS' | 'DONE'
  const [activeTab, setActiveTab] = useState('ALL');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Expanded subtasks
  const [expandedTasks, setExpandedTasks] = useState(new Set());

  // Task Modal (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('action') === 'new');
  const [editingTask, setEditingTask] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState('MEDIUM');
  const [formStatus, setFormStatus] = useState('TODO');
  const [formDueDate, setFormDueDate] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formDuration, setFormDuration] = useState('45');
  const [formSubtasks, setFormSubtasks] = useState(['']);

  // Delete dialog
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  const loadData = async () => {
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        api.getTasks({
          search: searchQuery,
          priority: priorityFilter,
          projectId: projectFilter,
        }),
        api.getProjects()
      ]);
      setTasks(tasksRes);
      setProjects(projectsRes);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, priorityFilter, projectFilter]);

  // Tab Filtering
  const filteredTasks = tasks.filter(task => {
    const isDone = task.status === 'DONE';
    const isToday = task.due_date && new Date(task.due_date).toDateString() === new Date().toDateString();
    const isUpcoming = task.due_date && new Date(task.due_date) > new Date() && !isDone;

    if (activeTab === 'TODAY') return isToday && !isDone;
    if (activeTab === 'UPCOMING') return isUpcoming;
    if (activeTab === 'IN_PROGRESS') return task.status === 'IN_PROGRESS';
    if (activeTab === 'DONE') return isDone;
    return true; // 'ALL'
  });

  const toggleSubtasksView = async (taskId) => {
    const next = new Set(expandedTasks);
    if (next.has(taskId)) {
      next.delete(taskId);
      setExpandedTasks(next);
    } else {
      next.add(taskId);
      setExpandedTasks(next);
      try {
        const details = await api.getTaskById(taskId);
        setTasks(prev => prev.map(t => (t.id === taskId ? details : t)));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    if (nextStatus === 'DONE') {
      confetti({ particleCount: 50, spread: 60 });
      toast.success(`Completed "${task.title}"`);
    } else {
      toast.info(`Reopened "${task.title}"`);
    }

    try {
      await api.updateTask(task.id, { status: nextStatus });
      setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    } catch (err) {
      toast.error('Failed to update task status');
    }
  };

  const handleToggleSubtask = async (taskId, subtask) => {
    const nextCompleted = subtask.is_completed ? 0 : 1;
    try {
      await api.updateSubtask(taskId, subtask.id, { is_completed: nextCompleted });
      setTasks(prev => prev.map(t => {
        if (t.id !== taskId || !t.subtasks) return t;
        const updatedSubs = t.subtasks.map(s => s.id === subtask.id ? { ...s, is_completed: nextCompleted } : s);
        return { ...t, subtasks: updatedSubs };
      }));
    } catch (err) {
      toast.error('Failed to update subtask');
    }
  };

  const confirmDeleteTask = async () => {
    if (!deletingTaskId) return;
    try {
      await api.deleteTask(deletingTaskId);
      setTasks(prev => prev.filter(t => t.id !== deletingTaskId));
      toast.success('Task removed');
    } catch (err) {
      toast.error('Failed to delete task');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormPriority('MEDIUM');
    setFormStatus('TODO');
    setFormDueDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    setFormProjectId('');
    setFormDuration('45');
    setFormSubtasks(['']);
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description || '');
    setFormPriority(task.priority);
    setFormStatus(task.status);
    setFormDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
    setFormProjectId(task.project_id || '');
    setFormDuration(task.estimated_duration ? String(task.estimated_duration) : '45');
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, {
          title: formTitle,
          description: formDesc,
          priority: formPriority,
          status: formStatus,
          due_date: formDueDate ? new Date(formDueDate).toISOString() : null,
          project_id: formProjectId || null,
          estimated_duration: Number(formDuration) || null,
        });
        toast.success('Task updated');
      } else {
        const validSubs = formSubtasks.filter(s => s.trim().length > 0).map(title => ({ title }));
        await api.createTask({
          title: formTitle,
          description: formDesc,
          priority: formPriority,
          status: formStatus,
          due_date: formDueDate ? new Date(formDueDate).toISOString() : null,
          project_id: formProjectId || null,
          estimated_duration: Number(formDuration) || null,
          subtasks: validSubs,
        });
        toast.success('Task created');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error saving task');
    }
  };

  const tabs = [
    { id: 'ALL', label: 'All Tasks', count: tasks.length },
    { id: 'TODAY', label: 'Today', count: tasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString() && t.status !== 'DONE').length },
    { id: 'UPCOMING', label: 'Upcoming', count: tasks.filter(t => t.due_date && new Date(t.due_date) > new Date() && t.status !== 'DONE').length },
    { id: 'IN_PROGRESS', label: 'In Progress', count: tasks.filter(t => t.status === 'IN_PROGRESS').length },
    { id: 'DONE', label: 'Completed', count: tasks.filter(t => t.status === 'DONE').length },
  ];

  return (
    <div>
      <PageHeader
        title="My Tasks"
        subtitle="Organize, prioritize, and track all deliverables across your workspace."
        actions={
          <PrimaryButton onClick={openCreateModal} icon={Plus}>
            New Task
          </PrimaryButton>
        }
      />

      {/* Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        borderBottom: '1px solid var(--border)',
        marginBottom: '1.25rem',
        overflowX: 'auto'
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.65rem 0.95rem',
                fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--primary-orange)' : 'var(--secondary-text)',
                borderBottom: isActive ? '2px solid var(--primary-orange)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: 'var(--text-xs)',
                padding: '0.1rem 0.4rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isActive ? 'var(--soft-peach)' : 'var(--surface-secondary)',
                color: isActive ? 'var(--primary-orange)' : 'var(--text-muted)'
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <FilterBar>
        <SearchInput
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          placeholder="Search deliverables by name or description..."
          style={{ flex: 1, minWidth: 200, maxWidth: 380 }}
        />

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            style={{ width: 'auto', minWidth: 120, fontSize: 'var(--text-xs)' }}
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            style={{ width: 'auto', minWidth: 140, fontSize: 'var(--text-xs)' }}
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </FilterBar>

      {/* Task List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading deliverables...</div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={searchQuery || priorityFilter || projectFilter ? 'No matching tasks' : 'No tasks in this view'}
          description={searchQuery || priorityFilter ? 'Try clearing your active filters to display more deliverables.' : 'Create your first task or use the AI Goal Planner to build a complete roadmap.'}
          actionText="Create new task"
          onAction={openCreateModal}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {filteredTasks.map(task => {
            const isDone = task.status === 'DONE';
            const isExpanded = expandedTasks.has(task.id);
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;

            return (
              <Card
                key={task.id}
                style={{
                  padding: '0.95rem 1.15rem',
                  backgroundColor: isDone ? 'var(--surface-secondary)' : 'var(--surface-primary)',
                  borderLeft: isOverdue ? '3px solid var(--error)' : (task.project_color ? `3px solid ${task.project_color}` : '1px solid var(--border)'),
                  opacity: isDone ? 0.8 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  
                  {/* Left: Checkbox + Content */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, overflow: 'hidden' }}>
                    <button
                      onClick={() => handleToggleStatus(task)}
                      style={{ marginTop: 2, color: isDone ? 'var(--success)' : 'var(--text-muted)' }}
                      title={isDone ? 'Mark as to do' : 'Mark as done'}
                    >
                      {isDone ? <CheckCircle2 size={19} color="var(--success)" /> : <Circle size={19} />}
                    </button>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontWeight: 600,
                          fontSize: 'var(--text-base)',
                          color: isDone ? 'var(--text-muted)' : 'var(--primary-text)',
                          textDecoration: isDone ? 'line-through' : 'none'
                        }}>
                          {task.title}
                        </span>

                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />

                        {task.project_name && (
                          <span style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 500,
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--surface-secondary)',
                            color: task.project_color || 'var(--primary-orange)',
                            border: '1px solid var(--border-subtle)'
                          }}>
                            {task.project_name}
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', marginTop: '0.3rem', lineHeight: 1.45 }}>
                          {task.description}
                        </p>
                      )}

                      {/* Metadata Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.55rem', fontSize: 'var(--text-xs)', color: 'var(--secondary-text)', flexWrap: 'wrap' }}>
                        {task.due_date && (
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: isOverdue ? 'var(--error)' : 'var(--secondary-text)',
                            fontWeight: isOverdue ? 600 : 400
                          }}>
                            <CalendarIcon size={13} />
                            Due: {new Date(task.due_date).toLocaleDateString()}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        )}

                        {task.estimated_duration && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={13} /> {task.estimated_duration} mins
                          </span>
                        )}

                        {/* Subtasks Accordion Button */}
                        {(task.subtask_count > 0 || (task.subtasks && task.subtasks.length > 0)) && (
                          <button
                            onClick={() => toggleSubtasksView(task.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: 'var(--primary-orange)',
                              fontWeight: 600,
                              fontSize: 'var(--text-xs)'
                            }}
                          >
                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            {task.completed_subtask_count || 0}/{task.subtask_count || task.subtasks?.length || 0} subtasks
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <IconButton
                      icon={Edit2}
                      title="Edit task"
                      size={15}
                      onClick={() => openEditModal(task)}
                    />
                    <IconButton
                      icon={Trash2}
                      title="Delete task"
                      size={15}
                      onClick={() => setDeletingTaskId(task.id)}
                    />
                  </div>
                </div>

                {/* Subtasks Expandable Checklist */}
                {isExpanded && task.subtasks && (
                  <div style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingLeft: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}>
                    {task.subtasks.map(sub => (
                      <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <button
                          onClick={() => handleToggleSubtask(task.id, sub)}
                          style={{ color: sub.is_completed ? 'var(--success)' : 'var(--text-muted)' }}
                        >
                          {sub.is_completed ? <CheckCircle2 size={15} color="var(--success)" /> : <Circle size={15} />}
                        </button>
                        <span style={{
                          fontSize: 'var(--text-sm)',
                          color: sub.is_completed ? 'var(--text-muted)' : 'var(--primary-text)',
                          textDecoration: sub.is_completed ? 'line-through' : 'none'
                        }}>
                          {sub.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT TASK MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Edit Deliverable' : 'Create Deliverable'}
      >
        <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Title *</label>
            <input
              type="text"
              placeholder="e.g. Implement schema migration for analytics"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Description</label>
            <textarea
              rows={3}
              placeholder="Context, specifications, or reference links..."
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Priority</label>
              <select value={formPriority} onChange={e => setFormPriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Status</label>
              <select value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Due Date</label>
              <input
                type="date"
                value={formDueDate}
                onChange={e => setFormDueDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Est. Duration (mins)</label>
              <input
                type="number"
                value={formDuration}
                onChange={e => setFormDuration(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Project</label>
            <select value={formProjectId} onChange={e => setFormProjectId(e.target.value)}>
              <option value="">No Project (Standalone Task)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Subtasks on Creation */}
          {!editingTask && (
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Subtasks checklist</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {formSubtasks.map((sub, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`Step ${idx + 1}...`}
                    value={sub}
                    onChange={e => {
                      const updated = [...formSubtasks];
                      updated[idx] = e.target.value;
                      setFormSubtasks(updated);
                    }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setFormSubtasks([...formSubtasks, ''])}
                  style={{ fontSize: 'var(--text-xs)', color: 'var(--primary-orange)', fontWeight: 600, textAlign: 'left', alignSelf: 'flex-start', marginTop: '0.2rem' }}
                >
                  + Add another subtask
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <SecondaryButton onClick={() => setIsModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit">
              {editingTask ? 'Save Changes' : 'Create Task'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Task Deletion */}
      <ConfirmationDialog
        isOpen={Boolean(deletingTaskId)}
        onClose={() => setDeletingTaskId(null)}
        onConfirm={confirmDeleteTask}
        title="Delete Deliverable"
        message="Are you sure you want to permanently delete this task? This action cannot be undone."
        confirmText="Delete"
        destructive={true}
      />
    </div>
  );
}
