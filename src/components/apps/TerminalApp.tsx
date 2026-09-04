"use client";

import { FormEvent, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { CAREERS_URL, runTerminalCommand } from "@/domain/terminal";

type Output = { id: number; prompt?: string; lines: readonly string[]; link?: { label: string; href: string } };
const WELCOME: Output[] = [{ id: 0, lines: ["Last login: Today on console", "Type help to see available commands."] }];

export type TerminalAppHandle = Readonly<{ run: (command: "clear" | "new-session" | "about") => void }>;

export const TerminalApp = forwardRef<TerminalAppHandle, { onExit: () => void; onOpenGlossary: () => void }>(function TerminalApp({ onExit, onOpenGlossary }, ref) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const nextId = useRef(1);
  const [output, setOutput] = useState<Output[]>(WELCOME);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const reset = () => { nextId.current = 1; setOutput(WELCOME); setInput(""); setHistoryIndex(history.length); inputRef.current?.focus(); };

  useImperativeHandle(ref, () => ({ run(command) {
    if (command === "clear") setOutput([]);
    if (command === "new-session") reset();
    if (command === "about") setOutput((items) => [...items, { id: nextId.current++, lines: runTerminalCommand("about").lines }]);
  } }));
  useEffect(() => { outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight }); }, [output]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const command = input.trim();
    const result = runTerminalCommand(command);
    if (command) setHistory((items) => [...items, command]);
    setHistoryIndex(history.length + (command ? 1 : 0));
    if (result.action === "clear") setOutput([]);
    else setOutput((items) => [...items, { id: nextId.current++, prompt: input, lines: result.lines, link: result.link }]);
    setInput("");
    if (result.action === "exit") onExit();
    if (result.action === "open-glossary") onOpenGlossary();
  }

  return <div className="terminal-app" onPointerDown={() => inputRef.current?.focus()}>
    <div className="terminal-tabs"><div role="tablist" aria-label="Terminal tabs"><button type="button" role="tab" aria-selected="true"><span>chromium - zsh</span><X aria-hidden="true" /></button></div><button type="button" aria-label="New Terminal session" onClick={reset}><Plus /></button></div>
    <div ref={outputRef} className="terminal-app__output" role="log" aria-live="polite">{output.map((item) => <div key={item.id}>{item.prompt !== undefined && <p><b>chromium@mac</b> ~ % {item.prompt}</p>}{item.lines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}{item.link && <p><a href={item.link.href} target="_blank" rel="noreferrer">{item.link.label}</a></p>}</div>)}</div>
    <form onSubmit={submit}><label htmlFor="terminal-command"><b>chromium@mac</b> ~ %</label><input ref={inputRef} id="terminal-command" autoFocus autoComplete="off" spellCheck={false} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      const next = event.key === "ArrowUp" ? Math.max(0, historyIndex - 1) : Math.min(history.length, historyIndex + 1);
      setHistoryIndex(next);
      setInput(history[next] ?? "");
    }} /></form>
    <a className="terminal-careers" href={CAREERS_URL} target="_blank" rel="noreferrer">Browserbase careers ↗</a>
  </div>;
});
