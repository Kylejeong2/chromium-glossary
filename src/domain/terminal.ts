export const CAREERS_URL = "https://www.browserbase.com/careers";

export type TerminalResult = Readonly<{
  lines: readonly string[];
  action?: "clear" | "exit";
  link?: Readonly<{ label: string; href: string }>;
}>;

const HELP = "Commands: help, about, careers, clear, exit";

export function runTerminalCommand(input: string): TerminalResult {
  const command = input.trim().toLowerCase();
  if (!command || command === "help") return { lines: [HELP] };
  if (command === "about") return { lines: ["Browserbase is infrastructure for reliable browser automation.", "This glossary is an independent learning resource built by Browserbase."] };
  if (command === "careers") return { lines: ["Build the future of the web with us."], link: { label: "Open Browserbase careers", href: CAREERS_URL } };
  if (command === "clear") return { lines: [], action: "clear" };
  if (command === "exit") return { lines: ["Session closed."], action: "exit" };
  return { lines: [`Command not found: ${command}`, HELP] };
}
