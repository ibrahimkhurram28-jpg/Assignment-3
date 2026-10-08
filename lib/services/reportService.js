import { prisma } from "@/lib/server/prisma";
import { generationQuerySchema, validate } from "@/lib/validation/schemas";
import { toCsv } from "@/lib/csv";

const CSV_ROW_LIMIT = 10000;

function cleanQuery(query) {
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== "" && value != null));
}

function whereFrom(filters) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.type) where.activity = { type: filters.type };
  return where;
}

function serializeGeneration(row) {
  return {
    id: row.id,
    generatedAt: row.generatedAt,
    activityId: row.activityId,
    activityName: row.activity?.name ?? null,
    activityType: row.activity?.type ?? null,
    kind: row.kind,
    status: row.status,
    fileName: row.fileName,
    wordCount: row.wordCount,
    byteSize: row.byteSize,
    durationMs: row.durationMs,
    errorMessage: row.errorMessage,
    simulated: row.simulated,
  };
}

const INCLUDE = { activity: { select: { id: true, name: true, type: true } } };

export async function listGenerations(query = {}) {
  const filters = validate(generationQuerySchema, cleanQuery(query));
  const where = whereFrom(filters);
  const [total, rows] = await Promise.all([
    prisma.generationLog.count({ where }),
    prisma.generationLog.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: INCLUDE,
    }),
  ]);
  return {
    rows: rows.map(serializeGeneration),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    pages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

export async function generationsCsv(query = {}) {
  const filters = validate(generationQuerySchema, cleanQuery(query));
  const rows = await prisma.generationLog.findMany({
    where: whereFrom(filters),
    orderBy: { generatedAt: "desc" },
    take: CSV_ROW_LIMIT,
    include: INCLUDE,
  });
  return toCsv(
    [
      { key: "generatedAt", label: "Generated at (UTC)" },
      { key: "activityName", label: "Activity" },
      { key: "activityType", label: "Type" },
      { key: "kind", label: "Kind" },
      { key: "status", label: "Status" },
      { key: "fileName", label: "File name" },
      { key: "wordCount", label: "Words" },
      { key: "byteSize", label: "Bytes" },
      { key: "durationMs", label: "Duration (ms)" },
      { key: "errorMessage", label: "Error" },
      { key: "simulated", label: "Simulated" },
    ],
    rows.map(serializeGeneration)
  );
}
