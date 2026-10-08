export const metadata = { title: "About: Phoneme Builder" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-14">
      <h1 className="font-display text-3xl font-semibold mb-6">About this project</h1>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-2">What this is</h2>
        <p style={{ color: "var(--color-ink-soft)" }}>
          Phoneme Builder is a Wordle-style web application builder for Speech Pathology students
          and teachers. It lets a teacher configure phoneme-based classroom activities and
          generate a standalone HTML page that students can play in any normal web browser, with
          no login, install, or server required.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-2">Scope of this stage</h2>
        <p style={{ color: "var(--color-ink-soft)" }}>
          This build is Assessment 2. It adds a backend and database to the Assessment 1 builder.
          Teachers can create, edit and delete phoneme word lists, save Wordle and Word Search
          settings, and download HTML activities generated on the server from the saved data. The
          app uses Next.js route handlers, Prisma with SQLite, and runs inside a Docker container.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-2">The two tools</h2>
        <ul className="space-y-2" style={{ color: "var(--color-ink-soft)" }}>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>Wordle</strong>: a teacher selects
            words from a saved list, then students guess each one phoneme by phoneme with
            Wordle-style colour feedback.
          </li>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>Word Search</strong>: words selected
            from a saved list are hidden in a letter grid, with phonetic clues that reveal their
            English match once found.
          </li>
        </ul>
      </section>

<section className="mb-8">
  <h2 className="font-semibold text-lg mb-2">
  </h2>

  <div className="card overflow-hidden">
    <video
      controls
      preload="metadata"
      className="w-full rounded-xl"
    >
      <source src="/walkthrough.mp4" type="video/mp4" />
    </video>
  </div>
</section>

      <section className="card p-5">
        <p className="label mb-1">Author</p>
        <p className="font-semibold">Ibrahim Khurram</p>
        <p style={{ color: "var(--color-ink-soft)" }}>Student Number: 21561062</p>
      </section>
    </div>
  );
}
