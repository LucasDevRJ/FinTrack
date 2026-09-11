// Registers a real user through the actual /api/auth/register +
// /api/auth/verify-email endpoints (rather than inserting a row directly via
// Prisma) so integration tests exercise the same signup path a real user
// would, and get back a real JWT the same way the frontend does. Login is
// blocked for unverified accounts (see auth.service.js's loginUser), so
// verification can't be skipped — register's response includes
// devVerificationToken outside of NODE_ENV=production specifically so tests
// (and local dev) can complete it without a real inbox.
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

  const registerRes = await request(app).post("/api/auth/register").send(payload);
  if (registerRes.status !== 201) {
    throw new Error(
      `Falha ao criar usuário de teste: ${registerRes.status} ${JSON.stringify(registerRes.body)}`,
    );
  }

  const verifyRes = await request(app)
    .post("/api/auth/verify-email")
    .send({ token: registerRes.body.devVerificationToken });
  if (verifyRes.status !== 200) {
    throw new Error(
      `Falha ao verificar e-mail do usuário de teste: ${verifyRes.status} ${JSON.stringify(verifyRes.body)}`,
    );
  }

  return { token: verifyRes.body.token, user: verifyRes.body.user };
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}
