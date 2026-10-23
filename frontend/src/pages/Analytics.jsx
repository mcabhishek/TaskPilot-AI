import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Focus Timer state (Pomodoro: 25 minutes = 1500 seconds)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [sessionLoggedMessage, setSessionLoggedMessage] = useState('');

  const loadAnalytics = async () => {
    try {
      const res = await api.getAnalyticsOverview();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  // Timer countdown hook
  useEffect(() => {
    let interval = null;
    if (timerActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (timerActive && secondsLeft === 0) {
      setTimerActive(false);
      handleFinishFocusSession();
    }
    return () => clearInterval(interval);
  }, [timerActive, secondsLeft]);

  const handleFinishFocusSession = async () => {
    try {
      confetti({ particleCount: 70, spread: 80 });
      await api.logFocusSession({ duration_minutes: 25, notes: '25-minute Pomodoro focus block' });
      setSessionLoggedMessage('🎉 Focus block completed! Logged 25 minutes to your productivity telemetry.');
      loadAnalytics();
      setSecondsLeft(25 * 60);
      setTimeout(() => setSessionLoggedMessage(''), 6000);
    } catch (err) {
      console.error(err);
    }
  };

  const resetTimer = () => {
    setTimerActive(false);
    setSecondsLeft(25 * 60);
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading analytics...</div>;
  }

  const { summary = {}, priorityStats = [], statusStats = [], dailyActivity = [] } = data || {};

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <BarChart3 size={26} color="var(--primary-orange)" /> Productivity Telemetry & Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
          Real execution velocity, completion rates, and focus time tracked from verified database records.
        </p>
      </div>

      {sessionLoggedMessage && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#065F46',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{sessionLoggedMessage}</span>
        </div>
      )}

      {/* Top Telemetry KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Completion Rate</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-orange)', margin: '0.25rem 0' }}>{summary.completionRate || 0}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{summary.completedTasks} of {summary.totalTasks} tasks finished</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Deep Focus Logged</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669', margin: '0.25rem 0' }}>{summary.totalFocusMinutes || 0}m</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified focus sessions recorded</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>In Progress</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0284C7', margin: '0.25rem 0' }}>{summary.inProgressTasks || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active execution items</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Overdue Items</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#DC2626', margin: '0.25rem 0' }}>{summary.overdueTasks || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tasks past scheduled deadline</div>
        </div>
      </div>

      {/* Deep Work Focus Timer & Priority Distributions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Interactive Focus Timer Widget */}
        <div className="card" style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'var(--warm-cream)', border: '1px solid #FBD4BD' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'var(--pale-orange)',
            color: 'var(--deep-orange)',
            padding: '0.25rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 700,
            marginBottom: '1rem'
          }}>
            <Clock size={13} /> Deep Focus Session
          </div>

          <div style={{ fontSize: '3.6rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em', fontFamily: 'monospace' }}>
            {formatTimer(secondsLeft)}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            25-minute Pomodoro interval. Sessions log directly to your database telemetry.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setTimerActive(!timerActive)}
              className="btn-primary"
              style={{ minWidth: 120 }}
            >
              {timerActive ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start Focus</>}
            </button>
            <button
              onClick={resetTimer}
              className="btn-secondary"
            >
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </div>

        {/* Priority Breakdown Chart */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
            Tasks by Priority
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(p => {
              const item = priorityStats.find(s => s.priority === p);
              const count = item ? item.count : 0;
              const pct = summary.totalTasks > 0 ? Math.round((count / summary.totalTasks) * 100) : 0;
              const colors = {
                URGENT: '#EF4444',
                HIGH: '#F59E0B',
                MEDIUM: '#3B82F6',
                LOW: '#9CA3AF'
              };

              return (
                <div key={p}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    <span>{p}</span>
                    <span>{count} tasks ({pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: 8, backgroundColor: 'var(--border-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: colors[p], borderRadius: 4, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status Breakdown & Daily Velocity */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
          Workspace Status Breakdown
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {statusStats.map(s => (
            <div key={s.status} style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--warm-cream)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{s.status}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-orange)', margin: '0.25rem 0' }}>{s.count}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tasks currently in this state</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
