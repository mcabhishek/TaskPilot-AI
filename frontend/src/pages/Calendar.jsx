import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await api.getCalendar();
      setItems(res.items || []);
    } catch (err) {
      console.error('Failed to load calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = () => {
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

  const handleReschedule = async () => {
    if (!selectedItem || !rescheduleDate) return;
    setRescheduling(true);
    try {
      await api.rescheduleTask(selectedItem.id, new Date(rescheduleDate).toISOString());
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      alert('Failed to reschedule task.');
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div>
      {/* Calendar Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Calendar & Deadlines
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Scheduled tasks, upcoming milestones, and delivery timelines.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={today} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
            Today
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <button onClick={prevMonth} style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', minWidth: 140, textAlign: 'center' }}>
              {monthNames[month]} {year}
            </span>
            <button onClick={nextMonth} style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Month Grid */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Days of week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--warm-cream)', borderBottom: '1px solid var(--border-color)', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.65rem 0' }}>
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {/* Days grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--border-color)', gap: 1 }}>
          {/* Empty cells for preceding days */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: 110, backgroundColor: '#FAF9F6', padding: '0.5rem' }} />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayItems = itemsByDate[dayStr] || [];
            const isToday = new Date().toDateString() === new Date(year, month, dayNum).toDateString();

            return (
              <div
                key={dayNum}
                style={{
                  minHeight: 110,
                  backgroundColor: isToday ? '#FFFDF8' : '#FFFFFF',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: isToday ? 800 : 600,
                    width: 24,
                    height: 24,
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isToday ? 'var(--primary-orange)' : 'transparent',
                    color: isToday ? '#FFFFFF' : 'var(--text-main)'
                  }}>
                    {dayNum}
                  </span>

                  {dayItems.length > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {dayItems.length}
                    </span>
                  )}
                </div>

                {/* Day Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto', maxHeight: 85 }}>
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
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.4rem',
                          borderRadius: 4,
                          backgroundColor: isMilestone ? '#FEF3C7' : (isDone ? '#ECFDF5' : 'var(--pale-orange)'),
                          color: isMilestone ? '#B45309' : (isDone ? '#059669' : 'var(--deep-orange)'),
                          borderLeft: `3px solid ${item.project_color || 'var(--primary-orange)'}`,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
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
      </div>

      {/* QUICK RESCHEDULE / ITEM DETAILS MODAL */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '1.75rem', maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span className={`badge badge-${selectedItem.priority ? selectedItem.priority.toLowerCase() : 'medium'}`}>
                {selectedItem.item_type || 'TASK'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status: {selectedItem.status}</span>
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              {selectedItem.title}
            </h2>

            {selectedItem.description && (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                {selectedItem.description}
              </p>
            )}

            <div style={{ marginBottom: '1.25rem', backgroundColor: 'var(--warm-cream)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
              {selectedItem.project_name && (
                <div style={{ marginBottom: '0.25rem' }}>
                  <strong>Project:</strong> {selectedItem.project_name}
                </div>
              )}
              <div>
                <strong>Current Due Date:</strong> {new Date(selectedItem.due_date).toLocaleDateString()}
              </div>
            </div>

            {/* Quick Reschedule Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Reschedule to new date:
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setSelectedItem(null)} className="btn-secondary">
                Close
              </button>
              <button onClick={handleReschedule} disabled={rescheduling} className="btn-primary">
                {rescheduling ? 'Rescheduling...' : 'Save Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
