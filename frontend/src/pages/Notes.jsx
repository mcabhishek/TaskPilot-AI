import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Sparkles,
  Trash2,
  Edit2,
  Tag,
  CheckCircle2,
  X
} from 'lucide-react';
import { api } from '../services/api';

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formPinned, setFormPinned] = useState(false);

  // AI Summary Modal
  const [summarizingNote, setSummarizingNote] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [summarizing, setSummarizing] = useState(false);

  const loadNotes = async () => {
    try {
      const res = await api.getNotes({ search, category: categoryFilter });
      setNotes(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [search, categoryFilter]);

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    try {
      if (editingNote) {
        await api.updateNote(editingNote.id, {
          title: formTitle,
          content: formContent,
          category: formCategory,
          is_pinned: formPinned,
        });
      } else {
        await api.createNote({
          title: formTitle,
          content: formContent,
          category: formCategory,
          is_pinned: formPinned,
        });
      }
      setIsModalOpen(false);
      loadNotes();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await api.deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('General');
    setFormPinned(false);
    setIsModalOpen(true);
  };

  const openEditModal = (note) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category || 'General');
    setFormPinned(Boolean(note.is_pinned));
    setIsModalOpen(true);
  };

  const handleSummarizeNote = async (note) => {
    setSummarizingNote(note);
    setSummaryData(null);
    setSummarizing(true);

    try {
      const res = await api.summarizeNotes(note.content, note.title);
      setSummaryData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSummarizing(false);
    }
  };

  const categories = ['All', 'General', 'Hackathon', 'Study', 'Engineering', 'Ideas'];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Knowledge & Notes
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Capture meeting notes, specs, formulas, and summarize with AI.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn-primary">
          <Plus size={18} /> New Note
        </button>
      </div>

      {/* Filter and Categories Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
          <input
            type="text"
            placeholder="Search notes content or title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {categories.map(cat => {
            const isSelected = (cat === 'All' && !categoryFilter) || categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === 'All' ? '' : cat)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  backgroundColor: isSelected ? 'var(--primary-orange)' : 'var(--warm-cream)',
                  color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                  border: isSelected ? 'none' : '1px solid var(--border-color)',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--pale-orange)', color: 'var(--primary-orange)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <FileText size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>No notes found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Capture your first note or document to start building your knowledge base.
          </p>
          <button onClick={openCreateModal} className="btn-primary" style={{ display: 'inline-flex' }}>
            <Plus size={16} /> New Note
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {notes.map(note => {
            const isPinned = Boolean(note.is_pinned);
            return (
              <div
                key={note.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  backgroundColor: isPinned ? '#FFFDF8' : '#FFFFFF',
                  borderColor: isPinned ? 'var(--primary-orange)' : 'var(--border-color)',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isPinned && <Pin size={16} color="var(--primary-orange)" style={{ fill: 'var(--primary-orange)' }} />}
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-orange)', backgroundColor: 'var(--pale-orange)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                        {note.category || 'General'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button
                        onClick={() => handleSummarizeNote(note)}
                        title="Summarize with AI"
                        style={{ color: 'var(--primary-orange)', padding: '0.35rem' }}
                      >
                        <Sparkles size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(note)}
                        title="Edit note"
                        style={{ color: 'var(--text-muted)', padding: '0.35rem' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        title="Delete note"
                        style={{ color: 'var(--text-muted)', padding: '0.35rem' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    {note.title}
                  </h3>

                  <p style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                    display: '-webkit-box',
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {note.content}
                  </p>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Updated {new Date(note.updated_at).toLocaleDateString()}</span>
                  <button onClick={() => handleSummarizeNote(note)} style={{ color: 'var(--deep-orange)', fontWeight: 600, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Sparkles size={13} /> AI Summary
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT NOTE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                {editingNote ? 'Edit Note' : 'Create Note'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Title *</label>
                <input
                  type="text"
                  placeholder="Note title..."
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Category</label>
                  <select value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                    <option value="General">General</option>
                    <option value="Hackathon">Hackathon</option>
                    <option value="Study">Study</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Ideas">Ideas</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <input
                    type="checkbox"
                    id="pinNote"
                    checked={formPinned}
                    onChange={e => setFormPinned(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="pinNote" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                    Pin to top
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Content (Markdown supported)</label>
                <textarea
                  rows={8}
                  placeholder="Write your notes, meeting minutes, or design thoughts..."
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingNote ? 'Save Changes' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI NOTE SUMMARY MODAL */}
      {summarizingNote && (
        <div className="modal-overlay" onClick={() => setSummarizingNote(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} color="var(--primary-orange)" />
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>AI Note Analysis</h2>
              </div>
              <button onClick={() => setSummarizingNote(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {summarizing ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                Analyzing note and extracting actionable tasks...
              </div>
            ) : summaryData ? (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  {summaryData.title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  {summaryData.summary}
                </p>

                <div style={{ backgroundColor: 'var(--warm-cream)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                    Key Takeaways:
                  </span>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {summaryData.keyTakeaways.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--deep-orange)', display: 'block', marginBottom: '0.35rem' }}>
                    Extracted Action Items:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {summaryData.actionItems.map((act, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                        <CheckCircle2 size={16} color="var(--primary-orange)" />
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button onClick={() => setSummarizingNote(null)} className="btn-primary">
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
