"use client";

import type React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { BossModeListener } from "@/components/boss-mode-listener";
import "@/lib/i18n";

// These import Geist font
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _geist = Geist({ subsets: ["latin"] });
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <BossModeListener />
        </ThemeProvider>
      </body>
    </html>
  );
}
