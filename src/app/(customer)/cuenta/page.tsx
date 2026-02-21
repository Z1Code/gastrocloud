"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, ShoppingBag, Store, Sparkles, Shield, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function CuentaPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupDone, setSetupDone] = useState(false);

  // If user is admin, redirect to dashboard
  useEffect(() => {
    if (!isLoading && isAdmin) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAdmin, router]);

  async function handleSetup() {
    setSetupLoading(true);
    try {
      const res = await fetch("/api/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSetupDone(true);
        // Force session refresh then redirect
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      } else {
        alert(data.error ?? "Error al configurar");
      }
    } catch {
      alert("Error de conexion");
    } finally {
      setSetupLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userName = user?.name ?? "Usuario";
  const userEmail = user?.email ?? "";

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-slate-900">Mi Cuenta</h1>
        <p className="text-slate-500 mt-1">
          Hola, {userName.split(" ")[0]}. Bienvenido a GastroCloud.
        </p>
      </motion.div>

      {/* User info card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
      >
        <div className="flex items-center gap-4">
          {user?.image ? (
            <img
              src={user.image}
              alt={userName}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-100"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold">
              {userName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{userName}</h2>
            <p className="text-sm text-slate-500">{userEmail}</p>
            {user?.role ? (
              <span className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                {user.role}
              </span>
            ) : (
              <span className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                Cliente
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <ShoppingBag size={20} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Mis Pedidos</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Revisa el historial de tus pedidos y su estado actual.
          </p>
          <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            Ver pedidos <ArrowRight size={14} />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Store size={20} className="text-violet-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Restaurantes</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Explora restaurantes disponibles y sus menus.
          </p>
          <button className="text-sm font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1">
            Explorar <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>

      {/* Admin setup CTA (only if no role) */}
      {!user?.role && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Tienes un restaurante?</h3>
              <p className="text-white/80 text-sm mt-1 mb-4">
                Configura tu cuenta como administrador y accede al panel completo de GastroCloud para gestionar tu negocio.
              </p>
              <button
                onClick={handleSetup}
                disabled={setupLoading || setupDone}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {setupLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    Configurando...
                  </>
                ) : setupDone ? (
                  <>
                    <Shield size={18} />
                    Configurado! Redirigiendo...
                  </>
                ) : (
                  <>
                    <Shield size={18} />
                    Configurar como Admin
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
