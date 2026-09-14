/**
 * DEVSIGHTAI — Technical Defense & Architecture Guide Modal
 *
 * Interactive presentation helper answering core examiner questions:
 * - "Prometheus already does this" (Contrast table & 8 core answers)
 * - "How does it get the data?" (Agent + Instrumentation + Webhook architecture)
 * - "Is AI useful?" (Groq speed, temperature tuning, structured output)
 * - End-to-end Pipeline walkthrough (Observe → Detect → Correlate → Explain → Predict → Recommend → Resolve)
 *
 * Zero emojis, clean SVG iconography, dual theme support.
 */

import { useState } from 'react'
import {
  IconDefense,
  IconClose,
  IconActivity,
  IconServer,
  IconCpu,
  IconDemo,
  IconCheck,
} from './icons'

const TABS = [
  { id: 'prometheus', label: 'Vs Prometheus / Grafana', icon: IconActivity },
  { id: 'dataflow', label: 'Data Ingestion Architecture', icon: IconServer },
  { id: 'ai', label: 'Inference Pipeline (Groq)', icon: IconCpu },
  { id: 'scenarios', label: 'Live Scenarios Reference', icon: IconDemo },
]

export default function ProfessorQAModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('prometheus')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-3xl rounded-xl border border-border-default bg-bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col text-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-default">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
              <IconDefense className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary tracking-tight font-heading">
                Technical Defense & Architecture Guide
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Key technical justifications, architectural trade-offs, and differentiation points
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-md hover:bg-bg-elevated transition"
            aria-label="Close modal"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-bg-secondary border border-border-default">
          {TABS.map((tab) => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition text-center flex items-center justify-center gap-1.5 ${
                  isActive
                    ? 'bg-accent-blue text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-card'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {/* TAB 1: PROMETHEUS CONTRAST */}
          {activeTab === 'prometheus' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-bg-elevated border border-border-default text-text-secondary leading-relaxed">
                <strong className="text-text-primary font-heading">Examiner:</strong> <span className="italic">"Prometheus and Grafana already monitor servers and trigger alerts. Why build DEVSIGHTAI?"</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-lg border border-border-default bg-bg-secondary space-y-2">
                  <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">
                    Prometheus & Grafana Alerting:
                  </div>
                  <ul className="space-y-1.5 text-text-muted leading-relaxed">
                    <li>• CPU = 92% (Static threshold alert)</li>
                    <li>• Memory = 87% (High RAM alert)</li>
                    <li>• Error Rate = 12% (HTTP 500 Spike)</li>
                    <li>• Alert storm: 15 disconnected alerts fired simultaneously</li>
                    <li>• Leaves SRE to manually cross-reference logs, traces, and commits</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg border border-accent-blue/40 bg-accent-blue/5 space-y-2">
                  <div className="text-[11px] font-bold text-accent-blue uppercase tracking-wider font-heading">
                    DEVSIGHTAI Correlated Pipeline:
                  </div>
                  <ul className="space-y-1 text-text-secondary leading-relaxed">
                    <li><strong className="text-text-primary">What:</strong> Payment checkout timeout burst</li>
                    <li><strong className="text-text-primary">Why:</strong> Connection pool exhaustion (max 50 limit)</li>
                    <li><strong className="text-text-primary">Where:</strong> <code className="font-mono text-[11px]">payment-service</code></li>
                    <li><strong className="text-text-primary">Trigger:</strong> Release v2.4.0 (commit #a4f891b)</li>
                    <li><strong className="text-text-primary">History:</strong> Matched INC-0892 pattern (94% confidence)</li>
                    <li><strong className="text-text-primary">Impact:</strong> 17% checkout failure, ~$12,400 at risk</li>
                    <li><strong className="text-text-primary">Action:</strong> 1-click rollback or pool scaling</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-accent-green/10 border border-accent-green/30 text-accent-green font-mono font-semibold text-center text-[11px]">
                Observe → Detect → Correlate → Explain → Predict → Recommend → Resolve
              </div>
            </div>
          )}

          {/* TAB 2: DATAFLOW ARCHITECTURE */}
          {activeTab === 'dataflow' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-bg-elevated border border-border-default text-text-secondary leading-relaxed">
                <strong className="text-text-primary font-heading">Examiner:</strong> <span className="italic">"How does DEVSIGHTAI ingest telemetry without imposing heavy agent overhead?"</span>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    step: '1. Lightweight psutil Monitoring Agent',
                    desc: 'A single-file Python daemon polling CPU, RAM, Disk, and Network every 10s. Overhead < 0.8% CPU. POSTs to /api/metrics/ with non-blocking fail-safes.',
                    color: 'text-accent-blue',
                  },
                  {
                    step: '2. Application Event & Log Interception',
                    desc: 'Application middleware streams HTTP latency, response codes, and regex-classified error lines to /api/events and /api/logs asynchronously.',
                    color: 'text-accent-green',
                  },
                  {
                    step: '3. CI/CD Pipeline Webhooks',
                    desc: 'GitHub Actions webhooks deliver release metadata (service, commit_hash, version, environment) to /api/deployments for automated baseline diffing.',
                    color: 'text-accent-blue',
                  },
                  {
                    step: '4. Supabase Realtime Telemetry Broadcast',
                    desc: 'PostgreSQL Realtime replication broadcasts incident state changes, SLA breaches, and alert notifications to connected dashboards in < 3 seconds.',
                    color: 'text-accent-green',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-bg-secondary border border-border-default space-y-1">
                    <div className={`font-bold font-heading ${item.color}`}>{item.step}</div>
                    <p className="text-text-muted leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: INFERENCE PIPELINE */}
          {activeTab === 'ai' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-bg-elevated border border-border-default text-text-secondary leading-relaxed">
                <strong className="text-text-primary font-heading">Examiner:</strong> <span className="italic">"How is the AI integration engineered to ensure deterministic, low-latency production reliability?"</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg border border-border-default bg-bg-secondary space-y-1.5">
                  <div className="font-bold text-text-primary font-heading">Groq LPU Sub-2s Latency</div>
                  <p className="text-text-muted leading-relaxed">
                    Executes Llama-3.3-70B on Groq Language Processing Units, yielding sub-2s inference. Triage synthesis completes before traditional notification chains finish routing.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-border-default bg-bg-secondary space-y-1.5">
                  <div className="font-bold text-text-primary font-heading">Dual Temperature Architecture</div>
                  <p className="text-text-muted leading-relaxed">
                    Separated parameters: <code className="font-mono text-[11px] text-accent-blue">0.2</code> for deterministic, machine-parseable JSON root cause output, and <code className="font-mono text-[11px] text-accent-blue">0.5</code> for interactive SRE chat runbooks.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-border-default bg-bg-secondary space-y-1.5">
                  <div className="font-bold text-text-primary font-heading">Dense Context Compression</div>
                  <p className="text-text-muted leading-relaxed">
                    Pre-processed telemetry summaries: metrics, top-5 error traces, and commit metadata are packed into &lt;1,000 tokens, eliminating hallucination risks.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-border-default bg-bg-secondary space-y-1.5">
                  <div className="font-bold text-text-primary font-heading">Telemetry Translation to Business Impact</div>
                  <p className="text-text-muted leading-relaxed">
                    Converts low-level 504 status codes into engineering leadership KPIs: affected checkout transactions, CSAT drop, and calculated SLA penalty exposure.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 5 LIVE SCENARIOS */}
          {activeTab === 'scenarios' && (
            <div className="space-y-2.5">
              {[
                {
                  id: 'Scenario 1',
                  name: 'E-commerce Checkout Failure',
                  flow: 'Inject payment timeouts → IsolationForest anomaly → Incident INC-1024 → Groq RCA in <2s.',
                },
                {
                  id: 'Scenario 2',
                  name: 'College ERP Traffic Surge',
                  flow: 'Simulate 8,500 rpm surge → Pandas rolling slope → Proactive SLA burn warning 12m before crash.',
                },
                {
                  id: 'Scenario 3',
                  name: 'SaaS Release Degradation',
                  flow: 'Deploy v2.4.0 (#a4f891b) → 30m pre/post comparison (+1675% errors) → Red Release Health card.',
                },
                {
                  id: 'Scenario 4',
                  name: 'Gradual Memory Leak',
                  flow: 'Heap allocation growth (58% → 91.2%) → Linear trend slope triggers Predicted OOM alert.',
                },
                {
                  id: 'Scenario 5',
                  name: 'Database Cascade in D3 Topology',
                  flow: 'DB lock contention → D3 force graph visualizes red blast-radius propagation to Payment & Order.',
                },
              ].map((s, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-bg-secondary border border-border-default flex items-start gap-3">
                  <span className="font-mono font-bold text-accent-blue flex-shrink-0">{s.id}:</span>
                  <div>
                    <div className="font-bold text-text-primary font-heading">{s.name}</div>
                    <div className="text-text-muted text-[11px] mt-0.5">{s.flow}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border-default flex items-center justify-between">
          <span className="text-[11px] text-text-dim font-mono">DEVSIGHTAI Defense Guide v1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-accent-blue text-white hover:bg-accent-blue/90 transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  )
}
