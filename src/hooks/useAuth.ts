"use client";

import { useSession } from "next-auth/react";

interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user as AuthUser | undefined,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    session,
    status,
  };
}
