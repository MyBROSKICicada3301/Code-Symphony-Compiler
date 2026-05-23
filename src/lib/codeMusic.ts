export type EventKind =
  | "for" | "while" | "if" | "else" | "switch" | "case" | "break" | "continue"
  | "return" | "printf" | "scanf" | "malloc" | "free" | "sizeof"
  | "struct" | "typedef" | "enum" | "union"
  | "assign"       
  | "compare"      
  | "pointer"      
  | "increment"    
  | "bitwise"      
  | "comment"      
  | "macro"        
  | "cast"         
  | "string_lit"   
  | "number_lit"   
  | "var";

export interface MusicEvent {
  line: number;
  col: number;       
  depth: number;
  kind: EventKind;
  token?: string;
}

const RESERVED = new Set([
  "int","char","float","double","void","short","long","signed","unsigned",
  "if","else","for","while","do","return","switch","case","break","continue",
  "struct","typedef","const","static","sizeof","include","define","NULL",
  "printf","scanf","malloc","free","calloc","realloc","enum","union",
  "main","true","false","extern","inline","volatile","register","auto",
]);

const KEYWORD_KINDS: Record<string, EventKind> = {
  for: "for", while: "while", if: "if", else: "else",
  switch: "switch", case: "case", break: "break", continue: "continue",
  return: "return", printf: "printf", scanf: "scanf",
  malloc: "malloc", free: "free", sizeof: "sizeof",
  struct: "struct", typedef: "typedef", enum: "enum", union: "union",
};

export function parseCode(src: string): MusicEvent[] {
  const events: MusicEvent[] = [];
  const lines = src.split("\n");
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trimStart();
    const lineDepth = depth + countLead(raw.replace(/\/\/.*$/, "").replace(/"(?:\\.|[^"\\])*"/g, '""'));

    if (trimmed.startsWith("#")) {
      events.push({ line: i + 1, col: raw.indexOf("#"), depth: lineDepth, kind: "macro" });
    }

    const commentIdx = raw.search(/\/\//);
    if (commentIdx !== -1) {
      events.push({ line: i + 1, col: commentIdx, depth: lineDepth, kind: "comment" });
    }
    const blockCommentIdx = raw.search(/\/\*/);
    if (blockCommentIdx !== -1) {
      events.push({ line: i + 1, col: blockCommentIdx, depth: lineDepth, kind: "comment" });
    }

    const stripped = raw
      .replace(/\/\/.*$/g, "")
      .replace(/\/\*.*?\*\//g, "")
      .replace(/"(?:\\.|[^"\\])*"/g, (m, offset) => {
        const col = raw.indexOf(m);
        events.push({ line: i + 1, col: col === -1 ? 0 : col, depth: lineDepth, kind: "string_lit" });
        return '""';
      });

    for (const m of stripped.matchAll(/(?<![=!<>])=(?!=)/g)) {
      events.push({ line: i + 1, col: m.index ?? 0, depth: lineDepth, kind: "assign" });
    }
    for (const m of stripped.matchAll(/==|!=|<=|>=|<(?![<=])|>(?![>=])/g)) {
      events.push({ line: i + 1, col: m.index ?? 0, depth: lineDepth, kind: "compare" });
    }
    for (const m of stripped.matchAll(/->|\*(?!\s*=)(?=[a-zA-Z_(])|&(?!\s*=)(?=[a-zA-Z_(])/g)) {
      events.push({ line: i + 1, col: m.index ?? 0, depth: lineDepth, kind: "pointer" });
    }
    for (const m of stripped.matchAll(/\+\+|--/g)) {
      events.push({ line: i + 1, col: m.index ?? 0, depth: lineDepth, kind: "increment" });
    }
    for (const m of stripped.matchAll(/~|<<|>>|\^|(?<![&|])&(?!&)|(?<![|])\|(?!\|)/g)) {
      events.push({ line: i + 1, col: m.index ?? 0, depth: lineDepth, kind: "bitwise" });
    }
    for (const m of stripped.matchAll(/\(\s*(int|char|float|double|void|long|short|unsigned|signed)\s*\*?\s*\)/g)) {
      events.push({ line: i + 1, col: m.index ?? 0, depth: lineDepth, kind: "cast" });
    }
    for (const m of stripped.matchAll(/\b(0x[0-9a-fA-F]+|\d+\.?\d*[fFuUlL]*)\b/g)) {
      events.push({ line: i + 1, col: m.index ?? 0, depth: lineDepth, kind: "number_lit" });
    }

    for (const m of stripped.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g)) {
      const word = m[1];
      const col = m.index ?? 0;
      if (KEYWORD_KINDS[word]) {
        events.push({ line: i + 1, col, depth: lineDepth, kind: KEYWORD_KINDS[word] });
      } else if (!RESERVED.has(word)) {
        events.push({ line: i + 1, col, depth: lineDepth, kind: "var", token: word });
      }
    }

    depth += netBraces(stripped);
    if (depth < 0) depth = 0;
  }

  events.sort((a, b) => (a.line !== b.line ? a.line - b.line : (a.col ?? 0) - (b.col ?? 0)));
  return events;
}

