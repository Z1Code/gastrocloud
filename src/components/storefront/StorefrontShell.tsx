'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/stores/cartStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Inline SVG icon components
// ---------------------------------------------------------------------------

function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// StorefrontShell
// ---------------------------------------------------------------------------

interface StorefrontShellProps {
  slug: string;
  restaurantName: string;
  children: React.ReactNode;
}

export function StorefrontShell({ slug, restaurantName, children }: StorefrontShellProps) {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.getItemCount());

  const base = `/r/${slug}`;

  const navItems = [
    { href: base, label: 'Inicio', icon: HomeIcon },
    { href: `${base}/menu`, label: 'Menu', icon: MenuIcon },
    { href: `${base}/order`, label: 'Pedido', icon: ClipboardIcon },
    { href: `${base}/track`, label: 'Mi Cuenta', icon: UserIcon },
  ];

  const isActive = (href: string) => {
    if (href === base) return pathname === base;
    return pathname.startsWith(href);
  };

  return (
    <div
      className="min-h-screen font-[var(--sf-font)] antialiased bg-[var(--sf-bg)] text-[var(--sf-text)]"
    >
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-[var(--sf-bg)]/80 backdrop-blur-xl border-b border-[var(--sf-text)]/10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={base} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--sf-primary)] flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {restaurantName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-semibold text-[var(--sf-text)]">
              {restaurantName}
            </span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto pb-24">{children}</main>

      {/* Floating cart button */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-24 right-4 z-50 md:bottom-8 md:right-8"
          >
            <Link href={`${base}/order`}>
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative w-14 h-14 rounded-full bg-[var(--sf-primary)] shadow-lg flex items-center justify-center text-white"
              >
                <ShoppingBagIcon className="w-6 h-6" />
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-[11px] font-bold flex items-center justify-center"
                >
                  {itemCount}
                </motion.span>
              </motion.div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--sf-bg)]/80 backdrop-blur-xl border-t border-[var(--sf-text)]/10 md:hidden">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-[60px]',
                  active ? 'text-[var(--sf-primary)]' : 'text-[var(--sf-text-muted)]'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
