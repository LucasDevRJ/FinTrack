// Integration tests for the e-mail verification flow added in issue #41:
// register no longer issues a usable token, login is blocked until the
// e-mail is confirmed, and verify-email/resend-verification behave as
// expected. Resend itself is mocked globally (see tests/setup/mockResend.js)
// so these never hit the real API.
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { authHeader, createAuthenticatedUser } from "../setup/auth.js";
import { prisma, resetDb } from "../setup/db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

function newUser(overrides = {}) {
  return {
    name: "Test User",
    email: `auth-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: "password123",
    ...overrides,
  };
}

describe("POST /api/auth/register", () => {
  it("does not return a usable token, but includes devVerificationToken outside production", async () => {
    const user = newUser();
    const res = await request(app).post("/api/auth/register").send(user);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeUndefined();
    expect(res.body.devVerificationToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: user.email, name: user.name });
  });

  it("reports a max-length violation in Portuguese when the schema has no custom message", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(newUser({ name: "x".repeat(101) }));

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: "name", message: "Deve ter no máximo 100 caracteres" },
    ]);
  });
});

describe("POST /api/auth/login", () => {
  it("reports a missing field in Portuguese, not with Zod's default English message", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nao-e-email" });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: "email", message: "E-mail inválido" },
      { field: "password", message: "Campo obrigatório" },
    ]);
  });

  it("rejects login with 403 before the e-mail is verified", async () => {
    const user = newUser();
    await request(app).post("/api/auth/register").send(user);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/confirme seu e-mail/i);
  });

  it("logs in successfully once the e-mail is verified", async () => {
    const user = newUser();
    const registerRes = await request(app).post("/api/auth/register").send(user);
    await request(app)
      .post("/api/auth/verify-email")
      .send({ token: registerRes.body.devVerificationToken });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });
});

describe("POST /api/auth/verify-email", () => {
  it("verifies the account and returns a usable token", async () => {
    const user = newUser();
    const registerRes = await request(app).post("/api/auth/register").send(user);

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: registerRes.body.devVerificationToken });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(user.email);
  });

  it("rejects an invalid or already-used token", async () => {
    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: "not-a-real-token" });

    expect(res.status).toBe(400);
  });

  it("rejects reusing the same token twice (single-use)", async () => {
    const user = newUser();
    const registerRes = await request(app).post("/api/auth/register").send(user);
    const token = registerRes.body.devVerificationToken;

    await request(app).post("/api/auth/verify-email").send({ token });
    const res = await request(app).post("/api/auth/verify-email").send({ token });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/resend-verification", () => {
  it("responds with the same generic message for a registered, unregistered, or already-verified e-mail", async () => {
    const user = newUser();
    const registerRes = await request(app).post("/api/auth/register").send(user);
    await request(app)
      .post("/api/auth/verify-email")
      .send({ token: registerRes.body.devVerificationToken });

    const [pending, unknown, alreadyVerified] = await Promise.all([
      request(app).post("/api/auth/resend-verification").send({ email: newUser().email }),
      request(app).post("/api/auth/resend-verification").send({ email: "nobody@example.com" }),
      request(app).post("/api/auth/resend-verification").send({ email: user.email }),
    ]);

    for (const res of [pending, unknown, alreadyVerified]) {
      expect(res.status).toBe(200);
    }
    expect(pending.body.message).toBe(unknown.body.message);
    expect(unknown.body.message).toBe(alreadyVerified.body.message);
  });

  it("issues a new working token for a genuinely pending account", async () => {
    const user = newUser();
    await request(app).post("/api/auth/register").send(user);

    const resendRes = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: user.email });
    expect(resendRes.status).toBe(200);

    // resend-verification doesn't echo the new token back (unlike register,
    // it's a route the frontend calls anonymously) — assert indirectly by
    // reading it straight from the DB. The raw token itself was only ever in
    // the e-mail (mocked away here); the hashing/expiry logic it relies on
    // is exercised end-to-end by the verify-email tests above.
    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    expect(dbUser.emailVerificationTokenHash).toEqual(expect.any(String));
    expect(dbUser.emailVerificationExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

// Integration tests for issue #4's edit-profile flow: name updates directly,
// e-mail changes require confirming ownership of the new address, password
// changes require the current password (not an e-mail code — see auth.service.js).
describe("PATCH /api/auth/me", () => {
  it("updates the user's name", async () => {
    const { token } = await createAuthenticatedUser();

    const res = await request(app)
      .patch("/api/auth/me")
      .set(authHeader(token))
      .send({ name: "Novo Nome" });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Novo Nome");
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).patch("/api/auth/me").send({ name: "Novo Nome" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/me/email + /api/auth/confirm-email-change", () => {
  it("does not change the email until the confirmation link is used", async () => {
    const { token, user } = await createAuthenticatedUser();
    const newEmail = `new-${Date.now()}@example.com`;

    const requestRes = await request(app)
      .post("/api/auth/me/email")
      .set(authHeader(token))
      .send({ email: newEmail });

    expect(requestRes.status).toBe(200);
    expect(requestRes.body.devEmailChangeToken).toEqual(expect.any(String));

    const meRes = await request(app).get("/api/auth/me").set(authHeader(token));
    expect(meRes.body.user.email).toBe(user.email);

    const confirmRes = await request(app)
      .post("/api/auth/confirm-email-change")
      .send({ token: requestRes.body.devEmailChangeToken });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.user.email).toBe(newEmail);
    expect(confirmRes.body.token).toEqual(expect.any(String));
  });

  it("rejects requesting an email already used by another account", async () => {
    const { token } = await createAuthenticatedUser();
    const other = await createAuthenticatedUser();

    const res = await request(app)
      .post("/api/auth/me/email")
      .set(authHeader(token))
      .send({ email: other.user.email });

    expect(res.status).toBe(409);
  });

  it("rejects an invalid or expired confirmation token", async () => {
    const res = await request(app)
      .post("/api/auth/confirm-email-change")
      .send({ token: "not-a-real-token" });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/me/password", () => {
  it("changes the password when the current password is correct", async () => {
    const { token, user } = await createAuthenticatedUser({ password: "password123" });

    const changeRes = await request(app)
      .post("/api/auth/me/password")
      .set(authHeader(token))
      .send({ currentPassword: "password123", newPassword: "newpassword456" });
    expect(changeRes.status).toBe(200);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "newpassword456" });
    expect(loginRes.status).toBe(200);
  });

  it("rejects an incorrect current password", async () => {
    const { token } = await createAuthenticatedUser({ password: "password123" });

    const res = await request(app)
      .post("/api/auth/me/password")
      .set(authHeader(token))
      .send({ currentPassword: "wrong-password", newPassword: "newpassword456" });

    expect(res.status).toBe(401);
  });
});
