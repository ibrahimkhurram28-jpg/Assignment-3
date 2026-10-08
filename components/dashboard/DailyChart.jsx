// Stacked daily columns with a legend and a table version of the same data.
export function DailyChart({ title, rows, series }) {
  const totalOf = (row) => series.reduce((sum, s) => sum + row[s.key], 0);
  const max = Math.max(1, ...rows.map(totalOf));
  const grandTotals = series.map((s) => `${rows.reduce((sum, r) => sum + r[s.key], 0)} ${s.label.toLowerCase()}`);

  return (
    <figure>
      <figcaption className="font-semibold mb-3">{title}</figcaption>
      <div className="chart-columns" role="img" aria-label={`${title}, last ${rows.length} days: ${grandTotals.join(", ")}.`}>
        {rows.map((row) => (
          <div key={row.date} className="chart-column" title={`${row.date}: ${series.map((s) => `${row[s.key]} ${s.label.toLowerCase()}`).join(", ")}`}>
            {series.map((s) =>
              row[s.key] > 0 ? (
                <div key={s.key} style={{ height: `${(row[s.key] / max) * 100}%`, background: s.color, minHeight: 2 }} />
              ) : null
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1" aria-hidden="true">
        {rows.map((row) => (
          <span key={row.date} className="flex-1 text-center" style={{ fontSize: "0.7rem", color: "var(--color-ink-soft)" }}>
            {row.date.slice(5)}
          </span>
        ))}
      </div>
      <p className="text-xs mt-2 flex flex-wrap gap-x-4" style={{ color: "var(--color-ink-soft)" }}>
        {series.map((s) => (
          <span key={s.key}>
            <span className="legend-swatch" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </span>
        ))}
        <span>Days are UTC.</span>
      </p>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-semibold" style={{ color: "var(--color-primary)" }}>
          View as table
        </summary>
        <div className="overflow-x-auto mt-2">
          <table className="data-table">
            <caption className="sr-only">{title} by day</caption>
            <thead>
              <tr>
                <th scope="col">Date (UTC)</th>
                {series.map((s) => (
                  <th key={s.key} scope="col">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date}>
                  <th scope="row" className="font-normal" style={{ textAlign: "left", padding: "0.5rem" }}>
                    {row.date}
                  </th>
                  {series.map((s) => (
                    <td key={s.key}>{row[s.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
