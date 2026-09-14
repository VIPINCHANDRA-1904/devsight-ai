import { useState } from "react";

const phases = [
  {
    id: 1,
    label: "Phase 1",
    title: "Foundation & Data Ingestion",
    duration: "Week 1–2",
    color: "#3B82F6",
    tag: "CORE",
    tagColor: "#1D4ED8",
    description: "Set up the full project skeleton, Supabase schema, and the FastAPI ingestion layer. Get real data flowing from the psutil agent into the dashboard.",
    tasks: [
      {
        category: "Project Setup",
        items: [
          "Monorepo structure: /backend (FastAPI), /frontend (React + Vite), /agent (psutil collector)",
          "pip install: fastapi uvicorn supabase python-jose[cryptography] bcrypt psutil pandas scikit-learn groq python-dotenv",
          "npm install: @supabase/supabase-js recharts d3 react-router-dom tailwindcss",
          "Configure .env: SUPABASE_URL, SUPABASE_SERVICE_KEY (backend), SUPABASE_ANON_KEY (frontend), GROQ_API_KEY",
          "FastAPI CORS middleware: allow React dev server origin (localhost:5173) + Supabase URL from day 1"
        ]
      },
      {
        category: "Supabase Schema",
        items: [
          "Tables: users, services, metrics, logs, deployments, incidents, incident_events, recommendations, predicted_warnings",
          "Use SUPABASE_SERVICE_KEY on backend (bypasses RLS for writes) — never expose this to frontend",
          "Use SUPABASE_ANON_KEY on frontend with RLS policies for read-only dashboard queries",
          "Enable Supabase Realtime on the incidents table immediately — React will subscribe to live incident inserts",
          "supabase-py client: supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)"
        ]
      },
      {
        category: "FastAPI Ingestion Endpoints",
        items: [
          "POST /api/metrics → supabase.table('metrics').insert(payload).execute()",
          "POST /api/logs → parse + tag severity (INFO/WARN/ERROR/CRITICAL), insert to logs table",
          "POST /api/events → store HTTP request events (endpoint, response_time, status_code, service)",
          "POST /api/deployments → store CI/CD webhook payload (service, version, commit, deployed_at)",
          "GET /api/metrics/{service_id} → time-series query with .order('timestamp', desc=True).limit(200)"
        ]
      },
      {
        category: "psutil Monitoring Agent",
        items: [
          "Single-file agent: reads CPU/RAM/Disk/Network via psutil every 10s, POSTs to /api/metrics",
          "Payload: { server_id, timestamp (UTC ISO), cpu, memory, disk, network_sent_mb, network_recv_mb }",
          "Wrap POST in try/except with print fallback — agent must never crash if backend is temporarily down",
          "Configure via env vars: DEVSIGHTAI_URL, SERVER_ID — no hardcoded values"
        ]
      },
      {
        category: "Demo Application",
        items: [
          "Build simulated e-commerce app (Login, Orders, Payments, DB) — instruments /api/events and /api/logs",
          "Failure-injection script: spike CPU load, simulate DB timeout logs, trigger HTTP 500 bursts, deploy a 'bad version'",
          "Critical: professors must see failure → detection → AI explanation end-to-end, not a static dashboard",
          "Run agent + demo app on same machine; watch metrics reflect injected failures in real time on dashboard"
        ]
      }
    ],
    deliverable: "Data flows from psutil agent + simulated app into Supabase via FastAPI. Raw metrics visible on the React dashboard. Supabase Realtime subscription active.",
    watchpoints: [
      "Use SERVICE_KEY on backend, ANON_KEY on frontend — mixing these causes silent auth failures",
      "Set up CORS on day 1 — it causes cryptic errors if added later",
      "Enable Realtime on incidents table in Supabase dashboard before writing subscription code"
    ]
  },
  {
    id: 2,
    label: "Phase 2",
    title: "ML Anomaly Detection",
    duration: "Week 3",
    color: "#8B5CF6",
    tag: "ML",
    tagColor: "#6D28D9",
    description: "Run IsolationForest as a FastAPI BackgroundTask after every metric ingestion. Add Pandas-based trend analysis for predictive warnings. Never block the ingestion endpoint waiting for ML.",
    tasks: [
      {
        category: "IsolationForest Pipeline",
        items: [
          "Use FastAPI BackgroundTasks — trigger run_anomaly_detection(service_id) after every /api/metrics insert, not inline",
          "Pull last 100 metric rows for the service from Supabase: .select('cpu,memory,latency,error_rate,requests_per_min').eq('service_id', id).limit(100)",
          "Load into Pandas DataFrame → feed to IsolationForest(contamination=0.05, random_state=42).fit_predict(df)",
          "If latest row anomaly_score == -1: write to anomalies table and call trigger_correlation_engine(service_id)",
          "Retrain on each batch for the demo (no model persistence needed); use joblib.dump() later for production"
        ]
      },
      {
        category: "Trend Analysis (Pandas)",
        items: [
          "Rolling 40-minute window: df['memory'].rolling(window=8).mean() — detect monotonically increasing slope",
          "Trigger predictive warning when: slope > threshold AND current value > 70% AND trend is consistent",
          "Example output: '⚠ Memory usage increasing for 40 min — may reach critical in ~15 min'",
          "Insert into predicted_warnings table: { service_id, metric, current_value, predicted_critical_at, severity }"
        ]
      },
      {
        category: "Log Analysis",
        items: [
          "On POST /api/logs: regex-classify each line for ERROR/WARN/CRITICAL keywords, extract service + timestamp",
          "Count error frequency per service per 5-min window using Pandas groupby on the logs table",
          "Expose GET /api/logs?service_id=x&level=ERROR&window=1h — dashboard uses this for the log panel",
          "High error frequency (>10 ERRORs in 5 min) feeds into the correlation engine as a signal"
        ]
      },
      {
        category: "React Chart Integration",
        items: [
          "Use Recharts LineChart for all time-series (CPU, memory, latency, error rate) — not D3",
          "Reserve D3 exclusively for the service dependency force-directed graph in Phase 3",
          "Overlay anomaly points on Recharts charts as red dots using a custom dot renderer",
          "Supabase Realtime subscription on metrics table: new rows append to chart data without polling"
        ]
      }
    ],
    deliverable: "IsolationForest flags anomalous metric batches as background tasks. Predictive warnings stored in Supabase. Recharts dashboard shows anomaly overlays in real time.",
    watchpoints: [
      "Always use BackgroundTasks — synchronous ML inference in the route handler blocks the ingestion endpoint",
      "Need ≥20 rows before IsolationForest runs — add a guard: if len(df) < 20: return",
      "Recharts for time-series, D3 only for the dependency graph — don't mix them on the same chart"
    ]
  },
  {
    id: 3,
    label: "Phase 3",
    title: "Incident Correlation Engine",
    duration: "Week 4",
    color: "#EF4444",
    tag: "CORE",
    tagColor: "#B91C1C",
    description: "The heart of the project. Correlate anomalies + error logs + deployment events into one unified incident. Supabase Realtime pushes the created incident to the React dashboard instantly.",
    tasks: [
      {
        category: "Correlation Logic",
        items: [
          "IncidentCorrelator runs as a FastAPI BackgroundTask triggered by anomaly detection",
          "Query Supabase: anomalies + ERROR logs + deployments within the last 15-min window for the affected service",
          "Scoring rules: anomaly alone = 1pt; + ERROR logs in 5 min = +2pts; + recent deployment = +3pts; + DB timeout logs = +2pts",
          "Score ≥ 4: create incident. Score < 4: store as a low-priority alert only",
          "Prevents alert storms: one incident groups 5+ raw signals into a single actionable item"
        ]
      },
      {
        category: "Incident Lifecycle",
        items: [
          "Incident schema: id, severity (LOW/MEDIUM/HIGH/CRITICAL), status, start_time, service_id, affected_metrics (JSON), correlated_logs (JSON), correlated_deployment_id, similar_incidents (JSON), assigned_to, resolution_time",
          "Full lifecycle: Detected → Assigned → Investigating → Root Cause Identified → Fix Applied → Resolved",
          "PATCH /api/incidents/{id}/status and PATCH /api/incidents/{id}/assign update Supabase row",
          "Supabase Realtime on incidents table: INSERT triggers React notification + dashboard update instantly — whole chain in <3 seconds"
        ]
      },
      {
        category: "Historical Matching",
        items: [
          "On incident creation: query historical incidents for same service_id + overlapping log keywords",
          "Simple similarity: count matching ERROR message substrings between current logs and past incident logs",
          "Store top 3 matches as similar_incidents JSON on the new incident row",
          "AI RCA in Phase 4 uses this historical context — pass it in the Groq prompt"
        ]
      },
      {
        category: "Service Dependency Map (D3)",
        items: [
          "Define dependency graph as JSON in Supabase: nodes (services) + edges (dependencies)",
          "GET /api/services/dependency-graph → fetched once on dashboard load",
          "D3 force-directed graph: d3.forceSimulation() renders nodes as circles, edges as lines",
          "On incident creation: highlight affected node red + propagate colour to dependent nodes",
          "This is a strong demo moment — professors can see exactly which service caused the cascade"
        ]
      }
    ],
    deliverable: "One correlated incident '🔴 INC-1024 — Payment Service Degradation' replaces 5 raw alerts. Supabase Realtime pushes it to React in <3 seconds. D3 dependency map highlights affected services.",
    watchpoints: [
      "Supabase Realtime must be enabled on the incidents table in the Supabase dashboard — it's off by default",
      "D3 force simulation needs cleanup on React component unmount (simulation.stop()) to avoid memory leaks",
      "Don't store raw log text in similar_incidents JSON — store log IDs only to keep the column size manageable"
    ]
  },
  {
    id: 4,
    label: "Phase 4",
    title: "AI Root Cause Analysis (Groq)",
    duration: "Week 5",
    color: "#F59E0B",
    tag: "AI",
    tagColor: "#B45309",
    description: "Use Groq's llama-3.3-70b-versatile to generate RCA, evidence, and recommendations for each incident. Keep temperature low for structured JSON output. Add an interactive AI assistant per incident.",
    tasks: [
      {
        category: "Incident Context Builder",
        items: [
          "Build structured context packager — do NOT send raw DB dumps to Groq",
          "Context format: { incident_id, service, time_range, metric_deltas: {cpu: '52%→88%', latency: '400ms→2.8s'}, top_error_logs: [...5 most frequent], deployment: {version, deployed_at}, similar_incidents: [...3 past matches] }",
          "Keep context under ~1500 tokens — Groq is fast but structured context beats volume",
          "POST /api/incidents/{id}/analyze → builds context, calls Groq, stores result in incident_analysis table"
        ]
      },
      {
        category: "Groq API Integration",
        items: [
          "from groq import Groq; client = Groq(api_key=GROQ_API_KEY)",
          "Model: llama-3.3-70b-versatile, temperature: 0.2 (low = consistent structured output for RCA)",
          "System prompt instructs: respond ONLY in valid JSON with keys: root_cause, evidence[], recommended_actions[], business_impact, confidence (HIGH/MEDIUM/LOW)",
          "Parse response: json.loads(response.choices[0].message.content) — wrap in try/except for malformed JSON",
          "Debounce: check if incident_analysis row already exists before calling Groq — prevents duplicate LLM calls"
        ]
      },
      {
        category: "Interactive AI Assistant",
        items: [
          "Chat interface per incident — user types: 'Why is payment failing?' / 'What should I check first?' / 'Show similar incidents'",
          "POST /api/incidents/{id}/chat with { message, conversation_history[] }",
          "Each request appends to conversation_history and sends to Groq with temperature: 0.5 (more conversational)",
          "Store conversation_history in Supabase incident_chat table per incident",
          "This upgrades the project from a static AI Summary button to a real investigation tool"
        ]
      },
      {
        category: "Business Impact Layer",
        items: [
          "Include business_impact as a required field in the Groq JSON response schema",
          "Groq prompt example: 'Translate technical metrics into business impact for a non-technical manager'",
          "Example output: '17% checkout failures — revenue-generating service affected, estimated 2,341 failed transactions'",
          "Display prominently on Manager Dashboard — this is what makes the project relevant beyond DevOps"
        ]
      }
    ],
    deliverable: "Every incident has AI-generated root cause, evidence, recommendations, business impact, and an interactive chat assistant. Full RCA generated in <3 seconds via Groq.",
    watchpoints: [
      "temperature: 0.2 for RCA JSON output, 0.5 for conversational AI assistant — don't use the same setting for both",
      "Groq free tier is generous but rate-limited — trigger RCA on incident creation only, not on every metric",
      "Always json.loads() in a try/except — llama-3.3-70b occasionally adds markdown fences around JSON output"
    ]
  },
  {
    id: 5,
    label: "Phase 5",
    title: "Deployment & Release Intelligence",
    duration: "Week 6",
    color: "#10B981",
    tag: "STRONG ADD",
    tagColor: "#065F46",
    description: "Track every deployment event and automatically detect performance regressions. Show before/after metric comparisons as a Release Health card on the dashboard.",
    tasks: [
      {
        category: "Deployment Tracking",
        items: [
          "POST /api/deployments stores: service_id, version, commit_hash, environment, deployed_at, deployed_by",
          "CI/CD webhook (GitHub Actions / any pipeline) fires this endpoint after each successful deploy",
          "For demo: manually POST a deployment event via the dashboard UI or a test script",
          "Link every metric row to active deployment version: add current_deployment_id FK on metrics table"
        ]
      },
      {
        category: "Before / After Comparison (Pandas)",
        items: [
          "On deployment event: snapshot baseline — avg(cpu, memory, latency, error_rate) for 30 min before deployed_at",
          "After deployment: monitor same metrics for 30 min, recalculate averages using Pandas",
          "Generate Release Health table: { metric, before, after, delta_pct, status } stored in deployment_health table",
          "Status thresholds: error_rate +3x = CRITICAL 🔴, latency +2x = WARNING ⚠️, within 20% = HEALTHY 🟢"
        ]
      },
      {
        category: "Regression Detection",
        items: [
          "If error_rate increases >3x OR latency increases >2x within 30 min of deployment → auto-create a MEDIUM/HIGH incident",
          "Incident title: 'Potential regression detected after {service} v{version} deployment'",
          "Include deployment commit hash and before/after delta in the Groq RCA context",
          "Groq can then output: 'Review changes in commit a82f91 / consider rollback if issue continues'"
        ]
      },
      {
        category: "Recharts Deployment Markers",
        items: [
          "Add vertical ReferenceLine on Recharts time-series charts at each deployment timestamp",
          "Label: 'v2.4 deployed' — makes the before/after degradation visually obvious on the chart",
          "Strong demo moment: show the chart, point to the deployment line, show metrics climbing after it",
          "Fetch deployment timestamps alongside metric data: include in GET /api/metrics/{service_id} response"
        ]
      }
    ],
    deliverable: "Every deployment has a Release Health card (Before / After / Status). Regressions auto-create incidents. Recharts charts show deployment markers as vertical reference lines.",
    watchpoints: [
      "The 30-min post-deploy window is fixed — make it configurable via env var for different demo scenarios",
      "Store baseline snapshot at deployment time, not retroactively — data may not be available later",
      "ReferenceLine in Recharts requires the exact timestamp string to match the chart's XAxis dataKey"
    ]
  },
  {
    id: 6,
    label: "Phase 6",
    title: "Dashboards, RBAC & SLA Monitoring",
    duration: "Week 7",
    color: "#06B6D4",
    tag: "PLATFORM",
    tagColor: "#0E7490",
    description: "Build four role-based React dashboards backed by JWT + Supabase RLS, add SLA/SLO monitoring, in-app and email notifications, and exportable incident reports.",
    tasks: [
      {
        category: "JWT Auth + Supabase RLS",
        items: [
          "FastAPI login endpoint: verify bcrypt password → issue JWT with role claim (developer/devops/qa/manager)",
          "React stores JWT in memory (not localStorage for security) — attach as Authorization: Bearer header",
          "Supabase RLS policies: manager role sees all services; developer/qa see only their assigned services",
          "React Router protected routes: <ProtectedRoute role='manager'> redirects unauthorised users"
        ]
      },
      {
        category: "Role-Based Dashboards (React)",
        items: [
          "Developer: Error logs, stack traces, recent deployments, AI explanation per incident",
          "DevOps: CPU/RAM/Network Recharts, service health grid, active alerts, infrastructure overview",
          "QA: Response time trends, error rate before/after release, Release Health cards",
          "Manager: System health summary, incident count, MTTR, SLA status, business impact panel",
          "Same FastAPI API — different React routes with role-specific data filters and layouts"
        ]
      },
      {
        category: "SLA / SLO Monitoring",
        items: [
          "User-configurable SLA targets per service stored in Supabase: availability_target, max_latency_ms, max_error_rate_pct",
          "Calculate availability from uptime events: (total_minutes - downtime_minutes) / total_minutes * 100",
          "SLA panel: Availability 99.94% 🟢 | Response Time 380ms 🟢 | Error Rate 0.8% 🟢",
          "SLA breach → auto-create LOW/MEDIUM incident + send notification: '🔴 SLA Risk: availability below 99.9% target'"
        ]
      },
      {
        category: "Notifications",
        items: [
          "In-app: Supabase Realtime subscription on notifications table — toast appears instantly on incident creation",
          "Email: SMTP via SendGrid free tier (100 emails/day) or Gmail SMTP for demo — trigger on CRITICAL incidents",
          "Notification schema: user_id, message, type (incident/sla/prediction/deployment), read, created_at",
          "Notification bell icon in navbar shows unread count — mark-as-read via PATCH /api/notifications/{id}"
        ]
      }
    ],
    deliverable: "Four distinct JWT-protected dashboards with role-filtered data. SLA panels with live status. In-app Realtime notifications + email alerts for critical incidents.",
    watchpoints: [
      "Store JWT in memory or httpOnly cookie — localStorage is vulnerable to XSS attacks",
      "Supabase RLS policies must be tested carefully: a missing policy silently returns empty data, not an error",
      "SendGrid free tier needs domain verification — use Gmail SMTP for the demo to avoid setup delays"
    ]
  },
  {
    id: 7,
    label: "Phase 7",
    title: "Demo, Polish & Presentation",
    duration: "Week 8",
    color: "#EC4899",
    tag: "DEMO",
    tagColor: "#9D174D",
    description: "Rehearse five live failure scenarios, polish the UI, and prepare the professor Q&A. The demo must be end-to-end: inject failure → Groq explains it → dashboard updates via Supabase Realtime.",
    tasks: [
      {
        category: "5 Live Demo Scenarios",
        items: [
          "Scenario 1 (E-commerce): Inject payment checkout errors → IsolationForest flags anomaly → incident auto-created → Groq RCA in <3 seconds → Supabase Realtime updates dashboard",
          "Scenario 2 (College ERP): Simulate traffic spike during exam result publish → trend analysis fires predictive warning before crash",
          "Scenario 3 (SaaS Release): POST a 'bad' deployment → 30-min comparison detects regression → Release Health card turns red → incident auto-created",
          "Scenario 4 (Memory Leak): Gradually increase memory in injection script → trend slope triggers '⚠ Predicted Memory Exhaustion' warning",
          "Scenario 5 (Service Cascade): Simulate DB timeout → D3 dependency map highlights DB + all dependent services (Payment, Order) red"
        ]
      },
      {
        category: "Groq Demo Timing",
        items: [
          "Pre-warm the Groq connection before the demo — first call after a cold start can be slower",
          "Show the AI Assistant live: type 'Why is the payment service failing?' and show Groq's response in real time",
          "Show 'Similar incidents found' — pre-seed the DB with one historical incident matching the demo failure",
          "Groq's speed (<2s response) is a demo advantage — emphasise it: 'RCA generated in under 2 seconds'"
        ]
      },
      {
        category: "Professor Q&A Prep",
        items: [
          "Q: 'Prometheus already does this' → A: Prometheus shows CPU=92%. DEVSIGHTAI answers: what happened, why, which service, what changed, business impact, what to do. Pipeline: Observe→Detect→Correlate→Explain→Predict→Recommend→Resolve",
          "Q: 'How does it get the data?' → A: Three mechanisms: psutil agent (CPU/RAM), app instrumentation (response_time, errors), CI/CD webhook (deployments) — walk through the data flow diagram",
          "Q: 'Is the AI actually useful?' → A: Live demo — type a question in the AI Assistant and show the structured response with evidence and recommended actions"
        ]
      },
      {
        category: "UI Polish & Multi-Format Upload",
        items: [
          "Dark mode dashboard: colour-coded severity (green/yellow/orange/red) consistently across all panels",
          "Animated Recharts sparklines on monitoring overview; D3 dependency map with smooth force-simulation transitions",
          "File upload: accept .log, .csv, .json — run same IsolationForest + log analysis pipeline on uploaded files",
          "Useful for offline demo and for QA/student use without a live agent running"
        ]
      }
    ],
    deliverable: "Rehearsed 10-minute live demo across 5 scenarios. Professor injects a failure and watches DEVSIGHTAI detect, correlate, and explain it — end to end, in under 10 seconds.",
    watchpoints: [
      "Run the demo against a stable network — Supabase Realtime and Groq API both need internet connectivity",
      "Pre-seed the DB with 2 weeks of simulated historical data so 'Similar incidents' always finds a match",
      "Have a static screenshot backup for every live demo step in case of connectivity issues during presentation"
    ]
  }
];

