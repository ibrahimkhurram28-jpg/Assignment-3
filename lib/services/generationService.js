import { prisma } from "@/lib/server/prisma";
import { UnprocessableError } from "@/lib/server/errors";
import { logEvent } from "@/lib/server/logger";
import { generateWordleHtml } from "@/lib/generateWordleHtml";
import { generateWordSearchHtml } from "@/lib/generateWordSearchHtml";
import { findActivityRecord } from "./activityService";
import { serializeWord } from "./serializers";

function defaultFileName(activity) {
  const base = activity.type === "WORDLE" ? "phonemele" : "phoneme-word-search";
  const slug = activity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? `${base}-${slug}` : base;
}

function buildHtml(activity) {
  const words = activity.words.map((link) => serializeWord(link.word));

  if (words.length === 0) {
    throw new UnprocessableError(
      "This activity has no words left. Edit it and select at least one word before downloading."
    );
  }

  const shared = {
    activityTitle: activity.title,
    showHints: activity.showHints,
    studentName: activity.authorName ?? "",
    studentNumber: activity.authorNumber ?? "",
  };
  const wordData = words.map((w) => ({ phonemes: w.phonemes, english: w.english, hint: w.hint }));

  let html;
  if (activity.type === "WORDLE") {
    html = generateWordleHtml({ ...shared, words: wordData, numGuesses: activity.maxGuesses ?? 6 });
  } else {
    html = generateWordSearchHtml({
      ...shared,
      words: wordData,
      size: activity.gridSize ?? 10,
      allowDiagonal: activity.allowDiagonal ?? true,
      allowBackwards: activity.allowBackwards ?? false,
    });
  }

  const fileName = `${activity.fileName || defaultFileName(activity)}.html`;
  return { html, fileName, byteSize: Buffer.byteLength(html, "utf8"), wordCount: words.length };
}

// Recording a generation must never break the feature it measures, so a
// failure to write the log is reported to the server log and then ignored.
async function record(data) {
  try {
    await prisma.generationLog.create({ data });
  } catch (error) {
    logEvent("generation_log_failed", { activityId: data.activityId, message: error.message }, "error");
  }
}

/**
 * Builds the downloadable HTML for a stored activity. Everything comes from
 * the database: the settings row, the selected words and their phonemes.
 *
 * Every attempt is stored in GenerationLog with its status, duration and
 * (for failures) the error message, and written to the server log. These rows
 * feed the dashboard statistics.
 *
 * @param {number} id
 * @param {{ kind?: "DOWNLOAD"|"VIEW" }} options
 */
export async function generateActivityHtml(id, { kind = "DOWNLOAD" } = {}) {
  const started = performance.now();
  const activity = await findActivityRecord(id);

  let result;
  try {
    result = buildHtml(activity);
  } catch (error) {
    const durationMs = Math.round(performance.now() - started);
    await record({
      activityId: activity.id,
      fileName: "",
      wordCount: 0,
      byteSize: 0,
      status: "FAILED",
      kind,
      durationMs,
      errorMessage: String(error.message ?? error).slice(0, 300),
    });
    logEvent("generation_failed", { activityId: activity.id, type: activity.type, kind, durationMs, message: error.message }, "error");
    throw error;
  }

  const durationMs = Math.round(performance.now() - started);
  await record({
    activityId: activity.id,
    fileName: result.fileName,
    wordCount: result.wordCount,
    byteSize: result.byteSize,
    status: "SUCCESS",
    kind,
    durationMs,
  });
  logEvent("generation_succeeded", {
    activityId: activity.id,
    type: activity.type,
    kind,
    words: result.wordCount,
    bytes: result.byteSize,
    durationMs,
  });
  return result;
}
