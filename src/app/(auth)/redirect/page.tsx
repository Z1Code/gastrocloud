"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function RedirectPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const role = user.role;

    if (!role) {
      router.replace("/cuenta");
      return;
    }

    if (role === "super_admin" || role === "owner" || role === "admin") {
      router.replace("/dashboard");
    } else if (role === "chef") {
      router.replace("/kitchen/default");
    } else if (role === "waiter" || role === "cashier") {
      router.replace("/pos");
    } else {
      router.replace("/cuenta");
    }
  }, [user, isLoading, isAdmin, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030014]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Redirigiendo...</p>
      </div>
    </div>
  );
}
