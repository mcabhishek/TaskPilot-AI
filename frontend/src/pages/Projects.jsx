import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  Layers,
  ArrowRight,
  X
} from 'lucide-react';
import { api } from '../services/api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState('#F97316');
  const [formDeadline, setFormDeadline] = useState('');
  const [formMilestones, setFormMilestones] = useState(['']);

  const loadProjects = async () => {
    try {
      const res = await api.getProjects();
      setProjects(res);
      if (res.length > 0 && !selectedProject) {
        // Load details for the first project by default
        loadProjectDetails(res[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetails = async (id) => {
    try {
      const res = await api.getProjectById(id);
      setSelectedProject(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      const validM = formMilestones.filter(m => m.trim().length > 0).map(title => ({ title }));
      await api.createProject({
        name: formName,
        description: formDesc,
        color: formColor,
        deadline: formDeadline ? new Date(formDeadline).toISOString() : null,
        milestones: validM,
      });
      setIsModalOpen(false);
      setFormName('');
      setFormDesc('');
      setFormMilestones(['']);
      loadProjects();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Delete this project and dissociate its tasks?')) return;
    try {
      await api.deleteProject(id);
      setSelectedProject(null);
      loadProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMilestone = async (milestone) => {
    if (!selectedProject) return;
    const nextStatus = milestone.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.updateMilestone(selectedProject.id, milestone.id, { status: nextStatus });
      loadProjectDetails(selectedProject.id);
    } catch (err) {
      console.error(err);
    }
  };

  const colors = ['#F97316', '#EA580C', '#059669', '#2563EB', '#7C3AED', '#DB2777'];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Projects & Roadmaps
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Track multi-phase initiatives, milestones, and deliverable progress.
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={18} /> New Project
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--pale-orange)', color: 'var(--primary-orange)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <FolderKanban size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>No projects yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Create a project manually or use the AI Goal Planner to generate complete roadmaps.
          </p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ display: 'inline-flex' }}>
            <Plus size={16} /> New Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: '2rem' }}>
          {/* Left: Project Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {projects.map(p => {
              const isSelected = selectedProject?.id === p.id;
              return (
                <div
                  key={p.id}
                  className="card"
                  onClick={() => loadProjectDetails(p.id)}
                  style={{
                    cursor: 'pointer',
                    borderLeft: `4px solid ${p.color || 'var(--primary-orange)'}`,
                    backgroundColor: isSelected ? 'var(--warm-cream)' : '#FFFFFF',
                    borderColor: isSelected ? 'var(--primary-orange)' : 'var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{p.name}</h3>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: p.color || 'var(--primary-orange)' }}>
                      {p.progress}%
                    </span>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.description || 'No description provided.'}
                  </p>

                  {/* Progress bar */}
                  <div style={{ width: '100%', height: 6, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <div style={{ width: `${p.progress}%`, height: '100%', backgroundColor: p.color || 'var(--primary-orange)', borderRadius: 3 }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>{p.completed_tasks} / {p.total_tasks} tasks done</span>
                    {p.deadline && <span>Due {new Date(p.deadline).toLocaleDateString()}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Selected Project Detail View */}
          {selectedProject ? (
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {selectedProject.name}
                    </h2>
                    <span className="badge badge-progress">{selectedProject.status}</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 650 }}>
                    {selectedProject.description}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteProject(selectedProject.id)}
                  className="btn-secondary"
                  style={{ color: 'var(--error)', borderColor: '#FECACA', fontSize: '0.82rem' }}
                >
                  <Trash2 size={16} /> Delete Project
                </button>
              </div>

              {/* Milestones Checklist */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                  Project Milestones ({selectedProject.milestones?.length || 0})
                </h3>

                {(!selectedProject.milestones || selectedProject.milestones.length === 0) ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No milestones set for this project.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedProject.milestones.map(m => {
                      const isComp = m.status === 'COMPLETED';
                      return (
                        <div key={m.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isComp ? '#ECFDF5' : 'var(--warm-cream)',
                          border: '1px solid var(--border-color)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <button onClick={() => handleToggleMilestone(m)} style={{ color: isComp ? '#059669' : 'var(--text-muted)' }}>
                              {isComp ? <CheckCircle2 size={18} color="#059669" /> : <Circle size={18} />}
                            </button>
                            <span style={{
                              fontWeight: 600,
                              fontSize: '0.88rem',
                              color: isComp ? '#065F46' : 'var(--text-main)',
                              textDecoration: isComp ? 'line-through' : 'none'
                            }}>
                              {m.title}
                            </span>
                          </div>
                          {m.due_date && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Due: {new Date(m.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Linked Tasks */}
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                  Linked Tasks ({selectedProject.tasks?.length || 0})
                </h3>

                {(!selectedProject.tasks || selectedProject.tasks.length === 0) ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No tasks linked to this project yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedProject.tasks.map(t => (
                      <div key={t.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--border-color)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span className={`badge badge-${t.status.toLowerCase().replace('_', '')}`}>
                            {t.status}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                            {t.title}
                          </span>
                        </div>
                        <span className={`badge badge-${t.priority.toLowerCase()}`}>
                          {t.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Select a project to inspect details
            </div>
          )}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Create New Project</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Mobile App Redesign..."
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Description</label>
                <textarea
                  rows={3}
                  placeholder="Objectives, deliverables, or team scope..."
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Accent Color</label>
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  {colors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: c,
                        border: formColor === c ? '3px solid #1F2937' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Target Deadline</label>
                <input
                  type="date"
                  value={formDeadline}
                  onChange={e => setFormDeadline(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Initial Milestones</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {formMilestones.map((m, idx) => (
                    <input
                      key={idx}
                      type="text"
                      placeholder={`Milestone ${idx + 1}...`}
                      value={m}
                      onChange={e => {
                        const updated = [...formMilestones];
                        updated[idx] = e.target.value;
                        setFormMilestones(updated);
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormMilestones([...formMilestones, ''])}
                    style={{ fontSize: '0.8rem', color: 'var(--primary-orange)', fontWeight: 600, textAlign: 'left', alignSelf: 'flex-start' }}
                  >
                    + Add milestone
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
