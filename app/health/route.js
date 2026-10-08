import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

// GET /health
// Returns 200 OK when the server is running and the database answers a query.
export async function GET() {
  const started = Date.now();
  const base = {
    service: "phoneme-builder",
    version: process.env.npm_package_version ?? "0.3.0",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
  const headers = { "Cache-Control": "no-store" };

  try {
    await prisma.$queryRaw`SELECT 1`;
    const phonemes = await prisma.phoneme.count();
    return NextResponse.json(
      {
        status: "ok",
        ...base,
        database: { status: "connected", phonemes, responseTimeMs: Date.now() - started },
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("[health] database check failed:", error);
    return NextResponse.json(
      { status: "error", ...base, database: { status: "unreachable" } },
      { status: 503, headers }
    );
  }
}
