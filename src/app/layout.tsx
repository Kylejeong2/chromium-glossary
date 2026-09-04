import type { Metadata } from "next";
import { Suspense } from "react";
import { GlossaryDesktopRoute } from "@/components/GlossaryDesktopRoute";
import { chromiumGlossary } from "@/data/chromium-glossary";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Chromium glossary | Browserbase",
  description: "Fifty foundational Chromium concepts, mapped from URL to pixels.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><head><link rel="preload" href="/assets/fonts/InterVariable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" /><link rel="preload" href="/assets/fonts/GT-Standard-Mono-Regular.otf" as="font" type="font/otf" crossOrigin="anonymous" /></head><body><Suspense><GlossaryDesktopRoute document={chromiumGlossary} /></Suspense>{children}</body></html>;
}
