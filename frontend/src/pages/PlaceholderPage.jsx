/**
 * DEVSIGHTAI — Placeholder Page
 *
 * Generic placeholder for pages that will be built in later phases.
 * Shows the page name and which phase it belongs to.
 */

export default function PlaceholderPage({ title, phase, description }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🚧</span>
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">{title}</h2>
        <p className="text-sm text-text-muted mb-4">{description}</p>
        <span className="inline-block text-[11px] font-semibold tracking-wider text-accent-blue bg-accent-blue/10 border border-accent-blue/20 rounded-full px-3 py-1">
          {phase}
        </span>
      </div>
    </div>
  )
}
