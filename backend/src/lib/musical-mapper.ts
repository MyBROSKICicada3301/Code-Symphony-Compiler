/**
 * Musical Mapping Engine
 * Maps C code elements to musical parameters based on the Code Symphony specifications
 */

import type { ParseResult, EventKind } from "./parser";

export interface MusicalNote {
  pitch: number; // MIDI note number
  time: number; // seconds
  duration: number; // seconds
  velocity: number; // 0-1
  instrument: string;
  effects: AudioEffect[];
}

export interface AudioEffect {
  type: "reverb" | "delay" | "distortion" | "filter" | "envelope";
  intensity: number;
}

export interface MusicalComposition {
  notes: MusicalNote[];
  tempo: number;
  timeSignature: string;
  layers: CompositionLayer[];
}

export interface CompositionLayer {
  name: string;
  instrument: string;
  notes: MusicalNote[];
}

// MIDI note number reference: C4 = 60
const NOTE_MAP = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

class MusicalMapper {
  private parseResult: ParseResult;
  private tempo: number = 110; // BPM
  private timePerBeat: number = 0;
  private currentTime: number = 0;
  private motifMap: Map<string, number> = new Map();
  private pitchCounter: number = 0;

  constructor(parseResult: ParseResult, tempo: number = 110) {
    this.parseResult = parseResult;
    this.tempo = tempo;
    this.timePerBeat = (60 / tempo) * 0.25; // quarter note in seconds
  }

  map(): MusicalComposition {
    const notes: MusicalNote[] = [];

    // Create layers for different aspects
    const layers: CompositionLayer[] = [
      { name: "control_flow", instrument: "percussion", notes: [] },
      { name: "data_types", instrument: "piano", notes: [] },
      { name: "memory", instrument: "synth", notes: [] },
      { name: "io", instrument: "lead", notes: [] },
    ];

    // Map control flow events → rhythm layer
    for (const event of this.parseResult.events) {
      if (
        event.kind === "for" ||
        event.kind === "while" ||
        event.kind === "if"
      ) {
        const note = this.mapControlFlow(event);
        notes.push(note);
        layers[0].notes.push(note);
      }
    }

    // Map data types → timbre layer
    for (const event of this.parseResult.events) {
      if (
        ["int", "float", "double", "char", "void", "unsigned"].includes(
          event.kind
        )
      ) {
        const note = this.mapDataType(event);
        notes.push(note);
        layers[1].notes.push(note);
      }
    }

    // Map memory operations → electronic layer
    for (const event of this.parseResult.events) {
      if (event.kind === "malloc" || event.kind === "free" || event.kind === "pointer") {
        const note = this.mapMemoryBehavior(event);
        notes.push(note);
        layers[2].notes.push(note);
      }
    }

    // Map I/O operations → foreground voice
    for (const event of this.parseResult.events) {
      if (event.kind === "printf") {
        const note = this.mapIO(event);
        notes.push(note);
        layers[3].notes.push(note);
      }
    }

    // Map operators → modulation
    for (const operator of this.parseResult.operators) {
      const note = this.mapOperator(operator);
      notes.push(note);
    }

    // Sort by time
    notes.sort((a, b) => a.time - b.time);

    return {
      notes,
      tempo: this.tempo,
      timeSignature: "4/4",
      layers,
    };
  }

  private mapControlFlow(event: any): MusicalNote {
    const baseTime = event.line * this.timePerBeat;

    switch (event.kind) {
      case "for":
        return {
          pitch: 36, // Low C
          time: baseTime,
          duration: this.timePerBeat * 0.5,
          velocity: 0.8,
          instrument: "percussion_kick",
          effects: [{ type: "reverb", intensity: 0.3 }],
        };
      case "while":
        return {
          pitch: 48, // C3
          time: baseTime,
          duration: this.timePerBeat * 2,
          velocity: 0.6,
          instrument: "synth_drone",
          effects: [
            { type: "reverb", intensity: 0.6 },
            { type: "delay", intensity: 0.4 },
          ],
        };
      case "if":
        return {
          pitch: 72, // C5
          time: baseTime,
          duration: this.timePerBeat * 0.25,
          velocity: 0.9,
          instrument: "bell",
          effects: [{ type: "reverb", intensity: 0.5 }],
        };
      default:
        return this.createSilentNote(baseTime);
    }
  }

