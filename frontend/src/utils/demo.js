// Mirrors backend/src/modules/auth/auth.service.js's DEMO_EMAIL — kept in
// sync manually since frontend and backend don't share code. Used to hide
// account-management UI that doesn't make sense for the shared public demo
// account (see issue #13).
const DEMO_EMAIL = "demo@fintrack.app";

export function isDemoUser(user) {
  return user?.email === DEMO_EMAIL;
}
