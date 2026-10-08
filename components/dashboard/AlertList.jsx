import Link from "next/link";

const LEVELS = {
  critical: { label: "Critical", color: "var(--color-danger)" },
  warning: { label: "Warning", color: "var(--color-warning)" },
  info: { label: "Info", color: "var(--color-primary)" },
};

// The level is written as a word as well as coloured, so it is not colour-only.
export function AlertList({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <p className="notice text-sm" role="status" style={{ borderColor: "var(--color-success)", color: "var(--color-success)" }}>
        <strong>All clear.</strong> No failed generations, empty word lists or invalid activities were found.
      </p>
    );
  }
  return (
    <ul className="space-y-3" data-testid="alert-list">
      {alerts.map((alert) => {
        const level = LEVELS[alert.level] ?? LEVELS.info;
        return (
          <li key={alert.id} className="notice text-sm" style={{ borderColor: level.color }} data-testid={`alert-${alert.id}`}>
            <p>
              <strong style={{ color: level.color }}>{level.label}:</strong> <strong>{alert.title}</strong>
            </p>
            <p style={{ color: "var(--color-ink-soft)" }}>{alert.detail}</p>
            {alert.href && (
              <Link href={alert.href} aria-label={`Open: ${alert.title}`} className="underline font-semibold" style={{ color: "var(--color-primary)" }}>
                Open
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
