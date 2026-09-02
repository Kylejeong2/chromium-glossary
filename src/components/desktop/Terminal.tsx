"use client";

import { FormEvent, useRef, useState } from "react";
import Image from "next/image";
import { CAREERS_URL, runTerminalCommand } from "@/domain/terminal";

type Output = { id: number; prompt?: string; lines: readonly string[]; link?: { label: string; href: string } };

export function Terminal({ onExit }: { onExit: () => void }) {
  const [input, setInput] = useState("");
  const nextId = useRef(1);
  const [output, setOutput] = useState<Output[]>([
    { id: 0, lines: ["Browserbase terminal 1.0", "Type help to see available commands."] },
  ]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = runTerminalCommand(input);
    if (result.action === "clear") setOutput([]);
    else setOutput((items) => [...items, { id: nextId.current++, prompt: input, lines: result.lines, link: result.link }]);
    setInput("");
    if (result.action === "exit") window.setTimeout(onExit, 260);
  }

  return (
    <div className="terminal">
      <div className="terminal__brand">
        <Image src="/brand/browserbase-logo-color.png" width={153} height={30} alt="Browserbase" />
        <a href={CAREERS_URL} target="_blank" rel="noreferrer">We are hiring</a>
      </div>
      <div className="terminal__output" role="log" aria-live="polite">
        {output.map((item) => (
          <div key={item.id} className="terminal__block">
            {item.prompt !== undefined && <p><span>guest@browserbase</span> $ {item.prompt}</p>}
            {item.lines.map((line) => <p key={line}>{line}</p>)}
            {item.link && <p><a href={item.link.href} target="_blank" rel="noreferrer">{item.link.label}</a></p>}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="terminal__form">
        <label htmlFor="terminal-command">guest@browserbase $</label>
        <input id="terminal-command" autoFocus autoComplete="off" value={input} onChange={(event) => setInput(event.target.value)} />
      </form>
    </div>
  );
}
