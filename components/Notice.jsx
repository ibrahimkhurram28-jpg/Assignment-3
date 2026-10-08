// Inline status message. tone: "error" | "success" | "info"
export function Notice({ tone = "info", children, onDismiss }) {
  if (!children) return null;
  const colors = {
    error: { color: "var(--color-danger)", borderColor: "var(--color-danger)" },
    success: { color: "var(--color-success)", borderColor: "var(--color-success)" },
    info: { color: "var(--color-ink-soft)", borderColor: "var(--color-border)" },
  }[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="notice flex items-start justify-between gap-3 text-sm"
      style={colors}
    >
      <div>{children}</div>
      {onDismiss && (
        <button type="button" className="text-xs underline shrink-0" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
}

export function FieldError({ message, id }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs mt-1" style={{ color: "var(--color-danger)" }}>
      {message}
    </p>
  );
}

// Lists every detail returned by the API, for errors that are not tied to a single field.
export function ErrorDetails({ error }) {
  const details = error?.details ?? [];
  if (details.length <= 1) return null;
  return (
    <ul className="list-disc pl-5 mt-1 space-y-0.5">
      {details.map((d, i) => (
        <li key={i}>{d.message}</li>
      ))}
    </ul>
  );
}
