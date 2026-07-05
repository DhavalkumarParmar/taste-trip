// SERVER route handler — Auth.js v5 catch-all. Handles every OAuth
// endpoint under /api/auth/* (sign-in, callback, sign-out, session, error).
// Do NOT add logic here; all config lives in ../../../../auth.ts.
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
