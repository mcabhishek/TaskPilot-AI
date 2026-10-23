import React, { useState, useEffect } from 'react';
import {
  Layers,
  Calendar,
  MessageSquare,
  GitBranch,
  Webhook,
  CheckCircle2,
  AlertCircle,
  Play,
  Unlink,
  Link as LinkIcon,
  X
} from 'lucide-react';
import { api } from '../services/api';

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // Connect form modal
  const [configValue, setConfigValue] = useState('');
  const [connecting, setConnecting] = useState(false);

  const loadIntegrations = async () => {
    try {
      const res = await api.getIntegrations();
      setIntegrations(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleTestConnection = async (provider) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testIntegration(provider);
      setTestResult({ provider, message: res.message, latency: res.latencyMs });
    } catch (err) {
      setTestResult({ provider, message: 'Connection test failed.', error: true });
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!selectedIntegration) return;

    setConnecting(true);
    try {
      await api.connectIntegration({
        provider: selectedIntegration.provider,
        name: selectedIntegration.name,
        config: { credential: configValue },
      });
      setSelectedIntegration(null);
      setConfigValue('');
      loadIntegrations();
    } catch (err) {
      alert(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (provider) => {
    if (!window.confirm('Disconnect this integration?')) return;
    try {
      await api.disconnectIntegration(provider);
      loadIntegrations();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (provider) => {
    switch (provider) {
      case 'google_calendar': return <Calendar size={24} color="#EA4335" />;
      case 'slack': return <MessageSquare size={24} color="#4A154B" />;
      case 'github': return <GitBranch size={24} color="#24292E" />;
      default: return <Webhook size={24} color="var(--primary-orange)" />;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Layers size={26} color="var(--primary-orange)" /> Connected Integrations & MCP Tools
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
          Connect third-party productivity tools, calendar synchronization, and automated webhook dispatchers.
        </p>
      </div>

      {testResult && (
        <div style={{
          backgroundColor: testResult.error ? 'var(--error-bg)' : '#ECFDF5',
          border: `1px solid ${testResult.error ? '#FECACA' : '#A7F3D0'}`,
          color: testResult.error ? 'var(--error)' : '#065F46',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} color={testResult.error ? 'var(--error)' : '#059669'} />
          <span>{testResult.message} (Latency: {testResult.latency}ms)</span>
        </div>
      )}

      {/* Integrations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {integrations.map(item => {
          const isConnected = item.status === 'CONNECTED';
          return (
            <div
              key={item.provider}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.5rem',
                borderLeft: `4px solid ${isConnected ? '#10B981' : 'var(--border-color)'}`
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--warm-cream)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getIcon(item.provider)}
                  </div>

                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: isConnected ? '#ECFDF5' : '#F3F4F6',
                    color: isConnected ? '#059669' : '#6B7280'
                  }}>
                    {item.status}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  {item.name}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                  {item.category}
                </span>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '1rem' }}>
                  {item.description}
                </p>

                {item.last_synced_at && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Last Handshake: {new Date(item.last_synced_at).toLocaleTimeString()}
                  </div>
                )}
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {isConnected ? (
                  <>
                    <button
                      onClick={() => handleTestConnection(item.provider)}
                      disabled={testing}
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                    >
                      <Play size={13} /> {testing ? 'Testing...' : 'Test Ping'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(item.provider)}
                      style={{ fontSize: '0.8rem', color: 'var(--error)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Unlink size={14} /> Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedIntegration(item);
                      setConfigValue('');
                    }}
                    className="btn-primary"
                    style={{ width: '100%', fontSize: '0.88rem', padding: '0.5rem' }}
                  >
                    <LinkIcon size={14} /> Connect {item.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CONNECT INTEGRATION MODAL */}
      {selectedIntegration && (
        <div className="modal-overlay" onClick={() => setSelectedIntegration(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Connect {selectedIntegration.name}</h2>
              <button onClick={() => setSelectedIntegration(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {selectedIntegration.description}
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  {selectedIntegration.provider === 'webhook' ? 'Webhook Endpoint URL' : 'API Token / OAuth Client ID'}
                </label>
                <input
                  type="text"
                  placeholder={selectedIntegration.provider === 'webhook' ? 'https://api.yourdomain.com/webhook' : 'paste_token_here...'}
                  value={configValue}
                  onChange={e => setConfigValue(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setSelectedIntegration(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={connecting} className="btn-primary">
                  {connecting ? 'Authenticating...' : 'Authorize Connection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
