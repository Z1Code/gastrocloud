"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Características", href: "#features" },
  { label: "Precios", href: "#pricing" },
  { label: "Contacto", href: "#contact" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-slate-950/70 backdrop-blur-2xl border-b border-white/10 shadow-2xl shadow-orange-500/5"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
              G
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-400 via-rose-400 to-amber-400 bg-clip-text text-transparent">
              GastroCloud
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-slate-400 hover:text-white transition-colors duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-gradient-to-r from-orange-500 to-rose-500 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-slate-300 hover:text-white transition-colors px-4 py-2"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-white px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-300 hover:scale-105"
            >
              Comenzar Gratis
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-slate-400 hover:text-white transition-colors p-2"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-950/95 backdrop-blur-2xl border-b border-white/10 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-slate-300 hover:text-white transition-colors py-2"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <Link
                  href="/login"
                  className="block text-center text-slate-300 hover:text-white transition-colors py-2"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/register"
                  className="block text-center text-white font-medium py-3 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500"
                >
                  Comenzar Gratis
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Footer() {
  const footerSections = [
    {
      title: "Producto",
      links: [
        { label: "KDS Inteligente", href: "#" },
        { label: "Menú Digital QR", href: "#" },
        { label: "POS Integrado", href: "#" },
        { label: "Integraciones", href: "#" },
        { label: "Facturación SII", href: "#" },
      ],
    },
    {
      title: "Empresa",
      links: [
        { label: "Nosotros", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Carreras", href: "#" },
        { label: "Partners", href: "#" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacidad", href: "#" },
        { label: "Términos", href: "#" },
        { label: "SLA", href: "#" },
        { label: "Cookies", href: "#" },
      ],
    },
    {
      title: "Contacto",
      links: [
        { label: "Soporte", href: "#" },
        { label: "Ventas", href: "#" },
        { label: "WhatsApp", href: "#" },
        { label: "hola@gastrocloud.cl", href: "mailto:hola@gastrocloud.cl" },
      ],
    },
  ];

  return (
    <footer className="border-t border-white/10 bg-slate-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                G
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
                GastroCloud
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">
              La plataforma todo-en-uno para la gestión inteligente de
              restaurantes.
            </p>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-white mb-4">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-600">
            &copy; 2024 GastroCloud. Hecho con amor en Chile.
          </p>
          <div className="flex items-center gap-4">
            {["Twitter", "LinkedIn", "Instagram", "GitHub"].map((social) => (
              <a
                key={social}
                href="#"
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#030014] text-white overflow-x-hidden">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
