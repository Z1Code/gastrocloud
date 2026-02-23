"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  UtensilsCrossed,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
} from "lucide-react";

const cuisineTypes = [
  "Chilena",
  "Peruana",
  "Japonesa",
  "Italiana",
  "Mexicana",
  "China",
  "Francesa",
  "Americana",
  "Fusión",
  "Mariscos",
  "Parrilla",
  "Vegana",
  "Otra",
];

const steps = [
  { title: "Tu Negocio", icon: Building2 },
  { title: "Tu Restaurante", icon: UtensilsCrossed },
  { title: "Confirmación", icon: Check },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [orgName, setOrgName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [address, setAddress] = useState("");

  const canNext =
    step === 0
      ? orgName.trim().length >= 2
      : step === 1
        ? restaurantName.trim().length >= 2
        : true;

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, restaurantName, cuisineType, address }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al crear el restaurante");
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`w-8 h-0.5 rounded-full transition-colors ${
                    isDone ? "bg-orange-500" : "bg-white/10"
                  }`}
                />
              )}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25"
                    : isDone
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-white/5 text-slate-500"
                }`}
              >
                {isDone ? <Check size={18} /> : <Icon size={18} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Nombre de tu negocio
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  El nombre de tu empresa o razón social. Puedes cambiarlo después.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre de la organización
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ej: Restaurantes López SpA"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Datos del restaurante
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Información básica. Podrás completar el resto desde el panel.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre del restaurante
                </label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Ej: Sushi Express"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tipo de cocina
                </label>
                <div className="flex flex-wrap gap-2">
                  {cuisineTypes.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCuisineType(c === cuisineType ? "" : c)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        cuisineType === c
                          ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                          : "bg-white/5 text-slate-400 border border-white/10 hover:border-white/20"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Dirección <span className="text-slate-500">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Av. Providencia 1234, Santiago"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25">
                  <Sparkles size={28} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  Todo listo para empezar
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Revisa los datos y confirma para crear tu restaurante.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-slate-400">Organización</span>
                  <span className="text-sm text-white font-medium">{orgName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-slate-400">Restaurante</span>
                  <span className="text-sm text-white font-medium">{restaurantName}</span>
                </div>
                {cuisineType && (
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-sm text-slate-400">Cocina</span>
                    <span className="text-sm text-white font-medium">{cuisineType}</span>
                  </div>
                )}
                {address && (
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-sm text-slate-400">Dirección</span>
                    <span className="text-sm text-white font-medium">{address}</span>
                  </div>
                )}
              </div>
              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-0 disabled:pointer-events-none"
        >
          <ArrowLeft size={16} />
          Atrás
        </button>

        {step < 2 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creando...
              </>
            ) : (
              <>
                Crear mi restaurante
                <Sparkles size={16} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
