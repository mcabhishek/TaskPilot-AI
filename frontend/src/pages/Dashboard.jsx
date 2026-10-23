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
  ArrowRight,
  Zap,
  Calendar,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const fetchDashboard = async () => {
    try {
      const res = await api.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleQuickCompleteTask = async (taskId) => {
    try {
      await api.updateTask(taskId, { status: 'DONE' });
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunOverdueScan = async () => {
    setScanning(true);
    setScanMessage('');
    try {
      const res = await api.scanOverdue();
      setScanMessage(res.message || 'Overdue scan completed!');
      fetchDashboard();
    } catch (err) {
      setScanMessage('Scan error occurred.');
    } finally {
      setScanning(false);
      setTimeout(() => setScanMessage(''), 4000);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
        Loading dashboard metrics...
      </div>
    );
  }

  const { summary, upcomingTasks = [], overdueList = [], recentProjects = [], recentActivity = [] } = data || {};

  return (
    <div>
      {/* Top Banner / Welcome */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Productivity Overview
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Real-time telemetry and task execution derived directly from your workspace database.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleRunOverdueScan}
            disabled={scanning}
            className="btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <Zap size={16} color="var(--primary-orange)" />
            {scanning ? 'Evaluating...' : 'Run Automation Scan'}
          </button>
          <button
            onClick={() => navigate('/ai')}
            className="btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            <Sparkles size={16} /> Plan Goal with AI
          </button>
        </div>
      </div>

      {scanMessage && (
        <div style={{
          backgroundColor: 'var(--warm-cream)',
          border: '1px solid #FBD4BD',
          color: 'var(--deep-orange)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Zap size={16} /> {scanMessage}
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--pale-orange)', color: 'var(--primary-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Active Tasks</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{summary?.totalActiveTasks || 0}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Completed</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{summary?.completedTasks || 0}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Overdue</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#DC2626' }}>{summary?.overdueTasks || 0}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Completion Rate</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{summary?.completionRate || 0}%</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderKanban size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Projects</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{summary?.totalProjects || 0}</div>
          </div>
        </div>
      </div>

      {/* Overdue Alert Banner if tasks are overdue */}
      {overdueList.length > 0 && (
        <div style={{
          backgroundColor: '#FFF5F5',
          border: '1px solid #FED7D7',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#C53030', fontWeight: 700, fontSize: '0.95rem' }}>
              <AlertTriangle size={18} /> Overdue Tasks Requiring Attention ({overdueList.length})
            </div>
            <button onClick={() => navigate('/tasks?overdue=true')} style={{ fontSize: '0.8rem', color: '#C53030', fontWeight: 600 }}>
              View all overdue &rarr;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {overdueList.map(task => (
              <div key={task.id} style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #FEB2B2',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{task.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#E53E3E' }}>
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleQuickCompleteTask(task.id)}
                  className="btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                >
                  <Check size={14} /> Mark Done
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Upcoming Tasks & Recent Projects */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Upcoming Deadlines */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Upcoming Deadlines</h2>
            <button onClick={() => navigate('/calendar')} style={{ fontSize: '0.82rem', color: 'var(--primary-orange)', fontWeight: 600 }}>
              View Calendar &rarr;
            </button>
          </div>

          {upcomingTasks.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No upcoming deadlines scheduled. You're all caught up!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcomingTasks.map(t => (
                <div key={t.id} style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                      {t.project_name && <span style={{ color: t.project_color || 'var(--primary-orange)', fontWeight: 600 }}>{t.project_name}</span>}
                      <span>• Due {new Date(t.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`badge badge-${t.priority.toLowerCase()}`}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Projects with calculated progress */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Projects Progress</h2>
            <button onClick={() => navigate('/projects')} style={{ fontSize: '0.82rem', color: 'var(--primary-orange)', fontWeight: 600 }}>
              All Projects &rarr;
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No projects created yet. Use AI Goal Planner or click below.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentProjects.map(p => (
                <div key={p.id} style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFFFFF'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>{p.name}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-orange)' }}>{p.progress}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: 6, backgroundColor: 'var(--pale-orange)', borderRadius: 3, overflow: 'hidden', margin: '0.5rem 0' }}>
                    <div style={{ width: `${p.progress}%`, height: '100%', backgroundColor: p.color || 'var(--primary-orange)', borderRadius: 3, transition: 'width 0.3s ease' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>{p.completed_tasks} of {p.total_tasks} tasks done</span>
                    <span>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Timeline Stream */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Recent Activity & Audit Log
        </h2>

        {recentActivity.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '1rem 0' }}>
            No recent activity logged yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentActivity.map(act => (
              <div key={act.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--warm-cream)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 4,
                    backgroundColor: act.action === 'COMPLETED' ? '#ECFDF5' : '#E0F2FE',
                    color: act.action === 'COMPLETED' ? '#059669' : '#0284C7'
                  }}>
                    {act.action}
                  </span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{act.details}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
