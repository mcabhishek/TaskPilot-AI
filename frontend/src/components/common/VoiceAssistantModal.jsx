import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Bot,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from './Toast';

export function VoiceAssistantModal({ isOpen, onClose }) {
  const toast = useToast();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your **Alexa-Style Productivity Assistant**. You can ask for your daily briefing, set reminders, query urgent tasks, or mark items complete.",
      action_taken: 'System ready',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [status, setStatus] = useState('idle'); // idle | listening | processing | speaking
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setStatus('listening');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSendCommand(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setStatus('idle');
        if (event.error === 'not-allowed') {
          toast.error('Microphone permission was denied. You can type commands below.');
        }
      };

      recognition.onend = () => {
        if (status === 'listening') {
          setStatus('idle');
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle Speech Synthesis
  const speakResponse = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick female or friendly voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google UK English Female')));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setStatus('speaking');
    utterance.onend = () => setStatus('idle');
    utterance.onerror = () => setStatus('idle');

    window.speechSynthesis.speak(utterance);
  };

  const handleToggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      toast.info('Speech recognition is not supported in this browser. Please use text input.');
      return;
    }

    if (status === 'listening') {
      recognitionRef.current.stop();
      setStatus('idle');
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleSendCommand = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    // Add user message to transcript
    const userMsg = {
      id: Date.now() + '-user',
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setStatus('processing');

    try {
      const res = await api.sendAssistantCommand(text);

      const assistantMsg = {
        id: Date.now() + '-assistant',
        sender: 'assistant',
        text: res.spoken_response || res.display_text,
        action_taken: res.tool_executed ? `MCP Tool: ${res.tool_executed}` : res.action_taken,
        tool_executed: res.tool_executed,
        mcp_trace: res.mcp_trace,
        requires_confirmation: res.requires_confirmation,
        intent: res.intent,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakResponse(res.spoken_response);
    } catch (err) {
      console.error(err);
      const errMsg = {
        id: Date.now() + '-error',
        sender: 'assistant',
        text: "I couldn't process that command via the MCP server right now. Please verify backend connection.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
      setStatus('idle');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(37, 35, 31, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (window.speechSynthesis) window.speechSynthesis.cancel();
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          maxHeight: '90vh',
          backgroundColor: 'var(--surface-primary)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-dropdown)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--surface-peach)',
                color: 'var(--primary-orange)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  TaskPilot Voice Assistant
                </h3>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(232, 117, 50, 0.12)',
                    color: 'var(--primary-orange)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  Alexa-Style Simulation
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Voice & natural-language assistant backed by live SQLite database
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                setVoiceEnabled(!voiceEnabled);
              }}
              className="btn-icon"
              title={voiceEnabled ? 'Mute vocal responses' : 'Enable vocal responses'}
              style={{ color: voiceEnabled ? 'var(--primary-orange)' : 'var(--text-secondary)' }}
            >
              {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              onClick={() => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                onClose();
              }}
              className="btn-icon"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Alexa Orb Visualizer */}
        <div
          style={{
            padding: '24px 20px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-main)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Animated Glow Ring */}
          <div
            onClick={handleToggleListening}
            style={{
              position: 'relative',
              width: 72,
              height: 72,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background:
                status === 'listening'
                  ? 'radial-gradient(circle, #00d2ff 0%, #0084ff 100%)'
                  : status === 'speaking'
                  ? 'radial-gradient(circle, #f97316 0%, #ea580c 100%)'
                  : status === 'processing'
                  ? 'radial-gradient(circle, #a855f7 0%, #7e22ce 100%)'
                  : 'radial-gradient(circle, var(--surface-primary) 0%, var(--surface-secondary) 100%)',
              border: '2px solid rgba(232, 117, 50, 0.4)',
              boxShadow:
                status === 'listening'
                  ? '0 0 25px rgba(0, 210, 255, 0.7), 0 0 50px rgba(0, 132, 255, 0.4)'
                  : status === 'speaking'
                  ? '0 0 25px rgba(232, 117, 50, 0.8), 0 0 45px rgba(234, 88, 12, 0.4)'
                  : 'var(--shadow-card)',
            }}
          >
            <Mic
              size={28}
              color={status === 'idle' ? 'var(--primary-orange)' : '#FFFFFF'}
              style={{
                transition: 'transform 0.2s ease',
                transform: status === 'listening' ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          </div>

          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color:
                  status === 'listening'
                    ? '#0284c7'
                    : status === 'speaking'
                    ? 'var(--primary-orange)'
                    : status === 'processing'
                    ? '#9333ea'
                    : 'var(--text-secondary)',
              }}
            >
              {status === 'listening' && 'Listening... Click orb or say a command'}
              {status === 'processing' && 'Analyzing request & querying database...'}
              {status === 'speaking' && 'Speaking response...'}
              {status === 'idle' && (speechSupported ? 'Tap microphone to speak or type below' : 'Type a command below')}
            </span>
          </div>

          {/* Prompt Chips */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              justifyContent: 'center',
              marginTop: 14,
            }}
          >
            {[
              'Give me my daily briefing',
              'What is my most urgent task?',
              'Remind me in 30 minutes',
              'Mark top task as done',
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handleSendCommand(chip)}
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
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
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Live Conversation Transcript */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: 220,
            maxHeight: 340,
            backgroundColor: 'var(--surface-primary)',
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  backgroundColor: msg.sender === 'user' ? 'var(--primary-orange)' : 'var(--surface-secondary)',
                  color: msg.sender === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                {msg.text}

                {msg.requires_confirmation && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)', display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleSendCommand('Yes, save it')}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: 'var(--primary-orange)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      ✓ Yes, Save
                    </button>
                    <button
                      onClick={() => handleSendCommand('No, cancel')}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 4,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <span>{msg.time}</span>
                {msg.action_taken && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      color: 'var(--primary-orange)',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={12} /> {msg.action_taken}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--surface-primary)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            className="input-text"
            placeholder={speechSupported ? 'Ask Alexa-style assistant or tap mic above...' : 'Type a command...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendCommand();
              }
            }}
            style={{ flex: 1, padding: '10px 14px', fontSize: 13 }}
          />

          <button
            onClick={() => handleSendCommand()}
            disabled={!inputText.trim() || status === 'processing'}
            className="btn-primary"
            style={{ padding: '9px 16px', gap: 6 }}
          >
            <Send size={15} />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
