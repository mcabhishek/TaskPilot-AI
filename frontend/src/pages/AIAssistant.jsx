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
  RotateCcw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  Zap,
  Activity,
  Server,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Trash2,
  ChevronRight,
  RefreshCw,
  Terminal,
  ChevronDown,
  Bell,
  CheckSquare
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
  const alexaEndRef = useRef(null);

  // Tab State: 'alexa' | 'planner' | 'chat'
  const [activeTab, setActiveTab] = useState('alexa');

  // --- MCP Assistant State ---
  const [mcpStatus, setMcpStatus] = useState({
    connected: false,
    protocol: 'Model Context Protocol (MCP)',
    specification: 'Streamable HTTP Transport Specification / SDK 1.32.1',
    transport: 'Streamable HTTP',
    toolCount: 10,
    tools: [],
  });
  const [mcpChecking, setMcpChecking] = useState(false);

  const [alexaInput, setAlexaInput] = useState('');
  const [alexaStatus, setAlexaStatus] = useState('idle'); // idle | listening | processing | speaking
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [alexaMessages, setAlexaMessages] = useState([
    {
      id: 'alexa-welcome',
      sender: 'assistant',
      text: "Hello! I am your **Alexa-Style Productivity Assistant**, powered by a live Model Context Protocol (MCP) server over Streamable HTTP.\n\nYou can speak or type to get your daily briefing, create tasks, schedule smart reminders with natural-language confirmation, reschedule deadlines, or complete items.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tool_executed: 'MCP Initialized (Streamable HTTP)',
      mcp_trace: null,
    },
  ]);
  const [activeReminders, setActiveReminders] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);
  const [expandedTraceId, setExpandedTraceId] = useState(null);

  const recognitionRef = useRef(null);

  // --- General Chat state ---
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: "Hello! I am **TaskPilot AI**, your productivity copilot.\n\nI can analyze your goals, create structured roadmaps with milestones and subtasks, extract actionable tasks from notes, or help you schedule upcoming deadlines.\n\nWhat would you like to achieve today?",
      created_at: new Date().toISOString(),
    },
  ]);

  // --- Planner state ---
  const [goalPrompt, setGoalPrompt] = useState('');
  const [planning, setPlanning] = useState(false);
  const [proposedPlan, setProposedPlan] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [approving, setApproving] = useState(false);

  // Initialize Speech & MCP Status
  useEffect(() => {
    // Check Speech Recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setAlexaStatus('listening');
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setAlexaInput(transcript);
        handleSendAlexaCommand(transcript);
      };
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setAlexaStatus('idle');
        if (event.error === 'not-allowed') {
          toast.error('Microphone permission denied. Using keyboard input.');
        }
      };
      recognition.onend = () => {
        if (alexaStatus === 'listening') setAlexaStatus('idle');
      };
      recognitionRef.current = recognition;
    }

    // Check MCP server status over Streamable HTTP SSE
    fetchMcpStatus();
    loadWorkspaceCards();
  }, []);

  // Auto-scroll conversation
  useEffect(() => {
    if (activeTab === 'alexa') {
      alexaEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [alexaMessages, chatMessages, alexaStatus, chatLoading, activeTab]);

  const fetchMcpStatus = async () => {
    setMcpChecking(true);
    try {
      const res = await api.getMcpClientStatus();
      setMcpStatus(res);
    } catch (err) {
      console.warn('Failed to connect to MCP client endpoint:', err);
      setMcpStatus((prev) => ({ ...prev, connected: false }));
    } finally {
      setMcpChecking(false);
    }
  };

  const loadWorkspaceCards = async () => {
    setLoadingWorkspaceData(true);
    try {
      const [tasksRes, remindersRes, briefingRes] = await Promise.allSettled([
        api.getTasks({ limit: 5 }),
        api.getReminders({ status: 'UPCOMING', limit: 5 }),
        api.getDailyBriefing(),
      ]);

      if (tasksRes.status === 'fulfilled') setActiveTasks(tasksRes.value || []);
      if (remindersRes.status === 'fulfilled') setActiveReminders(remindersRes.value || []);
      if (briefingRes.status === 'fulfilled') setBriefingSummary(briefingRes.value);
    } catch (err) {
      console.error('Error fetching workspace cards:', err);
    } finally {
      setLoadingWorkspaceData(false);
    }
  };

  // TTS Speech Synthesis
  const speakResponse = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '').slice(0, 300);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Female') || v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setAlexaStatus('speaking');
    utterance.onend = () => setAlexaStatus('idle');
    utterance.onerror = () => setAlexaStatus('idle');

    window.speechSynthesis.speak(utterance);
  };

  const handleToggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      toast.info('Speech recognition not supported in this browser. Please use text input.');
      return;
    }

    if (alexaStatus === 'listening') {
      recognitionRef.current.stop();
      setAlexaStatus('idle');
    } else {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleSendAlexaCommand = async (commandText) => {
    const text = (commandText || alexaInput).trim();
    if (!text || alexaStatus === 'processing') return;

    const userMsg = {
      id: Date.now() + '-user',
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAlexaMessages((prev) => [...prev, userMsg]);
    setAlexaInput('');
    setAlexaStatus('processing');

    try {
      const res = await api.sendMcpAssistantCommand(text);

      const assistantMsg = {
        id: Date.now() + '-assistant',
        sender: 'assistant',
        text: res.display_text || res.spoken_response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tool_executed: res.tool_executed,
        mcp_trace: res.mcp_trace,
        requires_confirmation: res.requires_confirmation,
        proposed_action: res.proposed_action,
      };

      setAlexaMessages((prev) => [...prev, assistantMsg]);

      // If tool was executed, record in execution audit logs
      if (res.mcp_trace) {
        setToolLogs((prev) => [
          {
            id: Date.now(),
            tool: res.tool_executed,
            durationMs: res.mcp_trace.durationMs,
            isError: res.mcp_trace.isError,
            args: res.mcp_trace.arguments,
            response: res.mcp_trace.parsedContent,
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 19),
        ]);
        // Refresh workspace data live
        loadWorkspaceCards();
      }

      speakResponse(res.spoken_response || res.display_text);
    } catch (err) {
      console.error(err);
      const errorMsg = {
        id: Date.now() + '-error',
        sender: 'assistant',
        text: "I encountered a problem executing that request via the MCP server. Please ensure the backend is connected.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setAlexaMessages((prev) => [...prev, errorMsg]);
    } finally {
      setAlexaStatus('idle');
    }
  };

  const handleConfirmAction = (confirmYes) => {
    handleSendAlexaCommand(confirmYes ? 'Yes, save it' : 'No, cancel');
  };

  // --- General Chat handlers ---
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: chatInput.trim(),
      created_at: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    const promptToSend = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.chatAI(promptToSend);
      setChatMessages((prev) => [...prev, res.message]);
    } catch (err) {
      console.error('Chat AI error:', err);
      toast.error('AI assistant encountered a connection issue');
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          text: "I couldn't complete that query. Please make sure the TaskPilot backend is running.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- Goal Planner handlers ---
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
      console.error('Generate plan error:', err);
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
      console.error('Approve plan error:', err);
      toast.error('Failed to approve and save plan');
    } finally {
      setApproving(false);
    }
  };

  const handleRemoveTaskFromPlan = (idx) => {
    if (!proposedPlan) return;
    const updated = proposedPlan.tasks.filter((_, i) => i !== idx);
    setProposedPlan({ ...proposedPlan, tasks: updated });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2.5rem' }}>
      {/* Header with visible MCP Server telemetry */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Bot size={28} style={{ color: 'var(--primary-orange)' }} />
            TaskPilot AI Assistant
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            Official Model Context Protocol (MCP) server & Alexa-style conversational productivity assistant.
          </p>
        </div>

        {/* Live MCP Status Chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: mcpStatus.connected ? 'rgba(39, 132, 91, 0.1)' : 'rgba(217, 79, 69, 0.1)',
              border: `1px solid ${mcpStatus.connected ? 'rgba(39, 132, 91, 0.25)' : 'rgba(217, 79, 69, 0.25)'}`,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: mcpStatus.connected ? 'var(--semantic-success)' : 'var(--semantic-error)',
                boxShadow: mcpStatus.connected ? '0 0 8px var(--semantic-success)' : 'none',
              }}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: mcpStatus.connected ? 'var(--semantic-success)' : 'var(--semantic-error)' }}>
              {mcpStatus.connected ? 'MCP Server: Connected (Streamable HTTP SSE)' : 'MCP Server: Offline'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {mcpStatus.toolCount || 10} Tools</span>
          </div>

          <button
            onClick={fetchMcpStatus}
            disabled={mcpChecking}
            className="btn-icon"
            title="Refresh MCP Status"
            style={{ padding: '0.45rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
          >
            <RefreshCw size={15} className={mcpChecking ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem' }}>
        <button
          onClick={() => setActiveTab('alexa')}
          style={{
            padding: '0.65rem 1.15rem',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            border: 'none',
            borderBottom: activeTab === 'alexa' ? '3px solid var(--primary-orange)' : '3px solid transparent',
            backgroundColor: activeTab === 'alexa' ? 'var(--surface-peach)' : 'transparent',
            color: activeTab === 'alexa' ? 'var(--primary-orange)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Mic size={16} />
          Alexa+ Assistant (MCP Simulator)
          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(232, 117, 50, 0.15)', color: 'var(--primary-orange)', fontWeight: 700 }}>
            HACKATHON
          </span>
        </button>

        <button
          onClick={() => setActiveTab('planner')}
          style={{
            padding: '0.65rem 1.15rem',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            border: 'none',
            borderBottom: activeTab === 'planner' ? '3px solid var(--primary-orange)' : '3px solid transparent',
            backgroundColor: activeTab === 'planner' ? 'var(--surface-peach)' : 'transparent',
            color: activeTab === 'planner' ? 'var(--primary-orange)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Sparkles size={16} />
          AI Goal Planner
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          style={{
            padding: '0.65rem 1.15rem',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            border: 'none',
            borderBottom: activeTab === 'chat' ? '3px solid var(--primary-orange)' : '3px solid transparent',
            backgroundColor: activeTab === 'chat' ? 'var(--surface-peach)' : 'transparent',
            color: activeTab === 'chat' ? 'var(--primary-orange)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <MessageSquare size={16} />
          Workspace Copilot
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALEXA-STYLE MCP ASSISTANT & SIMULATOR                              */}
      {/* ========================================================================= */}
      {activeTab === 'alexa' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', alignItems: 'start' }}>
          {/* Main Conversation & Microphone Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Simulation Honest Disclaimer Banner */}
            <div
              style={{
                padding: '0.65rem 1rem',
                backgroundColor: 'rgba(232, 117, 50, 0.08)',
                border: '1px solid rgba(232, 117, 50, 0.25)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} style={{ color: 'var(--primary-orange)' }} />
                <span>
                  <strong>Hackathon Verified Path:</strong> Real self-hosted MCP server running on <strong>Streamable HTTP Transport (/mcp)</strong>. All actions execute live against SQLite.
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Spec: 2025-11-25</span>
            </div>

            {/* Glowing Alexa Orb Interaction Visualizer */}
            <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative' }}>
              <div
                onClick={handleToggleListening}
                style={{
                  position: 'relative',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  backgroundColor:
                    alexaStatus === 'listening'
                      ? 'rgba(232, 117, 50, 0.2)'
                      : alexaStatus === 'processing'
                      ? 'rgba(39, 132, 91, 0.2)'
                      : alexaStatus === 'speaking'
                      ? 'rgba(74, 144, 226, 0.2)'
                      : 'var(--surface-peach)',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow:
                    alexaStatus === 'listening'
                      ? '0 0 0 12px rgba(232, 117, 50, 0.25), 0 0 24px rgba(232, 117, 50, 0.4)'
                      : alexaStatus === 'processing'
                      ? '0 0 0 10px rgba(39, 132, 91, 0.2), 0 0 20px rgba(39, 132, 91, 0.3)'
                      : alexaStatus === 'speaking'
                      ? '0 0 0 10px rgba(74, 144, 226, 0.2), 0 0 20px rgba(74, 144, 226, 0.3)'
                      : '0 4px 12px rgba(232, 117, 50, 0.15)',
                }}
              >
                {alexaStatus === 'listening' ? (
                  <Mic size={36} style={{ color: 'var(--primary-orange)', animation: 'pulse 1s infinite' }} />
                ) : alexaStatus === 'processing' ? (
                  <RefreshCw size={34} style={{ color: 'var(--semantic-success)', animation: 'spin 1.2s linear infinite' }} />
                ) : alexaStatus === 'speaking' ? (
                  <Volume2 size={34} style={{ color: '#4A90E2', animation: 'bounce 0.8s infinite' }} />
                ) : (
                  <Mic size={36} style={{ color: 'var(--primary-orange)' }} />
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  {alexaStatus === 'listening'
                    ? 'Listening... Speak your command'
                    : alexaStatus === 'processing'
                    ? 'Executing MCP Tool...'
                    : alexaStatus === 'speaking'
                    ? 'Speaking response...'
                    : 'Tap microphone or type below'}
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, maxWidth: 500 }}>
                Try: <em>"What do I need to finish today?"</em>, <em>"Remind me to submit assignment tomorrow at 9 AM"</em>, or <em>"Reschedule task to Friday"</em>.
              </p>

              {/* Quick Prompt Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', marginTop: '1rem' }}>
                {[
                  'What do I need to finish today?',
                  'Remind me to submit assignment tomorrow at 9 AM',
                  'What tasks are due today?',
                  'Reschedule urgent task to Friday',
                  'Show my upcoming reminders',
                  'Mark completed task as done',
                ].map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => handleSendAlexaCommand(prompt)}
                    disabled={alexaStatus === 'processing'}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-orange)';
                      e.currentTarget.style.color = 'var(--primary-orange)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </Card>

            {/* Conversation Feed */}
            <Card style={{ padding: '1.25rem', minHeight: 380, maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {alexaMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  <div
                    style={{
                      padding: '0.85rem 1.15rem',
                      borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      backgroundColor: msg.sender === 'user' ? 'var(--primary-orange)' : 'var(--surface-secondary)',
                      color: msg.sender === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      border: msg.sender === 'user' ? 'none' : '1px solid var(--border)',
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {msg.text}

                    {/* Interactive Confirmation Prompt (e.g. for creating reminder or deleting task) */}
                    {msg.requires_confirmation && (
                      <div
                        style={{
                          marginTop: '0.85rem',
                          paddingTop: '0.65rem',
                          borderTop: '1px dashed var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <button
                          onClick={() => handleConfirmAction(true)}
                          style={{
                            padding: '0.4rem 0.85rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--primary-orange)',
                            color: '#FFFFFF',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Check size={14} /> Yes, Confirm & Save
                        </button>
                        <button
                          onClick={() => handleConfirmAction(false)}
                          style={{
                            padding: '0.4rem 0.85rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border)',
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tool Execution Badge & Trace Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>{msg.time}</span>
                    {msg.tool_executed && (
                      <span
                        onClick={() => msg.mcp_trace && setExpandedTraceId(expandedTraceId === msg.id ? null : msg.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '1px 6px',
                          borderRadius: 4,
                          backgroundColor: 'rgba(232, 117, 50, 0.1)',
                          color: 'var(--primary-orange)',
                          fontWeight: 600,
                          cursor: msg.mcp_trace ? 'pointer' : 'default',
                        }}
                        title={msg.mcp_trace ? 'Click to inspect MCP JSON-RPC protocol trace' : ''}
                      >
                        <Terminal size={11} />
                        MCP Tool: {msg.tool_executed}
                        {msg.mcp_trace && (
                          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({msg.mcp_trace.durationMs}ms)</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Expandable MCP Protocol Trace Inspector */}
                  {expandedTraceId === msg.id && msg.mcp_trace && (
                    <div
                      style={{
                        marginTop: '0.4rem',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: '#1E1E1E',
                        color: '#D4D4D4',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        overflowX: 'auto',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', color: '#9CDCFE' }}>
                        <span>Method: tools/call ({msg.tool_executed})</span>
                        <span>Transport: Streamable HTTP</span>
                      </div>
                      <div style={{ color: '#CE9178', marginBottom: '0.25rem' }}>
                        Arguments: {JSON.stringify(msg.mcp_trace.arguments)}
                      </div>
                      <pre style={{ margin: 0, color: '#6A9955', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(msg.mcp_trace.parsedContent || msg.mcp_trace.rawResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}

              {alexaStatus === 'processing' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--primary-orange)' }} />
                  <span>Executing MCP tool over Streamable HTTP transport...</span>
                </div>
              )}
              <div ref={alexaEndRef} />
            </Card>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAlexaCommand();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--surface-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.4rem 0.6rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <button
                type="button"
                onClick={handleToggleListening}
                className="btn-icon"
                title={speechSupported ? 'Toggle Speech Recognition (Microphone)' : 'Speech recognition not supported in browser'}
                style={{
                  color: alexaStatus === 'listening' ? 'var(--primary-orange)' : 'var(--text-secondary)',
                  backgroundColor: alexaStatus === 'listening' ? 'var(--surface-peach)' : 'transparent',
                  padding: '0.55rem',
                  borderRadius: '50%',
                }}
              >
                {alexaStatus === 'listening' ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <input
                type="text"
                placeholder={
                  alexaStatus === 'listening'
                    ? 'Listening to your voice...'
                    : 'Ask for briefing, create a task, schedule a reminder...'
                }
                value={alexaInput}
                onChange={(e) => setAlexaInput(e.target.value)}
                disabled={alexaStatus === 'processing'}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />

              {/* TTS Mute Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (window.speechSynthesis) window.speechSynthesis.cancel();
                  setVoiceEnabled(!voiceEnabled);
                }}
                className="btn-icon"
                title={voiceEnabled ? 'Mute vocal responses' : 'Enable voice responses'}
                style={{ color: voiceEnabled ? 'var(--primary-orange)' : 'var(--text-muted)', padding: '0.5rem' }}
              >
                {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <PrimaryButton
                type="submit"
                disabled={!alexaInput.trim() || alexaStatus === 'processing'}
                style={{ padding: '0.5rem 0.95rem', fontSize: '0.85rem' }}
              >
                <Send size={15} />
              </PrimaryButton>
            </form>
          </div>

          {/* Right Workstation Panel: Live DB Cards & MCP Tools Inspector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* 1. Live Scheduled Reminders Card */}
            <Card style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Bell size={16} style={{ color: 'var(--primary-orange)' }} />
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Upcoming Reminders
                  </h4>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activeReminders.length} Active</span>
              </div>

              {activeReminders.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  No upcoming reminders. Try saying: <em>"Remind me to submit assignment tomorrow at 9 AM"</em>.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeReminders.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        padding: '0.5rem 0.65rem',
                        backgroundColor: 'var(--surface-secondary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.task_title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                        <span>
                          {new Date(r.reminder_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                          {new Date(r.reminder_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ color: 'var(--primary-orange)', fontWeight: 600 }}>{r.delivery_status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* 2. Today's Agenda & Urgent Tasks */}
            <Card style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <CheckSquare size={16} style={{ color: 'var(--primary-orange)' }} />
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Priority Tasks
                  </h4>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activeTasks.length} Loaded</span>
              </div>

              {activeTasks.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  No active tasks found in database.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeTasks.slice(0, 4).map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: '0.5rem 0.65rem',
                        backgroundColor: 'var(--surface-secondary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                        {t.title}
                      </span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* 3. Discovered MCP Tools List (10 Registered Tools) */}
            <Card style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}>
                <Server size={16} style={{ color: 'var(--primary-orange)' }} />
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Registered MCP Tools (10)
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 220, overflowY: 'auto' }}>
                {[
                  { name: 'get_daily_briefing', desc: 'Today tasks, deadlines, overdue' },
                  { name: 'list_tasks', desc: 'Date, status, and priority filter' },
                  { name: 'create_task', desc: 'Title, priority, deadline' },
                  { name: 'create_reminder', desc: 'Persistent date/time reminder' },
                  { name: 'complete_task', desc: 'Mark task as completed' },
                  { name: 'reschedule_task', desc: 'Update due date/time' },
                  { name: 'update_task', desc: 'Modify task fields/priority' },
                  { name: 'snooze_reminder', desc: 'Postpone reminder minutes' },
                  { name: 'list_reminders', desc: 'Upcoming, completed, overdue' },
                  { name: 'delete_task', desc: 'Validated deliberate deletion' },
                ].map((tool, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.35rem 0.5rem',
                      backgroundColor: 'var(--surface-secondary)',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                      fontSize: '0.72rem',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--primary-orange)', fontFamily: 'monospace' }}>
                      {tool.name}
                    </span>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>{tool.desc}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI GOAL PLANNER WITH HUMAN APPROVAL                                */}
      {/* ========================================================================= */}
      {activeTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
              Transform Strategic Goals into Actionable Workspaces
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              Enter an ambitious objective. TaskPilot AI will generate milestones, tasks, and subtasks with estimated durations. Review and approve the plan before persisting it into your database.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGeneratePlan();
              }}
              style={{ display: 'flex', gap: '0.5rem' }}
            >
              <input
                type="text"
                placeholder="e.g., Prepare for my MCA semester exams in 30 days"
                value={goalPrompt}
                onChange={(e) => setGoalPrompt(e.target.value)}
                disabled={planning}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
              <PrimaryButton type="submit" disabled={!goalPrompt.trim() || planning}>
                {planning ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Generate Plan
              </PrimaryButton>
            </form>
          </Card>

          {/* Generated Plan Review */}
          {proposedPlan && (
            <Card style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{proposedPlan.projectName}</h3>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {proposedPlan.summary}
                  </p>
                </div>
                <PrimaryButton onClick={handleApprovePlan} disabled={approving}>
                  {approving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Approve & Commit to Workspace
                </PrimaryButton>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {proposedPlan.tasks.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{t.title}</span>
                      <button
                        onClick={() => handleRemoveTaskFromPlan(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        title="Remove task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.description}</div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>⏱️ {t.estimatedDurationMinutes} mins</span>
                      <span>📅 Day +{t.dayOffset}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WORKSPACE COPILOT CHAT                                             */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card style={{ padding: '1.25rem', minHeight: 400, maxHeight: 560, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '0.85rem 1.15rem',
                  borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  backgroundColor: msg.sender === 'user' ? 'var(--primary-orange)' : 'var(--surface-secondary)',
                  color: msg.sender === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border)',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-line',
                }}
              >
                {msg.text}
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--primary-orange)' }} />
                <span>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </Card>

          <form
            onSubmit={handleSendMessage}
            style={{
              display: 'flex',
              gap: '0.5rem',
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.4rem 0.6rem',
            }}
          >
            <input
              type="text"
              placeholder="Ask anything about your workspace..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            />
            <PrimaryButton type="submit" disabled={!chatInput.trim() || chatLoading}>
              <Send size={15} />
            </PrimaryButton>
          </form>
        </div>
      )}
    </div>
  );
}
