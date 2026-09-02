import { Recycle } from "lucide-react";
export function TrashApp({ onExplain }: { onExplain: () => void }) { return <div className="trash-app"><span><Recycle /></span><h2>Recently Collected</h2><p>This bin is empty, but Chromium has a much more interesting garbage collector.</p><button type="button" onClick={onExplain}>Explore garbage collection</button></div>; }
