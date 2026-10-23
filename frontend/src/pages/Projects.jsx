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
  Search,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { PrimaryButton, SecondaryButton, IconButton } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { PriorityBadge, StatusBadge } from '../components/common/Badge';
import { SearchInput, FilterBar } from '../components/common/SearchInput';
import { Modal, ConfirmationDialog } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

export default function Projects() {
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [search, setSearch] = useState('');

  // Create Project Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState('#E87532');
  const [formDeadline, setFormDeadline] = useState('');
  const [formMilestones, setFormMilestones] = useState(['']);

  // Delete Dialog
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  const loadProjects = async () => {
    try {
      const res = await api.getProjects();
      setProjects(res);
      if (res.length > 0 && !selectedProject) {
        loadProjectDetails(res[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load projects');
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
      toast.success('Project created successfully');
      loadProjects();
    } catch (err) {
      toast.error(err.message || 'Failed to create project');
    }
  };

  const confirmDeleteProject = async () => {
    if (!deletingProjectId) return;
    try {
      await api.deleteProject(deletingProjectId);
      setSelectedProject(null);
      toast.success('Project deleted');
      loadProjects();
    } catch (err) {
      toast.error('Failed to delete project');
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleToggleMilestone = async (milestone) => {
    if (!selectedProject) return;
    const nextStatus = milestone.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.updateMilestone(selectedProject.id, milestone.id, { status: nextStatus });
      loadProjectDetails(selectedProject.id);
      toast.info(nextStatus === 'COMPLETED' ? 'Milestone completed' : 'Milestone reopened');
    } catch (err) {
      toast.error('Failed to update milestone');
    }
  };

  const colors = ['#E87532', '#C95D24', '#27845B', '#2B78C5', '#6D28D9', '#DB2777'];

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <PageHeader
        title="Projects & Roadmaps"
        subtitle="Manage multi-stage initiatives, track milestone completion, and inspect linked deliverables."
        actions={
          <PrimaryButton onClick={() => setIsModalOpen(true)} icon={Plus}>
            New Project
          </PrimaryButton>
        }
      />

      {/* Filter and Search Bar */}
      <FilterBar>
        <SearchInput
          value={search}
          onChange={e => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Search initiatives by title or description..."
          style={{ flex: 1, minWidth: 220, maxWidth: 360 }}
        />
        <div style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--secondary-text)' }}>
          {filteredProjects.length} active initiatives
        </div>
      </FilterBar>

      {/* Two Column Layout: Project Cards List / Project Detail Inspect */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="Create your first initiative or generate a plan using AI."
          actionText="Create Project"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '1.5rem' }}>
          
          {/* Left: Project Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredProjects.map(p => {
              const isSelected = selectedProject?.id === p.id;
              return (
                <Card
                  key={p.id}
                  onClick={() => loadProjectDetails(p.id)}
                  style={{
                    cursor: 'pointer',
                    borderLeft: `3px solid ${p.color || 'var(--primary-orange)'}`,
                    border: isSelected ? '2px solid var(--primary-orange)' : '1px solid var(--border)',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'var(--shadow-xs)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--primary-text)' }}>
                      {p.name}
                    </h3>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: p.color || 'var(--primary-orange)' }}>
                      {p.progress}%
                    </span>
                  </div>

                  <p style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--secondary-text)',
                    lineHeight: 1.45,
                    marginBottom: '0.75rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {p.description || 'No description provided.'}
                  </p>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: 5, backgroundColor: 'var(--surface-secondary)', borderRadius: 3, overflow: 'hidden', marginBottom: '0.45rem' }}>
                    <div style={{ width: `${p.progress}%`, height: '100%', backgroundColor: p.color || 'var(--primary-orange)', borderRadius: 3 }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <span>{p.completed_tasks} of {p.total_tasks} deliverables</span>
                    {p.deadline && <span>Due {new Date(p.deadline).toLocaleDateString()}</span>}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Right: Selected Project Detail Panel */}
          {selectedProject ? (
            <Card style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--primary-text)' }}>
                      {selectedProject.name}
                    </h2>
                    <span className="badge badge-progress">{selectedProject.status}</span>
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary-text)', maxWidth: 640 }}>
                    {selectedProject.description}
                  </p>
                </div>

                <SecondaryButton
                  onClick={() => setDeletingProjectId(selectedProject.id)}
                  style={{ color: 'var(--error)', borderColor: '#F5C6C3', fontSize: 'var(--text-xs)' }}
                >
                  <Trash2 size={14} /> Delete Project
                </SecondaryButton>
              </div>

              {/* Milestones Checklist */}
              <div style={{ marginBottom: '1.75rem' }}>
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--primary-text)', marginBottom: '0.75rem' }}>
                  Project Milestones ({selectedProject.milestones?.length || 0})
                </h3>

                {(!selectedProject.milestones || selectedProject.milestones.length === 0) ? (
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No milestones created for this project.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {selectedProject.milestones.map(m => {
                      const isComp = m.status === 'COMPLETED';
                      return (
                        <div key={m.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isComp ? 'var(--success-bg)' : 'var(--surface-secondary)',
                          border: '1px solid var(--border-subtle)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <button onClick={() => handleToggleMilestone(m)} style={{ color: isComp ? 'var(--success)' : 'var(--text-muted)' }}>
                              {isComp ? <CheckCircle2 size={17} color="var(--success)" /> : <Circle size={17} />}
                            </button>
                            <span style={{
                              fontWeight: 500,
                              fontSize: 'var(--text-sm)',
                              color: isComp ? 'var(--success)' : 'var(--primary-text)',
                              textDecoration: isComp ? 'line-through' : 'none'
                            }}>
                              {m.title}
                            </span>
                          </div>
                          {m.due_date && (
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary-text)' }}>
                              Due: {new Date(m.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Linked Deliverables */}
              <div>
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--primary-text)', marginBottom: '0.75rem' }}>
                  Associated Tasks ({selectedProject.tasks?.length || 0})
                </h3>

                {(!selectedProject.tasks || selectedProject.tasks.length === 0) ? (
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No tasks assigned to this project yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {selectedProject.tasks.map(t => (
                      <div key={t.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--surface-primary)',
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <StatusBadge status={t.status} />
                          <span style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--primary-text)' }}>
                            {t.title}
                          </span>
                        </div>
                        <PriorityBadge priority={t.priority} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Select a project to inspect milestones and linked deliverables
            </Card>
          )}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Project Name *</label>
            <input
              type="text"
              placeholder="e.g. Mobile App Redesign..."
              value={formName}
              onChange={e => setFormName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Description</label>
            <textarea
              rows={3}
              placeholder="Objectives, deliverables, or team scope..."
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
            />
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Accent Color</label>
            <div style={{ display: 'flex', gap: '0.55rem' }}>
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormColor(c)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: c,
                    border: formColor === c ? '2px solid #25231F' : '1px solid transparent',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Target Deadline</label>
            <input
              type="date"
              value={formDeadline}
              onChange={e => setFormDeadline(e.target.value)}
            />
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Milestones</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {formMilestones.map((m, idx) => (
                <input
                  key={idx}
                  type="text"
                  placeholder={`Phase ${idx + 1}...`}
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
                style={{ fontSize: 'var(--text-xs)', color: 'var(--primary-orange)', fontWeight: 600, textAlign: 'left', alignSelf: 'flex-start' }}
              >
                + Add milestone
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <SecondaryButton onClick={() => setIsModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit">
              Create Project
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Project Deletion */}
      <ConfirmationDialog
        isOpen={Boolean(deletingProjectId)}
        onClose={() => setDeletingProjectId(null)}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        message="Are you sure you want to delete this project? Associated tasks will remain in your workspace as standalone deliverables."
        confirmText="Delete Project"
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
