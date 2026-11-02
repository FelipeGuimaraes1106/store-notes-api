import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { healthSchema } from "../schemas/health.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/health",
    {
      schema: {
        tags: ["health"],
        summary: "Status da API",
        response: { 200: healthSchema },
      },
    },
    async () => ({ status: "ok" as const, timestamp: new Date().toISOString() })
  );
}
