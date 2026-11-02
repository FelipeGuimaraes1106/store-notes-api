import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { env } from "../../config/env.js";

export async function buildServer() {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL, transport: { target: "pino-pretty" } },
  });

  // Faz o Fastify validar params/querystring/body e serializar respostas com os schemas Zod de
  // cada rota — a mesma peça que faz o /docs mostrar o formato exato de requisição e resposta.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Precisa vir antes de registrar as rotas: cada rota captura o error handler vigente no momento
  // em que é definida, e registrar depois faria as rotas caírem no formato de erro do Fastify.
  app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      reply.status(400).send({ erro: "Payload inválido", detalhes: error.validation });
      return;
    }
    app.log.error(error);
    // `.statusCode` só existe em erro de negócio deliberado, com mensagem escrita para o cliente
    // ler. Sem ele o erro é inesperado (driver, bug) e a mensagem crua — nome de tabela, de
    // constraint — não sai daqui: fica só no log, na linha acima.
    if (error.statusCode !== undefined) {
      reply.status(error.statusCode).send({ erro: error.message });
      return;
    }
    reply.status(500).send({ erro: "Erro interno" });
  });

  // Além do CORS_ORIGIN, libera qualquer porta em localhost/127.0.0.1: o Vite troca de porta
  // sozinho quando a padrão está ocupada, e isso não pode quebrar o front em silêncio.
  const localhost = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;
  await app.register(cors, {
    // Recusa com `false`, não com Error: `false` só omite os headers (o browser bloqueia a leitura e
    // a requisição segue normal); um Error o @fastify/cors transforma em 500 "Erro interno".
    origin(origin, callback) {
      callback(null, !origin || localhost.test(origin) || origin === env.CORS_ORIGIN);
    },
  });

  await app.register(swagger, {
    openapi: {
      info: { title: "Caderno Lojas API", description: "API do Caderno Lojas (protótipo).", version: "0.1.0" },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  return app;
}
