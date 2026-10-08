// One headline number. Rendered inside a <dl class="stat-grid">.
export function StatCard({ id, label, value, note, tone }) {
  return (
    <div className="card p-4" data-testid={`stat-${id}`}>
      <dt className="label">{label}</dt>
      <dd className="font-display text-3xl font-semibold mt-1" style={tone ? { color: tone } : undefined}>
        {value}
      </dd>
      {note && (
        <dd className="text-xs mt-1" style={{ color: "var(--color-ink-soft)" }}>
          {note}
        </dd>
      )}
    </div>
  );
}
