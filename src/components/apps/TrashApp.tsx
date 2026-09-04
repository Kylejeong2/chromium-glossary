"use client";

import Image from "next/image";
import { FileText, RotateCcw, Search, Trash2 } from "lucide-react";
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";

export type TrashAppHandle = Readonly<{ run: (command: "empty" | "restore" | "about") => void }>;
const ORIGINAL_ITEMS = [
  { name: "renderer-crash.dmp", kind: "Crash report", size: "384 KB", slug: "renderer-process" },
  { name: "stale-paint-artifact.cache", kind: "Cache file", size: "92 KB", slug: "paint-artifact" },
  { name: "detached-dom-tree.log", kind: "Log file", size: "18 KB", slug: "garbage-collection" },
] as const;

export const TrashApp = forwardRef<TrashAppHandle, { onOpenConcept: (slug: string) => void }>(function TrashApp({ onOpenConcept }, ref) {
  const [items, setItems] = useState<readonly (typeof ORIGINAL_ITEMS)[number][]>(ORIGINAL_ITEMS);
  const [selected, setSelected] = useState<string>();
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");
  const visible = useMemo(() => items.filter((item) => item.name.includes(query.trim().toLowerCase())), [items, query]);
  const selectedItem = items.find((item) => item.name === selected);
  const empty = () => { setItems([]); setSelected(undefined); setConfirming(false); setNotice("Trash emptied. You can restore the demo files."); };
  const restore = () => { setItems(ORIGINAL_ITEMS); setNotice("Demo files restored."); };

  useImperativeHandle(ref, () => ({ run(command) {
    if (command === "empty") setConfirming(true);
    if (command === "restore") restore();
    if (command === "about") setNotice("These recovered files connect the desktop easter egg to real Chromium concepts.");
  } }));

  return <div className="trash-app">
    <div className="trash-toolbar"><label><Search aria-hidden="true" /><span className="sr-only">Search Trash</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value.toLowerCase())} placeholder="Search" /></label><button type="button" disabled={!items.length} onClick={() => setConfirming(true)}><Trash2 />Empty</button></div>
    <div className="trash-browser">
      <aside aria-label="Finder sidebar"><p>Favorites</p><span>Recents</span><span>Applications</span><span>Downloads</span><p>Locations</p><strong><Image src="/assets/icons/trash.png" alt="" width={20} height={20} />Trash</strong></aside>
      <div className="trash-list"><div className="trash-list__header"><span>Name</span><span>Kind</span><span>Size</span></div>{visible.length ? <div role="listbox" aria-label="Items in Trash">{visible.map((item) => <button type="button" role="option" aria-selected={selected === item.name} key={item.name} onClick={() => setSelected(item.name)} onDoubleClick={() => onOpenConcept(item.slug)}><span><FileText />{item.name}</span><span>{item.kind}</span><span>{item.size}</span></button>)}</div> : <div className="trash-empty"><Image src="/assets/icons/trash.png" alt="" width={64} height={64} /><h2>{items.length ? "No matches" : "Trash is empty"}</h2><p>{items.length ? "Try a different file name." : "Items remain here until you empty Trash."}</p>{!items.length && <button type="button" onClick={restore}><RotateCcw />Restore demo files</button>}</div>}</div>
    </div>
    <footer><span>{items.length} {items.length === 1 ? "item" : "items"}, 18.4 GB available</span><div><button type="button" disabled={!selectedItem} onClick={() => { if (selectedItem) { setItems((current) => current.filter((item) => item.name !== selectedItem.name)); setSelected(undefined); setNotice(`${selectedItem.name} put back.`); } }}>Put Back</button><button type="button" disabled={!selectedItem} onClick={() => selectedItem && onOpenConcept(selectedItem.slug)}>Open concept</button></div></footer>
    {notice && <div className="trash-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice("")}>Dismiss</button></div>}
    {confirming && <div className="trash-confirm" role="dialog" aria-modal="true" aria-labelledby="empty-trash-title"><Image src="/assets/icons/trash.png" alt="" width={54} height={54} /><div><h2 id="empty-trash-title">Empty Trash?</h2><p>The demo files will be removed from this window. You can restore them afterward.</p><div><button type="button" onClick={() => setConfirming(false)}>Cancel</button><button type="button" autoFocus onClick={empty}>Empty Trash</button></div></div></div>}
  </div>;
});
