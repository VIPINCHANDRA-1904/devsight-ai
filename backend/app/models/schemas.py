"""
DEVSIGHTAI — Pydantic Models for Data Ingestion

These schemas validate all incoming data from:
- psutil Monitoring Agent → MetricPayload
- Application instrumentation → EventPayload, LogPayload
- CI/CD webhooks → DeploymentPayload
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ──────────────────────────────────────────────
# Metrics (from psutil agent)
# ──────────────────────────────────────────────

class MetricPayload(BaseModel):
    """Server-level metrics collected by the psutil monitoring agent."""
    server_id: str = Field(..., description="Unique identifier for the monitored server")
    service_id: Optional[str] = Field(None, description="Associated service ID if applicable")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    cpu: float = Field(..., ge=0, le=100, description="CPU usage percentage")
    memory: float = Field(..., ge=0, le=100, description="Memory usage percentage")
    disk: float = Field(0, ge=0, le=100, description="Disk usage percentage")
    network_sent_mb: float = Field(0, ge=0, description="Network sent in MB")
    network_recv_mb: float = Field(0, ge=0, description="Network received in MB")


# ──────────────────────────────────────────────
# Application Events (from instrumented services)
# ──────────────────────────────────────────────

class EventPayload(BaseModel):
    """HTTP request events from application instrumentation."""
    service_id: str = Field(..., description="Service that handled the request")
    endpoint: str = Field(..., description="API endpoint path (e.g. /api/payment)")
    method: str = Field("GET", description="HTTP method")
    status_code: int = Field(..., ge=100, le=599, description="HTTP response status code")
    response_time: float = Field(..., ge=0, description="Response time in seconds")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ──────────────────────────────────────────────
# Logs (from log agent / direct API / uploaded files)
# ──────────────────────────────────────────────

class LogPayload(BaseModel):
    """Application log entries."""
    service_id: str = Field(..., description="Service that produced the log")
    message: str = Field(..., description="Log message content")
    level: Optional[str] = Field(
        None,
        description="Log level (INFO/WARN/ERROR/CRITICAL). Auto-classified if not provided."
    )
    source: Optional[str] = Field(None, description="Log source file or component")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class LogBatchPayload(BaseModel):
    """Batch of log entries for bulk ingestion."""
    logs: list[LogPayload] = Field(..., min_length=1)


# ──────────────────────────────────────────────
# Deployments (from CI/CD webhooks)
# ──────────────────────────────────────────────

class DeploymentPayload(BaseModel):
    """Deployment event from CI/CD pipeline."""
    service_id: str = Field(..., description="Service that was deployed")
    version: str = Field(..., description="Deployed version (e.g. 2.4)")
    environment: str = Field("production", description="Target environment")
    deployed_at: datetime = Field(default_factory=datetime.utcnow)
    deployed_by: Optional[str] = Field(None, description="User or pipeline that triggered deploy")
    commit_hash: Optional[str] = Field(None, description="Git commit hash")
    description: Optional[str] = Field(None, description="Deployment notes")


# ──────────────────────────────────────────────
# Incidents (Phase 3: Correlation & Lifecycle)
# ──────────────────────────────────────────────

class IncidentStatusUpdate(BaseModel):
    """Request to advance or update incident lifecycle status."""
    status: str = Field(
        ...,
        description="Lifecycle status: detected, assigned, investigating, root_cause_identified, fix_applied, resolved"
    )
    note: Optional[str] = Field(None, description="Optional transition note or resolution summary")
    user_id: Optional[str] = Field(None, description="User performing the transition")


class IncidentAssignUpdate(BaseModel):
    """Request to assign an incident to an engineer or team."""
    assigned_to: str = Field(..., description="User ID or email of the assignee")
    assigned_name: Optional[str] = Field(None, description="Display name of assignee")


class CorrelateTriggerRequest(BaseModel):
    """Manual request to trigger correlation for a service."""
    service_id: str = Field(..., description="Service ID to run correlation for")


class IncidentEventResponse(BaseModel):
    """Timeline event in an incident's lifecycle."""
    id: int
    incident_id: int
    event_type: str
    description: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime


class IncidentResponse(BaseModel):
    """Correlated incident model."""
    id: int
    title: str
    severity: str
    status: str
    service_id: str
    start_time: datetime
    resolved_at: Optional[datetime] = None
    resolution_time_minutes: Optional[float] = None
    correlation_score: int = 0
    affected_metrics: dict = Field(default_factory=dict)
    correlated_log_ids: list = Field(default_factory=list)
    correlated_deployment_id: Optional[str] = None
    similar_incident_ids: list = Field(default_factory=list)
    assigned_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ──────────────────────────────────────────────
# Service Dependency Graph (Phase 3)
# ──────────────────────────────────────────────

class DependencyGraphNode(BaseModel):
    """Service node in D3 dependency map."""
    id: str
    name: str
    service_type: str = "application"
    status: str = "healthy"
    description: Optional[str] = None
    active_incidents: int = 0
    max_severity: Optional[str] = None


class DependencyGraphEdge(BaseModel):
    """Directed dependency edge in D3 graph."""
    source: str
    target: str
    dependency_type: str = "calls"


class DependencyGraphResponse(BaseModel):
    """Complete graph topology for D3 visualization."""
    nodes: list[DependencyGraphNode]
    edges: list[DependencyGraphEdge]


# ──────────────────────────────────────────────
# AI Root Cause Analysis (Phase 4)
# ──────────────────────────────────────────────

