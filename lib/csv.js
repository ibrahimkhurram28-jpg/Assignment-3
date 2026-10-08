// Small CSV writer for the generation report export.
// Cells that start with = + - @ are prefixed with an apostrophe so a
// spreadsheet never runs them as a formula.

function cell(value) {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** columns: [{ key, label }], rows: array of plain objects. */
export function toCsv(columns, rows) {
  const lines = [columns.map((c) => cell(c.label)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => cell(row[c.key])).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}
