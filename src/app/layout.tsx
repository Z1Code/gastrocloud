import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AuthProvider from "@/components/providers/session-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GastroCloud | Restaurant Management Platform",
  description:
    "All-in-one cloud platform for restaurant management. Digital menus, real-time orders, kitchen display system, and smart analytics.",
  openGraph: {
    title: "GastroCloud | Restaurant Management Platform",
    description:
      "All-in-one cloud platform for restaurant management. Digital menus, real-time orders, kitchen display system, and smart analytics.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased min-h-screen bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-orange-950/50 dark:to-slate-950`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
