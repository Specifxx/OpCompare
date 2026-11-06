// Client-safe: where the "Email me a sign-in link" form posts (RiftCompare's
// sister sign-in service, lib/email-sign-in.ts). Kept apart so the form does
// not import the database module.
export const SIGN_IN_REQUEST_URL = "https://riftcompare.com/api/sister-sign-in";
