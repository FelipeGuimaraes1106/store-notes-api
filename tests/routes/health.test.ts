import { describe, expect, it } from "vitest";
import { buildServer } from "../../src/controllers/rest/server.js";

describe("GET /health", () => {
  it("responde ok com o horário do servidor", async () => {
    const app = await buildServer();
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", timestamp: expect.any(String) });
  });
});
