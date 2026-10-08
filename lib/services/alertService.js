import { prisma } from "@/lib/server/prisma";
import { DAY_MS } from "@/lib/metrics";
import { findActivityProblems } from "@/lib/activityChecks";
import { typePath } from "@/lib/difficulty";

const ORDER = { critical: 0, warning: 1, info: 2 };
const MAX_PER_RULE = 5;

/**
 * Looks for unusual states and returns them as alerts. Levels:
 *  - critical: something is broken now (for example downloads will fail)
 *  - warning:  data that is likely to cause trouble
 *  - info:     worth knowing, nothing is wrong
 */
export async function getAlerts(now = new Date()) {
  const since24h = new Date(now.getTime() - DAY_MS);
  const since7d = new Date(now.getTime() - 7 * DAY_MS);

  const [lists, activities, last24h, lastFailure, successLast7d] = await Promise.all([
    prisma.wordList.findMany({ include: { _count: { select: { words: true } } } }),
    prisma.activityConfig.findMany({
      include: {
        words: {
          include: { word: { include: { phonemes: { include: { phoneme: true } } } } },
        },
      },
    }),
    prisma.generationLog.groupBy({ by: ["status"], where: { generatedAt: { gte: since24h } }, _count: { _all: true } }),
    prisma.generationLog.findFirst({ where: { status: "FAILED" }, orderBy: { generatedAt: "desc" } }),
    prisma.generationLog.count({ where: { status: "SUCCESS", generatedAt: { gte: since7d } } }),
  ]);

  const alerts = [];
  const add = (alert) => alerts.push(alert);

  // 1. Failed generations in the last 24 hours.
  const failed = last24h.find((g) => g.status === "FAILED")?._count._all ?? 0;
  const ok = last24h.find((g) => g.status === "SUCCESS")?._count._all ?? 0;
  if (failed > 0) {
    const rate = failed / (failed + ok);
    add({
      id: "generation-failures",
      level: failed + ok >= 4 && rate >= 0.25 ? "critical" : "warning",
      title: `${failed} failed generation${failed === 1 ? "" : "s"} in the last 24 hours`,
      detail: `${Math.round(rate * 100)}% of attempts failed.${lastFailure?.errorMessage ? ` Latest error: ${lastFailure.errorMessage}` : ""}`,
      href: "/reports?status=FAILED",
    });
  }

  // 2. Activities that cannot generate because they have no words, or whose words are no longer valid.
  for (const activity of activities.filter((a) => a.words.length === 0).slice(0, MAX_PER_RULE)) {
    add({
      id: `activity-empty-${activity.id}`,
      level: "critical",
      title: `Activity "${activity.name}" has no words`,
      detail: "Its words were deleted, so it cannot be generated. Edit it and select at least one word.",
      href: `${typePath(activity.type)}?activity=${activity.id}`,
    });
  }
  for (const activity of activities.filter((a) => a.words.length > 0)) {
    const problems = findActivityProblems({
      type: activity.type,
      gridSize: activity.gridSize,
      words: activity.words.map((link) => ({
        english: link.word.english,
        phonemeCount: link.word.phonemes.length,
        spelling: link.word.phonemes.map((p) => p.phoneme.label).join("").toUpperCase(),
      })),
    });
    if (problems.length > 0 && alerts.filter((a) => a.id.startsWith("activity-invalid-")).length < MAX_PER_RULE) {
      add({
        id: `activity-invalid-${activity.id}`,
        level: "warning",
        title: `Activity "${activity.name}" contains invalid data`,
        detail: problems[0] + (problems.length > 1 ? ` (and ${problems.length - 1} more)` : ""),
        href: `${typePath(activity.type)}?activity=${activity.id}`,
      });
    }
  }

  // 3. Empty word lists.
  for (const list of lists.filter((l) => l._count.words === 0).slice(0, MAX_PER_RULE)) {
    add({
      id: `list-empty-${list.id}`,
      level: "warning",
      title: `Word list "${list.name}" is empty`,
      detail: "Add words before using it in an activity.",
      href: `/word-lists?list=${list.id}`,
    });
  }

  // 4. Usage signals.
  if (activities.length === 0) {
    add({
      id: "no-activities",
      level: "info",
      title: "No activities saved yet",
      detail: "Build a Wordle or Word Search and save it to start collecting usage statistics.",
      href: "/wordle",
    });
  } else if (successLast7d === 0) {
    add({
      id: "no-recent-generation",
      level: "info",
      title: "No activity was generated in the last 7 days",
      detail: "The builder has not produced any output recently.",
      href: "/activities",
    });
  }

  alerts.sort((a, b) => ORDER[a.level] - ORDER[b.level]);
  return {
    generatedAt: now.toISOString(),
    counts: {
      critical: alerts.filter((a) => a.level === "critical").length,
      warning: alerts.filter((a) => a.level === "warning").length,
      info: alerts.filter((a) => a.level === "info").length,
    },
    alerts,
  };
}
