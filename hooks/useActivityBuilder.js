"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api, fetchActivityFile } from "@/lib/apiClient";
import { downloadBlob } from "@/lib/download";
import { presetFor, typeLabel, typePath } from "@/lib/difficulty";

const SETTING_KEYS = [
  "name", "difficulty", "showHints", "maxGuesses", "gridSize", "allowDiagonal",
  "allowBackwards", "title", "authorName", "authorNumber", "fileName",
];

function pickSettings(activity) {
  return Object.fromEntries(SETTING_KEYS.map((key) => [key, activity[key] ?? null]));
}

/**
 * Shared state and backend calls for the Wordle and Word Search builders.
 * - Loads word lists from the API, and an existing activity when the URL has ?activity=ID
 * - Saves the configuration (POST for new, PUT for existing)
 * - Downloads the HTML that the server generates from the saved record
 *
 * @param {"WORDLE"|"WORD_SEARCH"} type
 * @param {object} defaults     initial settings for a new activity
 * @param {(word, settings) => string|null} unusableReason  why a word cannot be used, if any
 */
export function useActivityBuilder(type, defaults, unusableReason) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activityParam = searchParams.get("activity");

  const [lists, setLists] = useState([]);
  const [listId, setListId] = useState(null);
  const [words, setWords] = useState([]);
  const [wordIds, setWordIds] = useState([]);
  const [settings, setSettings] = useState(defaults);
  const [activityId, setActivityId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wordsLoading, setWordsLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [resetCount, setResetCount] = useState(0);
  const loadedId = useRef(null);
  const defaultsRef = useRef(defaults);
  const reasonRef = useRef(unusableReason);

  useEffect(() => {
    reasonRef.current = unusableReason;
  });

  useEffect(() => {
    const requestedId = activityParam ? Number(activityParam) : null;
    if (requestedId !== null && requestedId === loadedId.current) return;
    let cancelled = false;

    async function load() {
      try {
        const allLists = await api.get("/api/word-lists");
        if (cancelled) return;
        setLists(allLists);

        if (requestedId !== null) {
          const activity = await api.get(`/api/activities/${activityParam}`);
          if (cancelled) return;
          if (activity.type !== type) {
            router.replace(`${typePath(activity.type)}?activity=${activity.id}`);
            return;
          }
          const list = await api.get(`/api/word-lists/${activity.wordListId}`);
          if (cancelled) return;
          loadedId.current = activity.id;
          setActivityId(activity.id);
          setSettings({ ...defaultsRef.current, ...pickSettings(activity) });
          setListId(activity.wordListId);
          setWords(list.words);
          setWordIds(activity.wordIds);
          setNotice({ tone: "info", text: `Editing saved activity "${activity.name}".` });
        } else {
          loadedId.current = null;
          setActivityId(null);
          setSettings(defaultsRef.current);
          const first = allLists.find((l) => l.wordCount > 0) ?? allLists[0];
          if (first) {
            const list = await api.get(`/api/word-lists/${first.id}`);
            if (cancelled) return;
            setListId(first.id);
            setWords(list.words);
            const usable = list.words.filter((w) => !reasonRef.current?.(w, defaultsRef.current));
            setWordIds(usable.slice(0, 5).map((w) => w.id));
          } else {
            setListId(null);
            setWords([]);
            setWordIds([]);
          }
          setNotice(null);
        }
        setDirty(false);
        setFieldErrors({});
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
  }, [activityParam, type, router, resetCount]);

  const selectedWords = useMemo(() => {
    const byId = new Map(words.map((w) => [w.id, w]));
    return wordIds.map((id) => byId.get(id)).filter(Boolean);
  }, [words, wordIds]);

  function markDirty() {
    setDirty(true);
  }

  async function selectList(nextId) {
    const id = Number(nextId);
    setListId(id);
    setWordIds([]);
    setWords([]);
    setWordsLoading(true);
    markDirty();
    try {
      const list = await api.get(`/api/word-lists/${id}`);
      setWords(list.words);
    } catch (error) {
      setNotice({ tone: "error", error });
    } finally {
      setWordsLoading(false);
    }
  }

  function toggleWord(id) {
    setWordIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    markDirty();
  }

  function setSelection(ids) {
    setWordIds(ids);
    markDirty();
  }

  function update(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    markDirty();
  }

  function applyDifficulty(difficulty) {
    setSettings((prev) => ({ ...prev, difficulty, ...presetFor(type, difficulty) }));
    markDirty();
  }

  async function save() {
    setBusy("saving");
    setFieldErrors({});
    const body = { ...settings, type, wordListId: listId, wordIds };
    try {
      const saved = activityId
        ? await api.put(`/api/activities/${activityId}`, body)
        : await api.post("/api/activities", body);
      const isNew = !activityId;
      loadedId.current = saved.id;
      setActivityId(saved.id);
      setDirty(false);
      setNotice({ tone: "success", text: `${isNew ? "Saved" : "Updated"} "${saved.name}".` });
      if (isNew) router.replace(`${pathname}?activity=${saved.id}`, { scroll: false });
      return saved;
    } catch (error) {
      setFieldErrors(error.fieldErrors?.() ?? {});
      setNotice({ tone: "error", error });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    let id = activityId;
    if (!id || dirty) {
      const saved = await save();
      if (!saved) return;
      id = saved.id;
    }
    setBusy("downloading");
    try {
      const { blob, fileName } = await fetchActivityFile(id);
      downloadBlob(fileName, blob);
      setNotice({ tone: "success", text: `Downloaded ${fileName}, generated from the saved ${typeLabel(type)} activity.` });
    } catch (error) {
      setNotice({ tone: "error", error });
    } finally {
      setBusy(null);
    }
  }

  function startNew() {
    loadedId.current = null;
    setResetCount((n) => n + 1);
    router.replace(pathname, { scroll: false });
  }

  return {
    lists,
    listId,
    words,
    wordIds,
    selectedWords,
    settings,
    activityId,
    loading,
    wordsLoading,
    busy,
    dirty,
    notice,
    fieldErrors,
    setNotice,
    selectList,
    toggleWord,
    setSelection,
    update,
    applyDifficulty,
    save,
    download,
    startNew,
  };
}
