import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  ListTodo,
  MessageSquare,
  FileText,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';

export default function AIAssistant() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('planner'); // 'planner' | 'chat' | 'summarizer'

  // Planner state
  const [goalPrompt, setGoalPrompt] = useState('');
  const [planning, setPlanning] = useState(false);
  const [proposedPlan, setProposedPlan] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [approving, setApproving] = useState(false);
  const [approvalResult, setApprovalResult] = useState(null);
  const [error, setError] = useState('');

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'init-1',
      sender: 'assistant',
      text: 'Hello! I am TaskPilot AI. I can analyze your goals, create structured roadmaps, break projects into tasks, or summarize complex notes. What would you like to accomplish today?',
      created_at: new Date().toISOString()
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Summarizer state
  const [summaryInput, setSummaryInput] = useState('');
  const [summaryResult, setSummaryResult] = useState(null);
  const [summarizing, setSummarizing] = useState(false);

  const sampleGoals = [
    'Help me prepare for my MCA exams in 30 days',
    'Build and launch a SaaS landing page in 2 weeks',
    'Organize a 10-day cross-functional sprint for our mobile app',
    'Write a technical research paper on distributed systems'
  ];

  const handleGeneratePlan = async (promptToUse) => {
    const text = promptToUse || goalPrompt;
    if (!text.trim()) return;

    setPlanning(true);
    setError('');
    setProposedPlan(null);
    setApprovalResult(null);

    try {
      const res = await api.generateAIPlan(text.trim());
      setPlanId(res.planId);
      setProposedPlan(res.plan);
    } catch (err) {
      setError(err.message || 'Failed to generate plan.');
    } finally {
      setPlanning(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!planId || !proposedPlan) return;
    setApproving(true);
    setError('');

    try {
      const res = await api.approveAIPlan(planId, proposedPlan);
      setApprovalResult(res);
      setProposedPlan(null);
    } catch (err) {
      setError(err.message || 'Failed to approve plan.');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectPlan = async () => {
    if (!planId) return;
    try {
      await api.rejectAIPlan(planId);
      setProposedPlan(null);
      setPlanId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTaskFromPlan = (index) => {
    if (!proposedPlan) return;
    const updatedTasks = proposedPlan.tasks.filter((_, i) => i !== index);
    setProposedPlan({ ...proposedPlan, tasks: updatedTasks });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: chatInput.trim(),
      created_at: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMsg]);
    const promptToSend = chatInput;
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.chatAI(promptToSend);
      setChatMessages(prev => [...prev, res.message]);
    } catch (err) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'assistant',
        text: 'Sorry, I encountered an issue retrieving workspace data.',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!summaryInput.trim() || summarizing) return;
    setSummarizing(true);
    setSummaryResult(null);

    try {
      const res = await api.summarizeNotes(summaryInput);
      setSummaryResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div>
      {/* Title & Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Sparkles size={26} color="var(--primary-orange)" /> AI Workspace Copilot
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Transform natural-language goals into validated project roadmaps, database tasks, and summaries.
          </p>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 4 }}>
          <button
            onClick={() => setActiveTab('planner')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: activeTab === 'planner' ? 'var(--pale-orange)' : 'transparent',
              color: activeTab === 'planner' ? 'var(--primary-orange)' : 'var(--text-secondary)'
            }}
          >
            <ListTodo size={16} /> Goal Planner
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: activeTab === 'chat' ? 'var(--pale-orange)' : 'transparent',
              color: activeTab === 'chat' ? 'var(--primary-orange)' : 'var(--text-secondary)'
            }}
          >
            <MessageSquare size={16} /> Assistant Chat
          </button>
          <button
            onClick={() => setActiveTab('summarizer')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: activeTab === 'summarizer' ? 'var(--pale-orange)' : 'transparent',
              color: activeTab === 'summarizer' ? 'var(--primary-orange)' : 'var(--text-secondary)'
            }}
          >
            <FileText size={16} /> Note Summarizer
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'var(--error-bg)',
          color: 'var(--error)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem',
          border: '1px solid #FECACA'
        }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* SUCCESS APPROVAL BANNER */}
      {approvalResult && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#065F46', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            <CheckCircle2 size={24} color="#059669" />
            Plan Approved & Persisted to Workspace!
          </div>
          <p style={{ color: '#047857', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
            Created 1 new Project, Milestones, and {approvalResult.tasksCreatedCount} scheduled tasks in your SQLite database.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/tasks')}
              className="btn-primary"
              style={{ backgroundColor: '#059669', fontSize: '0.88rem' }}
            >
              View Generated Tasks <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="btn-secondary"
              style={{ fontSize: '0.88rem' }}
            >
              View Project Board
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: GOAL PLANNER */}
      {activeTab === 'planner' && (
        <div>
          {/* Input Card */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Describe what you want to achieve
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              The AI generates milestones, tasks, priorities, and subtasks. You can review and edit every detail before approving it to your database.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="e.g. Help me prepare for my MCA exams in 30 days..."
                value={goalPrompt}
                onChange={e => setGoalPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGeneratePlan()}
                style={{ flex: 1, minWidth: 260 }}
              />
              <button
                onClick={() => handleGeneratePlan()}
                disabled={planning || !goalPrompt.trim()}
                className="btn-primary"
                style={{ minWidth: 150 }}
              >
                <Sparkles size={16} />
                {planning ? 'Analyzing Goal...' : 'Generate Plan'}
              </button>
            </div>

            {/* Quick Suggestions Chips */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Quick Prompts:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {sampleGoals.map((g, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setGoalPrompt(g);
                      handleGeneratePlan(g);
                    }}
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--warm-cream)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontWeight: 500
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-orange)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    + {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Proposed Plan Review Interface */}
          {proposedPlan && (
            <div className="card" style={{ border: '2px solid var(--primary-orange)', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: 'var(--pale-orange)',
                    color: 'var(--deep-orange)',
                    padding: '0.2rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem'
                  }}>
                    <Sparkles size={13} /> Proposed AI Plan (Awaiting Human Review)
                  </div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {proposedPlan.projectName}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    {proposedPlan.summary}
                  </p>
                </div>

                {/* Approve / Reject Controls */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={handleRejectPlan}
                    className="btn-secondary"
                    style={{ color: 'var(--error)', borderColor: '#FECACA' }}
                  >
                    <XCircle size={16} /> Reject Plan
                  </button>
                  <button
                    onClick={handleApprovePlan}
                    disabled={approving}
                    className="btn-primary"
                    style={{ backgroundColor: '#059669', boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)' }}
                  >
                    <CheckCircle2 size={16} />
                    {approving ? 'Persisting to DB...' : 'Approve & Create Tasks'}
                  </button>
                </div>
              </div>

              {/* Milestones Chips */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--warm-cream)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>
                  Proposed Milestones:
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {proposedPlan.milestones.map((m, mIdx) => (
                    <span key={mIdx} style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--deep-orange)'
                    }}>
                      Step {mIdx + 1}: {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tasks List */}
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                Action Items ({proposedPlan.tasks.length} tasks ready for approval)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {proposedPlan.tasks.map((t, idx) => (
                  <div key={idx} style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                          {idx + 1}. {t.title}
                        </span>
                        <span className={`badge badge-${t.priority.toLowerCase()}`}>
                          {t.priority}
                        </span>
                      </div>

                      <button
                        onClick={() => handleRemoveTaskFromPlan(idx)}
                        title="Remove task"
                        style={{ color: 'var(--text-muted)', padding: '0.35rem' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {t.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={14} /> Est: {t.estimatedDurationMinutes} mins
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={14} /> Day {t.dayOffset} offset
                      </span>
                      {t.milestoneTitle && (
                        <span style={{ color: 'var(--primary-orange)', fontWeight: 600 }}>
                          Milestone: {t.milestoneTitle}
                        </span>
                      )}
                    </div>

                    {/* Subtasks */}
                    {t.subtasks && t.subtasks.length > 0 && (
                      <div style={{ marginTop: '0.35rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {t.subtasks.map((sub, sIdx) => (
                          <div key={sIdx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--primary-orange)' }} />
                            <span>{sub}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSISTANT CHAT */}
      {activeTab === 'chat' && (
        <div className="card" style={{ height: 600, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#FAFAFA', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--primary-orange)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Conversational Copilot</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>— connected to live workspace telemetry</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {chatMessages.map(msg => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '0.85rem 1.1rem',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: msg.sender === 'user' ? 'var(--primary-orange)' : '#FFFFFF',
                  color: msg.sender === 'user' ? '#FFFFFF' : 'var(--text-main)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  fontSize: '0.92rem',
                  lineHeight: 1.45
                }}
              >
                {msg.text}
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: 'flex-start', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: '#F3F4F6', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Analyzing workspace data...
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              placeholder="Ask a question or request task analysis..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
            />
            <button type="submit" disabled={chatLoading} className="btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: NOTE SUMMARIZER */}
      {activeTab === 'summarizer' && (
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>Note & Document Summarizer</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Paste meeting notes, syllabus outlines, or technical specifications to extract key takeaways and actionable to-do items.
          </p>

          <textarea
            rows={6}
            placeholder="Paste your notes here..."
            value={summaryInput}
            onChange={e => setSummaryInput(e.target.value)}
            style={{ marginBottom: '1rem', resize: 'vertical' }}
          />

          <button
            onClick={handleSummarize}
            disabled={summarizing || !summaryInput.trim()}
            className="btn-primary"
            style={{ marginBottom: '1.5rem' }}
          >
            <Sparkles size={16} /> {summarizing ? 'Summarizing...' : 'Extract Key Actions'}
          </button>

          {summaryResult && (
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--warm-cream)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                {summaryResult.title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {summaryResult.summary}
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                  Key Takeaways:
                </span>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {summaryResult.keyTakeaways.map((t, idx) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}>{t}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--deep-orange)', display: 'block', marginBottom: '0.35rem' }}>
                  Extracted Action Items:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {summaryResult.actionItems.map((act, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      <CheckCircle2 size={16} color="var(--primary-orange)" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
