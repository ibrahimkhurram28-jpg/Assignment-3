"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/apiClient";
import { ErrorDetails, FieldError, Notice } from "@/components/Notice";
import { PhonemeInput } from "@/components/PhonemeInput";

const EMPTY_WORD = { english: "", phonemes: "", hint: "" };

export default function WordListsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <p className="label mb-2" style={{ color: "var(--color-primary)" }}>
          Library
        </p>
        <h1 className="font-display text-3xl font-semibold">Word lists</h1>
        <p className="mt-2 max-w-2xl" style={{ color: "var(--color-ink-soft)" }}>
          Store phoneme words once and reuse them in any Wordle or Word Search activity. Each
          word is saved with its English match, its phonemes in order, and an optional clue.
        </p>
      </header>
      <Suspense fallback={<p>Loading word lists…</p>}>
        <WordListManager />
      </Suspense>
    </div>
  );
}

function WordListManager() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedId = Number(searchParams.get("list")) || null;

  const [lists, setLists] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const all = await api.get("/api/word-lists");
        if (cancelled) return;
        setLists(all);
        const targetId = requestedId && all.some((l) => l.id === requestedId) ? requestedId : all[0]?.id;
        if (targetId) {
          const detail = await api.get(`/api/word-lists/${targetId}`);
          if (!cancelled) setSelected(detail);
        } else {
          setSelected(null);
        }
        if (requestedId && !all.some((l) => l.id === requestedId) && !cancelled) {
          setNotice({ tone: "error", text: `Word list ${requestedId} was not found.` });
        }
      } catch (error) {
        if (!cancelled) setNotice({ tone: "error", error });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [requestedId, refreshKey]);

  function openList(id) {
    router.replace(`${pathname}?list=${id}`, { scroll: false });
  }

  function report(result) {
    setNotice(result);
    refresh();
  }

  if (loading) return <p style={{ color: "var(--color-ink-soft)" }}>Loading word lists…</p>;

  return (
    <div className="grid lg:grid-cols-[20rem_1fr] gap-8">
      <aside className="space-y-5">
        <CreateListForm
          onCreated={(list) => {
            setNotice({ tone: "success", text: `Created "${list.name}".` });
            if (list.id === requestedId) refresh();
            else openList(list.id);
          }}
        />
        <nav aria-label="Word lists" className="card p-2">
          {lists.length === 0 && (
            <p className="p-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              No lists yet. Create your first list above.
            </p>
          )}
          <ul>
            {lists.map((list) => {
              const active = selected?.id === list.id;
              return (
                <li key={list.id}>
                  <button
                    type="button"
                    onClick={() => openList(list.id)}
                    className="w-full text-left px-3 py-2 rounded-md"
                    style={{
                      background: active ? "var(--color-success-bg)" : "transparent",
                      color: active ? "var(--color-primary)" : "var(--color-ink)",
                    }}
                    aria-current={active ? "true" : undefined}
                  >
                    <span className="block font-semibold text-sm">{list.name}</span>
                    <span className="block text-xs" style={{ color: "var(--color-ink-soft)" }}>
                      {list.wordCount} word{list.wordCount === 1 ? "" : "s"}, used by {list.activityCount} activit
                      {list.activityCount === 1 ? "y" : "ies"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <section className="space-y-5 min-w-0">
        {notice && (
          <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.text ?? notice.error?.message}
            <ErrorDetails error={notice.error} />
          </Notice>
        )}
        {selected ? (
          <ListDetail
            key={selected.id}
            list={selected}
            onChanged={report}
            onDeleted={(result) => {
              setNotice(result);
              router.replace(pathname, { scroll: false });
              refresh();
            }}
          />
        ) : (
          <div className="card p-6">
            <p style={{ color: "var(--color-ink-soft)" }}>Create a word list to start adding words.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function CreateListForm({ onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const list = await api.post("/api/word-lists", { name, description });
      setName("");
      setDescription("");
      onCreated(list);
    } catch (error) {
      setErrors({ ...error.fieldErrors(), form: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card p-5 space-y-3" onSubmit={submit} aria-label="Create word list">
      <h2 className="font-semibold">New word list</h2>
      <div>
        <label className="label block mb-1" htmlFor="newListName">
          Name
        </label>
        <input
          id="newListName"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. /s/ blends"
          aria-invalid={Boolean(errors.name)}
        />
        <FieldError message={errors.name} />
      </div>
      <div>
        <label className="label block mb-1" htmlFor="newListDescription">
          Description (optional)
        </label>
        <input
          id="newListDescription"
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <FieldError message={errors.description} />
      </div>
      {errors.form && !errors.name && !errors.description && <FieldError message={errors.form} />}
      <button type="submit" className="btn btn-primary w-full" disabled={saving}>
        {saving ? "Creating…" : "Create list"}
      </button>
    </form>
  );
}

function ListDetail({ list, onChanged, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description ?? "");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function saveDetails(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const updated = await api.patch(`/api/word-lists/${list.id}`, { name, description });
      setEditing(false);
      onChanged({ tone: "success", text: `Updated "${updated.name}".` });
    } catch (error) {
      setErrors({ ...error.fieldErrors(), form: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function removeList() {
    const warning =
      `Delete "${list.name}"?\n\nThis also deletes its ${list.wordCount} word(s)` +
      (list.activityCount ? ` and ${list.activityCount} saved activit${list.activityCount === 1 ? "y" : "ies"} that use it.` : ".");
    if (!window.confirm(warning)) return;
    setBusy(true);
    try {
      const result = await api.delete(`/api/word-lists/${list.id}`);
      onDeleted({
        tone: "success",
        text: `Deleted "${list.name}" (${result.removedWords} words, ${result.removedActivities} activities).`,
      });
    } catch (error) {
      onChanged({ tone: "error", error });
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card p-5 sm:p-6">
        {editing ? (
          <form className="space-y-3" onSubmit={saveDetails} aria-label="Edit word list">
            <div>
              <label className="label block mb-1" htmlFor="editListName">
                Name
              </label>
              <input id="editListName" className="input" value={name} onChange={(e) => setName(e.target.value)} />
              <FieldError message={errors.name} />
            </div>
            <div>
              <label className="label block mb-1" htmlFor="editListDescription">
                Description
              </label>
              <input
                id="editListDescription"
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <FieldError message={errors.description} />
            </div>
            {errors.form && !errors.name && !errors.description && <FieldError message={errors.form} />}
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Save list
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold">{list.name}</h2>
              {list.description && (
                <p className="mt-1" style={{ color: "var(--color-ink-soft)" }}>
                  {list.description}
                </p>
              )}
              <p className="text-xs mt-2" style={{ color: "var(--color-ink-soft)" }}>
                {list.wordCount} word{list.wordCount === 1 ? "" : "s"}, used by{" "}
                <Link href="/activities" className="underline">
                  {list.activityCount} activit{list.activityCount === 1 ? "y" : "ies"}
                </Link>
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
                Rename
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={removeList} disabled={busy}>
                Delete list
              </button>
            </div>
          </div>
        )}
      </div>

      <AddWordForm listId={list.id} onAdded={(word) => onChanged({ tone: "success", text: `Added "${word.english}" /${word.phonemes.join(" ")}/.` })} />

      <div className="card p-5 sm:p-6">
        <h3 className="font-semibold mb-3">Words</h3>
        {list.words.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            No words yet. Add the first word above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">English</th>
                  <th scope="col">Phonemes</th>
                  <th scope="col">Letters</th>
                  <th scope="col">Clue</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.words.map((word) => (
                  <WordRow key={word.id} word={word} onChanged={onChanged} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function AddWordForm({ listId, onAdded }) {
  const [form, setForm] = useState(EMPTY_WORD);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const word = await api.post(`/api/word-lists/${listId}/words`, form);
      setForm(EMPTY_WORD);
      onAdded(word);
    } catch (error) {
      setErrors({ ...error.fieldErrors(), form: error.message });
    } finally {
      setSaving(false);
    }
  }

  const unmatched = errors.form && !errors.english && !errors.phonemes && !errors.hint;

  return (
    <form className="card p-5 sm:p-6 space-y-4" onSubmit={submit} aria-label="Add word">
      <h3 className="font-semibold">Add a word</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label block mb-1" htmlFor="newEnglish">
            English word
          </label>
          <input
            id="newEnglish"
            className="input"
            value={form.english}
            onChange={(e) => set("english", e.target.value)}
            placeholder="e.g. chair"
            aria-invalid={Boolean(errors.english)}
          />
          <FieldError message={errors.english} />
        </div>
        <div>
          <label className="label block mb-1" htmlFor="newHint">
            Clue (optional)
          </label>
          <input
            id="newHint"
            className="input"
            value={form.hint}
            onChange={(e) => set("hint", e.target.value)}
            placeholder="e.g. You sit on it"
          />
          <FieldError message={errors.hint} />
        </div>
      </div>
      <PhonemeInput value={form.phonemes} onChange={(v) => set("phonemes", v)} error={errors.phonemes} />
      {unmatched && <FieldError message={errors.form} />}
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Adding…" : "Add word"}
      </button>
    </form>
  );
}

function WordRow({ word, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    english: word.english,
    phonemes: word.phonemes.join(" "),
    hint: word.hint ?? "",
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      const updated = await api.patch(`/api/words/${word.id}`, form);
      setEditing(false);
      onChanged({ tone: "success", text: `Updated "${updated.english}" /${updated.phonemes.join(" ")}/.` });
    } catch (error) {
      setErrors({ ...error.fieldErrors(), form: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const usage = word.activityCount
      ? `\n\nIt is used in ${word.activityCount} saved activit${word.activityCount === 1 ? "y" : "ies"} and will be removed from them.`
      : "";
    if (!window.confirm(`Delete "${word.english}"?${usage}`)) return;
    setBusy(true);
    try {
      await api.delete(`/api/words/${word.id}`);
      onChanged({ tone: "success", text: `Deleted "${word.english}".` });
    } catch (error) {
      onChanged({ tone: "error", error });
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={5}>
          <form
            className="space-y-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            aria-label={`Edit ${word.english}`}
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label block mb-1" htmlFor={`english-${word.id}`}>
                  English word
                </label>
                <input
                  id={`english-${word.id}`}
                  className="input"
                  value={form.english}
                  onChange={(e) => setForm({ ...form, english: e.target.value })}
                />
                <FieldError message={errors.english} />
              </div>
              <div>
                <label className="label block mb-1" htmlFor={`hint-${word.id}`}>
                  Clue
                </label>
                <input
                  id={`hint-${word.id}`}
                  className="input"
                  value={form.hint}
                  onChange={(e) => setForm({ ...form, hint: e.target.value })}
                />
                <FieldError message={errors.hint} />
              </div>
            </div>
            <PhonemeInput
              value={form.phonemes}
              onChange={(v) => setForm({ ...form, phonemes: v })}
              error={errors.phonemes}
            />
            {errors.form && !errors.english && !errors.phonemes && !errors.hint && (
              <FieldError message={errors.form} />
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                {busy ? "Saving…" : "Save word"}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="font-semibold">{word.english}</td>
      <td className="font-mono-phoneme whitespace-nowrap">/{word.phonemes.join(" ")}/</td>
      <td className="font-mono-phoneme">{word.spelling}</td>
      <td style={{ color: "var(--color-ink-soft)" }}>{word.hint || "None"}</td>
      <td className="whitespace-nowrap text-right">
        <button type="button" className="btn btn-outline btn-sm mr-2" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={remove} disabled={busy}>
          Delete
        </button>
      </td>
    </tr>
  );
}
