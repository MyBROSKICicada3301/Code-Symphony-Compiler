/**
 * Shared type definitions and utilities for Code Symphony Compiler
 */

export type EventKind =
  | "for"
  | "while"
  | "if"
  | "return"
  | "printf"
  | "var"
  | "int"
  | "float"
  | "double"
  | "char"
  | "void"
  | "unsigned"
  | "pointer"
  | "array"
  | "struct"
  | "union"
  | "enum"
  | "typedef"
  | "malloc"
  | "free"
  | "operator";

export interface ParsedEvent {
  line: number;
  column: number;
  depth: number;
  kind: EventKind;
  token?: string;
  operator?: string;
  dataType?: string;
}

export interface MusicalNote {
  pitch: number;
  time: number;
  duration: number;
  velocity: number;
  instrument: string;
  effects: Array<{
    type: "reverb" | "delay" | "distortion" | "filter" | "envelope";
    intensity: number;
  }>;
}

export interface AnalysisResponse {
  success: boolean;
  data?: {
    parseResult: any;
    composition: {
      notes: MusicalNote[];
      tempo: number;
      timeSignature: string;
      layers: Array<{
        name: string;
        instrument: string;
        notes: MusicalNote[];
      }>;
    };
    report: {
      eventSummary: Record<string, number>;
      operatorSummary: Record<string, number>;
      complexity: {
        maxDepth: number;
        averageDepth: number;
        totalLines: number;
      };
    };
    syntaxWarnings: string[];
  };
  error?: string;
  details?: Array<{
    line: number;
    message: string;
  }>;
}
