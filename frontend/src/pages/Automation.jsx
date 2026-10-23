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
  Sliders,
  Bell,
  CheckSquare
} from 'lucide-react';
import { api } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { PrimaryButton, SecondaryButton, IconButton } from '../components/common/Button';
import { Card, StatCard } from '../components/common/Card';
import { Modal, ConfirmationDialog } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

export default function Automation() {
  const toast = useToast();
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
  const [scanning, setScanning] = useState(false);
  const [deletingWfId, setDeletingWfId] = useState(null);

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
      toast.error('Failed to load workflow automations');
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
      toast.info(res.is_active ? 'Workflow activated' : 'Workflow paused');
    } catch (err) {
      toast.error('Failed to toggle workflow status');
    }
  };

  const handleTriggerTest = async (id) => {
    setTestingId(id);
    try {
      const res = await api.triggerWorkflowTest(id);
      toast.success(res.message || 'Workflow executed test event');
      loadData();
    } catch (err) {
      toast.error('Workflow test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleScanOverdue = async () => {
    setScanning(true);
    try {
      const res = await api.scanOverdue();
      toast.success(res.message || 'Overdue tasks evaluated by workflow workers');
      loadData();
    } catch (err) {
      toast.error('Overdue scan encountered an issue');
    } finally {
      setScanning(false);
    }
  };

  const confirmDeleteWorkflow = async () => {
    if (!deletingWfId) return;
    try {
      await api.deleteWorkflow(deletingWfId);
      setWorkflows(prev => prev.filter(w => w.id !== deletingWfId));
      toast.success('Workflow deleted');
    } catch (err) {
      toast.error('Failed to delete workflow');
    } finally {
      setDeletingWfId(null);
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
      toast.success('Workflow automation created');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to create workflow');
    }
  };

  const activeCount = workflows.filter(w => w.is_active === 1).length;
  const pausedCount = workflows.filter(w => w.is_active === 0).length;

  return (
    <div>
      <PageHeader
        title="Workflow Automation Engine"
        subtitle="Event-driven triggers, conditional filters, automated reminders, and duplicate-safe backend workers."
        actions={
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <SecondaryButton onClick={handleScanOverdue} loading={scanning} icon={RefreshCw}>
              Evaluate Overdue Tasks
            </SecondaryButton>
            <PrimaryButton onClick={() => setIsModalOpen(true)} icon={Plus}>
              New Automation
            </PrimaryButton>
          </div>
        }
      />

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard
          label="Active Automations"
          value={activeCount}
          subtext="Monitoring workspace events"
          icon={Zap}
          color="var(--primary-orange)"
        />
        <StatCard
          label="Paused Workflows"
          value={pausedCount}
          subtext="Temporarily suspended"
          icon={Sliders}
          color="var(--secondary-text)"
        />
        <StatCard
          label="Total Executions"
          value={executions.length}
          subtext="Logged execution events"
          icon={CheckCircle2}
          color="var(--success)"
        />
        <StatCard
          label="Guard Protection"
          value="100%"
          subtext="Duplicate spam protection"
          icon={Shield}
          color="var(--info)"
        />
      </div>

      {/* Visual Pipeline Architecture Card */}
      <Card style={{ marginBottom: '1.75rem', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
          Workflow Execution Pipeline
        </div>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--primary-text)', marginBottom: '1rem' }}>
          Deterministic Event Processing
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'var(--surface-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--primary-orange)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              1. Event Trigger
            </div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary-text)' }}>
              Task Overdue or Created
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)', marginTop: '0.2rem' }}>
              Monitored via backend scheduler and event dispatchers
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--surface-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--primary-orange)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              2. Guard Condition
            </div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary-text)' }}>
              Status != DONE
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)', marginTop: '0.2rem' }}>
              Duplicate prevention checks if notified in past 24h
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--surface-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--primary-orange)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              3. Authorized Action
            </div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary-text)' }}>
              Create In-App Reminder
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)', marginTop: '0.2rem' }}>
              Persists notification and logs verified audit entry
            </div>
          </div>
        </div>
      </Card>

      {/* Configured Automations Grid */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)', marginBottom: '1rem' }}>
          Configured Automations
        </h2>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Loading workflows...</div>
        ) : workflows.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No automated workflows configured"
            description="Create an automation rule to handle recurring reminders and status transitions."
            actionText="Create Automation"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {workflows.map(wf => {
              const isActive = wf.is_active === 1;
              return (
                <Card
                  key={wf.id}
                  style={{
                    borderLeft: `3px solid ${isActive ? 'var(--primary-orange)' : 'var(--border)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                      <span style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: isActive ? 'var(--success-bg)' : 'var(--surface-secondary)',
                        color: isActive ? 'var(--success)' : 'var(--text-muted)'
                      }}>
                        {isActive ? 'ACTIVE' : 'PAUSED'}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleTriggerTest(wf.id)}
                          disabled={testingId === wf.id}
                          className="btn-secondary"
                          style={{ fontSize: 'var(--text-xs)', padding: '0.25rem 0.6rem' }}
                          title="Simulate event and test execution"
                        >
                          <Play size={12} /> {testingId === wf.id ? 'Testing...' : 'Test Run'}
                        </button>
                        <IconButton
                          icon={Trash2}
                          title="Delete workflow"
                          size={14}
                          onClick={() => setDeletingWfId(wf.id)}
                        />
                      </div>
                    </div>

                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--primary-text)', marginBottom: '0.25rem' }}>
                      {wf.name}
                    </h3>

                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)', lineHeight: 1.45, marginBottom: '0.85rem' }}>
                      {wf.description}
                    </p>

                    <div style={{
                      backgroundColor: 'var(--surface-secondary)',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}>
                      <div><strong>Trigger:</strong> {wf.trigger_type}</div>
                      <div><strong>Condition:</strong> {wf.condition_type}</div>
                      <div><strong>Action:</strong> {wf.action_type}</div>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '1rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--secondary-text)'
                  }}>
                    <span>Run {wf.run_count || 0} times</span>
                    <button
                      onClick={() => handleToggleWorkflow(wf.id)}
                      style={{
                        color: isActive ? 'var(--error)' : 'var(--success)',
                        fontWeight: 600,
                        fontSize: 'var(--text-xs)'
                      }}
                    >
                      {isActive ? 'Pause rule' : 'Resume rule'}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Execution Logs Table */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)' }}>
            Execution History & Audit Trail
          </h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Verified database executions</span>
        </div>

        {executions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            No executions logged yet. Click "Test Run" on any active workflow above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--secondary-text)' }}>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 500, fontSize: 'var(--text-xs)' }}>Status</th>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 500, fontSize: 'var(--text-xs)' }}>Workflow Rule</th>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 500, fontSize: 'var(--text-xs)' }}>Action Output</th>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 500, fontSize: 'var(--text-xs)' }}>Executed At</th>
                </tr>
              </thead>
              <tbody>
                {executions.map(ex => (
                  <tr key={ex.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      <span style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: 3,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        backgroundColor: ex.status === 'SUCCESS' ? 'var(--success-bg)' : 'var(--error-bg)',
                        color: ex.status === 'SUCCESS' ? 'var(--success)' : 'var(--error)'
                      }}>
                        {ex.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: 'var(--primary-text)' }}>
                      {ex.workflow_name || 'Workflow'}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', color: 'var(--secondary-text)' }}>
                      {ex.action_taken || ex.error_message || 'Completed action successfully'}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                      {new Date(ex.executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE WORKFLOW MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Automation Rule"
      >
        <form onSubmit={handleCreateWorkflow} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Workflow Name *</label>
            <input
              type="text"
              placeholder="e.g. Overdue Task Auto-Reminder"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Description</label>
            <textarea
              rows={2}
              placeholder="What does this automated rule accomplish?"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
            />
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>When Trigger occurs:</label>
            <select value={formTrigger} onChange={e => setFormTrigger(e.target.value)}>
              <option value="TASK_OVERDUE">Task reaches due date and is overdue</option>
              <option value="TASK_CREATED">A new task is created</option>
              <option value="STATUS_CHANGED">Task status changes</option>
              <option value="MILESTONE_REACHED">Project milestone completed</option>
            </select>
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Only if Condition is satisfied:</label>
            <select value={formCondition} onChange={e => setFormCondition(e.target.value)}>
              <option value="STATUS_NOT_DONE">Task status is not marked DONE</option>
              <option value="PRIORITY_HIGH">Priority is HIGH or URGENT</option>
              <option value="ALWAYS">Always run (no condition filter)</option>
            </select>
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Then execute Action:</label>
            <select value={formAction} onChange={e => setFormAction(e.target.value)}>
              <option value="CREATE_NOTIFICATION">Create in-app reminder notification</option>
              <option value="CREATE_TASK">Create automated follow-up deliverable</option>
              <option value="UPDATE_PRIORITY">Elevate task priority to URGENT</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <SecondaryButton onClick={() => setIsModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit">
              Save Automation
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Workflow Deletion */}
      <ConfirmationDialog
        isOpen={Boolean(deletingWfId)}
        onClose={() => setDeletingWfId(null)}
        onConfirm={confirmDeleteWorkflow}
        title="Delete Automation"
        message="Are you sure you want to delete this workflow rule? It will no longer execute for incoming events."
        confirmText="Delete"
        destructive={true}
      />
    </div>
  );
}
