# DEVSIGHTAI
### AI-Powered Application Monitoring, Incident Intelligence & Reliability Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF.svg)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC.svg)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg)](https://supabase.com)

---

## 📌 Overview

**DEVSIGHTAI** is a modern, full-stack application reliability and incident intelligence platform. It bridges the gap between low-level telemetry, machine learning anomaly detection, and automated AI root cause analysis (RCA). 

Rather than overwhelming engineering teams with fragmented raw logs and disjointed metrics dashboards, DEVSIGHTAI synthesizes infrastructure and application telemetry into unified incidents, explains anomalies using LLM reasoning (powered by Groq Llama-3.3-70B), models business impact, and provides role-tailored perspectives for Developers, DevOps, QA, and Engineering Managers.

---

## 🚀 Key Features

### 1. Unified Telemetry Ingestion & Lightweight Agent
- **psutil Agent**: Lightweight background daemon that collects host & container CPU, memory, disk, network, and request latency every 5 seconds.
- **FastAPI Telemetry Ingestion**: High-throughput REST API endpoints for metrics, logs, events, and deployment markers.
- **Supabase Realtime PostgreSQL**: Persistent storage with real-time websocket broadcasting for zero-polling UI updates.

### 2. ML Anomaly Detection & Incident Correlation
- **Isolation Forest Unsupervised Learning**: Real-time statistical anomaly detection across sliding time windows.
- **Temporal Multi-Signal Correlation**: Automatically groups concurrent metric spikes, HTTP 500 error surges, and deployment events into a single actionable incident.
- **Business Impact Translation**: Translates raw technical failures (e.g., 94% CPU, 2,300 HTTP 500s) into business terms (e.g., *17% checkout failure, high financial risk*).

### 3. AI Root Cause Analysis (RCA) & Automated Runbooks
- **Llama-3.3-70B via Groq**: Generates deep causal analysis from aggregated telemetry evidence within seconds.
- **Streaming Remediation Runbooks**: Step-by-step mitigation commands, verification checks, and rollback advice.
- **Graceful Fallback**: Deterministic heuristic rules engine activates seamlessly when AI endpoints are unreachable.

### 4. Interactive D3 Service Topology & Predictive SLA
- **Dynamic Dependency Graph**: Force-directed graph illustrating service health, downstream cascading impact, and bottleneck nodes.
- **SLA Burn-Rate & Forecasting**: Predictive modeling calculating Error Budget depletion and estimated time to breach.

### 5. Multi-Persona Dashboard Experience
Tailored intelligence views designed for every stakeholder:
- 👨‍💻 **Developer Perspective**: Stack traces, endpoint latency regressions, recent code commits, and direct log correlation.
- 🛠️ **DevOps / SRE Perspective**: Host infrastructure, container CPU/RAM saturation, deployment canary status, and network I/O.
- 🧪 **QA Engineer Perspective**: Automated test pass rates, regression alerts, flaky endpoint flags, and synthetic health checks.
- 📊 **Engineering Manager Perspective**: MTTR/MTTD trends, team reliability SLAs, incident frequencies, and business downtime risk.

---

## 🏗️ System Architecture & Data Flow

```
+------------------+         +--------------------+
| Lightweight Host |         | Synthetic Traffic  |
|  psutil Agent    |         |     Generators     |
+--------+---------+         +---------+----------+
         |                             |
         +--------------+--------------+
                        | (HTTP POST Telemetry)
                        v
        +-------------------------------+
        |      FastAPI Backend API      |
        |  - Metrics / Logs Ingestion   |
        |  - Deployment Tracking        |
        +---------------+---------------+
                        |
       +----------------+----------------+
       |                                 |
       v                                 v
+--------------+                 +---------------+
| ML Anomaly   |                 | Supabase DB   |
| Detection    |                 | - PostgreSQL  |
| (Isolation   |                 | - Realtime WS |
|  Forest)     |                 +-------+-------+
+------+-------+                         |
       |                                 |
       v                                 |
+--------------+                         |
| Correlation  |                         |
| Engine &     |                         |
| Groq AI RCA  |                         |
+------+-------+                         |
       |                                 |
       +----------------+----------------+
                        |
                        v
         +------------------------------+
         |     React 19 + Vite UI       |
         |  - Dual Light / Dark Themes  |
         |  - Recharts Visualizations   |
         |  - D3 Topology Graphs        |
         |  - 4 Persona Intelligence    |
         +------------------------------+
```

