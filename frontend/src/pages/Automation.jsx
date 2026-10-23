import React, { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Shield,
  Trash2,
  RefreshCw,
  X
} from 'lucide-react';
import { api } from '../services/api';

export default function Automation() {
  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Workflow Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTrigger, setFormTrigger] = useState('TASK_OVERDUE');
  const [formCondition, setFormCondition] = useState('STATUS_NOT_DONE');
  const [formAction, setFormAction] = useState('CREATE_NOTIFICATION');

  const [testingId, setTestingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const loadData = async () => {
    try {
      const [wfRes, execRes] = await Promise.all([
        api.getWorkflows(),
        api.getWorkflowExecutions()
      ]);
      setWorkflows(wfRes);
      setExecutions(execRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleWorkflow = async (id) => {
    try {
      const res = await api.toggleWorkflow(id);
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, is_active: res.is_active } : w));
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerTest = async (id) => {
    setTestingId(id);
    setStatusMessage('');
    try {
      const res = await api.triggerWorkflowTest(id);
      setStatusMessage(res.message);
      loadData();
    } catch (err) {
      setStatusMessage('Test failed.');
    } finally {
      setTestingId(null);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  const handleScanOverdue = async () => {
    setStatusMessage('');
    try {
      const res = await api.scanOverdue();
      setStatusMessage(res.message);
      loadData();
    } catch (err) {
      setStatusMessage('Overdue scan failed.');
    } finally {
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  const handleDeleteWorkflow = async (id) => {
    if (!window.confirm('Delete this workflow?')) return;
    try {
      await api.deleteWorkflow(id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWorkflow = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      await api.createWorkflow({
        name: formName,
        description: formDesc,
        trigger_type: formTrigger,
        condition_type: formCondition,
        action_type: formAction,
      });
      setIsModalOpen(false);
      setFormName('');
      setFormDesc('');
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
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Zap size={26} color="var(--primary-orange)" /> Workflow Automation Engine
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Event-driven triggers, automated reminders, and duplicate-safe backend workers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleScanOverdue} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
            <RefreshCw size={15} /> Trigger Overdue Scan
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ fontSize: '0.85rem' }}>
            <Plus size={16} /> New Workflow
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#065F46',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} color="#059669" /> {statusMessage}
        </div>
      )}

      {/* Visual Flow Builder Diagram Card */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--warm-cream)', border: '1px solid #FBD4BD' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          Automated Pipeline Architecture
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Every workflow executes through validated state transitions with duplicate prevention and audit logging.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-orange)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              1. Event Trigger
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Task Overdue or Created</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Backend background cron or user mutation</div>
          </div>

          <ArrowRight size={20} color="var(--primary-orange)" style={{ flexShrink: 0 }} />

          <div style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-orange)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              2. Guard Condition
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Status != DONE</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Validates permissions and active rules</div>
          </div>

          <ArrowRight size={20} color="var(--primary-orange)" style={{ flexShrink: 0 }} />

          <div style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-orange)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              3. Authorized Action
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Create In-App Reminder</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Inserts notification and execution audit</div>
          </div>
        </div>
      </div>

      {/* Active Workflows Section */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Configured Workflows ({workflows.length})
        </h2>

        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading automations...</div>
        ) : workflows.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No workflows configured yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {workflows.map(wf => {
              const isActive = wf.is_active === 1;
              return (
                <div
                  key={wf.id}
                  className="card"
                  style={{
                    backgroundColor: isActive ? '#FFFFFF' : '#FAF9F6',
                    borderLeft: `4px solid ${isActive ? 'var(--primary-orange)' : 'var(--border-color)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: isActive ? '#ECFDF5' : '#F3F4F6',
                        color: isActive ? '#059669' : '#6B7280'
                      }}>
                        {isActive ? 'ACTIVE' : 'PAUSED'}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleTriggerTest(wf.id)}
                          disabled={testingId === wf.id}
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                          title="Run manual test event"
                        >
                          <Play size={12} /> {testingId === wf.id ? 'Running...' : 'Test Run'}
                        </button>
                        <button
                          onClick={() => handleDeleteWorkflow(wf.id)}
                          style={{ color: 'var(--text-muted)', padding: '0.35rem' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      {wf.name}
                    </h3>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
                      {wf.description}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', backgroundColor: 'var(--warm-cream)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                      <div><strong>Trigger:</strong> {wf.trigger_type}</div>
                      <div><strong>Condition:</strong> {wf.condition_type}</div>
                      <div><strong>Action:</strong> {wf.action_type}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>Executed {wf.run_count || 0} times</span>
                    <button
                      onClick={() => handleToggleWorkflow(wf.id)}
                      style={{
                        color: isActive ? '#DC2626' : '#059669',
                        fontWeight: 600,
                        fontSize: '0.78rem'
                      }}
                    >
                      {isActive ? 'Pause Workflow' : 'Resume Workflow'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Execution Logs Table */}
      <div className="card">
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Execution History & Audit Trail
        </h2>

        {executions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No executions logged yet. Click "Test Run" above to trigger an automation.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Workflow</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Action Taken</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Executed At</th>
                </tr>
              </thead>
              <tbody>
                {executions.map(ex => (
                  <tr key={ex.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: 4,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: ex.status === 'SUCCESS' ? '#ECFDF5' : '#FEE2E2',
                        color: ex.status === 'SUCCESS' ? '#059669' : '#DC2626'
                      }}>
                        {ex.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {ex.workflow_name || 'Workflow'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                      {ex.action_taken || ex.error_message || 'Completed action'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                      {new Date(ex.executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE WORKFLOW MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Create New Workflow</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Workflow Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Overdue Task Alert..."
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Description</label>
                <textarea
                  rows={2}
                  placeholder="What does this automation do?"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>When this Trigger occurs:</label>
                <select value={formTrigger} onChange={e => setFormTrigger(e.target.value)}>
                  <option value="TASK_OVERDUE">Task reaches due date and is overdue</option>
                  <option value="TASK_CREATED">A new task is created</option>
                  <option value="STATUS_CHANGED">Task status changes</option>
                  <option value="MILESTONE_REACHED">Project milestone completed</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Only if Condition is met:</label>
                <select value={formCondition} onChange={e => setFormCondition(e.target.value)}>
                  <option value="STATUS_NOT_DONE">Task is not marked DONE</option>
                  <option value="PRIORITY_HIGH">Priority is HIGH or URGENT</option>
                  <option value="ALWAYS">Always run (no additional filter)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Then perform this Action:</label>
                <select value={formAction} onChange={e => setFormAction(e.target.value)}>
                  <option value="CREATE_NOTIFICATION">Create in-app notification reminder</option>
                  <option value="CREATE_TASK">Create automated follow-up task</option>
                  <option value="UPDATE_PRIORITY">Elevate task priority to URGENT</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
