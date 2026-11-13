import type { Metadata, Viewport } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import { Toaster } from "sonner";

import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

import "./globals.css";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ERP",
    template: "%s · ERP",
  },
  description: "Sistema de administración de recursos empresariales.",
  applicationName: "ERP",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es-MX"
      suppressHydrationWarning
      className={`${firaSans.variable} ${firaCode.variable} h-full`}
    >
      <body className="min-h-full bg-background text-foreground antialiased">
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster richColors position="bottom-right" closeButton />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