const techStack = [
  {
    layer: "Backend API",
    tech: "FastAPI (Python)",
    pkg: "fastapi uvicorn python-dotenv",
    note: "Central ingestion layer, ML orchestration, Groq integration, REST API. Use BackgroundTasks for all ML inference — never block ingestion endpoints."
  },
  {
    layer: "Database",
    tech: "Supabase (Hosted PostgreSQL + Realtime)",
    pkg: "supabase-py",
    note: "SERVICE_KEY on backend (bypasses RLS), ANON_KEY on frontend (RLS-protected reads). Enable Realtime on incidents + notifications tables for live dashboard updates."
  },
  {
    layer: "LLM / AI Engine",
    tech: "Groq API — llama-3.3-70b-versatile",
    pkg: "groq",
    note: "temperature=0.2 for structured RCA JSON, temperature=0.5 for AI assistant chat. Always json.loads() in try/except — model occasionally wraps output in markdown fences."
  },
  {
    layer: "ML / Anomaly Detection",
    tech: "scikit-learn IsolationForest + Pandas",
    pkg: "scikit-learn pandas numpy",
    note: "IsolationForest(contamination=0.05, random_state=42). Guard: skip if <20 rows. Retrain per batch for demo. Pandas rolling windows for trend/predictive analysis."
  },
  {
    layer: "Frontend",
    tech: "React + Vite + TailwindCSS",
    pkg: "react react-router-dom tailwindcss",
    note: "Role-based dashboards (Developer/DevOps/QA/Manager). Supabase Realtime subscriptions for live incident + notification updates. JWT in memory, not localStorage."
  },
  {
    layer: "Charts",
    tech: "Recharts + D3",
    pkg: "recharts d3",
    note: "Recharts for all time-series (CPU, latency, error rate) with ReferenceLine deployment markers. D3 exclusively for the service dependency force-directed graph."
  },
  {
    layer: "Monitoring Agent",
    tech: "Python psutil",
    pkg: "psutil requests",
    note: "Single-file collector. Reads CPU/RAM/Disk/Network every 10s, POSTs to /api/metrics. Configure via env vars (DEVSIGHTAI_URL, SERVER_ID). Try/except on every POST."
  },
  {
    layer: "Auth",
    tech: "JWT + bcrypt",
    pkg: "python-jose[cryptography] bcrypt",
    note: "FastAPI OAuth2PasswordBearer. JWT carries role claim. Supabase RLS enforces data-level access per role."
  },
  {
    layer: "Notifications",
    tech: "Supabase Realtime + SMTP",
    pkg: "sendgrid (or smtplib)",
    note: "In-app via Realtime subscription on notifications table. Email via SendGrid free tier (100/day) or Gmail SMTP for demo — trigger on CRITICAL incidents only."
  }
];

