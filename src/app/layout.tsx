import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const planar = localFont({ src: "../../public/fonts/GT-Planar-Medium.otf", variable: "--font-planar", display: "swap" });
const mono = localFont({ src: "../../public/fonts/GT-Standard-Mono-Regular.otf", variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "The Chromium glossary | Browserbase",
  description: "Fifty foundational Chromium concepts, mapped from URL to pixels.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className={`${planar.variable} ${mono.variable}`}><body>{children}</body></html>;
}
