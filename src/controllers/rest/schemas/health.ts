import { z } from "zod";

export const healthSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string().describe("Horário do servidor, ISO 8601"),
});
