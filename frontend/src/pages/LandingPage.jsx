import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Shield,
  Layers,
  Calendar,
  BarChart3,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Zap,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PrimaryButton, SecondaryButton } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useToast } from '../components/common/Toast';

export default function LandingPage() {
  const { user, login, register, demoLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) {
    navigate('/dashboard');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        if (!name.trim()) throw new Error('Please enter your full name');
        await register(name, email, password);
        toast.success('Account created successfully');
      } else {
        await login(email, password);
        toast.success('Signed in successfully');
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
      toast.error(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setError('');
    setLoading(true);
    try {
      await demoLogin();
      toast.success('Welcome to TaskPilot AI demo workspace');
      navigate('/dashboard');
    } catch (err) {
      setError('Demo login failed.');
      toast.error('Failed to initialize demo session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header style={{
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--surface-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary-orange)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(232, 117, 50, 0.3)'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary-text)', letterSpacing: '-0.02em' }}>
              TaskPilot <span style={{ color: 'var(--primary-orange)' }}>AI</span>
            </span>
            <div style={{ fontSize: '0.68rem', color: 'var(--secondary-text)' }}>Plan Smarter. Do More.</div>
          </div>
        </div>

        <button
          onClick={handleDemoAccess}
          className="btn-secondary"
          style={{ fontSize: 'var(--text-xs)', padding: '0.45rem 0.85rem' }}
        >
          Instant Demo Access &rarr;
        </button>
      </header>

      {/* Split-Screen Hero & Auth Section */}
      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', padding: '3.5rem 1.5rem', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3.5rem', alignItems: 'center' }}>
          
          {/* Left: Value Proposition & Product Preview */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: 'var(--soft-peach)',
              color: 'var(--primary-orange)',
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              marginBottom: '1.25rem',
              border: '1px solid #F3DBB8'
            }}>
              <Sparkles size={14} /> Amazon Developer Hackathon Project
            </div>

            <h1 style={{
              fontSize: '2.75rem',
              fontWeight: 700,
              color: 'var(--primary-text)',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem'
            }}>
              Turn your ambitious goals into <span style={{ color: 'var(--primary-orange)' }}>actionable execution.</span>
            </h1>

            <p style={{ fontSize: 'var(--text-md)', color: 'var(--secondary-text)', lineHeight: 1.6, marginBottom: '2rem' }}>
              TaskPilot AI is an all-in-one productivity workspace that turns natural-language requests into structured tasks, calendar schedules, project roadmaps, and event-driven automated workflows.
            </p>

            {/* Benefit Checkpoints */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              {[
                'AI Goal Planning with human approval before database persistence',
                'Task management with priorities, subtask checklists & calendar views',
                'Visual workflow automation with triggers, guards & audit execution logs',
                'Real productivity metrics calculated directly from database records'
              ].map((bullet, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: 'var(--text-sm)', color: 'var(--primary-text)' }}>
                  <div style={{ color: 'var(--primary-orange)', display: 'flex', flexShrink: 0 }}>
                    <CheckCircle2 size={17} />
                  </div>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <PrimaryButton onClick={handleDemoAccess} style={{ padding: '0.65rem 1.35rem', fontSize: 'var(--text-base)' }}>
              <Sparkles size={16} /> Explore Demo Workspace
            </PrimaryButton>
          </div>

          {/* Right: Authentication Card */}
          <Card style={{ padding: '2rem', maxWidth: 430, margin: '0 auto', width: '100%', boxShadow: 'var(--shadow-md)' }}>
            
            {/* Tabs for Sign In vs Register */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setError('');
                }}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  fontSize: 'var(--text-sm)',
                  fontWeight: !isRegistering ? 600 : 500,
                  color: !isRegistering ? 'var(--primary-orange)' : 'var(--secondary-text)',
                  borderBottom: !isRegistering ? '2px solid var(--primary-orange)' : 'none'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setError('');
                }}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  fontSize: 'var(--text-sm)',
                  fontWeight: isRegistering ? 600 : 500,
                  color: isRegistering ? 'var(--primary-orange)' : 'var(--secondary-text)',
                  borderBottom: isRegistering ? '2px solid var(--primary-orange)' : 'none'
                }}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div style={{
                backgroundColor: 'var(--error-bg)',
                color: 'var(--error)',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                marginBottom: '1rem',
                border: '1px solid #F5C6C3'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
              {isRegistering && (
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Full Name</label>
                  <input
                    type="text"
                    placeholder="Alex Rivera"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Email Address</label>
                <input
                  type="email"
                  placeholder="alex@taskpilot.ai"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: '2.25rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.65rem', color: 'var(--text-muted)', display: 'flex' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <PrimaryButton
                type="submit"
                loading={loading}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.65rem' }}
              >
                {isRegistering ? 'Register & Enter Workspace' : 'Sign In'}
              </PrimaryButton>
            </form>

            <div style={{ margin: '1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>OR</span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
            </div>

            {/* Instant Demo Account Access Button */}
            <button
              type="button"
              onClick={handleDemoAccess}
              className="btn-secondary"
              style={{ width: '100%', padding: '0.6rem', fontSize: 'var(--text-sm)' }}
            >
              Sign In with Demo Account (Alex Rivera)
            </button>
          </Card>
        </div>

        {/* Feature Highlights Grid */}
        <section style={{ marginTop: '5.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 className="heading-section" style={{ fontSize: 'var(--text-2xl)' }}>One workspace for everything</h2>
            <p style={{ color: 'var(--secondary-text)', marginTop: '0.35rem' }}>Tasks, calendars, notes, automated workflows, and verified analytics.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <Card style={{ padding: '1.5rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--soft-peach)', color: 'var(--primary-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Sparkles size={20} />
              </div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: '0.35rem' }}>AI Goal Breakdown</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                Converts natural language goals into structured milestones and tasks, with full review before database persistence.
              </p>
            </Card>

            <Card style={{ padding: '1.5rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Zap size={20} />
              </div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: '0.35rem' }}>Visual Automation</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                Event-driven automation engine with triggers, conditions, duplicate run protection, and verified execution logs.
              </p>
            </Card>

            <Card style={{ padding: '1.5rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Calendar size={20} />
              </div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: '0.35rem' }}>Interactive Calendar</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                Monthly grid and agenda schedules linked to real database tasks with quick drag/click rescheduling.
              </p>
            </Card>

            <Card style={{ padding: '1.5rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <BarChart3 size={20} />
              </div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: '0.35rem' }}>Verified Telemetry</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                Velocity trends, priority distribution, and built-in Pomodoro focus blocks tracked to actual activity events.
              </p>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '1.5rem 2rem',
        textAlign: 'center',
        color: 'var(--secondary-text)',
        fontSize: 'var(--text-xs)',
        backgroundColor: 'var(--surface-primary)'
      }}>
        TaskPilot AI — Amazon Developer Hackathon Project • Built with React, Vite, Node.js & SQLite
      </footer>
    </div>
  );
}
