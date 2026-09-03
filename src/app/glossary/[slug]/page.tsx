import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { chromiumGlossary } from "@/data/chromium-glossary";
import { createCatalog } from "@/domain/glossary";

const catalog = createCatalog(chromiumGlossary);

export function generateStaticParams() {
  return chromiumGlossary.stages.flatMap((stage) => stage.entries.map((entry) => ({ slug: entry.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = catalog.entry(slug);
  return entry ? { title: entry.term, description: entry.lede.text } : {};
}

export default async function EntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!catalog.entry(slug)) notFound();
  return null;
}
