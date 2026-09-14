"use client";
/**
 * SmartTextarea — a Textarea with snippet macros, usg-style discoverability:
 *
 *   • type “:” + letters and a live autocomplete opens with matching snippets
 *   • ↑ / ↓ to pick, Tab / Enter / click to expand, Esc to dismiss
 *   • exact “:trigger + Tab” still works when the list is closed
 *   • the command palette (type “:…” in Ctrl+K) can insert into the last
 *     focused SmartTextarea via the SNIPPET_INSERT_EVENT bridge
 *
 * `$1` in a snippet text is a placeholder — it is removed and the caret
 * lands in its place for overtyping.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  readSnippets, matchPartialSnippets, expandSnippet, expandSelectedSnippet,
  SNIPPET_INSERT_EVENT, snippetInsertAck, type Snippet,
} from "@/lib/workspace-enhance";
import { cn } from "@/lib/utils";

/** The SmartTextarea that should receive palette inserts — the last focused one. */
let lastFocused: HTMLTextAreaElement | null = null;

const TRIGGER_AT_CARET = /(?:^|[\s(;;.!?—-]):([a-z0-9]*)$/i;

type AcState = { items: Snippet[]; sel: number; partial: string } | null;

export function SmartTextarea({
  value,
  onChange,
  onExpand,
  className,
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
  onExpand?: (expanded: boolean) => void;
} & Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange">) {
  const snippets = useMemo(() => readSnippets(), []);
  const [ac, setAc] = useState<AcState>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  /** Recompute the autocomplete after the text / caret changed. */
  const recompute = (text: string, caret: number) => {
    const m = text.slice(0, caret).match(TRIGGER_AT_CARET);
    if (!m) { setAc(null); return; }
    const partial = m[1];
    const items = matchPartialSnippets(partial, snippets);
    setAc(items.length ? { items, sel: 0, partial } : null);
  };

  /** Apply an expansion, notify the parent, then restore caret after commit. */
  const apply = (hit: { value: string; caret: number; select?: [number, number] }) => {
    setAc(null);
    onExpand?.(true);
    onChangeRef.current(hit.value);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      if (hit.select) el.setSelectionRange(hit.select[0], hit.select[1]);
      else el.setSelectionRange(hit.caret, hit.caret);
    });
  };

  // Palette insert bridge: only the last-focused SmartTextarea reacts.
  useEffect(() => {
    const onInsert = (e: Event) => {
      const el = ref.current;
      if (!el || el !== lastFocused) return;
      const text = String((e as CustomEvent).detail?.text ?? "");
      if (!text) return;
      snippetInsertAck.ok = true;
      const v = valueRef.current;
      const caret = el.selectionStart ?? v.length;
      onChangeRef.current(v.slice(0, caret) + text + v.slice(caret));
      onExpand?.(true);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caret + text.length, caret + text.length);
      });
    };
    window.addEventListener(SNIPPET_INSERT_EVENT, onInsert);
    return () => window.removeEventListener(SNIPPET_INSERT_EVENT, onInsert);
  }, [onExpand]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const caret = el.selectionStart ?? el.value.length;

    if (ac) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAc({ ...ac, sel: (ac.sel + 1) % ac.items.length });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAc({ ...ac, sel: (ac.sel - 1 + ac.items.length) % ac.items.length });
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); setAc(null); return; }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        const hit = expandSelectedSnippet(el.value, caret, ac.items[ac.sel], ac.partial);
        if (hit) apply(hit);
        return;
      }
    }

    if (e.key !== "Tab") return;
    const hit = expandSnippet(el.value, caret, snippets);
    if (!hit) return; // normal Tab behaviour (leave the textarea)
    e.preventDefault();
    apply(hit);
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        className={className}
        {...props}
        onChange={(e) => {
          onChange(e.target.value);
          recompute(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => { lastFocused = ref.current; }}
        onKeyUp={(e) => {
          // caret moved without a value change (arrows, clicks)
          if (e.key.startsWith("Arrow")) recompute(e.currentTarget.value, e.currentTarget.selectionStart ?? 0);
        }}
        onClick={(e) => recompute(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
        onBlur={() => { setTimeout(() => setAc(null), 140); }}
      />

      {ac ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          <div className="studio-scroll max-h-[224px] overflow-y-auto">
            {ac.items.map((s, i) => (
              <button
                key={s.trigger}
                type="button"
                title={s.text}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus in the textarea
                  const el = ref.current;
                  if (!el) return;
                  const caret = el.selectionStart ?? el.value.length;
                  const hit = expandSelectedSnippet(el.value, caret, s, ac.partial);
                  if (hit) apply(hit);
                }}
                className={cn(
                  "flex w-full flex-col gap-0.5 px-2.5 py-1.5 text-left transition-colors",
                  i === ac.sel ? "bg-accent" : "hover:bg-accent",
                )}
              >
                <span className="flex items-center gap-2">
                  <kbd className={cn(
                    "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10.5px] font-bold",
                    i === ac.sel ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-panel text-primary",
                  )}>:{s.trigger}</kbd>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{s.label ?? s.trigger}</span>
                  {s.category ? <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-faint">{s.category}</span> : null}
                </span>
                <span className="truncate pl-1 text-[10.5px] text-muted-foreground">{s.text}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-border bg-panel px-2.5 py-1 text-[9.5px] text-faint">
            ↑ ↓ select · Tab / Enter expand · Esc close · $1 = fill-in slot
          </div>
        </div>
      ) : null}
    </div>
  );
}
