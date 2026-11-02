import { describe, expect, it } from "vitest";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { buildServer } from "../../src/controllers/rest/server.js";

/** Rotas só de teste, registradas depois do error handler — como as rotas reais. */
async function buildAppWithTestRoutes() {
  const app = await buildServer();
  app.withTypeProvider<ZodTypeProvider>().post(
    "/test/validated",
    { schema: { body: z.object({ name: z.string() }) } },
    async () => ({})
  );
  app.get("/test/business-error", async () => {
    throw Object.assign(new Error("Recurso não encontrado"), { statusCode: 404 });
  });
  app.get("/test/unexpected-error", async () => {
    throw new Error('relation "tabela" does not exist');
  });
  return app;
}

/** Formato `{ erro }` que os fronts leem — mesmo contrato da smart-city-legacy. */
describe("contrato de erro", () => {
  it("payload inválido vira 400 com os detalhes da validação", async () => {
    const app = await buildAppWithTestRoutes();
    const res = await app.inject({ method: "POST", url: "/test/validated", payload: { name: 1 } });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ erro: "Payload inválido", detalhes: expect.any(Array) });
  });

  it("erro de negócio sai com o status e a mensagem dele", async () => {
    const app = await buildAppWithTestRoutes();
    const res = await app.inject({ method: "GET", url: "/test/business-error" });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ erro: "Recurso não encontrado" });
  });

  it("erro inesperado vira 500 sem vazar a mensagem crua", async () => {
    const app = await buildAppWithTestRoutes();
    const res = await app.inject({ method: "GET", url: "/test/unexpected-error" });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ erro: "Erro interno" });
  });
});

/** `app.inject()` não aplica a política do browser: o teste olha o header que ela leria. */
describe("CORS", () => {
  it("libera o front em qualquer porta de localhost", async () => {
    const app = await buildServer();
    const res = await app.inject({ method: "GET", url: "/docs/json", headers: { origin: "http://localhost:5174" } });

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5174");
  });

  /** Recusar é só não mandar o header — virar 500 derrubaria até chamada servidor a servidor. */
  it("recusa origem fora de localhost e do CORS_ORIGIN sem transformar em erro", async () => {
    const app = await buildServer();
    const res = await app.inject({ method: "GET", url: "/docs/json", headers: { origin: "https://example.com" } });

    expect(res.statusCode).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
