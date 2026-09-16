"use client";
import { useState, useCallback } from "react";
import { parseVoiceCommand } from "@/lib/voice-engine";
export default function VoiceButton({ onTranscript, disabled }: { onTranscript: (t: string, isCmd: boolean) => void; disabled?: boolean }) {
  const [listening, setListening] = useState(false);
  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome or Edge for dictation."); return; }
    const rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = "en-IN";
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e: any) => { let fin = ""; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) fin += e.results[i][0].transcript;
      if (fin) { const p = parseVoiceCommand(fin); onTranscript(p.content, p.type === "command"); } };
    rec.start(); (window as any).__rec = rec;
  }, [onTranscript]);
  const stop = useCallback(() => { (window as any).__rec?.stop(); setListening(false); }, []);
  return (
    <button onClick={listening ? stop : start} disabled={disabled}
      className={`px-3 py-1.5 rounded font-bold text-xs ${listening ? "bg-red-500 text-white animate-pulse" : "bg-blue-600 text-white"} disabled:bg-gray-300`}>
      {listening ? "Stop Dictation" : "Start Dictation"}
    </button>
  );
}
