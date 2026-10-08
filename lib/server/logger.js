// Structured server-side log lines (one JSON object per line). These are the
// server-side monitoring output: `docker logs phoneme-builder` shows them.

export function logEvent(event, fields = {}, level = "info") {
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}
