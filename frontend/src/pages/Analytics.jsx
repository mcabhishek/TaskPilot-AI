import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { Card, StatCard } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

export default function Analytics() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7D'); // 'TODAY' | '7D' | '30D'

  const loadAnalytics = async () => {
    try {
      const res = await api.getAnalyticsOverview();
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Calculating workspace metrics...</div>;
  }

  const { summary = {}, priorityStats = [], statusStats = [], dailyActivity = [] } = data || {};

  const priorityColors = {
    URGENT: '#D94F45',
    HIGH: '#D99032',
    MEDIUM: '#2B78C5',
    LOW: '#9E978F'
  };

  return (
    <div>
      <PageHeader
        title="Productivity Analytics & Telemetry"
        subtitle="Completion trends, velocity breakdowns, and focus session statistics computed from verified database records."
        actions={
          <div style={{ display: 'flex', backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            {[
              { id: 'TODAY', label: 'Today' },
              { id: '7D', label: 'Last 7 Days' },
              { id: '30D', label: 'Last 30 Days' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setTimeRange(r.id)}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  backgroundColor: timeRange === r.id ? 'var(--soft-peach)' : 'transparent',
                  color: timeRange === r.id ? 'var(--primary-orange)' : 'var(--secondary-text)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <StatCard
          label="Completion Velocity"
          value={`${summary.completionRate || 0}%`}
          subtext={`${summary.completedTasks || 0} completed of ${summary.totalTasks || 0} tasks`}
          icon={TrendingUp}
          color="var(--primary-orange)"
        />
        <StatCard
          label="Verified Focus Time"
          value={`${summary.totalFocusMinutes || 0}m`}
          subtext="Deep Pomodoro intervals logged"
          icon={Clock}
          color="var(--success)"
        />
        <StatCard
          label="Active In Progress"
          value={summary.inProgressTasks || 0}
          subtext="Under active development"
          icon={CheckCircle2}
          color="var(--info)"
        />
        <StatCard
          label="Overdue Deliverables"
          value={summary.overdueTasks || 0}
          subtext={summary.overdueTasks > 0 ? "Past deadline" : "All deliverables on schedule"}
          icon={AlertTriangle}
          color={summary.overdueTasks > 0 ? "var(--error)" : "var(--text-muted)"}
        />
      </div>

      {/* Charts & Breakdown Grids */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
        
        {/* Task Velocity: Created vs Completed Bar Chart */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)' }}>
                7-Day Task Execution Velocity
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)' }}>
                Comparing tasks created versus tasks marked completed.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: 'var(--text-xs)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--primary-orange)' }} />
                <span>Created</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--success)' }} />
                <span>Completed</span>
              </div>
            </div>
          </div>

          {dailyActivity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              Insufficient daily activity in this timeframe. Complete tasks to see velocity chart.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 210, paddingTop: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              {dailyActivity.map((day, idx) => {
                const maxVal = Math.max(...dailyActivity.map(d => Math.max(d.created_count, d.completed_count, 1)));
                const createdHeight = Math.max(12, Math.round((day.created_count / maxVal) * 160));
                const completedHeight = Math.max(12, Math.round((day.completed_count / maxVal) * 160));

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.35rem', height: 160 }}>
                      <div
                        title={`Created: ${day.created_count}`}
                        style={{
                          width: 18,
                          height: createdHeight,
                          backgroundColor: 'var(--primary-orange)',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 250ms ease'
                        }}
                      />
                      <div
                        title={`Completed: ${day.completed_count}`}
                        style={{
                          width: 18,
                          height: completedHeight,
                          backgroundColor: 'var(--success)',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 250ms ease'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--secondary-text)' }}>
                      {day.day ? new Date(day.day).toLocaleDateString([], { month: 'short', day: 'numeric' }) : `Day ${idx + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.35rem' }}>
            Deliverables by Priority
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)', marginBottom: '1.25rem' }}>
            Current workload distribution by urgency.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(p => {
              const item = priorityStats.find(s => s.priority === p);
              const count = item ? item.count : 0;
              const pct = summary.totalTasks > 0 ? Math.round((count / summary.totalTasks) * 100) : 0;

              return (
                <div key={p}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--primary-text)' }}>{p}</span>
                    <span style={{ color: 'var(--secondary-text)', fontSize: 'var(--text-xs)' }}>{count} items ({pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: 6, backgroundColor: 'var(--surface-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: priorityColors[p], borderRadius: 3, transition: 'width 200ms ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Status Breakdown Row */}
      <Card>
        <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.35rem' }}>
          Workspace Lifecycle Status
        </h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)', marginBottom: '1.25rem' }}>
          Real-time count of tasks in each lifecycle stage.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {statusStats.map(s => (
            <div key={s.status} style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--secondary-text)', textTransform: 'uppercase' }}>
                {s.status.replace('_', ' ')}
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary-text)', margin: '0.25rem 0' }}>
                {s.count}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {summary.totalTasks > 0 ? Math.round((s.count / summary.totalTasks) * 100) : 0}% of all tasks
              </div>
            </div>
          ))}
        </div>
      </Card>

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
