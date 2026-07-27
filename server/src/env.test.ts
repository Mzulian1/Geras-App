import { describe, expect, it } from "vitest";
import { parseEnv, resolveAllowedOrigins } from "./env.js";

const validEnv = {
  NODE_ENV: "test",
  PORT: "4000",
  CLERK_SECRET_KEY: "sk_test_x",
  CLERK_PUBLISHABLE_KEY: "pk_test_x",
  CLERK_WEBHOOK_SIGNING_SECRET: "whsec_x",
  SUPABASE_URL: "https://xxx.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  RESEND_API_KEY: "re_x",
};

describe("parseEnv", () => {
  it("acepta un entorno completo y coerciona PORT a número", () => {
    const env = parseEnv(validEnv);
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe("test");
  });

  it("aplica defaults cuando NODE_ENV/PORT no vienen", () => {
    const { NODE_ENV: _n, PORT: _p, ...rest } = validEnv;
    const env = parseEnv(rest);
    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(4000);
  });

  it("lanza si falta una variable obligatoria", () => {
    const { CLERK_SECRET_KEY: _omit, ...rest } = validEnv;
    expect(() => parseEnv(rest)).toThrow();
  });

  it("lanza si SUPABASE_URL no es una URL válida", () => {
    expect(() => parseEnv({ ...validEnv, SUPABASE_URL: "no-es-una-url" })).toThrow();
  });
});

describe("resolveAllowedOrigins", () => {
  it("usa localhost:3000 como default sin CORS_ALLOWED_ORIGINS", () => {
    expect(resolveAllowedOrigins(undefined)).toEqual(["http://localhost:3000"]);
  });

  it("parsea una lista separada por comas y descarta espacios/vacíos", () => {
    expect(resolveAllowedOrigins("https://a.com, https://b.com ,,")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });
});
