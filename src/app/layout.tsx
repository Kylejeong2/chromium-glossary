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
  return <html lang="en"><body><Suspense><GlossaryDesktopRoute document={chromiumGlossary} /></Suspense>{children}</body></html>;
}
