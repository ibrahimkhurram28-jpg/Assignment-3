"use client";

import { DIFFICULTIES } from "@/lib/difficulty";
import { ErrorDetails, FieldError, Notice } from "./Notice";

// Name, difficulty and output settings shared by both builders.
export function ActivityDetailsFields({ builder }) {
  const { settings, update, applyDifficulty, fieldErrors } = builder;
  return (
    <>
      <div>
        <label className="label block mb-1" htmlFor="activityName">
          Activity name
        </label>
        <input
          id="activityName"
          className="input"
          value={settings.name ?? ""}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Week 3 TH sounds"
        />
        <FieldError message={fieldErrors.name} />
      </div>

      <fieldset>
        <legend className="label mb-1">Difficulty</legend>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              className="btn flex-1"
              style={
                settings.difficulty === d.value
                  ? { background: "var(--color-primary)", color: "var(--color-surface)" }
                  : { background: "transparent", border: "1px solid var(--color-border)" }
              }
              aria-pressed={settings.difficulty === d.value}
              onClick={() => applyDifficulty(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--color-ink-soft)" }}>
          Choosing a difficulty fills in the settings below. You can still adjust them.
        </p>
      </fieldset>
    </>
  );
}

export function OutputFields({ builder }) {
  const { settings, update, fieldErrors } = builder;
  return (
    <fieldset className="space-y-4">
      <legend className="label mb-1">Downloaded file</legend>
      <div>
        <label className="label block mb-1" htmlFor="activityTitle">
          Activity title
        </label>
        <input
          id="activityTitle"
          className="input"
          value={settings.title ?? ""}
          onChange={(e) => update("title", e.target.value)}
        />
        <FieldError message={fieldErrors.title} />
      </div>
      <div>
        <label className="label block mb-1" htmlFor="studentName">
          Your name (footer credit)
        </label>
        <input
          id="studentName"
          className="input"
          value={settings.authorName ?? ""}
          onChange={(e) => update("authorName", e.target.value)}
        />
        <FieldError message={fieldErrors.authorName} />
      </div>
      <div>
        <label className="label block mb-1" htmlFor="studentNumber">
          Student number
        </label>
        <input
          id="studentNumber"
          className="input"
          value={settings.authorNumber ?? ""}
          onChange={(e) => update("authorNumber", e.target.value)}
          placeholder="e.g. 00000000"
          inputMode="numeric"
        />
        <FieldError message={fieldErrors.authorNumber} />
      </div>
      <div>
        <label className="label block mb-1" htmlFor="fileName">
          File name
        </label>
        <div className="flex items-center gap-2">
          <input
            id="fileName"
            className="input"
            value={settings.fileName ?? ""}
            onChange={(e) => update("fileName", e.target.value)}
            placeholder="optional"
          />
          <span className="text-sm" style={{ color: "var(--color-ink-soft)" }}>.html</span>
        </div>
        <FieldError message={fieldErrors.fileName} />
      </div>
    </fieldset>
  );
}

export function SaveBar({ builder, canGenerate }) {
  const { activityId, busy, dirty, save, download, startNew, notice, setNotice } = builder;
  const status = !activityId ? "Not saved yet" : dirty ? "Unsaved changes" : "All changes saved";

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--color-ink-soft)" }} aria-live="polite">
        {activityId ? `Activity #${activityId}. ` : ""}
        {status}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-outline" onClick={save} disabled={Boolean(busy)}>
          {busy === "saving" ? "Saving…" : activityId ? "Save changes" : "Save activity"}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={download}
          disabled={Boolean(busy) || !canGenerate}
        >
          {busy === "downloading" ? "Generating…" : "Generate .html"}
        </button>
      </div>
      {activityId && (
        <button type="button" className="text-xs underline" onClick={startNew}>
          Start a new activity
        </button>
      )}
      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text ?? notice.error?.message}
          <ErrorDetails error={notice.error} />
        </Notice>
      )}
    </div>
  );
}
