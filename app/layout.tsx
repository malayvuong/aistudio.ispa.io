
import React from 'react';
import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { getLang } from "@/lib/i18n/getLang";

export const metadata: Metadata = {
  title: "Producer Packaging Assistant",
  description: "Automated packaging of AI songs for YouTube",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;900&family=Playfair+Display:ital,wght@0,400;1,400&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased">
        <LanguageProvider initialLang={lang}>
          <AppShell>{children}</AppShell>
        </LanguageProvider>
      </body>
    </html>
  );
}
