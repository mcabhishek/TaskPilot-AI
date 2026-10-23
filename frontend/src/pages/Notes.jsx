import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Sparkles,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Tag,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { PrimaryButton, SecondaryButton, IconButton } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { SearchInput, FilterBar } from '../components/common/SearchInput';
import { Modal, ConfirmationDialog } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

export default function Notes() {
  const toast = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Currently open / active note in reader/editor
  const [activeNote, setActiveNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editPinned, setEditPinned] = useState(false);

  // New Note Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General');

  // Delete Dialog
  const [deletingNoteId, setDeletingNoteId] = useState(null);

  // AI Summarizer Modal
  const [summarizing, setSummarizing] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  const loadNotes = async () => {
    try {
      const res = await api.getNotes({
        search,
        category: selectedCategory === 'All' ? '' : selectedCategory
      });
      setNotes(res);
      if (res.length > 0 && !activeNote) {
        setActiveNote(res[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [search, selectedCategory]);

  const handleSelectNote = (note) => {
    setActiveNote(note);
    setIsEditing(false);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditCategory(note.category || 'General');
    setEditPinned(Boolean(note.is_pinned));
  };

  const handleStartEdit = () => {
    if (!activeNote) return;
    setIsEditing(true);
    setEditTitle(activeNote.title);
    setEditContent(activeNote.content);
    setEditCategory(activeNote.category || 'General');
    setEditPinned(Boolean(activeNote.is_pinned));
  };

  const handleSaveActiveNote = async () => {
    if (!activeNote || !editTitle.trim()) return;

    try {
      const updated = await api.updateNote(activeNote.id, {
        title: editTitle,
        content: editContent,
        category: editCategory,
        is_pinned: editPinned
      });
      setActiveNote(updated);
      setIsEditing(false);
      toast.success('Note saved successfully');
      loadNotes();
    } catch (err) {
      toast.error('Failed to save note');
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await api.createNote({
        title: newTitle,
        content: newContent,
        category: newCategory,
        is_pinned: 0
      });
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setActiveNote(created);
      toast.success('New note created');
      loadNotes();
    } catch (err) {
      toast.error('Failed to create note');
    }
  };

  const confirmDeleteNote = async () => {
    if (!deletingNoteId) return;
    try {
      await api.deleteNote(deletingNoteId);
      setNotes(prev => prev.filter(n => n.id !== deletingNoteId));
      if (activeNote?.id === deletingNoteId) {
        setActiveNote(null);
      }
      toast.success('Note deleted');
    } catch (err) {
      toast.error('Failed to delete note');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleSummarizeWithAI = async () => {
    if (!activeNote) return;
    setSummarizing(true);
    setSummaryModalOpen(true);
    setSummaryData(null);

    try {
      const res = await api.summarizeNotes(activeNote.content, activeNote.title);
      setSummaryData(res);
    } catch (err) {
      toast.error('Summarization failed');
      setSummaryModalOpen(false);
    } finally {
      setSummarizing(false);
    }
  };

  const categories = ['All', 'General', 'Hackathon', 'Study', 'Engineering', 'Ideas'];

  return (
    <div>
      <PageHeader
        title="Knowledge Base & Notes"
        subtitle="Capture thoughts, specifications, sprint retrospectives, and extract AI summaries."
        actions={
          <PrimaryButton onClick={() => setIsCreateModalOpen(true)} icon={Plus}>
            New Note
          </PrimaryButton>
        }
      />

      {/* Filter and Category Bar */}
      <FilterBar>
        <SearchInput
          value={search}
          onChange={e => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Search notes content..."
          style={{ flex: 1, minWidth: 200, maxWidth: 360 }}
        />

        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', marginLeft: 'auto' }}>
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  backgroundColor: isSelected ? 'var(--soft-peach)' : 'var(--surface-secondary)',
                  color: isSelected ? 'var(--primary-orange)' : 'var(--secondary-text)',
                  border: isSelected ? '1px solid #F3DBB8' : '1px solid var(--border-subtle)',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </FilterBar>

      {/* Two Column Layout: Left Notes List / Right Document Reader & Editor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '1.5rem', minHeight: 560 }}>
        
        {/* Left: Notes Sidebar List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 680, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: '2rem' }}>
              Loading notes...
            </div>
          ) : notes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No notes found"
              description="Capture your first document or thought."
              actionText="Create Note"
              onAction={() => setIsCreateModalOpen(true)}
            />
          ) : (
            notes.map(note => {
              const isSelected = activeNote?.id === note.id;
              const isPinned = Boolean(note.is_pinned);

              return (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--surface-primary)' : 'var(--surface-primary)',
                    border: isSelected ? '2px solid var(--primary-orange)' : '1px solid var(--border)',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {isPinned && <Pin size={13} color="var(--primary-orange)" style={{ fill: 'var(--primary-orange)' }} />}
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--primary-orange)', textTransform: 'uppercase' }}>
                        {note.category || 'General'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {new Date(note.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--primary-text)', marginBottom: '0.25rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {note.title}
                  </h3>

                  <p style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--secondary-text)',
                    lineHeight: 1.45,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {note.content || 'Empty note...'}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Active Note Reading & Editing Surface */}
        {activeNote ? (
          <Card style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--primary-orange)',
                  backgroundColor: 'var(--soft-peach)',
                  padding: '0.15rem 0.55rem',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  {activeNote.category || 'General'}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Last edited {new Date(activeNote.updated_at).toLocaleDateString()}
                </span>
              </div>

              {/* Action Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={handleSummarizeWithAI}
                  className="btn-secondary"
                  style={{ fontSize: 'var(--text-xs)', padding: '0.35rem 0.65rem' }}
                  title="Summarize key takeaways with AI"
                >
                  <Sparkles size={14} color="var(--primary-orange)" /> AI Summarize
                </button>

                {isEditing ? (
                  <PrimaryButton onClick={handleSaveActiveNote} style={{ fontSize: 'var(--text-xs)', padding: '0.35rem 0.85rem' }}>
                    Save Note
                  </PrimaryButton>
                ) : (
                  <SecondaryButton onClick={handleStartEdit} style={{ fontSize: 'var(--text-xs)', padding: '0.35rem 0.65rem' }}>
                    <Edit2 size={13} /> Edit
                  </SecondaryButton>
                )}

                <IconButton
                  icon={Trash2}
                  title="Delete note"
                  onClick={() => setDeletingNoteId(activeNote.id)}
                />
              </div>
            </div>

            {/* Note Content View / Edit Form */}
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="text-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Category</label>
                    <select value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                      {categories.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '1.5rem' }}>
                    <input
                      type="checkbox"
                      id="editPin"
                      checked={editPinned}
                      onChange={e => setEditPinned(e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    <label htmlFor="editPin" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, cursor: 'pointer' }}>
                      Pin to top of list
                    </label>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label className="text-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Content (Markdown Supported)</label>
                  <textarea
                    rows={15}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    style={{ flex: 1, minHeight: 280, resize: 'vertical', lineHeight: 1.6 }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--primary-text)', marginBottom: '1rem' }}>
                  {activeNote.title}
                </h2>
                <div style={{
                  fontSize: 'var(--text-base)',
                  color: 'var(--primary-text)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line'
                }}>
                  {activeNote.content || 'No content written yet.'}
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select a note to read or edit
          </Card>
        )}
      </div>

      {/* CREATE NOTE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Note"
      >
        <form onSubmit={handleCreateNote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Title *</label>
            <input
              type="text"
              placeholder="e.g. Distributed Database Architecture Notes"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Category</label>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)}>
              {categories.filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Content</label>
            <textarea
              rows={8}
              placeholder="Write your thoughts, meeting points, formulas, or code snippets..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <SecondaryButton onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit">
              Create Note
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* AI NOTE SUMMARY MODAL */}
      <Modal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        title="AI Note Analysis & Action Items"
      >
        {summarizing ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--secondary-text)' }}>
            Extracting key takeaways and actionable deliverables...
          </div>
        ) : summaryData ? (
          <div>
            <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--primary-text)', marginBottom: '0.35rem' }}>
              {summaryData.title}
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              {summaryData.summary}
            </p>

            <div style={{ backgroundColor: 'var(--surface-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
              <span className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Key Takeaways:
              </span>
              <ul style={{ paddingLeft: '1.25rem', fontSize: 'var(--text-sm)', color: 'var(--secondary-text)' }}>
                {summaryData.keyTakeaways?.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '0.2rem' }}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary-orange)', display: 'block', marginBottom: '0.45rem' }}>
                Extracted Action Items:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {summaryData.actionItems?.map((act, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-sm)', color: 'var(--primary-text)' }}>
                    <CheckCircle2 size={16} color="var(--primary-orange)" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <PrimaryButton onClick={() => setSummaryModalOpen(false)}>
                Done
              </PrimaryButton>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Confirmation Dialog for Note Deletion */}
      <ConfirmationDialog
        isOpen={Boolean(deletingNoteId)}
        onClose={() => setDeletingNoteId(null)}
        onConfirm={confirmDeleteNote}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        destructive={true}
      />

      <style>{`
        @media (max-width: 860px) {
          div[style*="gridTemplateColumns: minmax(280px, 340px) 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
