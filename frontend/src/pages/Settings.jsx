import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Clock,
  Bell,
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);

  // Profile
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');

  // Preferences
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [dailyGoal, setDailyGoal] = useState(5);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.getSettings();
        if (res.user) {
          setName(res.user.name);
          setTimezone(res.user.timezone || 'America/New_York');
        }
        if (res.preferences) {
          setWorkStart(res.preferences.work_hours_start || '09:00');
          setWorkEnd(res.preferences.work_hours_end || '17:00');
          setDailyGoal(res.preferences.daily_task_goal || 5);
          setAiSuggestions(Boolean(res.preferences.ai_suggestions_enabled));
          setInAppNotif(Boolean(res.preferences.in_app_notifications));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const updated = await api.updateProfile({ name, timezone });
      setUser(prev => ({ ...prev, name: updated.name, timezone: updated.timezone }));
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.updatePreferences({
        work_hours_start: workStart,
        work_hours_end: workEnd,
        daily_task_goal: dailyGoal,
        ai_suggestions_enabled: aiSuggestions,
        in_app_notifications: inAppNotif,
      });
      setMessage('Productivity preferences updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.changePassword(currentPassword, newPassword);
      setMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading settings...</div>;
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <SettingsIcon size={26} color="var(--primary-orange)" /> Settings & Workspace Preferences
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
          Manage your account profile, working hours, AI suggestions, and security.
        </p>
      </div>

      {message && (
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
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: 'var(--error-bg)',
          border: '1px solid #FECACA',
          color: 'var(--error)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Form */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <User size={20} color="var(--primary-orange)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Personal Profile</h2>
        </div>

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Email Address</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              style={{ backgroundColor: 'var(--warm-cream)', cursor: 'not-allowed' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Email cannot be altered for demo account.</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}>
              <option value="America/New_York">Eastern Time (America/New_York)</option>
              <option value="America/Chicago">Central Time (America/Chicago)</option>
              <option value="America/Denver">Mountain Time (America/Denver)</option>
              <option value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Asia/Kolkata">India Standard Time (IST)</option>
              <option value="UTC">Coordinated Universal Time (UTC)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Preferences Form */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Clock size={20} color="var(--primary-orange)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Productivity & Working Hours</h2>
        </div>

        <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Work Start Time</label>
              <input
                type="time"
                value={workStart}
                onChange={e => setWorkStart(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Work End Time</label>
              <input
                type="time"
                value={workEnd}
                onChange={e => setWorkEnd(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Daily Target Completed Tasks</label>
            <input
              type="number"
              min={1}
              max={50}
              value={dailyGoal}
              onChange={e => setDailyGoal(Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="aiPref"
                checked={aiSuggestions}
                onChange={e => setAiSuggestions(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <label htmlFor="aiPref" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                Enable AI smart planning & schedule suggestions
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="notifPref"
                checked={inAppNotif}
                onChange={e => setInAppNotif(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <label htmlFor="notifPref" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                Enable in-app notifications for overdue tasks & automation triggers
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Form */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Lock size={20} color="var(--primary-orange)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Account Security</h2>
        </div>

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Current Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" disabled={saving || !currentPassword || !newPassword} className="btn-primary">
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
