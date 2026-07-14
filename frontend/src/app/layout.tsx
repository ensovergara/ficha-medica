import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  title: "Ficha Médica Pet",
  description: "Sistema de fichas médicas para veterinarias",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased dark:bg-slate-900 dark:text-slate-50">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
