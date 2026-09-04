export const CAREERS_URL = "https://www.browserbase.com/careers";

type TerminalResult = Readonly<{
  lines: readonly string[];
  action?: "clear" | "exit" | "open-glossary";
  link?: Readonly<{ label: string; href: string }>;
}>;

const HELP = "Commands: help, about, ls, pwd, whoami, date, careers, open glossary, open docs, clear, exit";

export function runTerminalCommand(input: string): TerminalResult {
  const command = input.trim().toLowerCase();
  if (!command || command === "help") return { lines: [HELP] };
  if (command === "about") return { lines: ["Browserbase is infrastructure for reliable browser automation.", "This glossary is an independent learning resource built by Browserbase."] };
  if (command === "ls") return { lines: ["Chromium Glossary.app\tREADME.md\tRecovered Files"] };
  if (command === "pwd") return { lines: ["/Users/chromium"] };
  if (command === "whoami") return { lines: ["chromium"] };
  if (command === "date") return { lines: [new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "long" }).format(new Date())] };
  if (command === "careers") return { lines: ["Build the future of the web with us."], link: { label: "Open Browserbase careers", href: CAREERS_URL } };
  if (command === "open glossary") return { lines: ["Opening Chromium Glossary.app"], action: "open-glossary" };
  if (command === "open docs") return { lines: ["Opening Chromium documentation."], link: { label: "Open Chromium documentation", href: "https://chromium.googlesource.com/chromium/src/+/HEAD/docs/README.md" } };
  if (command === "clear") return { lines: [], action: "clear" };
  if (command === "exit") return { lines: ["Session closed."], action: "exit" };
  return { lines: [`Command not found: ${command}`, HELP] };
}
