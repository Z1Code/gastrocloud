"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import {
  Monitor,
  QrCode,
  Smartphone,
  Timer,
  ShoppingBag,
  Globe,
  Receipt,
  Brain,
  Check,
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  TrendingUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────
   Shared animation helpers
   ─────────────────────────────────────────── */

function useFadeInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: threshold });
  return { ref, isInView };
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.12, duration: 0.5 },
  }),
};

/* ───────────────────────────────────────────
   Animated mesh gradient background
   ─────────────────────────────────────────── */

function MeshGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Large animated blobs */}
      <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[128px] animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[128px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
      <div className="absolute bottom-0 left-1/3 w-[700px] h-[700px] rounded-full bg-purple-600/15 blur-[128px] animate-[pulse_12s_ease-in-out_infinite_4s]" />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Subtle noise */}
      <div className="absolute inset-0 bg-[#030014]/40" />
    </div>
  );
}

/* ───────────────────────────────────────────
   Floating particles
   ─────────────────────────────────────────── */

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-indigo-400/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeInOut" as const,
          }}
        />
      ))}
    </div>
  );
}

/* ───────────────────────────────────────────
   Section: HERO
   ─────────────────────────────────────────── */

function HeroSection() {
  const { ref, isInView } = useFadeInView(0.1);

  const integrations = ["Uber Eats", "Rappi", "WhatsApp", "MercadoPago"];

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center pt-20 pb-20 overflow-hidden"
    >
      <MeshGradient />
      <Particles />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-slate-300">
            Plataforma #1 para restaurantes en Chile
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={1}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-8"
        >
          <span className="block text-white">La revolución</span>
          <span className="block bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            digital para tu
          </span>
          <span className="block text-white">restaurante</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={2}
          className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 leading-relaxed mb-10"
        >
          Gestiona pedidos, cocina, inventario y delivery desde una sola
          plataforma inteligente. Tus clientes piden desde el celular, tu chef
          ve el countdown en pantalla.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={3}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <a
            href="/register"
            className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 text-white font-semibold text-lg shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-105"
          >
            Comenzar Gratis
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/20 text-white font-medium text-lg hover:bg-white/5 transition-all duration-300"
          >
            Ver Demo
          </a>
        </motion.div>

        {/* Mockup */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={4}
          className="relative max-w-4xl mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl shadow-indigo-500/10"
            style={{ perspective: "1200px" }}
          >
            <div
              className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-10"
              style={{ transform: "rotateX(2deg)" }}
            >
              {/* Fake KDS Dashboard */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-xs text-slate-500">
                  GastroCloud KDS — Panel de Cocina
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { order: "#0012", time: "3:45", status: "En preparación", color: "amber" },
                  { order: "#0013", time: "2:10", status: "En preparación", color: "amber" },
                  { order: "#0014", time: "8:20", status: "Nuevo", color: "indigo" },
                  { order: "#0015", time: "0:30", status: "Listo", color: "emerald" },
                ].map((item) => (
                  <div
                    key={item.order}
                    className={cn(
                      "rounded-xl p-4 border",
                      item.color === "amber" && "bg-amber-500/10 border-amber-500/30",
                      item.color === "indigo" && "bg-indigo-500/10 border-indigo-500/30",
                      item.color === "emerald" && "bg-emerald-500/10 border-emerald-500/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">
                        {item.order}
                      </span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          item.color === "amber" && "bg-amber-500/20 text-amber-400",
                          item.color === "indigo" && "bg-indigo-500/20 text-indigo-400",
                          item.color === "emerald" && "bg-emerald-500/20 text-emerald-400"
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-white mb-1">
                      {item.time}
                    </div>
                    <div className="text-xs text-slate-500">Hamburguesa Clásica x2</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating integration badges */}
          {integrations.map((name, i) => (
            <motion.div
              key={name}
              className="absolute hidden md:flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-xs text-slate-300"
              style={{
                top: `${15 + i * 20}%`,
                [i % 2 === 0 ? "left" : "right"]: "-60px",
              }}
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut" as const,
              }}
            >
              <Zap size={12} className="text-indigo-400" />
              {name}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   Section: HOW IT WORKS
   ─────────────────────────────────────────── */

function HowItWorksSection() {
  const { ref, isInView } = useFadeInView();

  const steps = [
    {
      icon: QrCode,
      title: "El cliente escanea el QR",
      desc: "Un código QR en cada mesa conecta al comensal directo con tu carta digital.",
      color: "indigo",
    },
    {
      icon: Smartphone,
      title: "Pide y paga desde su celular",
      desc: "Selecciona platos, personaliza y paga sin esperar al mesero.",
      color: "violet",
    },
    {
      icon: Timer,
      title: "El chef ve el countdown en pantalla",
      desc: "El pedido llega al KDS con timer en tiempo real. Cero papeles, cero errores.",
      color: "purple",
    },
  ];

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="relative py-32 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={0}
          className="text-center mb-20"
        >
          <span className="text-sm font-medium text-indigo-400 tracking-widest uppercase mb-4 block">
            Cómo funciona
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Tan simple como{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              1, 2, 3
            </span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="relative grid md:grid-cols-3 gap-8 md:gap-12">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-px">
            <motion.div
              className="w-full h-full bg-gradient-to-r from-indigo-500/40 via-violet-500/40 to-purple-500/40"
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 1, delay: 0.5, ease: "easeInOut" as const }}
              style={{ transformOrigin: "left" }}
            />
          </div>

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                variants={fadeUp}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                custom={i + 1}
                className="relative text-center group"
              >
                {/* Step number */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[120px] font-black text-white/[0.02] select-none pointer-events-none">
                  {i + 1}
                </div>

                {/* Icon */}
                <motion.div
                  className={cn(
                    "relative z-10 w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center",
                    "bg-gradient-to-br shadow-2xl",
                    step.color === "indigo" && "from-indigo-500/20 to-indigo-600/10 shadow-indigo-500/20",
                    step.color === "violet" && "from-violet-500/20 to-violet-600/10 shadow-violet-500/20",
                    step.color === "purple" && "from-purple-500/20 to-purple-600/10 shadow-purple-500/20",
                    "border border-white/10"
                  )}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Icon
                    size={32}
                    className={cn(
                      step.color === "indigo" && "text-indigo-400",
                      step.color === "violet" && "text-violet-400",
                      step.color === "purple" && "text-purple-400"
                    )}
                  />
                </motion.div>

                <h3 className="text-xl font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-400 leading-relaxed max-w-xs mx-auto">
                  {step.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   Section: FEATURES GRID
   ─────────────────────────────────────────── */

function FeaturesSection() {
  const { ref, isInView } = useFadeInView();

  const features = [
    {
      icon: Monitor,
      title: "KDS Inteligente",
      desc: "Kitchen Display con countdown en tiempo real. Prioriza pedidos y reduce tiempos de preparación.",
    },
    {
      icon: QrCode,
      title: "Menú Digital QR",
      desc: "Tu carta siempre actualizada, accesible con un scan. Fotos, precios y modificadores al instante.",
    },
    {
      icon: Globe,
      title: "Multi-Plataforma",
      desc: "Uber Eats, Rappi y WhatsApp en un solo lugar. Un dashboard unificado para todos tus canales.",
    },
    {
      icon: ShoppingBag,
      title: "POS Integrado",
      desc: "Punto de venta para pedidos presenciales. Rápido, intuitivo y conectado con tu cocina.",
    },
    {
      icon: Receipt,
      title: "Facturación SII",
      desc: "Boletas y facturas electrónicas automáticas. Cumple con la normativa chilena sin esfuerzo.",
    },
    {
      icon: Brain,
      title: "IA Predictiva",
      desc: "Predice demanda y optimiza tu inventario. Machine learning al servicio de tu restaurante.",
    },
  ];

  return (
    <section
      id="features"
      ref={ref}
      className="relative py-32"
    >
      {/* Subtle bg glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-indigo-600/5 blur-[128px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={0}
          className="text-center mb-20"
        >
          <span className="text-sm font-medium text-indigo-400 tracking-widest uppercase mb-4 block">
            Características
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Todo lo que necesitas,{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              nada que no
            </span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Cada herramienta diseñada para que te concentres en lo que importa:
            la experiencia de tus clientes.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                variants={scaleIn}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                custom={i}
                className="group relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] p-8 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/5"
              >
                {/* Glow on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/0 to-violet-500/0 group-hover:from-indigo-500/5 group-hover:to-violet-500/5 transition-all duration-500" />

                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-white/10 flex items-center justify-center mb-5 group-hover:shadow-lg group-hover:shadow-indigo-500/20 transition-shadow duration-500">
                    <Icon size={24} className="text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   Section: STATS (animated counters)
   ─────────────────────────────────────────── */

function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
  duration = 2,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const end = target;
    const stepTime = (duration * 1000) / end;
    const increment = Math.max(1, Math.floor(end / 60));

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime * increment);

    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString("es-CL")}
      {suffix}
    </span>
  );
}

function StatsSection() {
  const { ref, isInView } = useFadeInView();

  const stats = [
    { value: 500, suffix: "+", label: "Restaurantes", icon: ShoppingBag },
    { value: 1, suffix: "M+", label: "Pedidos procesados", icon: TrendingUp },
    { value: 99, suffix: ".9%", label: "Uptime", icon: Shield },
    { prefix: "< ", value: 2, suffix: "s", label: "Tiempo de carga", icon: Clock },
  ];

  return (
    <section ref={ref} className="relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl border border-white/[0.06] p-12 md:p-16"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  initial="hidden"
                  animate={isInView ? "visible" : "hidden"}
                  custom={i}
                  className="text-center"
                >
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Icon size={22} className="text-indigo-400" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                    <AnimatedCounter
                      target={stat.value}
                      suffix={stat.suffix}
                      prefix={stat.prefix}
                    />
                  </div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   Section: PRICING
   ─────────────────────────────────────────── */

function PricingSection() {
  const { ref, isInView } = useFadeInView();

  const plans = [
    {
      name: "Starter",
      price: "$29.990",
      period: "/mes",
      desc: "Ideal para dark kitchens y locales pequeños",
      featured: false,
      features: [
        "1 sucursal",
        "KDS en tiempo real",
        "POS básico",
        "Menú digital QR",
        "100 pedidos/mes",
        "Soporte por email",
      ],
    },
    {
      name: "Pro",
      price: "$79.990",
      period: "/mes",
      desc: "Para restaurantes que quieren crecer",
      featured: true,
      features: [
        "3 sucursales",
        "Todo de Starter",
        "Integraciones (Uber, Rappi)",
        "WhatsApp IA",
        "Inventario inteligente",
        "Pedidos ilimitados",
        "Facturación SII",
        "Soporte prioritario",
      ],
    },
    {
      name: "Enterprise",
      price: "Contactar",
      period: "",
      desc: "Para cadenas y operaciones avanzadas",
      featured: false,
      features: [
        "Sucursales ilimitadas",
        "Todo de Pro",
        "API propia",
        "IA predictiva",
        "SLA 99.9%",
        "Account manager",
        "Onboarding dedicado",
        "Facturación personalizada",
      ],
    },
  ];

  return (
    <section id="pricing" ref={ref} className="relative py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={0}
          className="text-center mb-20"
        >
          <span className="text-sm font-medium text-indigo-400 tracking-widest uppercase mb-4 block">
            Precios
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Planes que se adaptan a{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              tu negocio
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            Sin compromisos. Escala cuando quieras. Cancela cuando quieras.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={scaleIn}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={i}
              className={cn(
                "relative rounded-2xl p-8 transition-all duration-500",
                plan.featured
                  ? "bg-gradient-to-b from-indigo-500/10 to-violet-500/5 border-2 border-indigo-500/30 shadow-2xl shadow-indigo-500/10 md:-mt-4 md:mb-0 md:py-12"
                  : "bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12]"
              )}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-semibold text-white">
                  Más Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-slate-400">{plan.desc}</p>
              </div>

              <div className="mb-8">
                <span className="text-4xl font-bold text-white">
                  {plan.price}
                </span>
                <span className="text-slate-400">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <Check
                      size={16}
                      className={cn(
                        "mt-0.5 flex-shrink-0",
                        plan.featured ? "text-indigo-400" : "text-emerald-400"
                      )}
                    />
                    <span className="text-sm text-slate-300">{feat}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/register"
                className={cn(
                  "block w-full text-center py-3 rounded-full font-medium transition-all duration-300",
                  plan.featured
                    ? "bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105"
                    : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                )}
              >
                {plan.price === "Contactar" ? "Hablar con Ventas" : "Comenzar Ahora"}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   Section: TESTIMONIALS
   ─────────────────────────────────────────── */

function TestimonialsSection() {
  const { ref, isInView } = useFadeInView();
  const [current, setCurrent] = useState(0);

  const testimonials = [
    {
      quote:
        "GastroCloud transformó nuestra operación. Pasamos de perder pedidos en papelitos a tener todo en tiempo real. El KDS es un game changer.",
      name: "María González",
      role: "Dueña",
      restaurant: "La Picá de la María",
      initials: "MG",
    },
    {
      quote:
        "La integración con Uber Eats y Rappi nos ahorró 3 horas diarias. Ya no tenemos tablets de cada plataforma en el mesón. Todo está unificado.",
      name: "Carlos Muñoz",
      role: "Gerente de Operaciones",
      restaurant: "Sushi Roll Express",
      initials: "CM",
    },
    {
      quote:
        "La facturación electrónica automática nos salvó de multas del SII. Y el menú QR redujo nuestros tiempos de atención en un 40%.",
      name: "Andrea Pizarro",
      role: "Administradora",
      restaurant: "Cadena BurgerFi",
      initials: "AP",
    },
  ];

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % testimonials.length),
    [testimonials.length]
  );
  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length),
    [testimonials.length]
  );

  useEffect(() => {
    const interval = setInterval(next, 6000);
    return () => clearInterval(interval);
  }, [next]);

  return (
    <section ref={ref} className="relative py-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={0}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-indigo-400 tracking-widest uppercase mb-4 block">
            Testimonios
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Lo que dicen{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              nuestros clientes
            </span>
          </h2>
        </motion.div>

        {/* Carousel */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="relative"
        >
          <div className="overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] p-8 md:p-12">
            <div className="flex items-center gap-1 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className="text-amber-400 fill-amber-400"
                />
              ))}
            </div>

            <div className="min-h-[120px]">
              <motion.blockquote
                key={current}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="text-lg md:text-xl text-slate-200 leading-relaxed mb-8"
              >
                &ldquo;{testimonials[current].quote}&rdquo;
              </motion.blockquote>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                  {testimonials[current].initials}
                </div>
                <div>
                  <div className="font-semibold text-white">
                    {testimonials[current].name}
                  </div>
                  <div className="text-sm text-slate-400">
                    {testimonials[current].role} — {testimonials[current].restaurant}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={prev}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={next}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  i === current
                    ? "w-8 bg-indigo-500"
                    : "bg-white/20 hover:bg-white/40"
                )}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   Section: CTA
   ─────────────────────────────────────────── */

function CTASection() {
  const { ref, isInView } = useFadeInView();

  return (
    <section id="contact" ref={ref} className="relative py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* BG gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

          <div className="relative z-10 text-center py-20 md:py-28 px-8">
            <motion.h2
              variants={fadeUp}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={0}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
            >
              ¿Listo para transformar
              <br />
              tu restaurante?
            </motion.h2>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={1}
              className="text-lg text-white/70 mb-10 max-w-xl mx-auto"
            >
              Únete a más de 500 restaurantes que ya optimizaron su operación
              con GastroCloud.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={2}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <a
                href="/register"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-indigo-600 font-semibold text-lg shadow-2xl shadow-black/20 hover:shadow-black/30 hover:scale-105 transition-all duration-300"
              >
                Comenzar Gratis
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </a>
            </motion.div>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={3}
              className="text-sm text-white/50 mt-6"
            >
              Sin tarjeta de crédito. Setup en 5 minutos.
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   PAGE
   ─────────────────────────────────────────── */

export default function MarketingPage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <StatsSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}