---

## 📂 Project Structure

```
DEVSIGHT-AI/
├── agent/                  # Lightweight Python telemetry agent
│   ├── agent.py            # psutil metrics collector & background daemon
│   ├── requirements.txt    # Agent dependencies (psutil, requests)
│   └── .env.example        # Agent configuration template
├── backend/                # FastAPI application backend
│   ├── app/
│   │   ├── core/           # Security, Supabase client, and app config
│   │   ├── models/         # Pydantic schemas and data contracts
│   │   ├── routers/        # API endpoints (metrics, incidents, logs, rca, demo)
│   │   ├── services/       # Isolation Forest, correlator, RCA engine, SLA
│   │   └── main.py         # Application entrypoint
│   ├── schema.sql          # Supabase PostgreSQL database schema
│   ├── verify_pipeline.py  # End-to-end integration verification suite
│   ├── requirements.txt    # Backend dependencies (fastAPI, scikit-learn, groq, etc.)
│   └── .env.example        # Backend environment template
├── frontend/               # React 19 + Vite + Tailwind CSS dashboard
│   ├── src/
│   │   ├── components/     # Charts, icons, modals, and shared widgets
│   │   ├── context/        # Auth and theme (Light/Dark) providers
│   │   ├── layouts/        # Dashboard layout with role navigation
│   │   ├── pages/          # Overview, Incidents, Metrics, Logs, Services, SLA, Demo
│   │   ├── lib/            # API client and Supabase realtime client
│   │   └── index.css       # Design tokens and custom theme styling
│   ├── package.json        # Frontend scripts and dependencies
│   └── vite.config.js      # Vite build configuration
└── README.md
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v18.0 or higher
- **Python**: v3.10 or higher
- **Supabase Account**: (Free tier PostgreSQL project)
- **Groq API Key**: (Optional, for Llama-3.3-70B AI root cause analysis)

---

### 2. Database Setup (Supabase)
1. Create a new project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Paste and run the contents of [`backend/schema.sql`](backend/schema.sql) to create all required tables (`services`, `metrics`, `logs`, `incidents`, `deployments`, `sla_policies`).
4. Note your **Project URL** and **Service Role / Anon Keys**.

---

### 3. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and supply your SUPABASE_URL, SUPABASE_KEY, and GROQ_API_KEY

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
Backend API interactive documentation is available at `http://localhost:8000/docs`.

---

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with VITE_BACKEND_URL and Supabase credentials

# Launch Vite development server
npm run dev
```
Open your browser at `http://localhost:5173`.

---

### 5. Running the Telemetry Agent

```bash
cd agent

# Activate backend or dedicated virtual environment
pip install -r requirements.txt

# Run agent
python agent.py
```

---

### 6. Automated Pipeline Verification

To execute an end-to-end synthetic verification across all layers (Agent metrics -> Ingestion -> Anomaly Detection -> Correlator -> Incident -> AI RCA):

```bash
cd backend
python verify_pipeline.py
```

---

## 🎨 Design System & UI/UX

- **Typography**: Bahnschrift headings, Inter body, and JetBrains Mono monospace telemetry.
- **Color Palette**: Precision Kelly Green (`#4CBB17`), Deep Royal Blue (`#2B5EA7`), Slate Gray borders, and contextual severity accents (P1 Critical, P2 High, P3 Medium, P4 Low).
- **Dual Themes**: Complete, cohesive Dark and Light modes with persistent local preference.
- **Clean Interface**: SVG iconography, responsive layouts, and zero distraction.

---

## 📄 License

This project is licensed under the MIT License.
