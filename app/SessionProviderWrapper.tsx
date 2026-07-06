"use client";
// CLIENT wrapper — mounts next-auth's SessionProvider so useSession() works
// anywhere below. Session data comes from /api/auth/session (server route),
// so no secrets flow through this file.
import { SessionProvider } from "next-auth/react";

export function SessionProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
