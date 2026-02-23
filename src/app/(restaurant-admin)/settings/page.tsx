"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Settings, Palette, Globe, Check, Loader2, ExternalLink, ImageIcon, Clock, Plus, X, Copy } from "lucide-react";
import { themeList, type StorefrontTheme } from "@/lib/themes";
import Image from "next/image";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const DAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

type TimeRange = { opens: string; closes: string };
type DaySchedule = { isOpen: boolean; timeRanges: TimeRange[] };
type OperatingHours = Record<string, DaySchedule>;

function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

function defaultHours(): OperatingHours {
  const hours: OperatingHours = {};
  for (const key of DAY_KEYS) {
    hours[key] = { isOpen: false, timeRanges: [] };
  }
  return hours;
}

export default function SettingsPage() {
  const [selectedTheme, setSelectedTheme] = useState<string>("moderno");
  const [savedTheme, setSavedTheme] = useState<string>("moderno");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customDomain, setCustomDomain] = useState("");

  // Logo state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Operating hours state
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(defaultHours);
  const [hoursLoading, setHoursLoading] = useState(true);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursSaveSuccess, setHoursSaveSuccess] = useState(false);

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

  // Fetch logo on mount
  useEffect(() => {
    async function fetchLogo() {
      try {
        const res = await fetch("/api/restaurant/logo");
        if (res.ok) {
          const data = await res.json();
          if (data.logoUrl) {
            setLogoUrl(data.logoUrl);
          }
        }
      } catch {
        // no logo
      } finally {
        setLogoLoading(false);
      }
    }
    fetchLogo();
  }, []);

  // Fetch operating hours on mount
  useEffect(() => {
    async function fetchHours() {
      try {
        const res = await fetch("/api/branch/operating-hours");
        if (res.ok) {
          const data = await res.json();
          if (data.operatingHours) {
            setOperatingHours(data.operatingHours);
          }
        }
      } catch {
        // default hours
      } finally {
        setHoursLoading(false);
      }
    }
    fetchHours();
  }, []);

  // Logo upload handler
  const handleLogoUpload = useCallback(async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo excede 5MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Solo se permiten archivos JPG, PNG o WebP");
      return;
    }
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/restaurant/logo", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.logoUrl);
      }
    } catch {
      // handle error silently
    } finally {
      setLogoUploading(false);
    }
  }, []);

  const handleDeleteLogo = async () => {
    try {
      const res = await fetch("/api/restaurant/logo", { method: "DELETE" });
      if (res.ok) {
        setLogoUrl(null);
      }
    } catch {
      // handle error silently
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoUpload(file);
  }, [handleLogoUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  // Operating hours handlers
  const toggleDay = (day: string) => {
    setOperatingHours((prev) => {
      const current = prev[day];
      if (current.isOpen) {
        return { ...prev, [day]: { isOpen: false, timeRanges: [] } };
      }
      return { ...prev, [day]: { isOpen: true, timeRanges: [{ opens: "09:00", closes: "22:00" }] } };
    });
  };

  const updateTimeRange = (day: string, index: number, field: "opens" | "closes", value: string) => {
    setOperatingHours((prev) => {
      const daySchedule = { ...prev[day] };
      const ranges = [...daySchedule.timeRanges];
      ranges[index] = { ...ranges[index], [field]: value };
      return { ...prev, [day]: { ...daySchedule, timeRanges: ranges } };
    });
  };

  const addTimeRange = (day: string) => {
    setOperatingHours((prev) => {
      const daySchedule = { ...prev[day] };
      if (daySchedule.timeRanges.length >= 2) return prev;
      const ranges = [...daySchedule.timeRanges, { opens: "18:00", closes: "22:00" }];
      return { ...prev, [day]: { ...daySchedule, timeRanges: ranges } };
    });
  };

  const removeTimeRange = (day: string, index: number) => {
    setOperatingHours((prev) => {
      const daySchedule = { ...prev[day] };
      const ranges = daySchedule.timeRanges.filter((_, i) => i !== index);
      return { ...prev, [day]: { ...daySchedule, timeRanges: ranges } };
    });
  };

  const copyToAllDays = () => {
    setOperatingHours((prev) => {
      const firstOpenDay = DAY_KEYS.find((k) => prev[k].isOpen);
      if (!firstOpenDay) return prev;
      const source = prev[firstOpenDay];
      const updated: OperatingHours = {};
      for (const key of DAY_KEYS) {
        if (prev[key].isOpen) {
          // Only copy time ranges to days that are already open
          updated[key] = { isOpen: true, timeRanges: source.timeRanges.map((r) => ({ ...r })) };
        } else {
          updated[key] = { ...prev[key] };
        }
      }
      return updated;
    });
  };

  const hasAnyDayOpen = DAY_KEYS.some((k) => operatingHours[k].isOpen);

  const handleSaveHours = async () => {
    setHoursSaving(true);
    setHoursSaveSuccess(false);
    try {
      const res = await fetch("/api/branch/operating-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatingHours }),
      });
      if (res.ok) {
        setHoursSaveSuccess(true);
        setTimeout(() => setHoursSaveSuccess(false), 3000);
      }
    } catch {
      // handle error silently
    } finally {
      setHoursSaving(false);
    }
  };

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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Settings size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Configuracion</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Configura tu restaurante, marca y horarios
            </p>
          </div>
        </div>
      </motion.div>

      {/* Section 1: Logo del Restaurante */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <ImageIcon size={20} className="text-orange-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Logo del Restaurante</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Sube el logo de tu restaurante para personalizar tu storefront
            </p>
          </div>
        </div>

        {logoLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-orange-400" />
          </div>
        ) : logoUrl ? (
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
              <Image src={logoUrl} alt="Logo del restaurante" fill className="object-cover" />
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
              >
                Cambiar
              </button>
              <button
                onClick={handleDeleteLogo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
              >
                Eliminar
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />
          </div>
        ) : (
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                dragOver
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
              }`}
            >
              {logoUploading ? (
                <Loader2 size={24} className="animate-spin text-orange-400" />
              ) : (
                <>
                  <ImageIcon size={32} className="text-slate-500 mb-2" />
                  <p className="text-sm text-gray-400">Arrastra tu logo o haz clic</p>
                  <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP. Max 5MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />
          </div>
        )}
      </motion.div>

      {/* Section 2: Horarios de Operacion */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Clock size={20} className="text-orange-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Horarios de Operacion</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Define los horarios de atencion de tu restaurante
            </p>
          </div>
        </div>

        {hoursLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-orange-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {DAY_KEYS.map((dayKey) => {
              const day = operatingHours[dayKey];
              return (
                <div key={dayKey} className="flex items-start gap-3">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleDay(dayKey)}
                    className={`mt-1 w-10 h-5 rounded-full relative transition-all flex-shrink-0 ${
                      day.isOpen ? "bg-orange-500" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        day.isOpen ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>

                  {/* Day name */}
                  <span className="w-24 text-sm text-white mt-1 flex-shrink-0 font-medium">
                    {DAY_LABELS[dayKey]}
                  </span>

                  {/* Time ranges or Cerrado */}
                  {day.isOpen ? (
                    <div className="flex-1 space-y-2">
                      {day.timeRanges.map((range, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            value={range.opens}
                            onChange={(e) => updateTimeRange(dayKey, idx, "opens", e.target.value)}
                            className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white appearance-none cursor-pointer"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t} className="bg-slate-900">
                                {t}
                              </option>
                            ))}
                          </select>
                          <span className="text-sm text-slate-400">a</span>
                          <select
                            value={range.closes}
                            onChange={(e) => updateTimeRange(dayKey, idx, "closes", e.target.value)}
                            className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white appearance-none cursor-pointer"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t} className="bg-slate-900">
                                {t}
                              </option>
                            ))}
                          </select>
                          {day.timeRanges.length > 1 && (
                            <button
                              onClick={() => removeTimeRange(dayKey, idx)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                              <X size={14} />
                            </button>
                          )}
                          {idx === day.timeRanges.length - 1 && day.timeRanges.length < 2 && (
                            <button
                              onClick={() => addTimeRange(dayKey)}
                              className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors ml-1"
                            >
                              <Plus size={14} />
                              Agregar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500 mt-1">Cerrado</span>
                  )}
                </div>
              );
            })}

            {/* Copy to all days */}
            {hasAnyDayOpen && (
              <button
                onClick={copyToAllDays}
                className="inline-flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors mt-2"
              >
                <Copy size={14} />
                Copiar a todos los dias
              </button>
            )}
          </div>
        )}

        {/* Save hours button */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleSaveHours}
            disabled={hoursSaving}
            className={`
              inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${
                !hoursSaving
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-white/5 text-slate-500 cursor-not-allowed"
              }
            `}
          >
            {hoursSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Horarios"
            )}
          </button>

          {hoursSaveSuccess && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-emerald-400 flex items-center gap-1"
            >
              <Check size={16} />
              Horarios guardados correctamente
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Section 3: Theme Picker */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Palette size={20} className="text-orange-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Tema del Storefront</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Selecciona el tema visual que veran tus clientes
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-orange-400" />
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
                        ? "bg-white/10 border-transparent ring-2 ring-orange-500/70 shadow-lg shadow-orange-500/10"
                        : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                    }
                  `}
                >
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
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
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]"
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

      {/* Section 4: Custom Domain */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.1 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Globe size={20} className="text-orange-400" />
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
            <code className="text-sm text-orange-300 font-mono">
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
              className="w-full max-w-md h-10 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
            />
          </label>

          {/* Instructions */}
          <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4 max-w-md">
            <p className="text-xs text-orange-300 font-medium mb-1">Instrucciones</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Apunta tu dominio con un registro CNAME a{" "}
              <code className="text-orange-300 bg-white/5 px-1.5 py-0.5 rounded font-mono">
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
