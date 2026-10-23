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
  Database,
  Bot
} from 'lucide-react';
import { api } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { PrimaryButton, SecondaryButton } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Modal, ConfirmationDialog } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';

export default function Integrations() {
  const toast = useToast();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Form
  const [configValue, setConfigValue] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnectingProvider, setDisconnectingProvider] = useState(null);
  const [testingProvider, setTestingProvider] = useState(null);

  const loadIntegrations = async () => {
    try {
      const res = await api.getIntegrations();
      setIntegrations(res);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleTestPing = async (provider) => {
    setTestingProvider(provider);
    try {
      const res = await api.testIntegration(provider);
      toast.success(`${res.message} (Latency: ${res.latencyMs}ms)`);
    } catch (err) {
      toast.error('Ping handshake test failed');
    } finally {
      setTestingProvider(null);
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
      toast.success(`${selectedIntegration.name} connected successfully`);
      setSelectedIntegration(null);
      setConfigValue('');
      loadIntegrations();
    } catch (err) {
      toast.error(err.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const confirmDisconnect = async () => {
    if (!disconnectingProvider) return;
    try {
      await api.disconnectIntegration(disconnectingProvider);
      toast.info('Integration disconnected');
      loadIntegrations();
    } catch (err) {
      toast.error('Failed to disconnect integration');
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const getServiceIcon = (provider) => {
    switch (provider) {
      case 'google_calendar': return <Calendar size={22} color="#EA4335" />;
      case 'slack': return <MessageSquare size={22} color="#4A154B" />;
      case 'github': return <GitBranch size={22} color="#24292E" />;
      default: return <Webhook size={22} color="var(--primary-orange)" />;
    }
  };

  const categories = ['All', 'Calendar & Scheduling', 'Communication', 'Developer Tools'];

  const filtered = selectedCategory === 'All'
    ? integrations
    : integrations.filter(i => i.category === selectedCategory);

  return (
    <div>
      <PageHeader
        title="Connected Integrations & MCP Tools"
        subtitle="Connect calendar synchronization, notification channels, code repositories, and custom webhook dispatchers."
      />

      {/* Categories Tabs */}
      <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {categories.map(cat => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                backgroundColor: isSelected ? 'var(--soft-peach)' : 'var(--surface-primary)',
                color: isSelected ? 'var(--primary-orange)' : 'var(--secondary-text)',
                border: isSelected ? '1px solid #F3DBB8' : '1px solid var(--border)',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Integrations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filtered.map(item => {
          const isConnected = item.status === 'CONNECTED';
          return (
            <Card
              key={item.provider}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.5rem',
                borderLeft: `3px solid ${isConnected ? 'var(--success)' : 'var(--border)'}`
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getServiceIcon(item.provider)}
                  </div>

                  <span style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: isConnected ? 'var(--success-bg)' : 'var(--surface-secondary)',
                    color: isConnected ? 'var(--success)' : 'var(--text-muted)'
                  }}>
                    {item.status}
                  </span>
                </div>

                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--primary-text)', marginBottom: '0.2rem' }}>
                  {item.name}
                </h3>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '0.65rem' }}>
                  {item.category}
                </span>

                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', lineHeight: 1.45, marginBottom: '1rem' }}>
                  {item.description}
                </p>

                {item.last_synced_at && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Active handshake verified: {new Date(item.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              <div style={{ paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {isConnected ? (
                  <>
                    <SecondaryButton
                      onClick={() => handleTestPing(item.provider)}
                      loading={testingProvider === item.provider}
                      style={{ fontSize: 'var(--text-xs)', padding: '0.35rem 0.75rem' }}
                    >
                      <Play size={12} /> Test Ping
                    </SecondaryButton>
                    <button
                      onClick={() => setDisconnectingProvider(item.provider)}
                      style={{ fontSize: 'var(--text-xs)', color: 'var(--error)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Unlink size={13} /> Disconnect
                    </button>
                  </>
                ) : (
                  <PrimaryButton
                    onClick={() => {
                      setSelectedIntegration(item);
                      setConfigValue('');
                    }}
                    style={{ width: '100%', fontSize: 'var(--text-sm)', padding: '0.45rem' }}
                  >
                    <LinkIcon size={14} /> Connect {item.name}
                  </PrimaryButton>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* CONNECT INTEGRATION MODAL */}
      <Modal
        isOpen={Boolean(selectedIntegration)}
        onClose={() => setSelectedIntegration(null)}
        title={selectedIntegration ? `Connect ${selectedIntegration.name}` : ''}
        maxWidth={480}
      >
        {selectedIntegration && (
          <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)' }}>
              {selectedIntegration.description}
            </p>

            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                {selectedIntegration.provider === 'webhook' ? 'Webhook Target URL' : 'API Access Token / Client ID'}
              </label>
              <input
                type="text"
                placeholder={selectedIntegration.provider === 'webhook' ? 'https://api.yourdomain.com/webhook' : 'paste_token_here...'}
                value={configValue}
                onChange={e => setConfigValue(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
              <SecondaryButton onClick={() => setSelectedIntegration(null)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" loading={connecting}>
                Authorize Connection
              </PrimaryButton>
            </div>
          </form>
        )}
      </Modal>

      {/* DISCONNECT CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={Boolean(disconnectingProvider)}
        onClose={() => setDisconnectingProvider(null)}
        onConfirm={confirmDisconnect}
        title="Disconnect Integration"
        message="Are you sure you want to disconnect this integration? Automated sync and webhooks will cease until reconnected."
        confirmText="Disconnect"
        destructive={true}
      />
    </div>
  );
}
