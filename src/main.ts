import { env } from "./config/env.js";
import { buildServer } from "./controllers/rest/server.js";

/**
 * Composition root. Hoje só sobe o servidor; é aqui que nascem, com o primeiro port, os mapas de
 * implementação e o `buildRepositoriesStore()` (docs/ARQUITETURA.md §7).
 */
async function main(): Promise<void> {
  const app = await buildServer();
  await app.listen({ port: env.PORT, host: env.HOST });
}

try {
  await main();
} catch (error) {
  console.error("Falha ao iniciar a API:", error);
  process.exit(1);
}
