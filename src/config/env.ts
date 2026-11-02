import { existsSync } from "node:fs";
import { z } from "zod";

// Carrega o `.env` com o que o próprio Node já traz (mesmo papel do `dotenv/config`): variável que
// já veio do ambiente não é sobrescrita — é o que deixa teste e CI forçarem valores.
if (existsSync(".env")) process.loadEnvFile();

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Configuração de ambiente inválida");
}

export const env = parsed.data;
