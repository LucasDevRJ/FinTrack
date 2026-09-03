// Registers a real user through the actual /api/auth/register endpoint
// (rather than inserting a row directly via Prisma) so integration tests
// exercise the same signup path a real user would, and get back a real JWT
// the same way the frontend does.
import request from "supertest";
import app from "../../src/app.js";

let counter = 0;

export async function createAuthenticatedUser(overrides = {}) {
  counter += 1;
  const payload = {
    name: "Test User",
    email: `test-user-${Date.now()}-${counter}@example.com`,
    password: "password123",
    ...overrides,
  };

  const res = await request(app).post("/api/auth/register").send(payload);
  if (res.status !== 201) {
    throw new Error(`Falha ao criar usuário de teste: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { token: res.body.token, user: res.body.user };
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}
