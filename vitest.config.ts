import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // `fatal` cala o log de requisição do Fastify, que sairia a cada `app.inject()`.
    env: { LOG_LEVEL: "fatal" },
  },
});
