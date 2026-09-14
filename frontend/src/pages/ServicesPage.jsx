/**
 * DEVSIGHTAI — Service Dependency Map
 *
 * Interactive D3 force-directed graph showing microservice topology,
 * directional call edges, live incident impact highlighting, and
 * cascade blast radius propagation.
 *
 * Theme-aware background, Bahnschrift typography, zero emojis.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { api } from '../lib/api'
import {
  IconServices,
  IconPlay,
  IconClose,
  IconServer,
  IconDatabase,
  IconCpu,
  IconActivity,
  IconArrowUpRight,
} from '../components/icons'

const SERVICE_TYPE_LABELS = {
  gateway: 'GW',
  application: 'APP',
  database: 'DB',
  cache: 'CACHE',
  infrastructure: 'HOST',
}

export default function ServicesPage() {
  const svgRef = useRef(null)
  const containerRef = useRef(null)

  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [selectedNode, setSelectedNode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [simulatedCascade, setSimulatedCascade] = useState(false)
  const [cascadeSource] = useState('payment-service')

  // Fetch dependency graph from backend
  const loadGraph = useCallback(async () => {
    try {
      const data = await api.getDependencyGraph()
      setGraphData(data)
    } catch (err) {
      console.error('Failed to load dependency graph:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGraph()
  }, [loadGraph])

  // D3 Force Simulation Setup & Cleanup
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || graphData.nodes.length === 0) return

    const width = containerRef.current.clientWidth || 800
    const height = 540

    // Clear any previous SVG contents
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Create defs for marker arrows and glow filters
    const defs = svg.append('defs')

    // Arrow marker
    defs
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'var(--text-dim)')

    // Cascade arrow marker
    defs
      .append('marker')
      .attr('id', 'arrow-cascade')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#D97706')

    // Root glow filter
    const filter = defs.append('filter').attr('id', 'glow-critical').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    filter.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Deep clone nodes and links so D3 mutation doesn't taint React state
    const nodes = graphData.nodes.map((d) => ({ ...d }))
    const links = graphData.edges.map((d) => ({ ...d }))

    // Identify cascade affected nodes (services that depend on the failing service)
    const affectedNodeIds = new Set()
    const cascadeEdges = new Set()

    if (simulatedCascade || nodes.some((n) => n.active_incidents > 0 || n.status === 'critical')) {
      const failingId = simulatedCascade ? cascadeSource : nodes.find((n) => n.active_incidents > 0)?.id
      if (failingId) {
        affectedNodeIds.add(failingId)

        // Find incoming callers (they suffer cascading failure)
        links.forEach((l) => {
          const targetId = typeof l.target === 'object' ? l.target.id : l.target
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source

          if (targetId === failingId) {
            affectedNodeIds.add(sourceId)
            cascadeEdges.add(`${sourceId}->${targetId}`)
          }
        })
      }
    }

    // Force simulation setup
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))

    // Container group
    const g = svg.append('g').attr('class', 'topology-container')

    // Zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.4, 2.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Render Edges
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        const key = `${typeof d.source === 'object' ? d.source.id : d.source}->${typeof d.target === 'object' ? d.target.id : d.target}`
        return cascadeEdges.has(key) ? '#D97706' : 'var(--border-default)'
      })
      .attr('stroke-width', (d) => {
        const key = `${typeof d.source === 'object' ? d.source.id : d.source}->${typeof d.target === 'object' ? d.target.id : d.target}`
        return cascadeEdges.has(key) ? 2.5 : 1.5
      })
      .attr('stroke-dasharray', (d) => {
        const key = `${typeof d.source === 'object' ? d.source.id : d.source}->${typeof d.target === 'object' ? d.target.id : d.target}`
        return cascadeEdges.has(key) ? '5,3' : 'none'
      })
      .attr('marker-end', (d) => {
        const key = `${typeof d.source === 'object' ? d.source.id : d.source}->${typeof d.target === 'object' ? d.target.id : d.target}`
        return cascadeEdges.has(key) ? 'url(#arrow-cascade)' : 'url(#arrow)'
      })

    // Render Nodes Group
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelectedNode(d)
      })

    // Outer ripple ring for critical/degraded nodes
    node
      .filter((d) => affectedNodeIds.has(d.id))
      .append('circle')
      .attr('r', 27)
      .attr('fill', 'none')
      .attr('stroke', (d) => (d.id === (simulatedCascade ? cascadeSource : 'payment-service') ? '#DC2626' : '#D97706'))
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.85)

    // Node main circle
    node
      .append('circle')
      .attr('r', 20)
      .attr('fill', (d) => {
        if (d.id === (simulatedCascade ? cascadeSource : 'payment-service') && (simulatedCascade || d.active_incidents > 0)) {
          return '#DC2626'
        }
        if (affectedNodeIds.has(d.id)) {
          return '#D97706'
        }
        return 'var(--bg-elevated)'
      })
      .attr('stroke', (d) => {
        if (d.id === (simulatedCascade ? cascadeSource : 'payment-service') && (simulatedCascade || d.active_incidents > 0)) {
          return '#EF4444'
        }
        if (affectedNodeIds.has(d.id)) {
          return '#F59E0B'
        }
        return 'var(--brand-blue)'
      })
      .attr('stroke-width', 2)
      .attr('filter', (d) => (affectedNodeIds.has(d.id) ? 'url(#glow-critical)' : 'none'))

    // Node type technical badge
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('font-family', 'var(--font-mono)')
      .attr('fill', (d) => (affectedNodeIds.has(d.id) ? '#FFFFFF' : 'var(--text-primary)'))
      .attr('pointer-events', 'none')
      .text((d) => SERVICE_TYPE_LABELS[d.service_type] || 'SVC')

    // Node label text
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 34)
      .attr('fill', 'var(--text-primary)')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('font-family', 'var(--font-heading)')
      .attr('pointer-events', 'none')
      .text((d) => d.name)

    // Sub-badge for active incidents
    node
      .filter((d) => affectedNodeIds.has(d.id))
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 47)
      .attr('fill', (d) => (d.id === (simulatedCascade ? cascadeSource : 'payment-service') ? '#DC2626' : '#D97706'))
      .attr('font-size', '9px')
      .attr('font-weight', '700')
      .attr('font-family', 'var(--font-heading)')
      .attr('pointer-events', 'none')
      .text((d) =>
        d.id === (simulatedCascade ? cascadeSource : 'payment-service')
          ? 'ROOT CAUSE'
          : 'CASCADE IMPACT'
      )

    // Simulation tick handler
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)

      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [graphData, simulatedCascade, cascadeSource])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-default">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-text-primary tracking-tight font-heading">
              Service Dependency Topology
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded bg-accent-blue/10 text-accent-blue border border-accent-blue/30 font-mono">
              D3 FORCE GRAPH
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Real-time topology, upstream/downstream blast radius, and failure cascade propagation
          </p>
        </div>

        {/* Demo Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSimulatedCascade(!simulatedCascade)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
              simulatedCascade
                ? 'bg-accent-red text-white shadow-md'
                : 'bg-accent-red/10 hover:bg-accent-red/20 text-accent-red border border-accent-red/30'
            }`}
          >
            {simulatedCascade ? (
              <>
                <IconClose className="w-3.5 h-3.5" />
                <span>Stop Cascade Simulation</span>
              </>
            ) : (
              <>
                <IconPlay className="w-3.5 h-3.5" />
                <span>Simulate Cascade Failure</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Legend & Simulation Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-card border border-border-default rounded-xl p-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-blue" />
            <span className="text-text-muted">Healthy Service</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-red animate-pulse" />
            <span className="text-accent-red font-medium">Root Incident Service</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-yellow" />
            <span className="text-accent-yellow font-medium">Downstream Cascade Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="border-t-2 border-dashed border-accent-yellow w-4" />
            <span className="text-text-dim">Blast Radius Vector</span>
          </div>
        </div>

        <div className="text-[11px] text-text-dim font-mono">
          Drag nodes • Scroll to zoom • Click node to inspect
        </div>
      </div>

      {/* Map Canvas + Details Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* D3 Graph Canvas */}
        <div
          ref={containerRef}
          className={`${
            selectedNode ? 'lg:col-span-8' : 'lg:col-span-12'
          } bg-bg-secondary border border-border-default rounded-xl relative overflow-hidden h-[540px] shadow-sm`}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-text-dim text-xs">
              Rendering microservice topology...
            </div>
          ) : (
            <svg
              ref={svgRef}
              className="w-full h-full"
              style={{ background: 'var(--bg-secondary)' }}
            />
          )}

          {/* Metadata counter */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-bg-card/90 backdrop-blur-sm border border-border-default rounded-md px-2 py-1 text-xs text-text-muted">
            <span className="text-[10px] text-text-dim font-mono font-medium">
              {graphData.nodes.length} Services • {graphData.edges.length} Edges
            </span>
          </div>
        </div>

        {/* Node Inspection Drawer */}
        {selectedNode && (
          <div className="lg:col-span-4 bg-bg-card border border-border-default rounded-xl p-5 space-y-4 animate-fade-in">
            <div className="flex items-start justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-bg-secondary border border-border-default text-accent-blue font-mono font-bold text-xs">
                  {SERVICE_TYPE_LABELS[selectedNode.service_type] || 'SVC'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary font-heading">{selectedNode.name}</h3>
                  <span className="text-[10px] text-text-dim uppercase tracking-wider font-mono">
                    {selectedNode.service_type}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-bg-elevated transition"
                aria-label="Close details"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Health Status Card */}
            <div className="bg-bg-secondary p-3.5 rounded-lg border border-border-default space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-dim">Current Status:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] font-heading ${
                    selectedNode.active_incidents > 0 || (simulatedCascade && selectedNode.id === cascadeSource)
                      ? 'bg-accent-red text-white'
                      : 'bg-accent-green/10 text-accent-green border border-accent-green/30'
                  }`}
                >
                  {selectedNode.active_incidents > 0 || (simulatedCascade && selectedNode.id === cascadeSource)
                    ? 'CRITICAL INCIDENT'
                    : 'HEALTHY'}
                </span>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                {selectedNode.description || 'Monitored production microservice'}
              </p>
            </div>

            {/* Dependencies Breakdown */}
            <div className="space-y-2">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block font-heading">
                Connected Topology Edges
              </span>

              <div className="space-y-1.5 text-xs">
                {graphData.edges
                  .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                  .map((e, idx) => {
                    const isCaller = e.target === selectedNode.id
                    const peerId = isCaller ? e.source : e.target
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-bg-secondary px-3 py-2 rounded-md border border-border-default"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-text-dim text-[11px]">{isCaller ? 'Called by' : 'Calls'}</span>
                          <span className="font-semibold text-text-primary font-mono text-xs">{peerId}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-card border border-border-subtle text-text-muted font-mono">
                          {e.dependency_type}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-border-default flex gap-2">
              <Link
                to="/metrics"
                className="flex-1 text-center py-2 rounded-md text-xs font-semibold bg-bg-secondary hover:bg-bg-elevated border border-border-default text-text-primary transition"
              >
                Telemetry Metrics
              </Link>
              <Link
                to="/incidents"
                className="flex-1 text-center py-2 rounded-md text-xs font-semibold bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/30 text-accent-blue transition"
              >
                View Incidents
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
