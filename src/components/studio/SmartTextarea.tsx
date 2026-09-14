"use client";
/**
 * SmartTextarea — a Textarea with snippet macros: type “:trigger” and press
 * Tab to expand (e.g. “:fu6” → “Follow-up ultrasound after 6 weeks is advised.”).
 * Ported from the big workspace design (“snippet macros with variable
 * substitution”), right-sized for the Studio.
 */
import { useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { readSnippets, expandSnippet } from "@/lib/workspace-enhance";

export function SmartTextarea({
  value,
  onChange,
  onExpand,
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
  onExpand?: (expanded: boolean) => void;
} & Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange">) {
  const snippets = useMemo(() => readSnippets(), []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    const el = e.currentTarget;
    const caret = el.selectionStart ?? el.value.length;
    const hit = expandSnippet(el.value, caret, snippets);
    if (!hit) return; // normal Tab behaviour (leave the textarea)
    e.preventDefault();
    onChange(hit.value);
    onExpand?.(true);
    // Apply caret / placeholder selection after React commits the new value.
    requestAnimationFrame(() => {
      el.focus();
      if (hit.select) el.setSelectionRange(hit.select[0], hit.select[1]);
      else el.setSelectionRange(hit.caret, hit.caret);
    });
  };

  return <Textarea value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown} {...props} />;
}
