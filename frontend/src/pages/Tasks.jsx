import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Clock,
  Calendar as CalendarIcon,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdue') === 'true');

  // Expanded subtasks
  const [expandedTasks, setExpandedTasks] = useState(new Set());

  // Task Modal state
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

  const loadData = async () => {
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        api.getTasks({
          status: statusFilter,
          priority: priorityFilter,
          search: searchQuery,
          overdue: overdueOnly ? 'true' : ''
        }),
        api.getProjects()
      ]);
      setTasks(tasksRes);
      setProjects(projectsRes);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, searchQuery, overdueOnly]);

  const toggleSubtasksView = async (taskId) => {
    const next = new Set(expandedTasks);
    if (next.has(taskId)) {
      next.delete(taskId);
      setExpandedTasks(next);
    } else {
      next.add(taskId);
      setExpandedTasks(next);
      // Fetch full task with subtasks if needed
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
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {}
    }

    try {
      await api.updateTask(task.id, { status: nextStatus });
      setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSubtask = async (taskId, subtask) => {
    try {
      const nextCompleted = subtask.is_completed ? 0 : 1;
      await api.updateSubtask(taskId, subtask.id, { is_completed: nextCompleted });
      setTasks(prev => prev.map(t => {
        if (t.id !== taskId || !t.subtasks) return t;
        const updatedSubs = t.subtasks.map(s => s.id === subtask.id ? { ...s, is_completed: nextCompleted } : s);
        return { ...t, subtasks: updatedSubs };
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error(err);
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
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Task Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Organize, prioritize, and track all your actionable deliverables.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn-primary">
          <Plus size={18} /> Create Task
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <input
            type="text"
            placeholder="Search tasks by title or details..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto', minWidth: 120 }}>
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Done</option>
          </select>

          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ width: 'auto', minWidth: 120 }}>
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            style={{
              padding: '0.6rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: overdueOnly ? '#FEE2E2' : '#FFFFFF',
              color: overdueOnly ? '#DC2626' : 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <AlertTriangle size={15} /> Overdue Only
          </button>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--pale-orange)', color: 'var(--primary-orange)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <CheckCircle2 size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>No tasks found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            {searchQuery || statusFilter || priorityFilter ? 'Try clearing your filters to see more tasks.' : 'Create your first task or use AI to generate a complete plan.'}
          </p>
          <button onClick={openCreateModal} className="btn-primary" style={{ display: 'inline-flex' }}>
            <Plus size={16} /> Create Task
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tasks.map(task => {
            const isDone = task.status === 'DONE';
            const isExpanded = expandedTasks.has(task.id);
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;

            return (
              <div
                key={task.id}
                className="card"
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: isDone ? '#FAF9F6' : '#FFFFFF',
                  opacity: isDone ? 0.85 : 1,
                  borderLeft: isOverdue ? '4px solid #EF4444' : (task.project_color ? `4px solid ${task.project_color}` : '1px solid var(--border-color)')
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1 }}>
                    {/* Status Toggle Checkbox */}
                    <button
                      onClick={() => handleToggleStatus(task)}
                      style={{ marginTop: 2, color: isDone ? '#059669' : 'var(--text-muted)' }}
                      title={isDone ? 'Mark as TODO' : 'Mark as DONE'}
                    >
                      {isDone ? <CheckCircle2 size={20} color="#059669" /> : <Circle size={20} />}
                    </button>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.98rem',
                          color: isDone ? 'var(--text-muted)' : 'var(--text-main)',
                          textDecoration: isDone ? 'line-through' : 'none'
                        }}>
                          {task.title}
                        </span>

                        <span className={`badge badge-${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>

                        <span className={`badge badge-${task.status.toLowerCase().replace('_', '')}`}>
                          {task.status.replace('_', ' ')}
                        </span>

                        {task.project_name && (
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--warm-cream)',
                            color: task.project_color || 'var(--primary-orange)',
                            border: '1px solid var(--border-color)'
                          }}>
                            {task.project_name}
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                          {task.description}
                        </p>
                      )}

                      {/* Metadata Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        {task.due_date && (
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: isOverdue ? '#DC2626' : 'var(--text-secondary)',
                            fontWeight: isOverdue ? 700 : 500
                          }}>
                            <CalendarIcon size={14} /> Due: {new Date(task.due_date).toLocaleDateString()}
                            {isOverdue && ' (Overdue!)'}
                          </span>
                        )}

                        {task.estimated_duration && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={14} /> {task.estimated_duration} mins
                          </span>
                        )}

                        {/* Subtasks Count Button */}
                        {(task.subtask_count > 0 || (task.subtasks && task.subtasks.length > 0)) && (
                          <button
                            onClick={() => toggleSubtasksView(task.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: 'var(--primary-orange)',
                              fontWeight: 600
                            }}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {task.completed_subtask_count || 0}/{task.subtask_count || task.subtasks?.length || 0} subtasks
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      onClick={() => openEditModal(task)}
                      title="Edit task"
                      style={{ color: 'var(--text-muted)', padding: '0.4rem' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete task"
                      style={{ color: 'var(--text-muted)', padding: '0.4rem' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Subtasks Accordion */}
                {isExpanded && task.subtasks && (
                  <div style={{
                    marginTop: '0.85rem',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid var(--border-color)',
                    paddingLeft: '2.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem'
                  }}>
                    {task.subtasks.map(sub => (
                      <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <button
                          onClick={() => handleToggleSubtask(task.id, sub)}
                          style={{ color: sub.is_completed ? '#059669' : 'var(--text-muted)' }}
                        >
                          {sub.is_completed ? <CheckCircle2 size={16} color="#059669" /> : <Circle size={16} />}
                        </button>
                        <span style={{
                          fontSize: '0.85rem',
                          color: sub.is_completed ? 'var(--text-muted)' : 'var(--text-main)',
                          textDecoration: sub.is_completed ? 'line-through' : 'none'
                        }}>
                          {sub.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT TASK MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Title *</label>
                <input
                  type="text"
                  placeholder="Task title..."
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Description</label>
                <textarea
                  rows={3}
                  placeholder="Additional context or notes..."
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Priority</label>
                  <select value={formPriority} onChange={e => setFormPriority(e.target.value)}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Status</label>
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
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Due Date</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Est. Duration (Mins)</label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={e => setFormDuration(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Project</label>
                <select value={formProjectId} onChange={e => setFormProjectId(e.target.value)}>
                  <option value="">No Project (Standalone)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Subtasks on create */}
              {!editingTask && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Subtasks</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {formSubtasks.map((sub, idx) => (
                      <input
                        key={idx}
                        type="text"
                        placeholder={`Subtask ${idx + 1}...`}
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
                      style={{ fontSize: '0.8rem', color: 'var(--primary-orange)', fontWeight: 600, textAlign: 'left', alignSelf: 'flex-start' }}
                    >
                      + Add another subtask
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
