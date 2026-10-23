import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FolderKanban
} from 'lucide-react';
import { api } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { PrimaryButton, SecondaryButton } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { PriorityBadge } from '../components/common/Badge';
import { useToast } from '../components/common/Toast';

export default function Calendar() {
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('MONTH'); // 'MONTH' | 'WEEK' | 'DAY'

  // Selected Item Modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await api.getCalendar();
      setItems(res.items || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prev = () => {
    if (viewMode === 'MONTH') setCurrentDate(new Date(year, month - 1, 1));
    else if (viewMode === 'WEEK') setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000));
    else setCurrentDate(new Date(currentDate.getTime() - 86400000));
  };

  const next = () => {
    if (viewMode === 'MONTH') setCurrentDate(new Date(year, month + 1, 1));
    else if (viewMode === 'WEEK') setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000));
    else setCurrentDate(new Date(currentDate.getTime() + 86400000));
  };

  const gotoToday = () => {
    setCurrentDate(new Date());
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Group items by date string 'YYYY-MM-DD'
  const itemsByDate = items.reduce((acc, item) => {
    if (!item.due_date) return acc;
    const dStr = item.due_date.slice(0, 10);
    if (!acc[dStr]) acc[dStr] = [];
    acc[dStr].push(item);
    return acc;
  }, {});

  // Upcoming agenda items
  const upcomingAgenda = [...items]
    .filter(i => i.due_date && new Date(i.due_date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 6);

  const handleReschedule = async () => {
    if (!selectedItem || !rescheduleDate) return;
    setRescheduling(true);
    try {
      await api.rescheduleTask(selectedItem.id, new Date(rescheduleDate).toISOString());
      toast.success(`Rescheduled "${selectedItem.title}"`);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to reschedule item');
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Schedule & Deadlines"
        subtitle="Manage delivery dates, scheduled tasks, and project milestones."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SecondaryButton onClick={gotoToday} style={{ fontSize: 'var(--text-xs)', padding: '0.45rem 0.85rem' }}>
              Today
            </SecondaryButton>

            <div style={{ display: 'flex', backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              {['MONTH', 'WEEK', 'DAY'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    backgroundColor: viewMode === mode ? 'var(--soft-peach)' : 'transparent',
                    color: viewMode === mode ? 'var(--primary-orange)' : 'var(--secondary-text)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  {mode.charAt(0) + mode.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Date Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        backgroundColor: 'var(--surface-primary)',
        padding: '0.65rem 1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button onClick={prev} className="btn-icon" style={{ width: 30, height: 30 }} aria-label="Previous">
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--primary-text)', minWidth: 160, textAlign: 'center' }}>
            {monthNames[month]} {year}
          </span>
          <button onClick={next} className="btn-icon" style={{ width: 30, height: 30 }} aria-label="Next">
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: 'var(--text-xs)', color: 'var(--secondary-text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--primary-orange)' }} />
            <span>Tasks</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#2563EB' }} />
            <span>Milestones</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid + Upcoming Agenda Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1fr', gap: '1.5rem' }}>
        
        {/* Month Calendar Grid */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {/* Day of Week Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            backgroundColor: 'var(--surface-secondary)',
            borderBottom: '1px solid var(--border)',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: 'var(--text-xs)',
            color: 'var(--secondary-text)',
            padding: '0.55rem 0'
          }}>
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Month Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--border)', gap: 1 }}>
            {/* Blank offset cells */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`offset-${i}`} style={{ minHeight: 95, backgroundColor: 'var(--surface-secondary)', padding: '0.45rem' }} />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayItems = itemsByDate[dayStr] || [];
              const isToday = new Date().toDateString() === new Date(year, month, dayNum).toDateString();

              return (
                <div
                  key={dayNum}
                  style={{
                    minHeight: 95,
                    backgroundColor: isToday ? 'var(--soft-peach)' : 'var(--surface-primary)',
                    padding: '0.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: isToday ? 700 : 500,
                      width: 22,
                      height: 22,
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isToday ? 'var(--primary-orange)' : 'transparent',
                      color: isToday ? '#FFFFFF' : 'var(--primary-text)'
                    }}>
                      {dayNum}
                    </span>

                    {dayItems.length > 0 && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  {/* Day Tasks List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', overflowY: 'auto', maxHeight: 68 }}>
                    {dayItems.map(item => {
                      const isMilestone = item.item_type === 'MILESTONE';
                      const isDone = item.status === 'DONE' || item.status === 'COMPLETED';

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedItem(item);
                            setRescheduleDate(item.due_date ? item.due_date.slice(0, 10) : '');
                          }}
                          style={{
                            textAlign: 'left',
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            padding: '0.15rem 0.35rem',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: isMilestone ? '#EBF3FA' : (isDone ? 'var(--success-bg)' : 'var(--surface-secondary)'),
                            color: isMilestone ? '#2563EB' : (isDone ? 'var(--success)' : 'var(--primary-text)'),
                            borderLeft: `2.5px solid ${item.project_color || (isMilestone ? '#2563EB' : 'var(--primary-orange)')}`,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {isMilestone ? '🚩 ' : ''}{item.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Upcoming Agenda Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--primary-text)', marginBottom: '0.85rem' }}>
              Upcoming Agenda
            </h3>

            {upcomingAgenda.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: '1.5rem 0', textAlign: 'center' }}>
                No upcoming events or scheduled tasks.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {upcomingAgenda.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      setRescheduleDate(item.due_date ? item.due_date.slice(0, 10) : '');
                    }}
                    style={{
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background-color 150ms ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--soft-peach)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary-text)' }}>
                        {item.title}
                      </span>
                      {item.priority && <PriorityBadge priority={item.priority} />}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: 'var(--text-xs)', color: 'var(--secondary-text)' }}>
                      <span>{new Date(item.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      {item.project_name && <span>• {item.project_name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Item Details / Reschedule Modal */}
      {selectedItem && (
        <Modal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title={selectedItem.item_type === 'MILESTONE' ? 'Milestone Details' : 'Deliverable Details'}
          maxWidth={460}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--primary-text)', marginBottom: '0.25rem' }}>
                {selectedItem.title}
              </div>
              {selectedItem.description && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                  {selectedItem.description}
                </p>
              )}
            </div>

            <div style={{ backgroundColor: 'var(--surface-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {selectedItem.project_name && <div><strong>Project:</strong> {selectedItem.project_name}</div>}
              <div><strong>Scheduled Date:</strong> {new Date(selectedItem.due_date).toLocaleDateString()}</div>
              <div><strong>Status:</strong> {selectedItem.status}</div>
            </div>

            {/* Reschedule Input */}
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Reschedule to date:
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <SecondaryButton onClick={() => setSelectedItem(null)}>
                Close
              </SecondaryButton>
              <PrimaryButton onClick={handleReschedule} loading={rescheduling}>
                Save Reschedule
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      <style>{`
        @media (max-width: 900px) {
          div[style*="gridTemplateColumns: 1.9fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
