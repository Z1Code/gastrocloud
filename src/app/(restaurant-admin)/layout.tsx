"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Grid3X3,
  Package,
  Users,
  BarChart3,
  Receipt,
  Plug,
  Settings,
  Search,
  Bell,
  ChevronLeft,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Eye,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "@/hooks/useAuth";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const sidebarItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pedidos", href: "/orders", icon: ShoppingBag },
  { label: "Menu", href: "/menu", icon: UtensilsCrossed },
  { label: "Mesas", href: "/tables", icon: Grid3X3 },
  { label: "Inventario", href: "/inventory", icon: Package },
  { label: "Personal", href: "/staff", icon: Users },
  { label: "Reportes", href: "/reports", icon: BarChart3 },
  { label: "Estadisticas", href: "/stats", icon: Eye },
  { label: "Facturacion", href: "/billing", icon: Receipt },
  { label: "Integraciones", href: "/integrations", icon: Plug },
  { label: "Configuracion", href: "/settings", icon: Settings },
];

const roleBadgeColors: Record<string, string> = {
  super_admin: "bg-red-500/20 text-red-300",
  owner: "bg-amber-500/20 text-amber-300",
  admin: "bg-indigo-500/20 text-indigo-300",
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  owner: "Owner",
  admin: "Admin",
};

export default function RestaurantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarWidth = collapsed ? 72 : 280;

  const userName = user?.name ?? "Usuario";
  const userEmail = user?.email ?? "";
  const userRole = user?.role ?? "admin";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#030014] text-white">
      {/* Background grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(mobileOpen || true) && (
          <motion.aside
            initial={false}
            animate={{
              width: mobileOpen ? 280 : sidebarWidth,
              x: mobileOpen ? 0 : undefined,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "fixed top-0 left-0 h-full z-50 flex flex-col",
              "bg-white/[0.03] backdrop-blur-2xl border-r border-white/[0.06]",
              "lg:translate-x-0",
              !mobileOpen && "max-lg:hidden"
            )}
          >
            {/* Logo */}
            <div className="flex items-center h-16 px-4 border-b border-white/[0.06] shrink-0">
              <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/25 shrink-0">
                  G
                </div>
                <AnimatePresence>
                  {(!collapsed || mobileOpen) && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-lg font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap overflow-hidden"
                    >
                      GastroCloud
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Mobile close */}
              {mobileOpen && (
                <button
                  onClick={() => setMobileOpen(false)}
                  className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors lg:hidden"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const showLabel = !collapsed || mobileOpen;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                      isActive
                        ? "bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-purple-500/20 text-white shadow-lg shadow-indigo-500/5"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-purple-500/20 border border-indigo-500/20"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <Icon
                      size={20}
                      className={cn(
                        "shrink-0 relative z-10",
                        isActive && "text-indigo-400"
                      )}
                    />
                    {showLabel && (
                      <span className="relative z-10 whitespace-nowrap">
                        {item.label}
                      </span>
                    )}

                    {/* Tooltip for collapsed */}
                    {collapsed && !mobileOpen && (
                      <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl z-[60]">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Collapse button (desktop only) */}
            <div className="p-3 border-t border-white/[0.06] shrink-0 hidden lg:block">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center justify-center w-full py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <motion.div
                  animate={{ rotate: collapsed ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronLeft size={18} />
                </motion.div>
                {!collapsed && (
                  <span className="ml-2 text-xs">Colapsar</span>
                )}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <motion.div
        animate={{ marginLeft: sidebarWidth }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="min-h-screen flex flex-col max-lg:!ml-0"
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center px-4 lg:px-6 gap-4 bg-[#030014]/80 backdrop-blur-xl border-b border-white/[0.06]">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors lg:hidden"
          >
            <Menu size={20} />
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Buscar pedidos, clientes, productos..."
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications */}
            <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#030014]" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/[0.05] transition-colors"
              >
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={userName}
                    className="w-8 h-8 rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                    {userInitials}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-white leading-tight">
                    {userName}
                  </p>
                  <p className="text-xs text-slate-500 leading-tight">
                    {roleLabels[userRole] ?? userRole}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-500 hidden sm:block" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 py-2 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50"
                    >
                      <div className="px-3 py-2 border-b border-white/[0.06]">
                        <p className="text-sm font-medium text-white">{userName}</p>
                        <p className="text-xs text-slate-400">{userEmail}</p>
                        {userRole && (
                          <span className={cn(
                            "inline-block mt-1 text-xs px-2 py-0.5 rounded-md font-medium",
                            roleBadgeColors[userRole] ?? "bg-slate-500/20 text-slate-300"
                          )}>
                            {roleLabels[userRole] ?? userRole}
                          </span>
                        )}
                      </div>
                      <div className="py-1">
                        <Link
                          href="/settings"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings size={16} />
                          Configuracion
                        </Link>
                        <button
                          onClick={() => signOut({ callbackUrl: "/login" })}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/[0.05] transition-colors w-full"
                        >
                          <LogOut size={16} />
                          Cerrar sesion
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 relative">{children}</main>
      </motion.div>
    </div>
  );
}
