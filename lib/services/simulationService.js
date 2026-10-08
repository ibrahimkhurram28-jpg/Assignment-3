import { prisma } from "@/lib/server/prisma";
import { UnprocessableError } from "@/lib/server/errors";
import { logEvent } from "@/lib/server/logger";
import { clearSimulatedData, simulateUsage } from "@/lib/simulation";
import { simulateSchema, validate } from "@/lib/validation/schemas";

export async function addSimulatedData(input = {}) {
  const options = validate(simulateSchema, input);
  const result = await simulateUsage(prisma, options);
  if (result.error) throw new UnprocessableError(result.error);
  logEvent("simulation_added", result);
  return result;
}

export async function removeSimulatedData() {
  const result = await clearSimulatedData(prisma);
  logEvent("simulation_cleared", result);
  return result;
}
