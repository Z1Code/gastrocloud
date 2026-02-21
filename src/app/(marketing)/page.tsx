"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Monitor,
  QrCode,
  Timer,
  Globe,
  Receipt,
  Brain,
  Check,
  ArrowRight,
  Zap,
  Store,
  CreditCard,
  ChefHat,
  Utensils,
  Laptop
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

/* ───────────────────────────────────────────
   Animated backgrounds
   ─────────────────────────────────────────── */

function MeshGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-orange-600/10 blur-[100px] animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-rose-600/10 blur-[100px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
      <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-amber-600/10 blur-[120px] animate-[pulse_12s_ease-in-out_infinite_4s]" />
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute inset-0 bg-[#0a0a0a]/60" />
    </div>
  );
}

/* ───────────────────────────────────────────
   Section: HERO
   ─────────────────────────────────────────── */

function HeroSection() {
  const { ref, isInView } = useFadeInView(0.1);

  const floatingItems = [
    { icon: Globe, label: "Sitio Web", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", delay: 0 },
    { icon: Store, label: "Uber Eats & Rappi", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", delay: 0.2 },
    { icon: CreditCard, label: "MercadoPago / Transbank", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", delay: 0.4 },
    { icon: ChefHat, label: "Panel de Cocina (KDS)", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", delay: 0.6 },
    { icon: Receipt, label: "Boletas SII", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", delay: 0.8 },
  ];

  return (
    <section ref={ref} className="relative min-h-[100svh] flex items-center justify-center pt-24 pb-20 overflow-hidden bg-[#0a0a0a]">
      <MeshGradient />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-sm font-medium text-slate-200">
            El sistema operativo para tu restaurante
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={1}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.1] mb-8"
        >
          <span className="block text-white">Vende más.</span>
          <span className="block bg-gradient-to-r from-orange-400 via-rose-400 to-amber-400 bg-clip-text text-transparent">
            Complícate menos.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={2}
          className="max-w-3xl mx-auto text-lg md:text-xl text-slate-400 leading-relaxed mb-12"
        >
          GastroCloud es el Wrapper definitivo: Crea tu propia página web, centraliza los pedidos de <strong>Uber Eats y Rappi</strong>, procesa pagos con <strong>MercadoPago o Transbank</strong>, gestiona la cocina en tu KDS y emite boletas automáticas. Todo en un solo lugar.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={3}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 w-full sm:w-auto"
        >
          <a
            href="/register"
            className="group relative inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold text-lg shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 transition-all duration-300 hover:scale-105"
          >
            Crear mi restaurante
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#process"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-full border border-white/20 text-white font-medium text-lg hover:bg-white/5 transition-all duration-300"
          >
            Ver cómo funciona
          </a>
        </motion.div>

        {/* Dynamic Abstract Diagram */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={4}
          className="relative w-full max-w-5xl aspect-[16/9] md:aspect-[21/9] flex items-center justify-center"
        >
          {/* Central Hub */}
          <div className="relative z-20 w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 shadow-2xl flex flex-col items-center justify-center shadow-orange-500/20 backdrop-blur-xl">
            <Utensils className="w-12 h-12 text-white mb-2" />
            <span className="text-sm font-bold text-white tracking-wide">GastroCloud</span>
          </div>

          {/* Connecting lines & Orbits */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80%] h-[80%] rounded-full border border-white/5 animate-[spin_40s_linear_infinite]" />
            <div className="absolute w-[60%] h-[60%] rounded-full border border-white/10 animate-[spin_30s_linear_infinite_reverse]" />
          </div>

          {/* Orbiting Elements */}
          {floatingItems.map((item, i) => {
            const angle = (i * 360) / floatingItems.length;
            const radius = "140%"; // relative to center
            return (
              <motion.div
                key={item.label}
                className="absolute z-10 flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + item.delay, duration: 0.8, type: "spring" }}
                style={{
                  transform: `rotate(${angle}deg) translateY(-${radius}) rotate(-${angle}deg)`,
                }}
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md border shadow-xl", item.bg, item.border)}>
                  <item.icon className={cn("w-6 h-6", item.color)} />
                </div>
                <div className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs font-medium text-slate-300 whitespace-nowrap">
                  {item.label}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   Section: PROCESS BREAKDOWN (Sticky Scroll)
   ─────────────────────────────────────────── */

function ProcessBreakdown() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const [activeStep, setActiveStep] = useState(0);

  // Sync scroll progress to active step based on progress thresholds
  useEffect(() => {
    const unsubscribe = scrollYProgress.onChange((v) => {
      if (v < 0.25) setActiveStep(0);
      else if (v < 0.75) setActiveStep(1);
      else setActiveStep(2);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Height transform for the connecting line
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const steps = [
    {
      id: "website",
      title: "Crea tu marca digital al instante",
      desc: "No pagues agencias. Elige un diseño increíble, sube las fotos de tus platos y lanza tu propia página web con carrito de compras integrado en menos de 10 minutos.",
      icon: Laptop,
    },
    {
      id: "integrations",
      title: "Conecta Delivery y Pagos con 1 Clic",
      desc: "Integra tus cuentas de Uber Eats y Rappi para recibir todos los pedidos en un solo lugar. Configura MercadoPago o Transbank para cobrar de forma segura en tu web.",
      icon: Zap,
    },
    {
      id: "operations",
      title: "Cocina y Factura en Piloto Automático",
      desc: "Los pedidos llegan directo a tu pantalla de cocina (KDS). Cuando el cliente paga, la boleta electrónica del SII se genera y se envía automáticamente.",
      icon: Brain,
    },
  ];

  return (
    <section id="process" className="relative bg-[#050505] py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center md:text-left">
          <span className="text-sm font-bold text-orange-500 tracking-widest uppercase mb-4 block">
            El Flujo Perfecto
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            De tu idea a vender en <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
              tiempo récord
            </span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start" ref={containerRef}>
          {/* Left Column: Scrolling Text Content */}
          <div className="relative pb-[40vh]">
            {/* Background Vertical Line */}
            <div className="absolute left-[23px] top-6 bottom-[40vh] w-1 bg-white/5 hidden md:block rounded-full" />
            
            {/* Animated Fill Vertical Line */}
            <motion.div 
              className="absolute left-[23px] top-6 bottom-[40vh] w-1 bg-gradient-to-b from-orange-500 via-rose-500 to-amber-500 hidden md:block rounded-full origin-top"
              style={{ scaleY: scrollYProgress }}
            />

            {steps.map((step, index) => {
              const isActive = activeStep >= index;
              return (
                <div 
                  key={step.id} 
                  className={cn(
                    "relative md:pl-20 mb-32 last:mb-0 transition-all duration-700",
                    isActive ? "opacity-100 translate-x-0" : "opacity-30 -translate-x-4"
                  )}
                >
                  {/* Node */}
                  <div className={cn(
                    "hidden md:flex absolute left-0 top-1 w-12 h-12 rounded-full border-4 border-[#050505] items-center justify-center transition-all duration-500",
                    isActive 
                      ? "bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)] scale-110" 
                      : "bg-slate-800 scale-100"
                  )}>
                    <step.icon className={cn("w-5 h-5 transition-colors duration-500", isActive ? "text-white" : "text-slate-400")} />
                  </div>

                  {/* Mobile icon */}
                  <div className="md:hidden flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                       <step.icon className="w-5 h-5 text-orange-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{step.title}</h3>
                  </div>

                  <h3 className="hidden md:block text-3xl font-bold text-white mb-4">{step.title}</h3>
                  <p className="text-lg text-slate-400 leading-relaxed">{step.desc}</p>
                  
                  {/* Spacer for scroll effect */}
                  <div className="h-32 hidden lg:block" />
                </div>
              );
            })}
          </div>

          {/* Right Column: Sticky Visuals */}
          <div className="hidden lg:block sticky top-32 h-[600px] w-full rounded-3xl overflow-hidden border border-white/10 bg-slate-900/50 shadow-2xl">
            <AnimatePresence mode="wait">
              {activeStep === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex flex-col bg-[#0a0a0a]"
                >
                  {/* Mock Website Builder */}
                  <div className="h-12 border-b border-white/10 flex items-center px-4 bg-white/5 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    <div className="ml-4 px-3 py-1 rounded bg-white/10 text-xs text-white/50 font-mono">
                      gastrocloud.app/tu-restaurante
                    </div>
                  </div>
                  <div className="flex-1 relative overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1600" 
                      alt="Restaurant Food" 
                      className="w-full h-48 object-cover opacity-50"
                    />
                    <div className="absolute top-32 left-8 right-8">
                      <div className="w-24 h-24 rounded-2xl bg-white shadow-xl mb-4 border-4 border-[#0a0a0a] flex items-center justify-center">
                        <Store className="w-10 h-10 text-orange-500" />
                      </div>
                      <h4 className="text-3xl font-bold text-white mb-2">Burgers & Co.</h4>
                      <div className="flex gap-4 mb-8">
                        <div className="h-8 w-24 bg-white/10 rounded-full animate-pulse" />
                        <div className="h-8 w-24 bg-white/10 rounded-full animate-pulse" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4">
                            <div className="w-20 h-20 rounded-lg bg-white/10" />
                            <div className="flex-1 space-y-2 py-1">
                              <div className="h-4 w-3/4 bg-white/20 rounded" />
                              <div className="h-3 w-full bg-white/10 rounded" />
                              <div className="h-4 w-1/4 bg-orange-500/50 rounded mt-2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 bg-[#0a0a0a] flex flex-col"
                >
                  <div className="h-48 relative overflow-hidden shrink-0 border-b border-white/10">
                    <img 
                      src="https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=1600" 
                      alt="Delivery and Payments" 
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                  </div>
                  <div className="flex-1 p-8 flex flex-col justify-start -mt-8 relative z-10">
                    <h4 className="text-2xl font-bold text-white mb-6 text-center drop-shadow-md">Centro de Integraciones</h4>
                    
                    <div className="space-y-6">
                      {/* Delivery Card */}
                      <div className="p-6 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 shadow-xl">
                        <div className="text-sm font-semibold text-slate-400 mb-4">Canales de Delivery</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <div className="flex items-center gap-3">
                              <Store className="w-8 h-8 text-emerald-400" />
                              <span className="font-bold text-white">Uber Eats</span>
                            </div>
                            <div className="w-12 h-6 rounded-full bg-emerald-500 relative shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                              <div className="absolute right-1 top-1 bottom-1 w-4 rounded-full bg-white" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                            <div className="flex items-center gap-3">
                              <Store className="w-8 h-8 text-orange-400" />
                              <span className="font-bold text-white">Rappi</span>
                            </div>
                            <div className="w-12 h-6 rounded-full bg-orange-500 relative shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                              <div className="absolute right-1 top-1 bottom-1 w-4 rounded-full bg-white" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Card */}
                      <div className="p-6 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 shadow-xl">
                        <div className="text-sm font-semibold text-slate-400 mb-4">Pasarelas de Pago</div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <CreditCard className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="font-bold text-white">MercadoPago</div>
                                <div className="text-xs text-emerald-400 font-medium">Conectado y Activo</div>
                              </div>
                            </div>
                            <Check className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                                <CreditCard className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="font-bold text-white">Transbank Webpay</div>
                                <div className="text-xs text-slate-500 font-medium">Configurar credenciales</div>
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-slate-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex flex-col bg-[#0a0a0a]"
                >
                  <div className="h-48 relative overflow-hidden shrink-0 border-b border-white/10">
                    <img 
                      src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&q=80&w=1600" 
                      alt="Kitchen operations" 
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                  </div>
                  <div className="flex-1 p-8 flex flex-col justify-start -mt-8 relative z-10">
                    <div className="flex items-center justify-between mb-8 bg-black/50 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl">
                      <h4 className="text-xl font-bold text-white flex items-center gap-2">
                        <Monitor className="w-6 h-6 text-orange-500" /> KDS Cocina
                      </h4>
                      <div className="px-4 py-1.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold animate-pulse border border-red-500/30">
                        3 Pedidos Pendientes
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 flex-1 max-h-[400px]">
                      {/* Order Card */}
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col shadow-lg shadow-amber-500/5">
                        <div className="flex justify-between items-center mb-5 border-b border-amber-500/20 pb-3">
                          <span className="text-2xl font-black text-white">#0142</span>
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/20 px-2 py-1 rounded">UberEats</span>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="text-white font-medium flex justify-between">
                            <span>2x Burger Doble</span> <span className="text-slate-400 text-sm">Sin cebolla</span>
                          </div>
                          <div className="text-white font-medium">1x Papas Fritas Grandes</div>
                          <div className="text-white font-medium">2x Bebida Cola 500cc</div>
                        </div>
                        <div className="mt-5 pt-4 border-t border-amber-500/20 flex justify-between items-center">
                          <div className="flex items-center gap-2 text-red-400 font-mono text-xl font-bold">
                            <Timer className="w-6 h-6" /> 12:45
                          </div>
                          <button className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 transition-colors text-white font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20">Listar</button>
                        </div>
                      </div>
                      {/* Receipt Animating Out */}
                      <div className="relative flex items-center justify-center">
                        <motion.div 
                          className="absolute w-56 bg-white rounded-xl shadow-2xl p-5 flex flex-col z-10"
                          initial={{ y: 50, opacity: 0 }}
                          animate={{ y: [0, -15, 0], opacity: 1 }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <div className="text-center border-b-2 border-dashed border-slate-300 pb-3 mb-3">
                            <div className="font-black text-slate-800 text-xl tracking-tight">BOLETA ELECTRÓNICA</div>
                            <div className="text-xs text-slate-500 font-bold mt-1">SII - CHILE</div>
                          </div>
                          <div className="text-sm text-slate-600 space-y-2 mb-5 flex-1 font-medium">
                            <div className="flex justify-between"><span>Burger Doble x2</span><span>$15.980</span></div>
                            <div className="flex justify-between"><span>Papas Fritas</span><span>$3.500</span></div>
                            <div className="flex justify-between"><span>Bebidas x2</span><span>$4.000</span></div>
                          </div>
                          <div className="border-t-2 border-slate-800 pt-3 flex justify-between font-black text-slate-800 text-lg">
                            <span>TOTAL</span><span>$23.480</span>
                          </div>
                          <div className="mt-5 flex justify-center">
                            <QrCode className="w-16 h-16 text-slate-800" />
                          </div>
                        </motion.div>
                        {/* Printer slot effect */}
                        <div className="absolute bottom-0 w-48 h-4 bg-slate-800 rounded-full blur-[2px] opacity-50" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   Section: RICH IMAGE SHOWCASE
   ─────────────────────────────────────────── */

function ShowcaseSection() {
  const { ref, isInView } = useFadeInView();

  return (
    <section ref={ref} className="py-32 bg-[#050505] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-20">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="text-4xl md:text-5xl font-bold text-white mb-6"
          >
            Diseñado para la <span className="text-orange-500">realidad de la cocina</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="text-slate-400 text-lg max-w-2xl mx-auto"
          >
            Sabemos que un restaurante no es una oficina. Hemos diseñado interfaces de alto contraste, legibles de lejos y a prueba de errores rápidos.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="group relative rounded-3xl overflow-hidden aspect-square md:aspect-[4/3]"
          >
            <img 
              src="https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&q=80&w=1200" 
              alt="Punto de venta y gestión" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
              <h3 className="text-2xl font-bold text-white mb-2">POS Integrado</h3>
              <p className="text-slate-300">Toma pedidos en el local físico, cobra con tarjeta y todo se sincroniza con tu web y delivery instantáneamente.</p>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="group relative rounded-3xl overflow-hidden aspect-square md:aspect-[4/3]"
          >
            <img 
              src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=1200" 
              alt="Cocina en acción" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
              <h3 className="text-2xl font-bold text-white mb-2">Cero Errores en Cocina</h3>
              <p className="text-slate-300">Reemplaza las comandas de papel. Cada pedido entra al KDS con tiempos claros y especificaciones exactas del cliente.</p>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="group md:col-span-2 relative rounded-3xl overflow-hidden h-80 md:h-96"
          >
            <img 
              src="https://images.unsplash.com/photo-1554902843-260acd0993f8?auto=format&fit=crop&q=80&w=2000" 
              alt="Facturación y automatización" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-12">
              <h3 className="text-3xl font-bold text-white mb-3">Factura en Piloto Automático</h3>
              <p className="text-slate-300 max-w-2xl text-lg">La boleta electrónica del SII se genera y se envía automáticamente con cada venta de cualquiera de tus canales, evitando descuadres de caja y liberándote de tareas manuales.</p>
            </div>
          </motion.div>
        </div>
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
      name: "Básico",
      price: "$100.000",
      period: "/mes",
      desc: "Perfecto para restaurantes pequeños que buscan digitalizarse.",
      featured: false,
      features: [
        "Creador de Sitio Web y Menú Digital",
        "Integración Uber Eats & Rappi",
        "Pasarela de Pagos (MercadoPago / Transbank)",
        "KDS Pantalla de Cocina",
        "Generación de Boletas SII",
        "Soporte por email (L-V)",
      ],
      missing: ["Sin funciones de Inteligencia Artificial"],
    },
    {
      name: "Profesional",
      price: "$350.000",
      period: "/mes",
      desc: "Para restaurantes en crecimiento que buscan optimización.",
      featured: true,
      features: [
        "Todo lo del plan Básico",
        "Gestión Multi-sucursal (hasta 3)",
        "Reportes avanzados de ventas",
        "IA: Predicción básica de demanda",
        "IA: Sugerencias de menú",
        "Soporte prioritario por chat (L-V)",
      ],
      missing: [],
    },
    {
      name: "Avanzado",
      price: "$1.000.000",
      period: "/mes",
      desc: "Para cadenas y operaciones de alto volumen que requieren automatización total.",
      featured: false,
      features: [
        "Todo lo del plan Profesional",
        "Sucursales ilimitadas",
        "IA Predictiva Avanzada (inventario)",
        "WhatsApp Bot con IA para pedidos",
        "Soporte técnico 24/7 dedicado",
        "Account Manager asignado",
      ],
      missing: [],
    },
  ];

  return (
    <section id="pricing" ref={ref} className="relative py-32 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={0}
          className="text-center mb-20"
        >
          <span className="text-sm font-medium text-orange-400 tracking-widest uppercase mb-4 block">
            Precios Transparentes
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Planes que escalan contigo
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Elige el plan que mejor se adapte a las necesidades operativas de tu restaurante.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={i + 1}
              className={cn(
                "relative rounded-3xl p-8 flex flex-col h-full",
                plan.featured
                  ? "bg-gradient-to-b from-orange-500/10 to-rose-500/5 border border-orange-500/30 shadow-2xl shadow-orange-500/10 md:-mt-4"
                  : "bg-white/5 border border-white/10"
              )}
            >
              {plan.featured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold text-xs shadow-lg">
                  Más Recomendado
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-400 h-10">{plan.desc}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black text-white">{plan.price}</span>
                <span className="text-slate-400 font-medium">CLP {plan.period}</span>
              </div>

              <div className="flex-1 space-y-6">
                <ul className="space-y-4">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3 text-sm">
                      <div className={cn(
                        "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                        plan.featured ? "bg-orange-500/20" : "bg-white/10"
                      )}>
                        <Check size={12} className={plan.featured ? "text-orange-400" : "text-white"} />
                      </div>
                      <span className="text-slate-300 leading-tight">{feat}</span>
                    </li>
                  ))}
                </ul>

                {plan.missing.length > 0 && (
                  <ul className="space-y-4 pt-4 border-t border-white/10">
                    {plan.missing.map((feat) => (
                      <li key={feat} className="flex items-start gap-3 text-sm opacity-50">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                          <span className="text-white/40 text-xs font-bold">✕</span>
                        </div>
                        <span className="text-slate-400 leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <a
                href="/register"
                className={cn(
                  "block w-full text-center py-4 rounded-xl font-bold text-sm transition-all mt-8",
                  plan.featured
                    ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg hover:shadow-orange-500/25"
                    : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                Comenzar Ahora
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   PAGE
   ─────────────────────────────────────────── */

export default function MarketingPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen text-slate-50 selection:bg-orange-500/30">
      <HeroSection />
      <ProcessBreakdown />
      <ShowcaseSection />
      <PricingSection />
    </div>
  );
}