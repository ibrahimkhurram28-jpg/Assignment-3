import { prisma } from "@/lib/server/prisma";
import { buildDailySeries, DAY_MS, mostUsed, percent, startOfUtcDay } from "@/lib/metrics";

const DAYS = 14;
const TYPES = ["WORDLE", "WORD_SEARCH"];

function countOf(rows, key, value) {
  return rows.find((r) => r[key] === value)?._count._all ?? 0;
}

/**
 * Everything the dashboard and reports show, read from the database.
 * Counts come from the stored records (activities, words, generation logs,
 * page visits), not from in-memory counters, so they survive restarts.
 */
export async function getDashboardMetrics(now = new Date()) {
  const windowStart = new Date(startOfUtcDay(now).getTime() - (DAYS - 1) * DAY_MS);
  const last24h = new Date(now.getTime() - DAY_MS);

  const [
    wordListCount,
    wordCount,
    typeGroups,
    difficultyGroups,
    statusGroups,
    perActivityGroups,
    lastGeneratedGroups,
    visitTotals,
    visitsByPage,
    recentActivityDates,
    recentGenerations,
    last24hGroups,
    topPhonemeGroups,
    wordLists,
    activities,
    recent,
    simulatedActivities,
    simulatedGenerations,
    simulatedVisits,
  ] = await Promise.all([
    prisma.wordList.count(),
    prisma.word.count(),
    prisma.activityConfig.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.activityConfig.groupBy({ by: ["difficulty"], _count: { _all: true } }),
    prisma.generationLog.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { byteSize: true, wordCount: true },
      _avg: { durationMs: true },
    }),
    prisma.generationLog.groupBy({ by: ["activityId", "status"], _count: { _all: true } }),
    prisma.generationLog.groupBy({
      by: ["activityId"],
      where: { status: "SUCCESS" },
      _max: { generatedAt: true },
    }),
    prisma.pageVisit.aggregate({ _count: { _all: true }, _avg: { durationMs: true } }),
    prisma.pageVisit.groupBy({
      by: ["path"],
      _count: { _all: true },
      _avg: { durationMs: true },
      orderBy: { _count: { path: "desc" } },
    }),
    prisma.activityConfig.findMany({ where: { createdAt: { gte: windowStart } }, select: { createdAt: true } }),
    prisma.generationLog.findMany({
      where: { generatedAt: { gte: windowStart } },
      select: { generatedAt: true, status: true },
    }),
    prisma.generationLog.groupBy({
      by: ["status"],
      where: { generatedAt: { gte: last24h } },
      _count: { _all: true },
    }),
    prisma.wordPhoneme.groupBy({
      by: ["phonemeId"],
      _count: { _all: true },
      orderBy: { _count: { phonemeId: "desc" } },
      take: 8,
    }),
    prisma.wordList.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { words: true, activities: true } },
        words: { select: { _count: { select: { phonemes: true } } } },
      },
    }),
    prisma.activityConfig.findMany({
      orderBy: { updatedAt: "desc" },
      include: { wordList: { select: { id: true, name: true } }, _count: { select: { words: true } } },
    }),
    prisma.generationLog.findMany({
      orderBy: { generatedAt: "desc" },
      take: 8,
      include: { activity: { select: { id: true, name: true, type: true } } },
    }),
    prisma.activityConfig.count({ where: { simulated: true } }),
    prisma.generationLog.count({ where: { simulated: true } }),
    prisma.pageVisit.count({ where: { simulated: true } }),
  ]);

  const phonemeRows = topPhonemeGroups.length
    ? await prisma.phoneme.findMany({ where: { id: { in: topPhonemeGroups.map((g) => g.phonemeId) } } })
    : [];
  const phonemeById = new Map(phonemeRows.map((p) => [p.id, p]));

  const success = countOf(statusGroups, "status", "SUCCESS");
  const failed = countOf(statusGroups, "status", "FAILED");
  const successRow = statusGroups.find((g) => g.status === "SUCCESS");

  // Generations per activity type, using the activity list to look up each type.
  const typeById = new Map(activities.map((a) => [a.id, a.type]));
  const generationsByType = Object.fromEntries(TYPES.map((t) => [t, { success: 0, failed: 0 }]));
  const resultsByActivity = new Map();
  for (const group of perActivityGroups) {
    const type = typeById.get(group.activityId);
    if (type) generationsByType[type][group.status === "SUCCESS" ? "success" : "failed"] += group._count._all;
    const entry = resultsByActivity.get(group.activityId) ?? { success: 0, failed: 0 };
    entry[group.status === "SUCCESS" ? "success" : "failed"] += group._count._all;
    resultsByActivity.set(group.activityId, entry);
  }
  const lastGeneratedById = new Map(lastGeneratedGroups.map((g) => [g.activityId, g._max.generatedAt]));

  const activityCounts = Object.fromEntries(TYPES.map((t) => [t, countOf(typeGroups, "type", t)]));
  const byGenerations = mostUsed(Object.fromEntries(TYPES.map((t) => [t, generationsByType[t].success])));
  const byActivities = mostUsed(activityCounts);
  const top = byGenerations ?? byActivities;

  const lastSuccess = lastGeneratedGroups.reduce(
    (latest, g) => (g._max.generatedAt && (!latest || g._max.generatedAt > latest) ? g._max.generatedAt : latest),
    null
  );

  return {
    generatedAt: now.toISOString(),
    totals: {
      wordLists: wordListCount,
      words: wordCount,
      activities: activities.length,
      wordle: activityCounts.WORDLE,
      wordSearch: activityCounts.WORD_SEARCH,
    },
    generation: {
      success,
      failed,
      total: success + failed,
      successRate: percent(success, success + failed),
      totalBytes: successRow?._sum.byteSize ?? 0,
      totalWords: successRow?._sum.wordCount ?? 0,
      avgDurationMs: successRow?._avg.durationMs != null ? Math.round(successRow._avg.durationMs) : null,
      last24h: {
        success: countOf(last24hGroups, "status", "SUCCESS"),
        failed: countOf(last24hGroups, "status", "FAILED"),
      },
      lastGeneratedAt: lastSuccess,
    },
    usage: {
      pageVisits: visitTotals._count._all,
      avgTimeOnPageMs: visitTotals._avg.durationMs != null ? Math.round(visitTotals._avg.durationMs) : null,
      byPage: visitsByPage.map((g) => ({
        path: g.path,
        visits: g._count._all,
        avgTimeMs: g._avg.durationMs != null ? Math.round(g._avg.durationMs) : null,
      })),
      mostUsedType: top
        ? {
            type: top.type,
            count: top.count,
            basis: byGenerations ? "successful generations" : "saved activities",
          }
        : null,
    },
    byType: TYPES.map((type) => ({
      type,
      activities: activityCounts[type],
      generations: generationsByType[type].success,
      failedGenerations: generationsByType[type].failed,
    })),
    byDifficulty: ["EASY", "MEDIUM", "HARD"].map((difficulty) => ({
      difficulty,
      count: countOf(difficultyGroups, "difficulty", difficulty),
    })),
    topPhonemes: topPhonemeGroups.map((g) => ({
      symbol: phonemeById.get(g.phonemeId)?.symbol ?? "?",
      label: phonemeById.get(g.phonemeId)?.label ?? "",
      count: g._count._all,
    })),
    daily: buildDailySeries(DAYS, now, {
      activitiesCreated: recentActivityDates.map((a) => a.createdAt),
      generationsOk: recentGenerations.filter((g) => g.status === "SUCCESS").map((g) => g.generatedAt),
      generationsFailed: recentGenerations.filter((g) => g.status === "FAILED").map((g) => g.generatedAt),
    }),
    wordLists: wordLists.map((list) => {
      const phonemeCounts = list.words.map((w) => w._count.phonemes);
      return {
        id: list.id,
        name: list.name,
        description: list.description,
        words: list._count.words,
        activities: list._count.activities,
        avgPhonemesPerWord: phonemeCounts.length
          ? Math.round((phonemeCounts.reduce((a, b) => a + b, 0) / phonemeCounts.length) * 10) / 10
          : null,
        createdAt: list.createdAt,
      };
    }),
    activities: activities.map((a) => {
      const results = resultsByActivity.get(a.id) ?? { success: 0, failed: 0 };
      return {
        id: a.id,
        name: a.name,
        type: a.type,
        difficulty: a.difficulty,
        showHints: a.showHints,
        maxGuesses: a.maxGuesses,
        gridSize: a.gridSize,
        allowDiagonal: a.allowDiagonal,
        allowBackwards: a.allowBackwards,
        wordList: a.wordList,
        words: a._count.words,
        successfulGenerations: results.success,
        failedGenerations: results.failed,
        lastGeneratedAt: lastGeneratedById.get(a.id) ?? null,
        simulated: a.simulated,
      };
    }),
    recentGenerations: recent.map((g) => ({
      id: g.id,
      generatedAt: g.generatedAt,
      activityId: g.activityId,
      activityName: g.activity?.name ?? null,
      activityType: g.activity?.type ?? null,
      status: g.status,
      kind: g.kind,
      durationMs: g.durationMs,
      byteSize: g.byteSize,
      errorMessage: g.errorMessage,
    })),
    simulated: {
      activities: simulatedActivities,
      generations: simulatedGenerations,
      pageVisits: simulatedVisits,
    },
  };
}

