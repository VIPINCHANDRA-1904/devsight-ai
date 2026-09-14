/**
 * DEVSIGHTAI — API Client
 *
 * Centralized HTTP client for all FastAPI backend calls.
 * Attaches JWT token from memory (not localStorage — security).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// JWT stored in memory only — not localStorage (XSS protection)
let _authToken = null

export const setAuthToken = (token) => {
  _authToken = token
}

export const clearAuthToken = () => {
  _authToken = null
}

export const getAuthToken = () => _authToken

/**
 * Make an authenticated API request to the FastAPI backend.
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(error.detail || `API Error: ${response.status}`)
  }

  return response.json()
}

// ──────────────────────────────────────────────
// Typed API methods matching FastAPI endpoints
// ──────────────────────────────────────────────

export const api = {
  // Health
  health: () => apiRequest('/api/health'),

  // Metrics
  getMetrics: (serviceId, { limit = 200, serverId } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (serverId) params.set('server_id', serverId)
    return apiRequest(`/api/metrics/${serviceId}?${params}`)
  },

  ingestMetrics: (payload) =>
    apiRequest('/api/metrics/', { method: 'POST', body: JSON.stringify(payload) }),

  // Logs
  getLogs: (serviceId, { level, window: timeWindow = '1h', limit = 100 } = {}) => {
    const params = new URLSearchParams({
      service_id: serviceId,
      window: timeWindow,
      limit: String(limit),
    })
    if (level) params.set('level', level)
    return apiRequest(`/api/logs?${params}`)
  },

  // Events
  getEvents: (serviceId, { window: timeWindow = '1h', limit = 200 } = {}) => {
    const params = new URLSearchParams({
      service_id: serviceId,
      window: timeWindow,
      limit: String(limit),
    })
    return apiRequest(`/api/events?${params}`)
  },

  getEventStats: (serviceId, { window: timeWindow = '5m' } = {}) => {
    const params = new URLSearchParams({
      service_id: serviceId,
      window: timeWindow,
    })
    return apiRequest(`/api/events/stats?${params}`)
  },

  // Deployments
  getDeployments: (serviceId, { limit = 50 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (serviceId) params.set('service_id', serviceId)
    return apiRequest(`/api/deployments?${params}`)
  },

  getLatestDeployment: (serviceId) =>
    apiRequest(`/api/deployments/latest/${serviceId}`),

  // Anomalies (Phase 2)
  getAnomalies: (serviceId, { window: timeWindow = '6h', limit = 50 } = {}) => {
    const params = new URLSearchParams({
      window: timeWindow,
      limit: String(limit),
    })
    return apiRequest(`/api/anomalies/${serviceId}?${params}`)
  },

  getRecentAnomalies: ({ window: timeWindow = '24h', limit = 20 } = {}) => {
    const params = new URLSearchParams({
      window: timeWindow,
      limit: String(limit),
    })
    return apiRequest(`/api/anomalies/recent?${params}`)
  },

  // Predictive Warnings (Phase 2)
  getActiveWarnings: ({ limit = 20 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) })
    return apiRequest(`/api/warnings/active?${params}`)
  },

  getWarnings: (serviceId, { limit = 20, includeAcknowledged = false } = {}) => {
    const params = new URLSearchParams({
      limit: String(limit),
      include_acknowledged: String(includeAcknowledged),
    })
    return apiRequest(`/api/warnings/${serviceId}?${params}`)
  },

  acknowledgeWarning: (warningId) =>
    apiRequest(`/api/warnings/${warningId}/acknowledge`, { method: 'PATCH' }),

  // Incidents (Phase 3)
  getIncidents: ({ serviceId, status, severity, limit = 50 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (serviceId) params.set('service_id', serviceId)
    if (status) params.set('status', status)
    if (severity) params.set('severity', severity)
    return apiRequest(`/api/incidents?${params}`)
  },

  getIncidentStats: () => apiRequest('/api/incidents/stats'),

  getIncidentById: (incidentId) => apiRequest(`/api/incidents/${incidentId}`),

  updateIncidentStatus: (incidentId, { status, note, userId } = {}) =>
    apiRequest(`/api/incidents/${incidentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note, user_id: userId }),
    }),

  assignIncident: (incidentId, { assignedTo, assignedName } = {}) =>
    apiRequest(`/api/incidents/${incidentId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_to: assignedTo, assigned_name: assignedName }),
    }),

  getIncidentTimeline: (incidentId) =>
    apiRequest(`/api/incidents/${incidentId}/timeline`),

  triggerCorrelation: (serviceId) =>
    apiRequest('/api/incidents/correlate', {
      method: 'POST',
      body: JSON.stringify({ service_id: serviceId }),
    }),

  seedDemoIncident: () =>
    apiRequest('/api/incidents/demo-seed', { method: 'POST' }),

  // Services & Dependency Graph (Phase 3)
  getServices: () => apiRequest('/api/services'),

  getDependencyGraph: () => apiRequest('/api/services/dependency-graph'),

  seedTopology: () =>
    apiRequest('/api/services/seed-topology', { method: 'POST' }),

  // AI Root Cause Analysis & Chat (Phase 4)
  analyzeIncident: (incidentId, { forceRefresh = false } = {}) =>
    apiRequest(`/api/incidents/${incidentId}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ force_refresh: forceRefresh }),
    }),

  getIncidentAnalysis: (incidentId) =>
    apiRequest(`/api/incidents/${incidentId}/analysis`),

  sendIncidentChatMessage: (incidentId, { message, history = [] }) =>
    apiRequest(`/api/incidents/${incidentId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),

  getIncidentChatHistory: (incidentId) =>
    apiRequest(`/api/incidents/${incidentId}/chat`),

  // Deployments & Release Intelligence (Phase 5)
  getDeployments: ({ serviceId, environment, limit = 50 } = {}) => {
    const params = new URLSearchParams()
    if (serviceId) params.append('service_id', serviceId)
    if (environment) params.append('environment', environment)
    if (limit) params.append('limit', limit.toString())
    const query = params.toString()
    return apiRequest(`/api/deployments/${query ? `?${query}` : ''}`)
  },

  getLatestDeployment: (serviceId) =>
    apiRequest(`/api/deployments/latest/${serviceId}`),

  getDeploymentHealth: (deploymentId) =>
    apiRequest(`/api/deployments/${deploymentId}/health`),

  getRecentReleaseHealth: () =>
    apiRequest('/api/deployments/health/recent'),

  createDeployment: (payload) =>
    apiRequest('/api/deployments/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  seedDemoDeployments: () =>
    apiRequest('/api/deployments/demo-seed', { method: 'POST' }),

  // Authentication & RBAC (Phase 6)
  setAuthToken: (token) => {
    _authToken = token
  },

  login: ({ email, password }) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (payload) =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => apiRequest('/api/auth/me'),

  demoSwitchRole: (role) =>
    apiRequest('/api/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  // SLA & SLO Monitoring (Phase 6)
  getSlaOverview: () => apiRequest('/api/sla/'),

  getServiceSla: (serviceId) => apiRequest(`/api/sla/${serviceId}`),

  updateSlaTarget: (serviceId, payload) =>
    apiRequest(`/api/sla/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  evaluateSla: () => apiRequest('/api/sla/evaluate', { method: 'POST' }),

  seedDemoSla: () => apiRequest('/api/sla/demo-seed', { method: 'POST' }),

  // Realtime Notifications & In-App Alerts (Phase 6)
  getNotifications: ({ unreadOnly = false, limit = 30 } = {}) => {
    const params = new URLSearchParams()
    if (unreadOnly) params.append('unread_only', 'true')
    if (limit) params.append('limit', limit.toString())
    const query = params.toString()
    return apiRequest(`/api/notifications/${query ? `?${query}` : ''}`)
  },

  markNotificationRead: (notificationId) =>
    apiRequest(`/api/notifications/${notificationId}/read`, { method: 'PATCH' }),

  markAllNotificationsRead: () =>
    apiRequest('/api/notifications/mark-all-read', { method: 'POST' }),

  createNotification: (payload) =>
    apiRequest('/api/notifications/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  triggerTestAlert: () =>
    apiRequest('/api/notifications/test', { method: 'POST' }),

  // Incident Postmortem Reports (Phase 6)
  getIncidentReport: (incidentId) =>
    apiRequest(`/api/reports/incident/${incidentId}`),

  // Demo Scenarios & Offline File Processing (Phase 7)
  triggerDemoScenario: (scenarioKey) =>
    apiRequest(`/api/demo/scenario/${scenarioKey}`, { method: 'POST' }),

  resetDemoEnvironment: () =>
    apiRequest('/api/demo/scenario/reset', { method: 'POST' }),

  uploadTelemetryFile: ({ filename, content, file_type }) =>
    apiRequest('/api/demo/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, content, file_type }),
    }),
}



