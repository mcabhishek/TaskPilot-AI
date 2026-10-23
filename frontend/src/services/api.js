const API_BASE = '/api/v1';

function getAuthHeader() {
  const token = localStorage.getItem('taskpilot_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  demoLogin: () => request('/auth/demo', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Tasks
  getTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`);
  },
  getTaskById: (id) => request(`/tasks/${id}`),
  createTask: (taskData) => request('/tasks', { method: 'POST', body: JSON.stringify(taskData) }),
  updateTask: (id, taskData) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(taskData) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  addSubtask: (taskId, title) => request(`/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) }),
  updateSubtask: (taskId, subtaskId, data) => request(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubtask: (taskId, subtaskId) => request(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' }),

  // Projects
  getProjects: () => request('/projects'),
  getProjectById: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  addMilestone: (projectId, data) => request(`/projects/${projectId}/milestones`, { method: 'POST', body: JSON.stringify(data) }),
  updateMilestone: (projectId, milestoneId, data) => request(`/projects/${projectId}/milestones/${milestoneId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // AI Assistant
  generateAIPlan: (prompt) => request('/ai/plan', { method: 'POST', body: JSON.stringify({ prompt }) }),
  getAIPlan: (id) => request(`/ai/plans/${id}`),
  approveAIPlan: (id, modifiedPlan) => request(`/ai/plans/${id}/approve`, { method: 'POST', body: JSON.stringify({ modifiedPlan }) }),
  rejectAIPlan: (id) => request(`/ai/plans/${id}/reject`, { method: 'POST' }),
  chatAI: (message, conversationId) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ message, conversationId }) }),
  summarizeNotes: (content, title) => request('/ai/summarize', { method: 'POST', body: JSON.stringify({ content, title }) }),

  // Calendar
  getCalendar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/calendar${qs ? `?${qs}` : ''}`);
  },
  rescheduleTask: (id, due_date) => request(`/calendar/reschedule/${id}`, { method: 'PUT', body: JSON.stringify({ due_date }) }),

  // Notes
  getNotes: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/notes${qs ? `?${qs}` : ''}`);
  },
  getNoteById: (id) => request(`/notes/${id}`),
  createNote: (data) => request('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id, data) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),

  // Workflows
  getWorkflows: () => request('/workflows'),
  createWorkflow: (data) => request('/workflows', { method: 'POST', body: JSON.stringify(data) }),
  toggleWorkflow: (id) => request(`/workflows/${id}/toggle`, { method: 'POST' }),
  triggerWorkflowTest: (id) => request(`/workflows/${id}/trigger`, { method: 'POST' }),
  scanOverdue: () => request('/workflows/scan-overdue', { method: 'POST' }),
  getWorkflowExecutions: () => request('/workflows/executions'),
  deleteWorkflow: (id) => request(`/workflows/${id}`, { method: 'DELETE' }),

  // Analytics
  getAnalyticsOverview: () => request('/analytics/overview'),
  logFocusSession: (data) => request('/analytics/focus-sessions', { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),

  // Integrations
  getIntegrations: () => request('/integrations'),
  connectIntegration: (data) => request('/integrations/connect', { method: 'POST', body: JSON.stringify(data) }),
  disconnectIntegration: (provider) => request('/integrations/disconnect', { method: 'POST', body: JSON.stringify({ provider }) }),
  testIntegration: (provider) => request('/integrations/test', { method: 'POST', body: JSON.stringify({ provider }) }),

  // Settings
  getSettings: () => request('/settings'),
  updateProfile: (data) => request('/settings/profile', { method: 'PUT', body: JSON.stringify(data) }),
  updatePreferences: (data) => request('/settings/preferences', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (currentPassword, newPassword) => request('/settings/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
};
