"use client";
import { useState } from "react";

const SHORTCUTS = [
  { keys: ":", label: "macro → Tab expands (85 built-ins)", action: "info" },
  { keys: "Ctrl+K", label: "palette", action: "palette" },
  { keys: "?", label: "cheat-sheet", action: "cheat" },
  { keys: "Alt+↓/↑", label: "next/prev patient", action: "nav" },
  { keys: "Ctrl+P", label: "print", action: "print" },
  { keys: "Ctrl+Enter", label: "finalize", action: "finalize" },
  { keys: "Ctrl+S", label: "save", action: "save" },
];

export default function ShortcutRibbon() {
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && localStorage.getItem("care-ribbon-hidden") === "1");

  if (hidden) {
    return (
      <button
        onClick={() => { localStorage.setItem("care-ribbon-hidden", "0"); setHidden(false); }}
        className="self-start text-[9px] text-faint underline hover:text-foreground"
      >
        show shortcuts
      </button>
    );
  }

  const fire = (action: string) => {
    if (action === "print") window.dispatchEvent(new CustomEvent("care-studio:cmd-print"));
    if (action === "finalize") window.dispatchEvent(new CustomEvent("care-studio:cmd-finalize"));
    if (action === "save") window.dispatchEvent(new CustomEvent("care-studio:flush-save"));
    if (action === "nav") window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", altKey: true, bubbles: true }));
    if (action === "palette") window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    if (action === "cheat") window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }));
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[9px]">
      {SHORTCUTS.map(s => (
        <button
          key={s.keys}
          onClick={() => fire(s.action)}
          title={s.label}
          className="shrink-0 whitespace-nowrap rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <b className="text-primary">{s.keys}</b> {s.label}
        </button>
      ))}
      <button
        onClick={() => { localStorage.setItem("care-ribbon-hidden", "1"); setHidden(true); }}
        className="shrink-0 text-[9px] text-faint hover:text-foreground"
      >
        hide
      </button>
    </div>
  );
}
