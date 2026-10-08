export function Footer() {
  return (
    <footer
      className="border-t mt-16"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm" style={{ color: "var(--color-ink-soft)" }}>
        <p>Phoneme Builder: a classroom activity tool for Speech Pathology teaching.</p>
        <p>Ibrahim Khurram, Student Number: 21561062</p>
      </div>
    </footer>
  );
}
