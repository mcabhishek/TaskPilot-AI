import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Clock,
  Bell,
  Lock,
  Sparkles,
  Sliders,
  Check,
  ShieldCheck,
  Moon,
  Sun
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { PrimaryButton, SecondaryButton } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useToast } from '../components/common/Toast';

export default function Settings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('profile');

  // Profile Form
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [savingProfile, setSavingProfile] = useState(false);

  // Preferences Form
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [dailyGoal, setDailyGoal] = useState(5);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Security Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

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
          setEmailNotif(Boolean(res.preferences.email_notifications));
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load user settings');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await api.updateProfile({ name, timezone });
      setUser(prev => ({ ...prev, name: updated.name, timezone: updated.timezone }));
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message || 'Error updating profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      await api.updatePreferences({
        work_hours_start: workStart,
        work_hours_end: workEnd,
        daily_task_goal: dailyGoal,
        ai_suggestions_enabled: aiSuggestions,
        in_app_notifications: inAppNotif,
        email_notifications: emailNotif,
      });
      toast.success('Workspace preferences updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.warning('Please enter current and new passwords');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning('New passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Password update failed');
    } finally {
      setSavingPassword(false);
    }
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Working Hours & Goals', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'ai', label: 'AI Intelligence', icon: Sparkles },
    { id: 'security', label: 'Account Security', icon: Lock },
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading preferences...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Settings & Workspace Preferences"
        subtitle="Manage personal details, working hours, AI suggestions, notifications, and security."
      />

      {/* Settings Navigation and Form View */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 240px) 1fr', gap: '2rem' }}>
        
        {/* Left: Sections List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {sections.map(sec => {
            const Icon = sec.icon;
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--soft-peach)' : 'transparent',
                  color: isSelected ? 'var(--primary-orange)' : 'var(--secondary-text)',
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: 'var(--text-sm)',
                  textAlign: 'left'
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon size={16} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Section Forms */}
        <div>
          {/* PROFILE SECTION */}
          {activeSection === 'profile' && (
            <Card style={{ padding: '1.75rem' }}>
              <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.25rem' }}>
                Personal Profile
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', marginBottom: '1.5rem' }}>
                Your identity across team projects and workspace activity logs.
              </p>

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Email Address</label>
                  <input
                    type="email"
                    value={user?.email || 'demo@taskpilot.ai'}
                    disabled
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Primary email associated with your TaskPilot account.
                  </span>
                </div>

                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Timezone</label>
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
                  <PrimaryButton type="submit" loading={savingProfile}>
                    Save Profile
                  </PrimaryButton>
                </div>
              </form>
            </Card>
          )}

          {/* WORKING HOURS & GOALS */}
          {activeSection === 'preferences' && (
            <Card style={{ padding: '1.75rem' }}>
              <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.25rem' }}>
                Working Hours & Daily Targets
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', marginBottom: '1.5rem' }}>
                Configure your typical focus window and daily task completion goals.
              </p>

              <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Work Start Time</label>
                    <input
                      type="time"
                      value={workStart}
                      onChange={e => setWorkStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Work End Time</label>
                    <input
                      type="time"
                      value={workEnd}
                      onChange={e => setWorkEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Daily Task Completion Target</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={dailyGoal}
                    onChange={e => setDailyGoal(Number(e.target.value))}
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Used to calculate your daily productivity pace on the dashboard.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <PrimaryButton type="submit" loading={savingPrefs}>
                    Save Working Hours
                  </PrimaryButton>
                </div>
              </form>
            </Card>
          )}

          {/* NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <Card style={{ padding: '1.75rem' }}>
              <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.25rem' }}>
                Notification Preferences
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', marginBottom: '1.5rem' }}>
                Control how and when you receive workflow alerts and overdue task reminders.
              </p>

              <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <input
                    type="checkbox"
                    id="inAppCheck"
                    checked={inAppNotif}
                    onChange={e => setInAppNotif(e.target.checked)}
                    style={{ width: 'auto', marginTop: 3 }}
                  />
                  <div>
                    <label htmlFor="inAppCheck" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary-text)', cursor: 'pointer' }}>
                      In-App Notifications & Reminders
                    </label>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)' }}>
                      Receive real-time bell alerts when workflows trigger or tasks become overdue.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <input
                    type="checkbox"
                    id="emailCheck"
                    checked={emailNotif}
                    onChange={e => setEmailNotif(e.target.checked)}
                    style={{ width: 'auto', marginTop: 3 }}
                  />
                  <div>
                    <label htmlFor="emailCheck" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary-text)', cursor: 'pointer' }}>
                      Daily Agenda Digest Email
                    </label>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)' }}>
                      Receive a morning summary of tasks due and scheduled deadlines.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <PrimaryButton type="submit" loading={savingPrefs}>
                    Save Preferences
                  </PrimaryButton>
                </div>
              </form>
            </Card>
          )}

          {/* AI PREFERENCES */}
          {activeSection === 'ai' && (
            <Card style={{ padding: '1.75rem' }}>
              <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.25rem' }}>
                AI Model & Suggestions
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', marginBottom: '1.5rem' }}>
                Configure intelligent schedule breakdown and note summarization options.
              </p>

              <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <input
                    type="checkbox"
                    id="aiCheck"
                    checked={aiSuggestions}
                    onChange={e => setAiSuggestions(e.target.checked)}
                    style={{ width: 'auto', marginTop: 3 }}
                  />
                  <div>
                    <label htmlFor="aiCheck" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary-text)', cursor: 'pointer' }}>
                      Smart Goal Planning & Breakdown Assistance
                    </label>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)' }}>
                      Enable intelligent task synthesis, milestone estimation, and study planning.
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--secondary-text)',
                  lineHeight: 1.5
                }}>
                  <strong style={{ color: 'var(--primary-text)' }}>Privacy & Model Architecture:</strong> TaskPilot AI operates on explicit user approval. All generated plans must be approved by you before any task or project is committed to your workspace database.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <PrimaryButton type="submit" loading={savingPrefs}>
                    Save AI Settings
                  </PrimaryButton>
                </div>
              </form>
            </Card>
          )}

          {/* SECURITY */}
          {activeSection === 'security' && (
            <Card style={{ padding: '1.75rem' }}>
              <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.25rem' }}>
                Account Security & Credentials
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', marginBottom: '1.5rem' }}>
                Update your account password and security credentials.
              </p>

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Confirm Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <PrimaryButton type="submit" loading={savingPassword} disabled={!currentPassword || !newPassword}>
                    Update Password
                  </PrimaryButton>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: minmax(200px, 240px) 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
