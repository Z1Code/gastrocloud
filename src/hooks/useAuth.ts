"use client";

import { useSession } from "next-auth/react";

interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  organizationId?: string;
  branchId?: string;
}

export function useAuth() {
  const { data: session, status } = useSession();

  const user = session?.user as AuthUser | undefined;

  return {
    user,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    isAdmin: user?.role === "super_admin" || user?.role === "owner" || user?.role === "admin",
    isStaff: !!user?.role,
    session,
    status,
  };
}
