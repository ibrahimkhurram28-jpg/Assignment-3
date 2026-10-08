import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
      <div className="max-w-2xl">
        <p className="label mb-3" style={{ color: "var(--color-primary)" }}>
          Assessment 3: Data-driven dashboard and reporting
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold mb-5 leading-tight">
          Build phoneme-based classroom activities in minutes.
        </h1>
        <p className="text-lg mb-8" style={{ color: "var(--color-ink-soft)" }}>
          Phoneme Builder helps Speech Pathology teachers save phoneme word lists, turn them into
          a playable Wordle-style game or a phoneme Word Search, preview it live, then download a
          single HTML file that runs in any browser.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/wordle" className="btn btn-primary">
            Build a Wordle activity
          </Link>
          <Link href="/wordsearch" className="btn btn-outline">
            Build a Word Search
          </Link>
          <Link href="/word-lists" className="btn btn-outline">
            Manage word lists
          </Link>
          <Link href="/dashboard" className="btn btn-outline">
            Open the dashboard
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-14">
        <FeatureCard
          title="Phoneme-first"
          body="Every activity is built from IPA symbols, not standard spelling, with hover hints mapping each symbol to its letter equivalence."
        />
        <FeatureCard
          title="Preview, then generate"
          body="See exactly how students will experience the activity before downloading. No surprises in the exported file."
        />
        <FeatureCard
          title="Runs anywhere"
          body="Generated activities are a single, self-contained .html file. No server, install, or internet connection required."
        />
      </div>

      <div className="card p-6 sm:p-8 mt-14">
        <h2 className="font-display text-2xl font-semibold mb-3">How it works</h2>
        <ol className="space-y-3 text-sm sm:text-base" style={{ color: "var(--color-ink-soft)" }}>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>1. Build a word list.</strong> Save each
            word with its phonemes, its English match and an optional clue.
          </li>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>2. Choose an activity.</strong> Pick
            Wordle for a guess-the-word game, or Word Search for a find-the-word puzzle.
          </li>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>3. Configure and save it.</strong> Select
            words from the list, adjust difficulty and hint settings, and save the activity.
          </li>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>4. Preview it.</strong> Play through the
            activity right in the builder to check it works the way you expect.
          </li>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>5. Generate and download.</strong> The
            server builds a single HTML file from the saved activity, ready to project or share
            with students.
          </li>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>6. Monitor it.</strong> The dashboard shows
            system health, how many activities were created and generated, failed generations,
            average time on page and alerts, with full reports and CSV export.
          </li>
        </ol>
      </div>
    </div>
  );
}

function FeatureCard({ title, body }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
        {body}
      </p>
    </div>
  );
}
