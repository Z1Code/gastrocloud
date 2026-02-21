"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Types ──────────────────────────────────────────────── */

interface PaymentConfig {
  id: string;
  gateway: "mercadopago" | "transbank";
  credentials: Record<string, string>;
  sandbox: boolean;
  status: "active" | "inactive" | "unconfigured";
  lastTested: string | null;
}

interface DeliveryConfig {
  id: string;
  platform: "uber_eats" | "rappi" | "whatsapp";
  credentials: Record<string, string>;
  externalStoreId: string;
  webhookSecret: string;
  isActive: boolean;
  isSandbox: boolean;
  metadata: Record<string, unknown> | null;
  lastSyncAt: string | null;
}

interface GatewayDef {
  key: "mercadopago" | "transbank";
  name: string;
  icon: string;
  fields: { key: string; label: string }[];
}

interface DeliveryDef {
  key: "uber_eats" | "rappi" | "whatsapp";
  name: string;
  icon: string;
  color: string;
  fields: { key: string; label: string; type?: string }[];
  extraFields?: { key: string; label: string; placeholder?: string }[];
  hasSyncMenu?: boolean;
  hasTestSend?: boolean;
}

/* ── Gateway Definitions ────────────────────────────────── */

const gateways: GatewayDef[] = [
  {
    key: "mercadopago",
    name: "MercadoPago",
    icon: "\uD83D\uDCB3",
    fields: [
      { key: "accessToken", label: "Access Token" },
      { key: "publicKey", label: "Public Key" },
    ],
  },
  {
    key: "transbank",
    name: "Transbank",
    icon: "\uD83C\uDFE6",
    fields: [
      { key: "commerceCode", label: "Commerce Code" },
      { key: "apiKey", label: "API Key" },
    ],
  },
];

const deliveryPlatforms: DeliveryDef[] = [
  {
    key: "uber_eats",
    name: "Uber Eats",
    icon: "\uD83D\uDE97",
    color: "from-green-500 to-emerald-600",
    fields: [
      { key: "clientId", label: "Client ID" },
      { key: "clientSecret", label: "Client Secret" },
    ],
    extraFields: [
      { key: "storeId", label: "Store ID", placeholder: "ID de tu tienda en Uber Eats" },
    ],
    hasSyncMenu: true,
  },
  {
    key: "rappi",
    name: "Rappi",
    icon: "\uD83D\uDCE6",
    color: "from-orange-500 to-red-500",
    fields: [
      { key: "clientId", label: "Client ID" },
      { key: "clientSecret", label: "Client Secret" },
    ],
    extraFields: [
      { key: "storeId", label: "Store ID", placeholder: "ID de tu tienda en Rappi" },
    ],
    hasSyncMenu: true,
  },
  {
    key: "whatsapp",
    name: "WhatsApp Business",
    icon: "\uD83D\uDCAC",
    color: "from-green-400 to-green-600",
    fields: [
      { key: "accessToken", label: "Access Token (Meta)" },
      { key: "appSecret", label: "App Secret" },
    ],
    extraFields: [
      { key: "phoneNumberId", label: "Phone Number ID", placeholder: "ID del numero de WhatsApp" },
      { key: "verifyToken", label: "Verify Token (Webhook)", placeholder: "Token para verificacion del webhook" },
    ],
    hasTestSend: true,
  },
];

/* ── Status Badge ───────────────────────────────────────── */

function StatusBadge({ status }: { status: "active" | "inactive" | "unconfigured" }) {
  const styles = {
    active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    inactive: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    unconfigured: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  };
  const labels = {
    active: "Activo",
    inactive: "Inactivo",
    unconfigured: "No configurado",
  };

  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

/* ── Toggle Switch ──────────────────────────────────────── */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-10 h-5 rounded-full transition-colors ${
            checked
              ? "bg-gradient-to-r from-indigo-500 to-violet-500"
              : "bg-white/10"
          }`}
        />
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
      <span className="text-sm text-gray-400">{label}</span>
    </label>
  );
}

/* ── Alert Component ────────────────────────────────────── */

interface Alert {
  type: "success" | "error";
  message: string;
  gateway: string;
}

function AlertBanner({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  const styles =
    alert.type === "success"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
      : "bg-red-500/10 border-red-500/30 text-red-300";

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${styles} mb-4`}>
      <span className="text-sm">
        {alert.type === "success" ? "\u2713" : "\u2717"} {alert.message}
      </span>
      <button
        onClick={onDismiss}
        className="text-current opacity-60 hover:opacity-100 transition-opacity ml-4 text-lg leading-none"
      >
        &times;
      </button>
    </div>
  );
}

