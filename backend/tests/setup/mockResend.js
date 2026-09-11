// Registering a user now always sends a verification e-mail (see
// auth.service.js's registerUser), and createAuthenticatedUser (below) calls
// /register on virtually every integration test — so without this, every
// test run would fire real HTTP requests at Resend using the dummy
// RESEND_API_KEY in .env.test/CI, which fails loudly (401) and would break
// every test that creates a user. Mocked globally via vitest.config.js's
// setupFiles so no individual test file needs to remember to do this.
import { vi } from "vitest";

vi.mock("../../src/lib/resend.js", () => ({
  default: {
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: "test-email-id" }, error: null }),
    },
  },
}));
