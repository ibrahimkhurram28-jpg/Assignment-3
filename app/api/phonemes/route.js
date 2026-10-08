import { ok, withErrorHandling } from "@/lib/server/http";
import { listPhonemes } from "@/lib/services/phonemeService";

export const dynamic = "force-dynamic";

// GET /api/phonemes  -> the phoneme inventory stored in the database
export const GET = withErrorHandling(async () => ok(await listPhonemes()));
