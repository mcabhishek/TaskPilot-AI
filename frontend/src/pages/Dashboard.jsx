import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  TrendingUp,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  FileText,
  Zap,
  ArrowRight,
  Check,
  Circle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatCard, Card } from '../components/common/Card';
import { PriorityBadge, StatusBadge } from '../components/common/Badge';
import { PrimaryButton, SecondaryButton } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Focus Timer
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await api.getDashboard();
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Timer Countdown Effect
  useEffect(() => {
    let interval = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (timerRunning && timerSeconds === 0) {
      setTimerRunning(false);
      handleFinishTimer();
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const handleFinishTimer = async () => {
    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      await api.logFocusSession({ duration_minutes: 25, notes: '25-minute Pomodoro Block' });
      toast.success('Focus block complete! Logged 25 minutes to productivity records.');
      setTimerSeconds(25 * 60);
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    if (nextStatus === 'DONE') {
      confetti({ particleCount: 40, spread: 50 });
      toast.success(`Completed "${task.title}"`);
    }
    try {
      await api.updateTask(task.id, { status: nextStatus });
      fetchDashboard();
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const formatTimerTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--secondary-text)' }}>
        Loading dashboard metrics...
      </div>
    );
  }

  const { summary = {}, upcomingTasks = [], overdueList = [], recentProjects = [], recentActivity = [] } = data || {};

  return (
    <div>
      {/* Personalized Greeting Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {formattedDate}
          </div>
          <h1 className="heading-page" style={{ marginTop: '0.15rem' }}>
            {getGreeting()}, {user?.name ? user.name.split(' ')[0] : 'Alex'}
          </h1>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--secondary-text)', marginTop: '0.25rem' }}>
            {summary.overdueTasks > 0
              ? `You have ${summary.overdueTasks} overdue item requiring attention today.`
              : `You're on track! ${summary.totalActiveTasks} active tasks scheduled across your workspace.`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <PrimaryButton onClick={() => navigate('/tasks?action=new')} icon={Plus}>
            Create task
          </PrimaryButton>
        </div>
      </div>

      {/* 4 Compact KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <StatCard
          label="Tasks Due Today"
          value={summary.dueTodayTasks || 0}
          subtext="Immediate deadlines"
          icon={Calendar}
          color="var(--primary-orange)"
        />
        <StatCard
          label="In Progress"
          value={summary.totalActiveTasks || 0}
          subtext="Active deliverables"
          icon={Clock}
          color="var(--info)"
        />
        <StatCard
          label="Completed"
          value={summary.completedTasks || 0}
          subtext={`${summary.completionRate || 0}% overall velocity`}
          icon={CheckCircle2}
          color="var(--success)"
        />
        <StatCard
          label="Overdue Tasks"
          value={summary.overdueTasks || 0}
          subtext={summary.overdueTasks > 0 ? "Requires rescheduling" : "Clean delivery schedule"}
          icon={AlertTriangle}
          color={summary.overdueTasks > 0 ? "var(--error)" : "var(--text-muted)"}
        />
      </div>

      {/* Main Grid: Today's Tasks & Focus Timer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
        
        {/* Today's & Priority Tasks List */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
            <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)' }}>
              Priority Deliverables
            </h2>
            <button
              onClick={() => navigate('/tasks')}
              style={{ fontSize: 'var(--text-sm)', color: 'var(--primary-orange)', fontWeight: 600 }}
            >
              View all &rarr;
            </button>
          </div>

          {upcomingTasks.length === 0 && overdueList.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No pending tasks"
              description="You have completed all scheduled tasks or haven't planned your day yet."
              actionText="Create new task"
              onAction={() => navigate('/tasks?action=new')}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Overdue items highlighted */}
              {overdueList.map(task => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-primary)',
                    border: '1px solid var(--border)',
                    borderLeft: '3px solid var(--error)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <button
                      onClick={() => handleToggleTaskStatus(task)}
                      style={{ color: 'var(--text-muted)', display: 'flex' }}
                      title="Mark task done"
                    >
                      <Circle size={18} />
                    </button>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--primary-text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--error)', marginTop: '0.15rem' }}>
                        Overdue: {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}

              {/* Upcoming priority tasks */}
              {upcomingTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-primary)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${task.project_color || 'var(--primary-orange)'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <button
                      onClick={() => handleToggleTaskStatus(task)}
                      style={{ color: 'var(--text-muted)', display: 'flex' }}
                      title="Mark task done"
                    >
                      <Circle size={18} />
                    </button>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--primary-text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)', marginTop: '0.15rem' }}>
                        {task.project_name ? `${task.project_name} • ` : ''}Due {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right Column: Deep Focus Timer & Productivity Insight */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Focus Timer */}
          <Card style={{ backgroundColor: 'var(--surface-primary)', textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              Deep Work Focus Block
            </div>
            <div style={{
              fontSize: '3rem',
              fontWeight: 700,
              color: 'var(--primary-text)',
              fontFamily: 'monospace',
              letterSpacing: '-0.02em',
              lineHeight: 1
            }}>
              {formatTimerTime(timerSeconds)}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)', marginTop: '0.5rem', marginBottom: '1.15rem' }}>
              25-minute Pomodoro session tracked to verified database telemetry.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem' }}>
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className="btn-primary"
                style={{ minWidth: 105, padding: '0.45rem 0.85rem', fontSize: 'var(--text-sm)' }}
              >
                {timerRunning ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Start</>}
              </button>
              <button
                onClick={() => {
                  setTimerRunning(false);
                  setTimerSeconds(25 * 60);
                }}
                className="btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: 'var(--text-sm)' }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </Card>

          {/* Quick Actions Panel */}
          <Card style={{ padding: '1.15rem' }}>
            <div className="text-label" style={{ marginBottom: '0.75rem' }}>
              Quick Creation
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                onClick={() => navigate('/ai')}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', fontSize: 'var(--text-sm)', padding: '0.45rem 0.75rem' }}
              >
                <Sparkles size={14} color="var(--primary-orange)" /> AI Plan
              </button>
              <button
                onClick={() => navigate('/tasks?action=new')}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', fontSize: 'var(--text-sm)', padding: '0.45rem 0.75rem' }}
              >
                <Plus size={14} color="var(--primary-orange)" /> Task
              </button>
              <button
                onClick={() => navigate('/notes')}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', fontSize: 'var(--text-sm)', padding: '0.45rem 0.75rem' }}
              >
                <FileText size={14} color="var(--primary-orange)" /> Note
              </button>
              <button
                onClick={() => navigate('/projects')}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', fontSize: 'var(--text-sm)', padding: '0.45rem 0.75rem' }}
              >
                <FolderKanban size={14} color="var(--primary-orange)" /> Project
              </button>
            </div>
          </Card>

          {/* Productivity Insight Panel */}
          <div style={{
            backgroundColor: 'var(--surface-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--soft-peach)',
              color: 'var(--primary-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <TrendingUp size={15} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary-text)' }}>
                Productivity Pace
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)', marginTop: '0.15rem', lineHeight: 1.45 }}>
                {summary.completionRate > 50
                  ? `High velocity: ${summary.completionRate}% completion rate. You're maintaining a strong delivery cadence.`
                  : `Focus on completing 2 high-priority tasks today to raise completion velocity above 50%.`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Active Projects Progress & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Projects Progress */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
            <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)' }}>
              Projects Overview
            </h2>
            <button
              onClick={() => navigate('/projects')}
              style={{ fontSize: 'var(--text-sm)', color: 'var(--primary-orange)', fontWeight: 600 }}
            >
              All projects &rarr;
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: '1rem 0' }}>
              No projects created yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {recentProjects.map(p => (
                <div key={p.id} style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--primary-text)' }}>{p.name}</span>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--primary-orange)' }}>{p.progress}%</span>
                  </div>

                  <div style={{ width: '100%', height: 5, backgroundColor: 'var(--border)', borderRadius: 3, overflow: 'hidden', margin: '0.4rem 0' }}>
                    <div style={{ width: `${p.progress}%`, height: '100%', backgroundColor: p.color || 'var(--primary-orange)', borderRadius: 3, transition: 'width 200ms ease' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--secondary-text)' }}>
                    <span>{p.completed_tasks} of {p.total_tasks} deliverables done</span>
                    <span>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Activity Feed */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
            <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)' }}>
              Recent Workspace Activity
            </h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Verified audit log</span>
          </div>

          {recentActivity.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: '1rem 0' }}>
              No activity recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentActivity.slice(0, 5).map(act => (
                <div key={act.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface-secondary)',
                  fontSize: 'var(--text-xs)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <span style={{
                      fontWeight: 600,
                      padding: '0.15rem 0.4rem',
                      borderRadius: 3,
                      backgroundColor: act.action === 'COMPLETED' ? 'var(--success-bg)' : 'var(--soft-peach)',
                      color: act.action === 'COMPLETED' ? 'var(--success)' : 'var(--primary-orange)',
                      fontSize: '0.68rem'
                    }}>
                      {act.action}
                    </span>
                    <span style={{ color: 'var(--primary-text)', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {act.details}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                    {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <style>{`
        @media (max-width: 860px) {
          div[style*="gridTemplateColumns: 1.6fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