/* ── Webhook URL Display ─────────────────────────────────── */

function WebhookUrl({ path }: { path: string }) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${baseUrl}${path}`;
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] mb-4">
      <span className="text-xs text-slate-500 shrink-0">Webhook URL:</span>
      <code className="text-xs text-indigo-300 truncate flex-1">{url}</code>
      <button
        onClick={() => {
          navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="text-xs text-slate-400 hover:text-white transition-colors shrink-0"
      >
        {copied ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

/* ── Main Page Component ────────────────────────────────── */

export default function IntegrationsPage() {
  // Payment gateway state
  const [configs, setConfigs] = useState<Record<string, PaymentConfig>>({});
  const [forms, setForms] = useState<
    Record<string, { credentials: Record<string, string>; sandbox: boolean }>
  >({});

  // Delivery platform state
  const [deliveryConfigs, setDeliveryConfigs] = useState<Record<string, DeliveryConfig>>({});
  const [deliveryForms, setDeliveryForms] = useState<
    Record<string, { credentials: Record<string, string>; extras: Record<string, string>; sandbox: boolean }>
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const showAlert = useCallback((type: Alert["type"], message: string, gateway: string) => {
    const alert: Alert = { type, message, gateway };
    setAlerts((prev) => [...prev, alert]);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a !== alert));
    }, 5000);
  }, []);

  /* ── Fetch existing configs ─────────────────────────── */

  const fetchConfigs = useCallback(async () => {
    try {
      // Fetch payment configs
      const paymentRes = await fetch("/api/payment-config");
      if (paymentRes.ok) {
        const data: PaymentConfig[] = await paymentRes.json();
        const configMap: Record<string, PaymentConfig> = {};
        const formMap: Record<string, { credentials: Record<string, string>; sandbox: boolean }> = {};

        for (const gw of gateways) {
          const existing = data.find((c) => c.gateway === gw.key);
          if (existing) {
            configMap[gw.key] = existing;
            formMap[gw.key] = {
              credentials: { ...existing.credentials },
              sandbox: existing.sandbox,
            };
          } else {
            configMap[gw.key] = {
              id: "",
              gateway: gw.key,
              credentials: {},
              sandbox: true,
              status: "unconfigured",
              lastTested: null,
            };
            const creds: Record<string, string> = {};
            for (const f of gw.fields) creds[f.key] = "";
            formMap[gw.key] = { credentials: creds, sandbox: true };
          }
        }

        setConfigs(configMap);
        setForms(formMap);
      }

      // Fetch delivery configs
      const deliveryRes = await fetch("/api/delivery-config");
      if (deliveryRes.ok) {
        const data: DeliveryConfig[] = await deliveryRes.json();
        const configMap: Record<string, DeliveryConfig> = {};
        const formMap: Record<string, { credentials: Record<string, string>; extras: Record<string, string>; sandbox: boolean }> = {};

        for (const dp of deliveryPlatforms) {
          const existing = data.find((c) => c.platform === dp.key);
          if (existing) {
            configMap[dp.key] = existing;
            const extras: Record<string, string> = {};
            if (dp.extraFields) {
              for (const f of dp.extraFields) {
                if (f.key === "storeId") extras[f.key] = existing.externalStoreId || "";
                else if (f.key === "phoneNumberId") extras[f.key] = existing.externalStoreId || "";
                else if (f.key === "verifyToken") extras[f.key] = (existing.metadata as Record<string, string>)?.verify_token || "";
                else extras[f.key] = "";
              }
            }
            formMap[dp.key] = {
              credentials: { ...existing.credentials },
              extras,
              sandbox: existing.isSandbox,
            };
          } else {
            configMap[dp.key] = {
              id: "",
              platform: dp.key,
              credentials: {},
              externalStoreId: "",
              webhookSecret: "",
              isActive: false,
              isSandbox: true,
              metadata: null,
              lastSyncAt: null,
            };
            const creds: Record<string, string> = {};
            for (const f of dp.fields) creds[f.key] = "";
            const extras: Record<string, string> = {};
            if (dp.extraFields) {
              for (const f of dp.extraFields) extras[f.key] = "";
            }
            formMap[dp.key] = { credentials: creds, extras, sandbox: true };
          }
        }

        setDeliveryConfigs(configMap);
        setDeliveryForms(formMap);
      }
    } catch {
      showAlert("error", "No se pudieron cargar las configuraciones", "global");
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  /* ── Payment Gateway Handlers ──────────────────────── */

  const updateField = (gateway: string, field: string, value: string) => {
    setForms((prev) => ({
      ...prev,
      [gateway]: {
        ...prev[gateway],
        credentials: { ...prev[gateway].credentials, [field]: value },
      },
    }));
  };

  const updateSandbox = (gateway: string, value: boolean) => {
    setForms((prev) => ({
      ...prev,
      [gateway]: { ...prev[gateway], sandbox: value },
    }));
  };

  const handleSave = async (gateway: string) => {
    setSaving((prev) => ({ ...prev, [gateway]: true }));
    try {
      const res = await fetch("/api/payment-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway,
          credentials: forms[gateway].credentials,
          sandbox: forms[gateway].sandbox,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      showAlert("success", "Configuracion guardada correctamente", gateway);
      await fetchConfigs();
    } catch {
      showAlert("error", "Error al guardar la configuracion", gateway);
    } finally {
      setSaving((prev) => ({ ...prev, [gateway]: false }));
    }
  };

  const handleTest = async (gateway: string) => {
    setTesting((prev) => ({ ...prev, [gateway]: true }));
    try {
      const res = await fetch("/api/payment-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway,
          credentials: forms[gateway].credentials,
          sandbox: forms[gateway].sandbox,
        }),
      });
      if (!res.ok) throw new Error("Fallo la prueba de conexion");
      const data = await res.json();
      if (data.success) {
        showAlert("success", "Conexion exitosa", gateway);
      } else {
        showAlert("error", data.message ?? "Fallo la prueba de conexion", gateway);
      }
      await fetchConfigs();
    } catch {
      showAlert("error", "Error al probar la conexion", gateway);
    } finally {
      setTesting((prev) => ({ ...prev, [gateway]: false }));
    }
  };

  const handleDelete = async (gateway: string) => {
    if (!confirm("Estas seguro de eliminar esta configuracion?")) return;
    setDeleting((prev) => ({ ...prev, [gateway]: true }));
    try {
      const res = await fetch("/api/payment-config", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateway }),
      });
      if (!res.ok) throw new Error("Error al eliminar");
      showAlert("success", "Configuracion eliminada", gateway);
      await fetchConfigs();
    } catch {
      showAlert("error", "Error al eliminar la configuracion", gateway);
    } finally {
      setDeleting((prev) => ({ ...prev, [gateway]: false }));
    }
  };

  /* ── Delivery Platform Handlers ───────────────────── */

  const updateDeliveryField = (platform: string, field: string, value: string) => {
    setDeliveryForms((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        credentials: { ...prev[platform].credentials, [field]: value },
      },
    }));
  };

  const updateDeliveryExtra = (platform: string, field: string, value: string) => {
    setDeliveryForms((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        extras: { ...prev[platform].extras, [field]: value },
      },
    }));
  };

  const updateDeliverySandbox = (platform: string, value: boolean) => {
    setDeliveryForms((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], sandbox: value },
    }));
  };

  const handleDeliverySave = async (platform: string) => {
    setSaving((prev) => ({ ...prev, [platform]: true }));
    try {
      const form = deliveryForms[platform];
      const externalStoreId = form.extras.storeId || form.extras.phoneNumberId || "";
      const metadata: Record<string, string> = {};
      if (form.extras.verifyToken) metadata.verify_token = form.extras.verifyToken;
      if (form.extras.phoneNumberId) metadata.display_phone_number_id = form.extras.phoneNumberId;

      const res = await fetch("/api/delivery-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          credentials: form.credentials,
          externalStoreId,
          isActive: true,
          isSandbox: form.sandbox,
          metadata,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      showAlert("success", "Configuracion guardada correctamente", platform);
      await fetchConfigs();
    } catch {
      showAlert("error", "Error al guardar la configuracion", platform);
    } finally {
      setSaving((prev) => ({ ...prev, [platform]: false }));
    }
  };

  const handleDeliveryDelete = async (platform: string) => {
    if (!confirm("Estas seguro de eliminar esta configuracion?")) return;
    setDeleting((prev) => ({ ...prev, [platform]: true }));
    try {
      const res = await fetch("/api/delivery-config", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (!res.ok) throw new Error("Error al eliminar");
      showAlert("success", "Configuracion eliminada", platform);
      await fetchConfigs();
    } catch {
      showAlert("error", "Error al eliminar la configuracion", platform);
    } finally {
      setDeleting((prev) => ({ ...prev, [platform]: false }));
    }
  };

  const handleSyncMenu = async (platform: "uber_eats" | "rappi") => {
    setSyncing((prev) => ({ ...prev, [platform]: true }));
    try {
      const endpoint = platform === "uber_eats"
        ? "/api/delivery/ubereats/sync-menu"
        : "/api/delivery/rappi/sync-menu";
      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al sincronizar menu");
      }
      showAlert("success", "Menu sincronizado correctamente", platform);
      await fetchConfigs();
    } catch (err) {
      showAlert("error", err instanceof Error ? err.message : "Error al sincronizar", platform);
    } finally {
      setSyncing((prev) => ({ ...prev, [platform]: false }));
    }
  };

  /* ── Render ─────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Integraciones</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configura pasarelas de pago, delivery apps y canales de comunicacion
        </p>
      </div>

      {/* Global alerts */}
      {alerts
        .filter((a) => a.gateway === "global")
        .map((alert, i) => (
          <AlertBanner
            key={i}
            alert={alert}
            onDismiss={() => setAlerts((prev) => prev.filter((a) => a !== alert))}
          />
        ))}

      {/* ─── Section: Pasarelas de Pago ──────────────── */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
          Pasarelas de Pago
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {gateways.map((gw) => {
            const config = configs[gw.key];
            const form = forms[gw.key];
            if (!config || !form) return null;

            const gwAlerts = alerts.filter((a) => a.gateway === gw.key);
            const isSaving = saving[gw.key] ?? false;
            const isTesting = testing[gw.key] ?? false;
            const isDeleting = deleting[gw.key] ?? false;
            const hasCredentials = gw.fields.every(
              (f) => form.credentials[f.key]?.trim()
            );

            return (
              <div
                key={gw.key}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
                      {gw.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-white">{gw.name}</h3>
                  </div>
                  <StatusBadge status={config.status} />
                </div>

                {gwAlerts.map((alert, i) => (
                  <AlertBanner key={i} alert={alert} onDismiss={() => setAlerts((prev) => prev.filter((a) => a !== alert))} />
                ))}

                <div className="mb-6">
                  <Toggle checked={form.sandbox} onChange={(v) => updateSandbox(gw.key, v)} label="Modo Sandbox (pruebas)" />
                </div>

                <div className="space-y-4 mb-6">
                  {gw.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-400 mb-1.5">{field.label}</label>
                      <input
                        type="password"
                        value={form.credentials[field.key] ?? ""}
                        onChange={(e) => updateField(gw.key, field.key, e.target.value)}
                        placeholder={`Ingresa tu ${field.label}`}
                        className="w-full h-10 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono"
                      />
                    </div>
                  ))}
                </div>

                {config.lastTested && (
                  <p className="text-xs text-slate-500 mb-4">
                    Ultima prueba: {new Date(config.lastTested).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button onClick={() => handleTest(gw.key)} disabled={isTesting || !hasCredentials}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-white hover:bg-white/[0.05] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    {isTesting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                    Probar Conexion
                  </button>
                  <button onClick={() => handleSave(gw.key)} disabled={isSaving || !hasCredentials}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    {isSaving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                    Guardar
                  </button>
                  {config.status !== "unconfigured" && (
                    <button onClick={() => handleDelete(gw.key)} disabled={isDeleting}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed ml-auto">
                      {isDeleting ? <span className="w-4 h-4 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" /> : null}
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Section: Delivery & Mensajeria ──────────── */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-green-500 to-emerald-500" />
          Delivery y Mensajeria
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {deliveryPlatforms.map((dp) => {
            const config = deliveryConfigs[dp.key];
            const form = deliveryForms[dp.key];
            if (!config || !form) return null;

            const dpAlerts = alerts.filter((a) => a.gateway === dp.key);
            const isSaving = saving[dp.key] ?? false;
            const isDeleting = deleting[dp.key] ?? false;
            const isSyncing = syncing[dp.key] ?? false;
            const hasCredentials = dp.fields.every(
              (f) => form.credentials[f.key]?.trim()
            );
            const status: "active" | "inactive" | "unconfigured" =
              config.id ? (config.isActive ? "active" : "inactive") : "unconfigured";

            const webhookPaths: Record<string, string> = {
              uber_eats: "/api/webhooks/ubereats",
              rappi: "/api/webhooks/rappi",
              whatsapp: "/api/webhooks/whatsapp",
            };

            return (
              <div
                key={dp.key}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${dp.color} flex items-center justify-center text-2xl shadow-lg`}>
                      {dp.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-white">{dp.name}</h3>
                  </div>
                  <StatusBadge status={status} />
                </div>

                {dpAlerts.map((alert, i) => (
                  <AlertBanner key={i} alert={alert} onDismiss={() => setAlerts((prev) => prev.filter((a) => a !== alert))} />
                ))}

                {/* Webhook URL */}
                <WebhookUrl path={webhookPaths[dp.key]} />

                {/* Sandbox Toggle */}
                <div className="mb-6">
                  <Toggle checked={form.sandbox} onChange={(v) => updateDeliverySandbox(dp.key, v)} label="Modo Sandbox (pruebas)" />
                </div>

                {/* Credential Fields */}
                <div className="space-y-4 mb-4">
                  {dp.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-400 mb-1.5">{field.label}</label>
                      <input
                        type="password"
                        value={form.credentials[field.key] ?? ""}
                        onChange={(e) => updateDeliveryField(dp.key, field.key, e.target.value)}
                        placeholder={`Ingresa tu ${field.label}`}
                        className="w-full h-10 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono"
                      />
                    </div>
                  ))}
                </div>

                {/* Extra Fields (Store ID, Phone Number ID, etc.) */}
                {dp.extraFields && (
                  <div className="space-y-4 mb-6">
                    {dp.extraFields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">{field.label}</label>
                        <input
                          type="text"
                          value={form.extras[field.key] ?? ""}
                          onChange={(e) => updateDeliveryExtra(dp.key, field.key, e.target.value)}
                          placeholder={field.placeholder || `Ingresa ${field.label}`}
                          className="w-full h-10 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Last Sync */}
                {config.lastSyncAt && (
                  <p className="text-xs text-slate-500 mb-4">
                    Ultima sincronizacion: {new Date(config.lastSyncAt).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  {/* Sync Menu (Uber Eats / Rappi) */}
                  {dp.hasSyncMenu && (
                    <button
                      onClick={() => handleSyncMenu(dp.key as "uber_eats" | "rappi")}
                      disabled={isSyncing || !hasCredentials || status === "unconfigured"}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-white hover:bg-white/[0.05] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSyncing ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                        </svg>
                      )}
                      Sincronizar Menu
                    </button>
                  )}

                  {/* Save */}
                  <button
                    onClick={() => handleDeliverySave(dp.key)}
                    disabled={isSaving || !hasCredentials}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r ${dp.color} text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {isSaving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                    Guardar
                  </button>

                  {/* Delete */}
                  {status !== "unconfigured" && (
                    <button
                      onClick={() => handleDeliveryDelete(dp.key)}
                      disabled={isDeleting}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                    >
                      {isDeleting ? <span className="w-4 h-4 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" /> : null}
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