class RcaRequest(BaseModel):
    """Request to trigger or refresh AI RCA."""
    force_refresh: bool = Field(False, description="Bypass cache and force new LLM evaluation")


class RcaResponse(BaseModel):
    """Structured AI Root Cause Analysis result from Groq Llama-3.3-70B."""
    incident_id: int
    root_cause: str
    evidence: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    business_impact: str
    confidence: str = "HIGH"
    model_used: str = "llama-3.3-70b-versatile"
    context_tokens: Optional[int] = None
    created_at: Optional[str] = None


class IncidentChatRequest(BaseModel):
    """Interactive question to incident AI assistant."""
    message: str = Field(..., description="User query or instruction regarding the incident")
    history: Optional[list[dict]] = Field(default_factory=list, description="Recent conversation turns")


class IncidentChatResponse(BaseModel):
    """Assistant conversational answer."""
    incident_id: int
    reply: str
    timestamp: str


# ──────────────────────────────────────────────
# Deployment & Release Health (Phase 5)
# ──────────────────────────────────────────────

class DeploymentHealthItem(BaseModel):
    """Metric before/after comparison item."""
    metric: str
    unit: str = "%"
    before_value: float
    after_value: float
    delta_pct: float
    status: str = "healthy"


class DeploymentHealthResponse(BaseModel):
    """Release Health evaluation result."""
    deployment_id: str
    service_id: str
    version: str
    evaluated_at: str
    overall_status: str = "healthy"
    has_regression: bool = False
    items: list[DeploymentHealthItem] = Field(default_factory=list)


# ──────────────────────────────────────────────
# Authentication & RBAC (Phase 6)
# ──────────────────────────────────────────────

class UserResponse(BaseModel):
    """Public user profile model."""
    id: str
    email: str
    full_name: str
    role: str = "developer"
    is_active: bool = True


class LoginRequest(BaseModel):
    """Login credentials payload."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class RegisterRequest(BaseModel):
    """Registration payload."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")
    full_name: str = Field(..., description="Full display name")
    role: str = Field("developer", description="Role: developer, devops, qa, manager, admin")


class TokenResponse(BaseModel):
    """JWT Token payload returned on successful authentication."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class DemoRoleSwitchRequest(BaseModel):
    """Quick role switch request for live demo presentations."""
    role: str = Field(..., description="Target role: developer, devops, qa, manager, admin")


# ──────────────────────────────────────────────
# SLA / SLO Monitoring (Phase 6)
# ──────────────────────────────────────────────

class SlaTargetUpdate(BaseModel):
    """Configuration payload to update SLA targets for a service."""
    availability_target: float = Field(..., ge=90.0, le=100.0, description="Target availability percentage (e.g. 99.9)")
    max_latency_ms: float = Field(..., ge=10.0, le=30000.0, description="Max acceptable p95 response time in ms")
    max_error_rate_pct: float = Field(..., ge=0.0, le=100.0, description="Max acceptable error rate percentage")


class SlaTargetResponse(BaseModel):
    """Service SLA target configuration."""
    id: Optional[str] = None
    service_id: str
    availability_target: float = 99.9
    max_latency_ms: float = 1000.0
    max_error_rate_pct: float = 2.0
    updated_at: Optional[str] = None


class SlaStatusItem(BaseModel):
    """Live SLA/SLO evaluation result for a single service."""
    service_id: str
    service_name: str
    availability_target: float
    current_availability: float
    availability_status: str  # healthy, warning, critical
    max_latency_ms: float
    current_p95_latency_ms: float
    latency_status: str
    max_error_rate_pct: float
    current_error_rate_pct: float
    error_rate_status: str
    error_budget_remaining_pct: float
    overall_status: str  # healthy, warning, critical
    active_breaches: list[str] = Field(default_factory=list)
    total_downtime_minutes: float = 0.0
    evaluated_at: str


class SlaOverviewResponse(BaseModel):
    """System-wide SLA overview."""
    overall_system_availability: float
    healthy_services_count: int
    at_risk_services_count: int
    breached_services_count: int
    evaluated_at: str
    services: list[SlaStatusItem] = Field(default_factory=list)


# ──────────────────────────────────────────────
# Notifications (Phase 6)
# ──────────────────────────────────────────────

class NotificationCreateRequest(BaseModel):
    """Request to create an in-app alert notification."""
    user_id: Optional[str] = None
    message: str = Field(..., description="Notification message text")
    type: str = Field("incident", description="Type: incident, sla, prediction, deployment, system")
    incident_id: Optional[int] = None


class NotificationResponse(BaseModel):
    """Notification item model."""
    id: int
    user_id: Optional[str] = None
    message: str
    type: str
    read: bool = False
    incident_id: Optional[int] = None
    created_at: str


# ──────────────────────────────────────────────
# Incident Postmortem Reports (Phase 6)
# ──────────────────────────────────────────────

class IncidentReportResponse(BaseModel):
    """Structured postmortem report for incident audit and export."""
    incident_id: int
    title: str
    severity: str
    status: str
    service_id: str
    start_time: str
    resolved_at: Optional[str] = None
    duration_minutes: Optional[float] = None
    assigned_to: Optional[str] = None
    root_cause: str
    business_impact: str
    evidence: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    correlated_logs_count: int = 0
    deployment_commit: Optional[str] = None
    sla_penalty_applied: bool = False
    generated_at: str
    markdown_content: str

