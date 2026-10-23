import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  Calendar,
  ListTodo,
  MessageSquare,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { PrimaryButton, SecondaryButton } from '../components/common/Button';
import { PriorityBadge } from '../components/common/Badge';
import { useToast } from '../components/common/Toast';

export default function AIAssistant() {
  const navigate = useNavigate();
  const toast = useToast();
  const messagesEndRef = useRef(null);

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'planner'
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: "Hello! I am **TaskPilot AI**, your productivity copilot.\n\nI can analyze your goals, create structured roadmaps with milestones and subtasks, extract actionable tasks from notes, or help you schedule upcoming deadlines.\n\nWhat would you like to achieve today?",
      created_at: new Date().toISOString()
    }
  ]);

  // Planner state
  const [goalPrompt, setGoalPrompt] = useState('');
  const [planning, setPlanning] = useState(false);
  const [proposedPlan, setProposedPlan] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [approving, setApproving] = useState(false);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const samplePrompts = [
    'Help me prepare for my MCA exams in 30 days',
    'Plan a 14-day sprint to launch our SaaS MVP',
    'Break down a distributed database architecture research paper',
    'How many active tasks do I have due this week?'
  ];

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: chatInput.trim(),
      created_at: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMsg]);
    const promptToSend = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.chatAI(promptToSend);
      setChatMessages(prev => [...prev, res.message]);
    } catch (err) {
      toast.error('AI assistant encountered a connection issue');
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          text: "I couldn't complete that query. Please make sure the TaskPilot backend is running.",
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGeneratePlan = async (promptText) => {
    const text = promptText || goalPrompt;
    if (!text.trim()) return;

    setPlanning(true);
    setProposedPlan(null);
    try {
      const res = await api.generateAIPlan(text.trim());
      setPlanId(res.planId);
      setProposedPlan(res.plan);
      setActiveTab('planner');
      toast.success('Generated structured plan roadmap');
    } catch (err) {
      toast.error('Failed to generate plan');
    } finally {
      setPlanning(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!planId || !proposedPlan) return;
    setApproving(true);
    try {
      const res = await api.approveAIPlan(planId, proposedPlan);
      confetti({ particleCount: 70, spread: 80 });
      toast.success(`Created project and ${res.tasksCreatedCount} tasks in workspace database!`);
      setProposedPlan(null);
      setPlanId(null);
      navigate('/tasks');
    } catch (err) {
      toast.error('Failed to approve and save plan');
    } finally {
      setApproving(false);
    }
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handleRemoveTaskFromPlan = (idx) => {
    if (!proposedPlan) return;
    const updated = proposedPlan.tasks.filter((_, i) => i !== idx);
    setProposedPlan({ ...proposedPlan, tasks: updated });
  };

  // Simple Markdown Formatter Helper
  const renderMessageContent = (text, msgId) => {
    // If text contains code block ```
    if (text.includes('```')) {
      const parts = text.split(/```/g);
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          // Code block
          return (
            <div key={index} style={{
              margin: '0.65rem 0',
              backgroundColor: '#1E1E1E',
              color: '#D4D4D4',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              position: 'relative',
              fontSize: '0.82rem',
              fontFamily: 'monospace',
              overflowX: 'auto'
            }}>
              <button
                onClick={() => handleCopyText(part.trim(), `${msgId}-${index}`)}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: '#FFF',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 4,
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                {copiedCodeId === `${msgId}-${index}` ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                <span>{copiedCodeId === `${msgId}-${index}` ? 'Copied' : 'Copy'}</span>
              </button>
              <pre>{part.trim()}</pre>
            </div>
          );
        }
        return <span key={index} style={{ whiteSpace: 'pre-line' }}>{part}</span>;
      });
    }

    return <span style={{ whiteSpace: 'pre-line' }}>{text}</span>;
  };

  return (
    <div>
      <PageHeader
        title="AI Productivity Copilot"
        subtitle="Conversational planning, intelligent goal breakdowns, and automated deliverable synthesis."
        actions={
          <div style={{ display: 'flex', backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                backgroundColor: activeTab === 'chat' ? 'var(--soft-peach)' : 'transparent',
                color: activeTab === 'chat' ? 'var(--primary-orange)' : 'var(--secondary-text)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <MessageSquare size={14} /> Assistant Chat
            </button>
            <button
              onClick={() => setActiveTab('planner')}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                backgroundColor: activeTab === 'planner' ? 'var(--soft-peach)' : 'transparent',
                color: activeTab === 'planner' ? 'var(--primary-orange)' : 'var(--secondary-text)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <ListTodo size={14} /> Goal Planner
            </button>
          </div>
        }
      />

      {/* TAB 1: CONVERSATIONAL ASSISTANT */}
      {activeTab === 'chat' && (
        <Card style={{ height: 620, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          
          {/* Chat Header */}
          <div style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--surface-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--primary-orange)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={14} />
              </div>
              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--primary-text)' }}>
                Conversational Copilot
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>• Connected to workspace database</span>
            </div>

            <button
              onClick={() => {
                setChatMessages([
                  {
                    id: Date.now().toString(),
                    sender: 'assistant',
                    text: 'Chat history cleared. How can I help you plan or execute your work next?',
                    created_at: new Date().toISOString()
                  }
                ]);
              }}
              style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <RotateCcw size={12} /> Clear Chat
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {chatMessages.map(msg => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: isUser ? 'var(--primary-orange)' : 'var(--surface-secondary)',
                    color: isUser ? '#FFFFFF' : 'var(--primary-text)',
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.5,
                    border: isUser ? 'none' : '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-xs)'
                  }}>
                    {renderMessageContent(msg.text, msg.id)}
                  </div>

                  {/* Contextual Action Button for AI Plan Suggestion */}
                  {!isUser && msg.text.toLowerCase().includes('plan') && (
                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setGoalPrompt('Help me prepare for my exams in 30 days');
                          handleGeneratePlan('Help me prepare for my exams in 30 days');
                        }}
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--primary-orange)',
                          backgroundColor: 'var(--soft-peach)',
                          border: '1px solid #F3DBB8',
                          padding: '0.25rem 0.65rem',
                          borderRadius: 'var(--radius-full)',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <ListTodo size={12} /> Generate 30-Day Exam Plan
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {chatLoading && (
              <div style={{ alignSelf: 'flex-start', padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-secondary)', color: 'var(--secondary-text)', fontSize: 'var(--text-xs)' }}>
                Synthesizing response from workspace context...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div style={{ padding: '0.5rem 1rem 0.2rem', backgroundColor: 'var(--surface-primary)', display: 'flex', gap: '0.45rem', overflowX: 'auto' }}>
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setChatInput(p);
                }}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--secondary-text)',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-orange)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              >
                + {p}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.65rem' }}>
            <input
              type="text"
              placeholder="Ask anything or propose a goal (e.g. 'How many tasks are overdue?')..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
            />
            <PrimaryButton type="submit" loading={chatLoading} style={{ padding: '0.55rem 1rem' }}>
              <Send size={15} />
            </PrimaryButton>
          </form>
        </Card>
      )}

      {/* TAB 2: STRUCTURED GOAL PLANNER */}
      {activeTab === 'planner' && (
        <div>
          {/* Goal Prompt Generator Card */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <h2 className="heading-section" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.35rem' }}>
              Natural Language Goal Breakdown
            </h2>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--secondary-text)', marginBottom: '1.15rem' }}>
              Describe your objective. The AI formulates a reviewable roadmap of milestones, tasks, and estimated durations.
            </p>

            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="e.g. Help me prepare for my MCA exams in 30 days..."
                value={goalPrompt}
                onChange={e => setGoalPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGeneratePlan()}
                style={{ flex: 1, minWidth: 260 }}
              />
              <PrimaryButton onClick={() => handleGeneratePlan()} loading={planning} icon={Sparkles}>
                {planning ? 'Planning...' : 'Generate Roadmap'}
              </PrimaryButton>
            </div>
          </Card>

          {/* Proposed Plan Review Interface */}
          {proposedPlan && (
            <Card style={{ border: '2px solid var(--primary-orange)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    backgroundColor: 'var(--soft-peach)',
                    color: 'var(--primary-orange)',
                    padding: '0.15rem 0.55rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    marginBottom: '0.35rem'
                  }}>
                    <Sparkles size={12} /> Proposed Action Plan (Review & Edit Before Persistence)
                  </div>
                  <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--primary-text)' }}>
                    {proposedPlan.projectName}
                  </h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', marginTop: '0.2rem' }}>
                    {proposedPlan.summary}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <SecondaryButton onClick={() => setProposedPlan(null)} style={{ color: 'var(--error)' }}>
                    <XCircle size={15} /> Reject
                  </SecondaryButton>
                  <PrimaryButton onClick={handleApprovePlan} loading={approving} style={{ backgroundColor: 'var(--success)' }}>
                    <CheckCircle2 size={15} /> Approve & Commit
                  </PrimaryButton>
                </div>
              </div>

              {/* Milestones Chips */}
              <div style={{ backgroundColor: 'var(--surface-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                <span className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Proposed Milestones:
                </span>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  {proposedPlan.milestones.map((m, idx) => (
                    <span key={idx} style={{
                      backgroundColor: 'var(--surface-primary)',
                      border: '1px solid var(--border)',
                      padding: '0.25rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'var(--primary-orange)'
                    }}>
                      Phase {idx + 1}: {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actionable Tasks List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {proposedPlan.tasks.map((t, idx) => (
                  <div key={idx} style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-primary)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--primary-text)' }}>
                          {idx + 1}. {t.title}
                        </span>
                        <PriorityBadge priority={t.priority} />
                      </div>

                      <button
                        onClick={() => handleRemoveTaskFromPlan(idx)}
                        style={{ color: 'var(--text-muted)', padding: '0.25rem' }}
                        title="Remove task"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)' }}>
                      {t.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={13} /> {t.estimatedDurationMinutes} mins
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={13} /> Day +{t.dayOffset}
                      </span>
                      {t.milestoneTitle && <span style={{ color: 'var(--primary-orange)', fontWeight: 500 }}>{t.milestoneTitle}</span>}
                    </div>

                    {t.subtasks && t.subtasks.length > 0 && (
                      <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dashed var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {t.subtasks.map((sub, sIdx) => (
                          <div key={sIdx} style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--primary-orange)' }} />
                            <span>{sub}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
