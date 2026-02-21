"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const floatingShapes = [
  { size: 300, x: "10%", y: "20%", delay: 0, duration: 20, color: "rgba(99, 102, 241, 0.08)" },
  { size: 200, x: "80%", y: "10%", delay: 2, duration: 25, color: "rgba(139, 92, 246, 0.06)" },
  { size: 250, x: "70%", y: "70%", delay: 4, duration: 22, color: "rgba(99, 102, 241, 0.07)" },
  { size: 180, x: "20%", y: "80%", delay: 1, duration: 18, color: "rgba(139, 92, 246, 0.05)" },
  { size: 150, x: "50%", y: "50%", delay: 3, duration: 24, color: "rgba(168, 85, 247, 0.06)" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function GoogleSignInButton() {
  const [pressed, setPressed] = useState(false);

  const handleClick = () => {
    if (pressed) return;
    setPressed(true);
    // Small delay so the user sees the swipe animation before redirect
    setTimeout(() => {
      signIn("google", { callbackUrl: "/redirect" });
    }, 600);
  };

  return (
    <motion.div
      className="relative"
      variants={itemVariants}
    >
      {/* Soft ambient glow — no competing animate loops */}
      <div
        className="absolute -inset-1 rounded-[20px] blur-xl transition-opacity duration-700"
        style={{
          background: "linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)",
          opacity: pressed ? 0.5 : 0.15,
        }}
      />

      {/* Gradient border ring */}
      <div
        className="absolute -inset-px rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)",
          opacity: 0.5,
        }}
      />

      {/* The actual button */}
      <motion.button
        onClick={handleClick}
        disabled={pressed}
        className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed"
        whileHover={pressed ? {} : { scale: 1.015 }}
        whileTap={pressed ? {} : { scale: 0.975 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {/* Left-to-right swipe fill on press */}
        <AnimatePresence>
          {pressed && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background: "linear-gradient(90deg, #4285F4, #34A853, #FBBC05, #EA4335)",
              }}
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            />
          )}
        </AnimatePresence>

        {/* Idle shimmer — pure CSS, no framer animate loop */}
        {!pressed && (
          <div
            className="pointer-events-none absolute inset-0 z-0 rounded-2xl"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 3s ease-in-out infinite",
            }}
          />
        )}

        {/* Content */}
        <motion.span
          className="relative z-10 flex items-center gap-3"
          animate={pressed ? { color: "#ffffff" } : { color: "#1f2937" }}
          transition={{ duration: 0.3, delay: pressed ? 0.2 : 0 }}
        >
          {pressed ? (
            <motion.svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </motion.svg>
          ) : (
            <GoogleIcon />
          )}
          <span>{pressed ? "Redirigiendo..." : "Continuar con Google"}</span>
        </motion.span>
      </motion.button>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <>
      {/* Animated mesh gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(139, 92, 246, 0.1), transparent), radial-gradient(ellipse 60% 40% at 20% 80%, rgba(168, 85, 247, 0.08), transparent)",
          }}
        />

        {/* Floating shapes */}
        {floatingShapes.map((shape, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: shape.size,
              height: shape.size,
              left: shape.x,
              top: shape.y,
              background: shape.color,
              filter: "blur(60px)",
            }}
            animate={{
              x: [0, 30, -20, 10, 0],
              y: [0, -25, 15, -10, 0],
              scale: [1, 1.1, 0.95, 1.05, 1],
            }}
            transition={{
              duration: shape.duration,
              delay: shape.delay,
              repeat: Infinity,
              ease: "easeInOut" as const,
            }}
          />
        ))}

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* Main content */}
      <motion.div
        className="relative z-10 mx-4 flex w-full max-w-md flex-col items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo / Wordmark */}
        <motion.div className="mb-10 flex flex-col items-center" variants={itemVariants}>
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 11h.01" />
              <path d="M11 15h.01" />
              <path d="M16 16h.01" />
              <path d="m2 16 20 6-6-20A20 20 0 0 0 2 16" />
              <path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4" />
            </svg>
          </div>
          <h1 className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            GastroCloud
          </h1>
        </motion.div>

        {/* Glass card */}
        <motion.div
          className="w-full rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-10"
          variants={itemVariants}
        >
          {/* Tagline */}
          <motion.p
            className="mb-8 text-center text-base leading-relaxed text-white/50"
            variants={itemVariants}
          >
            La plataforma inteligente
            <br />
            para tu restaurante
          </motion.p>

          {/* Divider */}
          <motion.div className="mb-8" variants={itemVariants}>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
              <span className="text-xs uppercase tracking-widest text-white/20">
                Iniciar sesion
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
            </div>
          </motion.div>

          {/* Google Sign In Button */}
          <GoogleSignInButton />

          {/* Terms */}
          <motion.p
            className="mt-6 text-center text-xs leading-relaxed text-white/25"
            variants={itemVariants}
          >
            Al continuar, aceptas nuestros{" "}
            <span className="text-white/40 underline decoration-white/20 underline-offset-2">
              Terminos de Servicio
            </span>{" "}
            y{" "}
            <span className="text-white/40 underline decoration-white/20 underline-offset-2">
              Politica de Privacidad
            </span>
          </motion.p>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="mt-8 text-xs tracking-wide text-white/20"
          variants={itemVariants}
        >
          Powered by GastroCloud
        </motion.p>
      </motion.div>
    </>
  );
}
