import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CodeEditor } from "@/components/CodeEditor";
import { Visualizer } from "@/components/Visualizer";
import { Legend } from "@/components/Legend";
import { MusicEngine, parseCode } from "@/lib/codeMusic";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Code Symphony Compiler" },
      { name: "description", content: "A precision instrument that turns C code into sound. Parse, compile, listen." },
    ],
  }),
});

const DEFAULT_CODE = `#include <stdio.h>

int fibonacci(int n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
  int total = 0;
  for (int i = 0; i < 8; i++) {
    int value = fibonacci(i);
    total = total + value;
    printf("fib(%d) = %d\\n", i, value);
  }

  while (total > 10) {
    if (total % 2 == 0) {
      total = total / 2;
    } else {
      total = total - 1;
    }
  }
  return total;
}
`;

function Page() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [tempo, setTempo] = useState(110);
  const [live, setLive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);

  const engineRef = useRef<MusicEngine | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  if (!engineRef.current) engineRef.current = new MusicEngine();
  const engine = engineRef.current;

  const events = useMemo(() => parseCode(code), [code]);

  const stats = useMemo(() => {
    const c = (k: string) => events.filter(e => e.kind === k).length;
    return {
      lines: code.split("\n").length,
      fors: c("for"), whiles: c("while"), ifs: c("if"),
      returns: c("return"), prints: c("printf"),
      vars: new Set(events.filter(e => e.kind === "var").map(e => e.token)).size,
    };
  }, [code, events]);

  useEffect(() => {
    engine.setEvents(events);
    engine.tempo = tempo;
    engine.onStep = (line) => setActiveLine(line);
  }, [events, tempo, engine]);

  useEffect(() => {
    if (live && !playing) handlePlay();
    if (!live && playing) handleStop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const handlePlay = () => { engine.start(); setPlaying(true); };
  const handleStop = () => { engine.stop(); setPlaying(false); setActiveLine(null); };

  const handleExport = () => {
    if (recording) { recRef.current?.stop(); return; }
    const rec = engine.startRecording();
    recRef.current = rec;
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "code-symphony.webm"; a.click();
      URL.revokeObjectURL(url);
      setRecording(false);
    };
    if (!playing) handlePlay();
    rec.start();
    setRecording(true);
    setTimeout(() => { if (rec.state === "recording") rec.stop(); }, 12000);
  };

  const current = events.find((e) => e.line === activeLine);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header — strict, label-driven */}
      <header className="grid grid-cols-[1fr_auto] items-end gap-6 border-b border-border px-6 py-4">
        <div className="flex items-baseline gap-6">
          <h1 className="text-[15px] font-medium tracking-tight-2">Code Symphony Compiler</h1>
          <span className="uppercase-label">v 0.1 — c source → audio</span>
        </div>
        <div className="flex items-center gap-6">
          <Field label="status">
            <span className="flex items-center gap-1.5 font-mono text-[12px]">
              <span className={`h-1.5 w-1.5 ${playing ? "bg-signal" : "bg-border"}`} />
              {playing ? "running" : "idle"}
            </span>
          </Field>
          <Field label="events">
            <span className="font-mono text-[12px]">{events.length}</span>
          </Field>
          <Field label="lines">
            <span className="font-mono text-[12px]">{stats.lines}</span>
          </Field>
        </div>
      </header>

      {/* Control row */}
      <div className="grid grid-cols-[1fr_auto] items-center gap-6 border-b border-border px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="uppercase-label">live</span>
            <Switch checked={live} onCheckedChange={setLive} />
          </div>
          <div className="flex items-center gap-3">
            <span className="uppercase-label">tempo</span>
            <Slider value={[tempo]} min={40} max={220} step={1} onValueChange={(v) => setTempo(v[0])} className="w-40" />
            <span className="w-10 font-mono text-[12px]">{tempo} bpm</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!playing ? (
            <Button onClick={handlePlay} className="h-8 rounded-none bg-foreground px-4 text-[12px] font-medium uppercase tracking-[0.12em] text-background hover:bg-foreground/90">
              play
            </Button>
          ) : (
            <Button onClick={handleStop} variant="outline" className="h-8 rounded-none border-foreground px-4 text-[12px] font-medium uppercase tracking-[0.12em]">
              stop
            </Button>
          )}
          <Button onClick={handleExport} variant="outline" className={`h-8 rounded-none px-4 text-[12px] font-medium uppercase tracking-[0.12em] ${recording ? "border-signal text-signal" : ""}`}>
            {recording ? "recording…" : "export"}
          </Button>
        </div>
      </div>

      {/* Main split */}
      <main className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
        <section className="flex min-h-[60vh] flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-border px-6 py-2">
            <span className="uppercase-label">source · main.c</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              for {stats.fors} · while {stats.whiles} · if {stats.ifs} · return {stats.returns} · printf {stats.prints} · vars {stats.vars}
            </span>
          </div>
          <div className="min-h-0 flex-1 p-6">
            <CodeEditor value={code} onChange={setCode} activeLine={activeLine} />
          </div>
        </section>

        <section className="flex min-h-[60vh] flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-2">
            <span className="uppercase-label">output · audio stream</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {current ? `${current.kind} · line ${current.line} · depth ${current.depth}${current.token ? ` · ${current.token}` : ""}` : "—"}
            </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
            <div className="min-h-0 flex-1">
              <Visualizer analyser={engine.analyser ?? null} active={playing} />
            </div>
            <Legend />
          </div>
        </section>
      </main>

      <footer className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-border px-6 py-2 font-mono text-[11px] text-muted-foreground">
        <span>code symphony compiler ☮️ MAY THE FORCE BE WITH YOU</span>
        <span>web audio · 44.1khz</span>
      </footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="uppercase-label">{label}</span>
      {children}
    </div>
  );
}