const priorityItems = [
  {
    label: "🔴 Must Implement",
    color: "#EF4444",
    items: [
      "Authentication + JWT + RBAC",
      "psutil agent → /api/metrics ingestion",
      "Log ingestion + severity classification",
      "Recharts dashboard (multi-role)",
      "IsolationForest anomaly detection (BackgroundTask)",
      "Alert generation from anomaly scores",
      "Incident grouping + full lifecycle",
      "Groq RCA + recommendations",
      "Historical incident comparison",
      "Incident management system",
      "Role-based dashboards (4 views)"
    ]
  },
  {
    label: "🟡 Strong Additions",
    color: "#F59E0B",
    items: [
      "D3 service dependency map",
      "Deployment impact + regression detection",
      "Predictive failure warnings (Pandas trend)",
      "SLA/SLO monitoring panel",
      "Business impact analysis (Groq output)",
      "Supabase Realtime notifications",
      "Release Health before/after cards",
      "Recharts deployment markers"
    ]
  },
  {
    label: "🟢 Future Scope",
    color: "#10B981",
    items: [
      "Distributed tracing",
      "Automatic remediation",
      "Kubernetes monitoring",
      "Advanced ML forecasting",
      "Multi-cloud monitoring",
      "WhatsApp / SMS notifications",
      "Multi-tenant workspaces"
    ]
  }
];

