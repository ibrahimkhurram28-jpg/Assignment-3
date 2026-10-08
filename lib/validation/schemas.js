import { z } from "zod";
import { ValidationError } from "@/lib/server/errors";
import { LIMITS } from "@/lib/difficulty";

// Empty strings from form inputs are stored as null.
const optionalText = (max, label) =>
  z
    .string({ error: `${label} must be text.` })
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .nullish()
    .transform((v) => (v ? v : null));

const requiredText = (max, label) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const id = (label) =>
  z.coerce
    .number({ error: `${label} must be a number.` })
    .int(`${label} must be a whole number.`)
    .positive(`${label} must be a positive number.`);

const intInRange = (label, { min, max }) =>
  z.coerce
    .number({ error: `${label} must be a number.` })
    .int(`${label} must be a whole number.`)
    .min(min, `${label} must be at least ${min}.`)
    .max(max, `${label} must be at most ${max}.`);

/* ---------- Word lists ---------- */

export const wordListCreateSchema = z.object({
  name: requiredText(80, "List name"),
  description: optionalText(300, "Description"),
});

export const wordListUpdateSchema = wordListCreateSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Send at least one field to update (name or description).");

/* ---------- Words ---------- */

const englishWord = z
  .string({ error: "English word is required." })
  .trim()
  .toLowerCase()
  .min(1, "English word is required.")
  .max(40, "English word must be 40 characters or fewer.")
  .regex(/^[a-z][a-z' -]*$/, "English word can only use letters, spaces, hyphens and apostrophes.");

// Phonemes arrive as "k æ t" or ["k", "æ", "t"]. The service parses them
// against the database inventory.
const phonemeInput = z.union(
  [
    z.string().trim().min(1, "Phonemes are required."),
    z.array(z.string(), { error: "Phonemes must be a list of symbols." }).min(1, "Add at least one phoneme."),
  ],
  { error: "Phonemes are required, for example \"k æ t\"." }
);

export const wordCreateSchema = z.object({
  english: englishWord,
  phonemes: phonemeInput,
  hint: optionalText(120, "Hint"),
});

export const wordUpdateSchema = wordCreateSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Send at least one field to update (english, phonemes or hint).");

/* ---------- Activity configurations ---------- */

export const ACTIVITY_TYPE_VALUES = ["WORDLE", "WORD_SEARCH"];
export const DIFFICULTY_VALUES = ["EASY", "MEDIUM", "HARD"];

const fileName = z
  .string()
  .trim()
  .toLowerCase()
  .max(60, "File name must be 60 characters or fewer.")
  .transform((v) => v.replace(/\.html?$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
  .nullish()
  .transform((v) => (v ? v : null));

const activityBase = z.object({
  name: requiredText(80, "Activity name"),
  type: z.enum(ACTIVITY_TYPE_VALUES, { error: "Type must be WORDLE or WORD_SEARCH." }),
  difficulty: z.enum(DIFFICULTY_VALUES, { error: "Difficulty must be EASY, MEDIUM or HARD." }).default("MEDIUM"),
  showHints: z.boolean({ error: "Show hints must be true or false." }).default(true),
  maxGuesses: intInRange("Number of guesses", LIMITS.maxGuesses).nullish(),
  gridSize: intInRange("Grid size", LIMITS.gridSize).nullish(),
  allowDiagonal: z.boolean({ error: "Allow diagonal must be true or false." }).nullish(),
  allowBackwards: z.boolean({ error: "Allow backwards must be true or false." }).nullish(),
  title: requiredText(80, "Activity title"),
  authorName: optionalText(60, "Name"),
  authorNumber: z
    .string()
    .trim()
    .regex(/^\d{0,12}$/, "Student number can only contain digits (up to 12).")
    .nullish()
    .transform((v) => (v ? v : null)),
  fileName,
  wordListId: id("Word list"),
  wordIds: z
    .array(id("Word"), { error: "Word selection must be a list of word ids." })
    .min(1, "Select at least one word."),
});

export const activitySchema = activityBase.superRefine((v, ctx) => {
  const unique = new Set(v.wordIds);
  if (unique.size !== v.wordIds.length) {
    ctx.addIssue({ code: "custom", path: ["wordIds"], message: "Each word can only be selected once." });
  }

  if (v.type === "WORDLE") {
    if (v.maxGuesses == null) {
      ctx.addIssue({ code: "custom", path: ["maxGuesses"], message: "Number of guesses is required for Wordle." });
    }
    if (v.wordIds.length > LIMITS.wordleWords.max) {
      ctx.addIssue({ code: "custom", path: ["wordIds"], message: `Wordle can use at most ${LIMITS.wordleWords.max} words.` });
    }
  }

  if (v.type === "WORD_SEARCH") {
    if (v.gridSize == null) {
      ctx.addIssue({ code: "custom", path: ["gridSize"], message: "Grid size is required for Word Search." });
    }
    if (v.wordIds.length > LIMITS.wordSearchWords.max) {
      ctx.addIssue({ code: "custom", path: ["wordIds"], message: `Word Search can use at most ${LIMITS.wordSearchWords.max} words.` });
    }
  }
}).transform((v) => {
  // Keep only the settings that belong to the chosen activity type.
  if (v.type === "WORDLE") {
    return { ...v, gridSize: null, allowDiagonal: null, allowBackwards: null };
  }
  return { ...v, maxGuesses: null, allowDiagonal: v.allowDiagonal ?? true, allowBackwards: v.allowBackwards ?? false };
});

export const activityQuerySchema = z.object({
  type: z.enum(ACTIVITY_TYPE_VALUES, { error: "type must be WORDLE or WORD_SEARCH." }).optional(),
  wordListId: id("wordListId").optional(),
});

/* ---------- Monitoring and reporting (Assessment 3) ---------- */

export const MAX_PAGE_VISIT_MS = 30 * 60 * 1000;

export const pageVisitSchema = z.object({
  path: z
    .string({ error: "Path is required." })
    .trim()
    .min(1, "Path is required.")
    .max(200, "Path must be 200 characters or fewer.")
    .regex(/^\//, "Path must start with /."),
  durationMs: intInRange("Duration", { min: 0, max: MAX_PAGE_VISIT_MS }),
});

export const generationQuerySchema = z.object({
  status: z.enum(["SUCCESS", "FAILED"], { error: "status must be SUCCESS or FAILED." }).optional(),
  type: z.enum(ACTIVITY_TYPE_VALUES, { error: "type must be WORDLE or WORD_SEARCH." }).optional(),
  page: intInRange("page", { min: 1, max: 100000 }).default(1),
  pageSize: intInRange("pageSize", { min: 1, max: 100 }).default(25),
});

export const simulateSchema = z.object({
  days: intInRange("days", { min: 1, max: 60 }).default(14),
  newActivities: intInRange("newActivities", { min: 0, max: 20 }).default(6),
});

/* ---------- Helper ---------- */

export function formatIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "body",
    message: issue.message,
  }));
}

export function validate(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = formatIssues(result.error);
    const message = details.length === 1 ? details[0].message : "Some fields are invalid. Check the highlighted fields.";
    throw new ValidationError(message, details);
  }
  return result.data;
}
