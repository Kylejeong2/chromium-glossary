"use client";

import { FormEvent, useRef, useState } from "react";
import { CAREERS_URL, runTerminalCommand } from "@/domain/terminal";
type Output = { id: number; prompt?: string; lines: readonly string[]; link?: { label: string; href: string } };
export function TerminalApp({ onExit }: { onExit: () => void }) {
  const [input, setInput] = useState("");
  const nextId = useRef(1);
  const [output, setOutput] = useState<Output[]>([{ id: 0, lines: ["Lattice shell", "Type help to see available commands."] }]);
  function submit(event: FormEvent) { event.preventDefault(); const result = runTerminalCommand(input); if (result.action === "clear") setOutput([]); else setOutput((items) => [...items, { id: nextId.current++, prompt: input, lines: result.lines, link: result.link }]); setInput(""); if (result.action === "exit") onExit(); }
  return <div className="terminal-app"><div className="terminal-app__meta"><span>guest@lattice</span><a href={CAREERS_URL} target="_blank" rel="noreferrer">Careers ↗</a></div><div className="terminal-app__output" role="log" aria-live="polite">{output.map((item) => <div key={item.id}>{item.prompt !== undefined && <p><b>guest@browserbase</b> % {item.prompt}</p>}{item.lines.map((line) => <p key={line}>{line}</p>)}{item.link && <p><a href={item.link.href} target="_blank" rel="noreferrer">{item.link.label}</a></p>}</div>)}</div><form onSubmit={submit}><label htmlFor="terminal-command">guest@browserbase %</label><input id="terminal-command" autoFocus autoComplete="off" value={input} onChange={(event) => setInput(event.target.value)} /></form></div>;
}
