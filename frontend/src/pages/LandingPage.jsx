import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle2, Zap, ArrowRight, Shield, Layers, Calendar, BarChart3, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user, login, register, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  if (user) {
    navigate('/dashboard');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegistering) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoAccess = async () => {
    setError('');
    setSubmitting(true);
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch (err) {
      setError('Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        padding: '1.25rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--primary-orange), var(--deep-orange))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              TaskPilot <span style={{ color: 'var(--primary-orange)' }}>AI</span>
            </span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Plan Smarter. Do More.</div>
          </div>
        </div>

        <button onClick={handleDemoAccess} className="btn-secondary" style={{ fontSize: '0.88rem' }}>
          Instant Reviewer Demo <ArrowRight size={16} />
        </button>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', padding: '3.5rem 1.5rem', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3.5rem', alignItems: 'center' }}>
          
          {/* Left: Value Proposition */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--pale-orange)',
              color: 'var(--deep-orange)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
              border: '1px solid #FBD4BD'
            }}>
              <Sparkles size={15} /> Amazon Developer Hackathon Project
            </div>

            <h1 style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
              Turn your ambitious goals into <span style={{ color: 'var(--primary-orange)' }}>actionable execution.</span>
            </h1>

            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
              TaskPilot AI is an AI-powered productivity workspace that turns natural-language goals into structured tasks, schedules, projects, searchable notes, and automated workflows.
            </p>

            {/* Feature Bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
              {[
                'Structured AI Goal Planning with human approval review',
                'Task management with priorities, subtasks & calendar scheduling',
                'Visual workflow automation with triggers, conditions & run logs',
                'Zero-guesswork analytics computed from actual workspace data'
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                  <div style={{ color: 'var(--primary-orange)', display: 'flex' }}><CheckCircle2 size={18} /></div>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={handleDemoAccess} className="btn-primary" style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}>
                <Sparkles size={18} /> Try 1-Click Demo Account
              </button>
            </div>
          </div>

          {/* Right: Authentication Card */}
          <div className="card" style={{ padding: '2.25rem', maxWidth: 440, margin: '0 auto', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              {isRegistering ? 'Create your workspace' : 'Welcome back'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {isRegistering ? 'Start planning your projects in seconds' : 'Sign in to access your tasks and workflows'}
            </p>

            {error && (
              <div style={{
                backgroundColor: 'var(--error-bg)',
                color: 'var(--error)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                border: '1px solid #FECACA'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isRegistering && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Alex Rivera"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="alex@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
              >
                {submitting ? 'Authenticating...' : (isRegistering ? 'Create Account' : 'Sign In')}
              </button>
            </form>

            <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-color)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR</span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-color)' }} />
            </div>

            <button
              type="button"
              onClick={handleDemoAccess}
              className="btn-secondary"
              style={{ width: '100%', padding: '0.7rem' }}
            >
              Sign in with Demo Account (demo@taskpilot.ai)
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isRegistering ? (
                <>Already have an account? <button type="button" onClick={() => setIsRegistering(false)} style={{ color: 'var(--primary-orange)', fontWeight: 600 }}>Sign In</button></>
              ) : (
                <>Don't have an account? <button type="button" onClick={() => setIsRegistering(true)} style={{ color: 'var(--primary-orange)', fontWeight: 600 }}>Register</button></>
              )}
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <section style={{ marginTop: '5.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>One unified workspace for everything</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>From high-level goals to automated daily execution.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            <div className="card">
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--pale-orange)', color: 'var(--primary-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Sparkles size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>AI Goal Planning</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Type an ambitious goal like "Prepare for MCA exams in 30 days" and get a structured milestone breakdown with user approval before database commits.
              </p>
            </div>

            <div className="card">
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Zap size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Visual Automation</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Build event-driven automations with triggers, conditions, and actions. Protects against duplicate runs and logs every execution audit trail.
              </p>
            </div>

            <div className="card">
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Calendar size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Calendar & Tasks</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Month, week, and day views connected to real database records. Reschedule work in one click and track subtasks effortlessly.
              </p>
            </div>

            <div className="card">
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <BarChart3 size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Real Productivity Metrics</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Velocity trends, completion rates, and built-in Pomodoro deep focus session tracking based on actual activity.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem', backgroundColor: '#FFFFFF' }}>
        TaskPilot AI — Amazon Developer Hackathon Submission • Built with React, Vite, Node.js & SQLite
      </footer>
    </div>
  );
}
