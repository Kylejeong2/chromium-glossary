import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Chromium glossary | Browserbase",
  description: "Fifty foundational Chromium concepts, mapped from URL to pixels.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body>{children}</body></html>;
}
