// Horizontal bars. Every value is also written as text, so the chart does not
// depend on colour or on being able to see the bars.
export function HBars({ items, label, emptyText = "No data yet." }) {
  if (!items.some((item) => item.value > 0)) {
    return (
      <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
        {emptyText}
      </p>
    );
  }
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul aria-label={label} className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
            <span>{item.label}</span>
            <span className="font-semibold">
              {item.value}
              {item.detail ? <span style={{ color: "var(--color-ink-soft)", fontWeight: 400 }}> {item.detail}</span> : null}
            </span>
          </div>
          <div className="bar-track" aria-hidden="true">
            <div className="bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
