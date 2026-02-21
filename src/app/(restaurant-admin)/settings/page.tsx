"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Palette, Globe, Check, Loader2, ExternalLink } from "lucide-react";
import { themeList, type StorefrontTheme } from "@/lib/themes";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function SettingsPage() {
  const [selectedTheme, setSelectedTheme] = useState<string>("moderno");
  const [savedTheme, setSavedTheme] = useState<string>("moderno");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customDomain, setCustomDomain] = useState("");

  // Fetch current theme on mount
  useEffect(() => {
    async function fetchTheme() {
      try {
        const res = await fetch("/api/restaurant/theme");
        if (res.ok) {
          const data = await res.json();
          if (data.themeKey) {
            setSelectedTheme(data.themeKey);
            setSavedTheme(data.themeKey);
          }
        }
      } catch {
        // default to 'moderno'
      } finally {
        setLoading(false);
      }
    }
    fetchTheme();
  }, []);

  async function handleSaveTheme() {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/restaurant/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeKey: selectedTheme }),
      });
      if (res.ok) {
        setSavedTheme(selectedTheme);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      // handle error silently for now
    } finally {
      setSaving(false);
    }
  }

  const hasThemeChanged = selectedTheme !== savedTheme;

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Settings size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Configuracion</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Personaliza la apariencia y dominio de tu storefront
            </p>
          </div>
        </div>
      </motion.div>

      {/* Section 1: Theme Picker */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Palette size={20} className="text-indigo-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Tema del Storefront</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Selecciona el tema visual que veran tus clientes
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {themeList.map((theme: StorefrontTheme) => {
              const isSelected = selectedTheme === theme.key;
              return (
                <button
                  key={theme.key}
                  onClick={() => setSelectedTheme(theme.key)}
                  className={`
                    relative text-left p-4 rounded-2xl border transition-all duration-200
                    ${
                      isSelected
                        ? "bg-white/10 border-transparent ring-2 ring-indigo-500/70 shadow-lg shadow-indigo-500/10"
                        : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                    }
                  `}
                >
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}

                  {/* Emoji */}
                  <span className="text-2xl">{theme.emoji}</span>

                  {/* Theme name */}
                  <p className="text-sm font-semibold text-white mt-2">{theme.name}</p>

                  {/* Color swatches */}
                  <div className="flex items-center gap-2 mt-3">
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: theme.colors.primary }}
                      title="Primary"
                    />
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: theme.colors.secondary }}
                      title="Secondary"
                    />
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: theme.colors.accent }}
                      title="Accent"
                    />
                  </div>

                  {/* Font name */}
                  <p
                    className="text-xs text-gray-400 mt-2 truncate"
                    style={{ fontFamily: theme.font }}
                  >
                    {theme.font.split(",")[0].replace(/['"]/g, "")}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleSaveTheme}
            disabled={!hasThemeChanged || saving}
            className={`
              inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${
                hasThemeChanged && !saving
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-white/5 text-slate-500 cursor-not-allowed"
              }
            `}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Tema"
            )}
          </button>

          {saveSuccess && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-emerald-400 flex items-center gap-1"
            >
              <Check size={16} />
              Tema guardado correctamente
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Section 2: Custom Domain */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.1 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Globe size={20} className="text-indigo-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Dominio Personalizado</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Conecta tu propio dominio para una experiencia de marca completa
            </p>
          </div>
        </div>

        {/* Current domain */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-5">
          <p className="text-xs text-gray-400 mb-1">Tu storefront actual</p>
          <div className="flex items-center gap-2">
            <code className="text-sm text-indigo-300 font-mono">
              gastrocloud.vercel.app/r/<span className="text-white">[slug]</span>
            </code>
            <ExternalLink size={14} className="text-slate-500" />
          </div>
        </div>

        {/* Custom domain input */}
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-gray-400 mb-1.5 block">Dominio personalizado</span>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="mirestaurante.cl"
              className="w-full max-w-md h-10 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
          </label>

          {/* Instructions */}
          <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 max-w-md">
            <p className="text-xs text-indigo-300 font-medium mb-1">Instrucciones</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Apunta tu dominio con un registro CNAME a{" "}
              <code className="text-indigo-300 bg-white/5 px-1.5 py-0.5 rounded font-mono">
                gastrocloud.vercel.app
              </code>
            </p>
          </div>
        </div>

        {/* Save domain button (TODO) */}
        <div className="mt-5">
          <button
            disabled
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-slate-500 cursor-not-allowed"
          >
            Guardar Dominio
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-md text-slate-400">
              Proximamente
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