  private mapDataType(event: any): MusicalNote {
    const baseTime = event.line * this.timePerBeat;

    switch (event.kind) {
      case "int":
        return {
          pitch: 60, // Middle C
          time: baseTime,
          duration: this.timePerBeat,
          velocity: 0.7,
          instrument: "piano",
          effects: [{ type: "reverb", intensity: 0.2 }],
        };
      case "float":
        return {
          pitch: 64, // E4
          time: baseTime,
          duration: this.timePerBeat * 0.75,
          velocity: 0.7,
          instrument: "glockenspiel",
          effects: [
            { type: "reverb", intensity: 0.3 },
            { type: "filter", intensity: 0.4 },
          ],
        };
      case "double":
        return {
          pitch: 60, // C4
          time: baseTime,
          duration: this.timePerBeat * 1.2,
          velocity: 0.8,
          instrument: "piano_with_echo",
          effects: [
            { type: "reverb", intensity: 0.4 },
            { type: "delay", intensity: 0.5 },
          ],
        };
      case "char":
        return {
          pitch: 72, // C5
          time: baseTime,
          duration: this.timePerBeat * 0.2,
          velocity: 0.6,
          instrument: "pluck",
          effects: [{ type: "reverb", intensity: 0.1 }],
        };
      case "void":
        return this.createSilentNote(baseTime);
      case "unsigned":
        return {
          pitch: 62, // D4
          time: baseTime,
          duration: this.timePerBeat,
          velocity: 0.75,
          instrument: "piano_bright",
          effects: [{ type: "filter", intensity: 0.2 }],
        };
      default:
        return this.createSilentNote(baseTime);
    }
  }

  private mapMemoryBehavior(event: any): MusicalNote {
    const baseTime = event.line * this.timePerBeat;

    switch (event.kind) {
      case "pointer":
        return {
          pitch: 55, // G3
          time: baseTime,
          duration: this.timePerBeat * 0.5,
          velocity: 0.5,
          instrument: "delay_synth",
          effects: [
            { type: "delay", intensity: 0.7 },
            { type: "reverb", intensity: 0.4 },
          ],
        };
      case "malloc":
        return {
          pitch: 60 + event.depth * 2, // Higher pitch for deeper nesting
          time: baseTime,
          duration: this.timePerBeat * 0.3,
          velocity: 0.8,
          instrument: "synth_spawn",
          effects: [
            { type: "reverb", intensity: 0.3 },
            { type: "envelope", intensity: 0.6 },
          ],
        };
      case "free":
        return {
          pitch: 48 - event.depth * 2, // Lower pitch for deeper nesting
          time: baseTime,
          duration: this.timePerBeat * 1.5,
          velocity: 0.6,
          instrument: "decay_reverb",
          effects: [
            { type: "reverb", intensity: 0.8 },
            { type: "delay", intensity: 0.5 },
          ],
        };
      default:
        return this.createSilentNote(baseTime);
    }
  }

  private mapIO(event: any): MusicalNote {
    const baseTime = event.line * this.timePerBeat;
    return {
      pitch: 67, // G4
      time: baseTime,
      duration: this.timePerBeat * 0.8,
      velocity: 0.9,
      instrument: "lead",
      effects: [
        { type: "reverb", intensity: 0.2 },
        { type: "distortion", intensity: 0.1 },
      ],
    };
  }

  private mapOperator(operator: any): MusicalNote {
    const baseTime = operator.line * this.timePerBeat;

    const operatorMap: Record<string, [number, string, number]> = {
      "=": [60, "piano", 0.5],
      "+": [64, "bell", 0.7],
      "-": [57, "bass", 0.6],
      "*": [62, "synth", 0.8],
      "/": [65, "lead", 0.7],
      "%": [66, "pluck", 0.6],
      "==": [69, "harmonic", 0.7],
      "!=": [54, "dissonance", 0.8],
      "<": [59, "pan_left", 0.5],
      ">": [65, "pan_right", 0.5],
      "&&": [60, "chord_major", 0.8],
      "||": [60, "chord_alt", 0.7],
      "++": [72, "arpeggio_up", 0.7],
      "--": [48, "arpeggio_down", 0.7],
    };

    const [pitch, instrument, velocity] = operatorMap[operator.operator] || [60, "piano", 0.5];

    return {
      pitch,
      time: baseTime,
      duration: this.timePerBeat * 0.3,
      velocity,
      instrument,
      effects: [{ type: "filter", intensity: 0.3 }],
    };
  }

  private createSilentNote(time: number): MusicalNote {
    return {
      pitch: 0,
      time,
      duration: this.timePerBeat,
      velocity: 0,
      instrument: "silence",
      effects: [],
    };
  }
}

export function mapToMusic(parseResult: ParseResult, tempo: number = 110): MusicalComposition {
  const mapper = new MusicalMapper(parseResult, tempo);
  return mapper.map();
}

export { MusicalMapper };
