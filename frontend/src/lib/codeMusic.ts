// Parse C code into musical events and play via Web Audio API.

export type EventKind = "for" | "while" | "if" | "return" | "printf" | "var";

export interface MusicEvent {
  line: number;       // 1-indexed source line
  depth: number;      // nesting depth (braces)
  kind: EventKind;
  token?: string;     // variable name for "var"
}

const KW = {
  for: /\bfor\s*\(/g,
  while: /\bwhile\s*\(/g,
  if: /\bif\s*\(/g,
  return: /\breturn\b/g,
  printf: /\bprintf\s*\(/g,
};

// Identify candidate variable identifiers (very loose, ignores keywords).
const RESERVED = new Set([
  "int","char","float","double","void","short","long","signed","unsigned",
  "if","else","for","while","do","return","switch","case","break","continue",
  "struct","typedef","const","static","sizeof","include","define","NULL",
  "printf","scanf","main","true","false",
]);

export function parseCode(src: string): MusicEvent[] {
  const events: MusicEvent[] = [];
  const lines = src.split("\n");
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    // strip strings & comments for depth/keyword scan
    const stripped = raw
      .replace(/\/\/.*$/g, "")
      .replace(/\/\*.*?\*\//g, "")
      .replace(/"(?:\\.|[^"\\])*"/g, '""');

    const lineDepth = depth + countLead(stripped);

    for (const [k, re] of Object.entries(KW)) {
      re.lastIndex = 0;
      if (re.test(stripped)) {
        events.push({ line: i + 1, depth: lineDepth, kind: k as EventKind });
      }
    }

    // variables: identifiers that aren't reserved
    const ids = stripped.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) ?? [];
    for (const id of ids) {
      if (RESERVED.has(id)) continue;
      events.push({ line: i + 1, depth: lineDepth, kind: "var", token: id });
    }

    depth += netBraces(stripped);
    if (depth < 0) depth = 0;
  }
  return events;
}

function netBraces(s: string) {
  let n = 0;
  for (const c of s) { if (c === "{") n++; else if (c === "}") n--; }
  return n;
}
function countLead(s: string) {
  // depth contribution before any closing brace on the line
  let n = 0;
  for (const c of s) {
    if (c === "}") { n--; break; }
    if (c === "{") break;
  }
  return n < 0 ? n : 0;
}

// --- Audio engine ----------------------------------------------------------

export class MusicEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  analyser!: AnalyserNode;
  destStream?: MediaStreamAudioDestinationNode;
  private timer: number | null = null;
  private step = 0;
  tempo = 110; // BPM
  private events: MusicEvent[] = [];
  private motifMap = new Map<string, number>(); // var -> pitch class
  onStep?: (line: number | null) => void;

  ensure() {
    if (this.ctx) return;
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  setEvents(ev: MusicEvent[]) {
    this.events = ev;
    // assign motif pitch classes
    let idx = 0;
    const scale = [0, 2, 4, 7, 9, 11, 12, 14];
    for (const e of ev) {
      if (e.kind === "var" && e.token && !this.motifMap.has(e.token)) {
        this.motifMap.set(e.token, scale[idx % scale.length]);
        idx++;
      }
    }
  }

  start() {
    this.ensure();
    if (this.ctx!.state === "suspended") this.ctx!.resume();
    this.stop();
    this.step = 0;
    const tick = () => {
      this.playStep();
      const interval = (60 / this.tempo) * 1000 / 2; // eighth notes
      this.timer = window.setTimeout(tick, interval);
    };
    tick();
  }
  stop() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.onStep?.(null);
  }

  private playStep() {
    if (!this.events.length) { this.onStep?.(null); return; }
    const ev = this.events[this.step % this.events.length];
    this.step++;
    this.onStep?.(ev.line);
    this.trigger(ev);
  }

  trigger(ev: MusicEvent) {
    this.ensure();
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const baseHz = 220 * Math.pow(2, ev.depth / 4); // depth shifts octave-ish

    switch (ev.kind) {
      case "for":
        this.drum(t, "kick");
        break;
      case "while":
        this.drone(t, baseHz);
        break;
      case "if":
        this.bell(t, baseHz * 2);
        break;
      case "return":
        this.chord(t, baseHz);
        break;
      case "printf":
        this.lead(t, baseHz * 1.5);
        break;
      case "var": {
        const pc = this.motifMap.get(ev.token!) ?? 0;
        const hz = 261.63 * Math.pow(2, pc / 12 + ev.depth / 12);
        this.pluck(t, hz);
        break;
      }
    }
  }

  // --- voices ---
  private env(g: GainNode, t: number, a: number, d: number, peak = 0.5) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  private osc(type: OscillatorType, hz: number, t: number, dur: number, peak = 0.3) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = hz;
    o.connect(g); g.connect(this.master);
    this.env(g, t, 0.005, dur, peak);
    o.start(t); o.stop(t + dur + 0.05);
  }
  private pluck(t: number, hz: number) { this.osc("triangle", hz, t, 0.35, 0.22); }
  private lead(t: number, hz: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth"; o2.type = "sine";
    o.frequency.value = hz; o2.frequency.value = hz * 2.01;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 1800;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
    this.env(g, t, 0.02, 0.6, 0.18);
    o.start(t); o2.start(t); o.stop(t + 0.7); o2.stop(t + 0.7);
  }
  private bell(t: number, hz: number) {
    const ctx = this.ctx!;
    [1, 2.76, 5.4].forEach((m, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = hz * m;
      o.connect(g); g.connect(this.master);
      this.env(g, t, 0.002, 0.9 - i * 0.2, 0.14 / (i + 1));
      o.start(t); o.stop(t + 1);
    });
  }
  private chord(t: number, hz: number) {
    [1, 1.25, 1.5, 2].forEach(m => this.osc("triangle", hz * m, t, 0.9, 0.12));
  }
  private drone(t: number, hz: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sawtooth"; o.frequency.value = hz / 2;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600;
    o.connect(f); f.connect(g); g.connect(this.master);
    this.env(g, t, 0.05, 0.7, 0.1);
    o.start(t); o.stop(t + 0.8);
  }
  private drum(t: number, _kind: "kick") {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    o.connect(g); g.connect(this.master);
    this.env(g, t, 0.002, 0.22, 0.55);
    o.start(t); o.stop(t + 0.25);
  }

  // --- recording ---
  startRecording(): MediaRecorder {
    this.ensure();
    if (!this.destStream) {
      this.destStream = this.ctx!.createMediaStreamDestination();
      this.master.connect(this.destStream);
    }
    const rec = new MediaRecorder(this.destStream.stream);
    return rec;
  }
}
