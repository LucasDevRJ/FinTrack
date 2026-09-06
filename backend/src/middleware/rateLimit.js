import rateLimit from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 10;

// Factory (rather than a single pre-built instance) so tests can build an
// unskipped limiter with a lower `limit`, instead of firing 10+ real
// requests to exercise the 429 path.
export function createAuthLimiter(overrides = {}) {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Muitas tentativas. Tente novamente em alguns minutos." },
    ...overrides,
  });
}

// Brute-force protection for the auth routes. Keyed by IP (the default),
// which relies on app.set("trust proxy", 1) in app.js to see the real
// client IP behind Railway's reverse proxy instead of a single shared one.
//
// Disabled under NODE_ENV=test: the integration suite creates several test
// users per file through the real /register endpoint (see
// tests/setup/auth.js), all from the same loopback IP — without this the
// suite would trip the same brute-force protection it isn't trying to test.
export const authLimiter = createAuthLimiter({
  skip: () => process.env.NODE_ENV === "test",
});