export default function ImplementationPlan() {
  const [activePhase, setActivePhase] = useState(1);
  const [activeTab, setActiveTab] = useState("phases");
  const [expandedWatchpoint, setExpandedWatchpoint] = useState(false);

  const phase = phases.find(p => p.id === activePhase);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#0F172A", minHeight: "100vh", color: "#E2E8F0" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)", borderBottom: "1px solid #1E3A5F", padding: "28px 32px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3B82F6", boxShadow: "0 0 12px #3B82F6" }} />
          <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "#64748B", fontWeight: 600 }}>AI-POWERED APPLICATION MONITORING PLATFORM</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#F1F5F9", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          DEVSIGHTAI — Implementation Plan
        </h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {[
            { label: "FastAPI", color: "#3B82F6" },
            { label: "Supabase + Realtime", color: "#10B981" },
            { label: "Groq llama-3.3-70b", color: "#F59E0B" },
            { label: "IsolationForest + Pandas", color: "#8B5CF6" },
            { label: "React + Recharts + D3", color: "#06B6D4" },
            { label: "psutil Agent", color: "#EC4899" }
          ].map((t, i) => (
            <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: t.color + "22", color: t.color, fontWeight: 600, border: `1px solid ${t.color}44` }}>
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1E293B", padding: "0 32px", background: "#0F172A" }}>
        {[
          { id: "phases", label: "Build Phases" },
          { id: "stack", label: "Tech Stack" },
          { id: "priority", label: "Feature Priority" }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "14px 20px", background: "none", border: "none", cursor: "pointer", fontSize: 14,
            fontWeight: activeTab === tab.id ? 600 : 400,
            color: activeTab === tab.id ? "#3B82F6" : "#64748B",
            borderBottom: activeTab === tab.id ? "2px solid #3B82F6" : "2px solid transparent",
            marginBottom: -1, transition: "color 0.15s"
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* PHASES TAB */}
      {activeTab === "phases" && (
        <div style={{ display: "flex", gap: 0, minHeight: "calc(100vh - 170px)" }}>
          {/* Sidebar */}
          <div style={{ width: 200, borderRight: "1px solid #1E293B", padding: "20px 0", flexShrink: 0 }}>
            {phases.map(p => (
              <button key={p.id} onClick={() => { setActivePhase(p.id); setExpandedWatchpoint(false); }} style={{
                display: "block", width: "100%", textAlign: "left", padding: "12px 20px",
                background: activePhase === p.id ? "#1E293B" : "none", border: "none",
                borderLeft: activePhase === p.id ? `3px solid ${p.color}` : "3px solid transparent",
                cursor: "pointer", transition: "all 0.15s"
              }}>
                <div style={{ fontSize: 11, color: activePhase === p.id ? p.color : "#475569", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 2 }}>{p.label}</div>
                <div style={{ fontSize: 13, color: activePhase === p.id ? "#F1F5F9" : "#64748B", fontWeight: 500, lineHeight: 1.3 }}>{p.title}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>{p.duration}</div>
              </button>
            ))}
          </div>

          {/* Phase detail */}
          <div style={{ flex: 1, padding: "28px 32px", overflow: "auto" }}>
            {phase && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: phase.tagColor + "33", color: phase.color, letterSpacing: "0.08em" }}>{phase.tag}</span>
                    <span style={{ fontSize: 13, color: "#64748B" }}>{phase.duration}</span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.01em" }}>{phase.title}</h2>
                  <p style={{ margin: "8px 0 0", color: "#94A3B8", fontSize: 14, lineHeight: 1.6, maxWidth: 660 }}>{phase.description}</p>
                </div>

                {/* Tasks */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 20 }}>
                  {phase.tasks.map((group, gi) => (
                    <div key={gi} style={{ background: "#1E293B", borderRadius: 10, padding: "16px 18px", border: "1px solid #334155" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: phase.color, letterSpacing: "0.08em", marginBottom: 12 }}>{group.category.toUpperCase()}</div>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {group.items.map((item, ii) => (
                          <li key={ii} style={{ display: "flex", gap: 8, marginBottom: 9, alignItems: "flex-start" }}>
                            <span style={{ color: phase.color, marginTop: 1, flexShrink: 0, fontSize: 14 }}>›</span>
                            <span style={{ fontSize: 12.5, color: "#CBD5E1", lineHeight: 1.55 }}>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Deliverable */}
                <div style={{ background: "#0D1F3C", border: `1px solid ${phase.color}44`, borderLeft: `3px solid ${phase.color}`, borderRadius: 8, padding: "13px 18px", marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: phase.color, letterSpacing: "0.1em" }}>PHASE DELIVERABLE</span>
                  <p style={{ margin: "5px 0 0", fontSize: 13.5, color: "#93C5FD", lineHeight: 1.6 }}>{phase.deliverable}</p>
                </div>

                {/* Watchpoints */}
                <div
                  onClick={() => setExpandedWatchpoint(!expandedWatchpoint)}
                  style={{ background: "#1C1410", border: "1px solid #78350F44", borderLeft: "3px solid #F59E0B", borderRadius: 8, padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B", letterSpacing: "0.1em" }}>⚠ INTEGRATION WATCHPOINTS ({phase.watchpoints.length})</span>
                    <span style={{ fontSize: 12, color: "#78350F" }}>{expandedWatchpoint ? "▲ hide" : "▼ show"}</span>
                  </div>
                  {expandedWatchpoint && (
                    <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none" }}>
                      {phase.watchpoints.map((w, wi) => (
                        <li key={wi} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                          <span style={{ color: "#F59E0B", flexShrink: 0, fontSize: 13 }}>!</span>
                          <span style={{ fontSize: 12.5, color: "#FCD34D", lineHeight: 1.55 }}>{w}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Navigation */}
                <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                  {phase.id > 1 && (
                    <button onClick={() => { setActivePhase(phase.id - 1); setExpandedWatchpoint(false); }}
                      style={{ padding: "9px 18px", background: "#1E293B", border: "1px solid #334155", borderRadius: 6, color: "#94A3B8", cursor: "pointer", fontSize: 13 }}>
                      ← Previous Phase
                    </button>
                  )}
                  {phase.id < phases.length && (
                    <button onClick={() => { setActivePhase(phase.id + 1); setExpandedWatchpoint(false); }}
                      style={{ padding: "9px 18px", background: phase.color, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      Next Phase →
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TECH STACK TAB */}
      {activeTab === "stack" && (
        <div style={{ padding: "32px" }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "#F1F5F9" }}>Technology Stack</h2>
          <p style={{ margin: "0 0 24px", color: "#64748B", fontSize: 14 }}>Confirmed stack — every layer with the exact packages and key integration notes.</p>
          <div style={{ display: "grid", gap: 10 }}>
            {techStack.map((row, i) => (
              <div key={i} style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 10, padding: "15px 20px", display: "grid", gridTemplateColumns: "130px 200px 1fr", gap: 16, alignItems: "start" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#3B82F6", letterSpacing: "0.06em", paddingTop: 2 }}>{row.layer}</div>
                <div>
                  <div style={{ fontSize: 13.5, color: "#E2E8F0", fontWeight: 600, marginBottom: 4 }}>{row.tech}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#475569", background: "#0F172A", padding: "2px 6px", borderRadius: 4, display: "inline-block" }}>{row.pkg}</div>
                </div>
                <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>{row.note}</div>
              </div>
            ))}
          </div>

          {/* Data flow */}
          <div style={{ marginTop: 28, background: "#0D1F3C", border: "1px solid #1E3A5F", borderRadius: 10, padding: "20px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#3B82F6", letterSpacing: "0.1em", marginBottom: 14 }}>CONFIRMED DATA FLOW</div>
            {[
              { step: "psutil Agent", detail: "CPU/RAM/Disk/Network every 10s → POST /api/metrics", color: "#EC4899" },
              { step: "Demo App", detail: "Response time, status codes → POST /api/events + /api/logs", color: "#EC4899" },
              { step: "CI/CD Webhook", detail: "Deployment events → POST /api/deployments", color: "#EC4899" },
              { step: "FastAPI", detail: "Validates, inserts to Supabase (SERVICE_KEY), triggers BackgroundTask", color: "#3B82F6" },
              { step: "Supabase", detail: "Persists all data; Realtime broadcasts incident + notification inserts", color: "#10B981" },
              { step: "IsolationForest", detail: "Runs as BackgroundTask on metric batch → anomaly_score → triggers correlator", color: "#8B5CF6" },
              { step: "Incident Engine", detail: "Correlates anomaly + logs + deployment → creates incident row in Supabase", color: "#EF4444" },
              { step: "Groq llama-3.3-70b", detail: "Receives structured context → returns JSON RCA in <3 seconds", color: "#F59E0B" },
              { step: "Supabase Realtime", detail: "Pushes incident insert to React subscription → dashboard updates instantly", color: "#10B981" },
              { step: "React Dashboard", detail: "Recharts time-series + D3 dependency map + role-based views for all 4 user types", color: "#06B6D4" }
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "flex-start" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: row.color, marginTop: 5, flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: row.color }}>{row.step}</span>
                  <span style={{ fontSize: 12, color: "#64748B" }}> → {row.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRIORITY TAB */}
      {activeTab === "priority" && (
        <div style={{ padding: "32px" }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "#F1F5F9" }}>Feature Priority</h2>
          <p style={{ margin: "0 0 24px", color: "#64748B", fontSize: 14 }}>Scoped to be ambitious but completable. Don't implement everything blindly.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
            {priorityItems.map((group, gi) => (
              <div key={gi} style={{ background: "#1E293B", border: `1px solid ${group.color}33`, borderTop: `3px solid ${group.color}`, borderRadius: 10, padding: "18px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: group.color, marginBottom: 14 }}>{group.label}</div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {group.items.map((item, ii) => (
                    <li key={ii} style={{ display: "flex", gap: 8, marginBottom: 9, alignItems: "center" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: group.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "#CBD5E1" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Differentiation */}
          <div style={{ marginTop: 28, background: "#1E293B", border: "1px solid #334155", borderRadius: 10, padding: "22px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B", letterSpacing: "0.1em", marginBottom: 14 }}>WHEN A PROFESSOR ASKS: "BUT PROMETHEUS ALREADY DOES THIS"</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>Prometheus / Grafana shows:</div>
                {["CPU = 92%", "Memory = 87%", "Error Rate = 12%"].map((s, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#94A3B8", padding: "5px 0", borderBottom: "1px solid #334155" }}>{s}</div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6", marginBottom: 8 }}>DEVSIGHTAI answers:</div>
                {["What happened?", "Why did it happen?", "Which service caused it?", "What changed before the incident?", "Has this happened before?", "What could happen next?", "What should the team do?", "What is the business impact?"].map((s, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#60A5FA", padding: "5px 0", borderBottom: "1px solid #1E3A5F" }}>{s}</div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 16, padding: "12px 16px", background: "#0D1F3C", borderRadius: 6, fontSize: 13, color: "#93C5FD", fontWeight: 500 }}>
              Pipeline: Observe → Detect → Correlate → Explain → Predict → Recommend → Resolve
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