function netBraces(s: string) {
  let n = 0;
  for (const c of s) { if (c === "{") n++; else if (c === "}") n--; }
  return n;
}
function countLead(s: string) {
  let n = 0;
  for (const c of s) {
    if (c === "}") { n--; break; }
    if (c === "{") break;
  }
  return n < 0 ? n : 0;
}

export class MusicEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  reverb!: ConvolverNode;
  analyser!: AnalyserNode;
  destStream?: MediaStreamAudioDestinationNode;
  private timer: number | null = null;
  private step = 0;
  tempo = 110; 
  private events: MusicEvent[] = [];
  private motifMap = new Map<string, number>();
  onStep?: (line: number | null) => void;

  ensure() {
    if (this.ctx) return;
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.reverb = this.makeReverb();
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  
  private makeReverb(): ConvolverNode {
    const ctx = this.ctx!;
    const conv = ctx.createConvolver();
    const len = ctx.sampleRate * 1.8;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    conv.buffer = buf;
    return conv;
  }

  
  private toOut(g: GainNode, wet = 0) {
    g.connect(this.master);
    if (wet > 0) {
      const wg = this.ctx!.createGain();
      wg.gain.value = wet;
      g.connect(wg);
      wg.connect(this.reverb);
      this.reverb.connect(this.master);
    }
  }

  setEvents(ev: MusicEvent[]) {
    this.events = ev;
    let idx = 0;
    const scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
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
      if (!this.events.length) { this.onStep?.(null); return; }
      this.playStep();
      // schedule next only if there are remaining events
      if (this.step < this.events.length) {
        const interval = (60 / this.tempo) * 1000 / 2;
        this.timer = window.setTimeout(tick, interval);
      } else {
        // finished playback
        this.onStep?.(null);
        this.timer = null;
      }
    };
    tick();
  }

  stop() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.onStep?.(null);
  }

  private playStep() {
    if (!this.events.length) { this.onStep?.(null); return; }
    const ev = this.events[this.step];
    this.onStep?.(ev.line);
    this.trigger(ev);
    this.step++;
  }
  trigger(ev: MusicEvent) {
    this.ensure();
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const baseHz = 110 * Math.pow(2, ev.depth / 3.5);

    switch (ev.kind) {
      
      case "for":     this.kick(t); break;
      case "while":   this.drone(t, baseHz); break;
      case "if":      this.bell(t, baseHz * 2); break;
      case "else":    this.bell(t, baseHz * 1.5); break;
      case "switch":  this.kick(t); this.hihat(t + 0.05, false); break;
      case "case":    this.hihat(t, false); break;
      case "break":   this.snare(t); break;
      case "continue":this.hihat(t, true); break;

      
      case "return":  this.chord(t, baseHz); break;
      case "printf":  this.lead(t, baseHz * 1.5); break;
      case "scanf":   this.lead(t, baseHz * 1.2); break;
      case "malloc":  this.sub(t, baseHz / 2); break;
      case "free":    this.sub(t, baseHz / 2.5); break;
      case "sizeof":  this.woodblock(t); break;

      
      case "struct":  this.pad(t, baseHz); break;
      case "typedef": this.pad(t, baseHz * 1.25); break;
      case "enum":    this.pad(t, baseHz * 1.5); break;
      case "union":   this.pad(t, baseHz * 0.75); break;

      
      case "assign":    this.click(t, 600); break;
      case "compare":   this.click(t, 900); break;
      case "pointer":   this.click(t, 1400); break;
      case "increment": this.click(t, 1800); break;
      case "bitwise":   this.glitch(t, baseHz * 3); break;
      case "cast":      this.glitch(t, baseHz * 2.5); break;

      
      case "string_lit": this.marimba(t, baseHz * 2); break;
      case "number_lit": this.marimba(t, baseHz * 1.33); break;

      
      case "macro":   this.sweep(t, baseHz); break;
      case "comment": this.shimmer(t); break;

      
      case "var": {
        const pc = this.motifMap.get(ev.token!) ?? 0;
        const hz = 261.63 * Math.pow(2, pc / 12 + ev.depth / 14);
        this.pluck(t, hz);
        break;
      }
    }
  }

  
  private env(g: GainNode, t: number, a: number, d: number, peak = 0.5) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  
  private osc(type: OscillatorType, hz: number, t: number, dur: number, peak = 0.3, wet = 0) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = hz;
    o.connect(g);
    this.toOut(g, wet);
    this.env(g, t, 0.005, dur, peak);
    o.start(t); o.stop(t + dur + 0.1);
  }

  

  
  private pluck(t: number, hz: number) {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = hz * 2;
    const g = ctx.createGain();
    src.connect(lp); lp.connect(g);
    this.toOut(g, 0.15);
    this.env(g, t, 0.001, 0.4, 0.2);
    src.start(t); src.stop(t + 0.5);
  }

  
  private lead(t: number, hz: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth"; o2.type = "sine";
    o.frequency.value = hz; o2.frequency.value = hz * 2.01;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1800;
    o.connect(f); o2.connect(f); f.connect(g);
    this.toOut(g, 0.2);
    this.env(g, t, 0.02, 0.6, 0.18);
    o.start(t); o2.start(t); o.stop(t + 0.7); o2.stop(t + 0.7);
  }

  
  private bell(t: number, hz: number) {
    const ctx = this.ctx!;
    [1, 2.76, 5.4].forEach((m, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = hz * m;
      o.connect(g);
      this.toOut(g, 0.35);
      this.env(g, t, 0.002, 1.0 - i * 0.2, 0.12 / (i + 1));
      o.start(t); o.stop(t + 1.2);
    });
  }

  
  private chord(t: number, hz: number) {
    [1, 1.25, 1.5, 2].forEach(m => this.osc("triangle", hz * m, t, 0.9, 0.1, 0.25));
  }

  
  private pad(t: number, hz: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = hz;
    o.connect(g);
    this.toOut(g, 0.5);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.start(t); o.stop(t + 1.3);
  }

  
  private drone(t: number, hz: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sawtooth"; o.frequency.value = hz / 2;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 550;
    o.connect(f); f.connect(g);
    this.toOut(g, 0.1);
    this.env(g, t, 0.06, 0.8, 0.09);
    o.start(t); o.stop(t + 0.9);
  }

  
  private marimba(t: number, hz: number) {
    const ctx = this.ctx!;
    [1, 4, 10].forEach((m, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = hz * m;
      o.connect(g);
      this.toOut(g, 0.1);
      this.env(g, t, 0.002, 0.25 - i * 0.07, 0.15 / (i + 1));
      o.start(t); o.stop(t + 0.3);
    });
  }

  
  private sweep(t: number, hz: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(hz * 0.5, t);
    o.frequency.linearRampToValueAtTime(hz * 4, t + 0.3);
    o.connect(g);
    this.toOut(g, 0.3);
    this.env(g, t, 0.01, 0.3, 0.12);
    o.start(t); o.stop(t + 0.4);
  }

  
  private shimmer(t: number) {
    const ctx = this.ctx!;
    const freqs = [1200, 1800, 2400, 3200];
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      o.connect(g);
      this.toOut(g, 0.6);
      g.gain.setValueAtTime(0, t + i * 0.04);
      g.gain.linearRampToValueAtTime(0.04, t + i * 0.04 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.04 + 0.4);
      o.start(t + i * 0.04); o.stop(t + 0.6);
    });
  }

  
  private sub(t: number, hz: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = Math.max(hz, 30);
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 120;
    o.connect(f); f.connect(g);
    this.toOut(g, 0);
    this.env(g, t, 0.005, 0.5, 0.45);
    o.start(t); o.stop(t + 0.6);
  }

  
  private glitch(t: number, hz: number) {
    const ctx = this.ctx!;
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = hz * (1 + Math.random() * 0.3);
      o.connect(g);
      this.toOut(g, 0);
      const dt = t + i * 0.03;
      g.gain.setValueAtTime(0.07, dt);
      g.gain.setValueAtTime(0, dt + 0.02);
      o.start(dt); o.stop(dt + 0.03);
    }
  }

  
  private click(t: number, hz: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = hz;
    o.connect(g); g.connect(this.master);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.start(t); o.stop(t + 0.05);
  }

  
  private woodblock(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = 900;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 8;
    o.connect(f); f.connect(g); g.connect(this.master);
    this.env(g, t, 0.001, 0.08, 0.3);
    o.start(t); o.stop(t + 0.1);
  }

  
  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    o.connect(g); g.connect(this.master);
    this.env(g, t, 0.002, 0.22, 0.55);
    o.start(t); o.stop(t + 0.25);
  }

  
  private snare(t: number) {
    const ctx = this.ctx!;
    
    const o = ctx.createOscillator(); const og = ctx.createGain();
    o.type = "triangle"; o.frequency.value = 200;
    o.connect(og); og.connect(this.master);
    this.env(og, t, 0.002, 0.12, 0.25);
    o.start(t); o.stop(t + 0.15);
    
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource(); ns.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2000;
    const ng = ctx.createGain();
    ns.connect(hp); hp.connect(ng); ng.connect(this.master);
    this.env(ng, t, 0.001, 0.15, 0.35);
    ns.start(t);
  }

  
  private hihat(t: number, open: boolean) {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
    const g = ctx.createGain();
    src.connect(hp); hp.connect(g); g.connect(this.master);
    this.env(g, t, 0.001, open ? 0.25 : 0.06, 0.15);
    src.start(t);
  }

  
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