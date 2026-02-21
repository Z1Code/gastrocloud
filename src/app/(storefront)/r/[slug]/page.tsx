"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={cn("w-4 h-4", filled ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200")}
      viewBox="0 0 24 24"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  );
}

const hours = [
  { day: "Lunes - Viernes", time: "12:00 - 23:00" },
  { day: "Sabado", time: "12:00 - 00:00" },
  { day: "Domingo", time: "12:00 - 22:00" },
];

const galleryGradients = [
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-fuchsia-400 to-pink-500",
];

export default function RestaurantLandingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const base = `/r/${slug}`;
  const name = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const quickLinks = [
    { label: "Ver Menu", href: `${base}/menu`, gradient: "from-indigo-500 to-blue-600", emoji: "📖" },
    { label: "Hacer Pedido", href: `${base}/menu`, gradient: "from-emerald-500 to-teal-600", emoji: "🛒" },
    { label: "Reservar Mesa", href: "#", gradient: "from-amber-500 to-orange-600", emoji: "🪑" },
  ];

  return (
    <div className="pb-8">
      {/* Hero */}
      <div className="relative h-56 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute bottom-6 left-5 right-5 text-white"
        >
          <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
          <p className="text-sm text-white/80 mt-1">
            Cocina contemporanea chilena con los mejores ingredientes locales
          </p>
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <StarIcon key={i} filled={i <= 5} />
            ))}
            <span className="text-xs text-white/70 ml-1">4.8 (328 resenas)</span>
          </div>
        </motion.div>
      </div>

      {/* Quick Links */}
      <div className="px-4 -mt-5 relative z-10">
        <div className="grid grid-cols-3 gap-3">
          {quickLinks.map((link, i) => (
            <motion.div
              key={link.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
            >
              <Link href={link.href}>
                <div
                  className={cn(
                    "bg-gradient-to-br text-white rounded-2xl p-3 text-center shadow-lg shadow-black/5",
                    link.gradient
                  )}
                >
                  <span className="text-2xl">{link.emoji}</span>
                  <p className="text-xs font-semibold mt-1">{link.label}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Hours */}
      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mx-4 mt-6"
      >
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Horario</h2>
            <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Abierto ahora
            </span>
          </div>
          <div className="space-y-1.5">
            {hours.map((h) => (
              <div key={h.day} className="flex justify-between text-sm">
                <span className="text-gray-500">{h.day}</span>
                <span className="font-medium text-gray-900">{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Contact */}
      <motion.div
        custom={4}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mx-4 mt-4"
      >
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Contacto</h2>
          <div className="flex items-start gap-3">
            <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-600">
              Av. Providencia 1234, Providencia, Santiago
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PhoneIcon className="w-5 h-5 text-gray-400 shrink-0" />
            <p className="text-sm text-gray-600">+56 2 2345 6789</p>
          </div>
        </div>
      </motion.div>

      {/* Gallery */}
      <motion.div
        custom={5}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-6 px-4"
      >
        <h2 className="font-semibold text-gray-900 mb-3">Galeria</h2>
        <div className="grid grid-cols-3 gap-2">
          {galleryGradients.map((g, i) => (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl",
                g,
                i === 0 && "col-span-2 row-span-2 text-4xl"
              )}
            >
              {["🍽️", "🥩", "🍷", "🥗", "🍰", "🍹"][i]}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
