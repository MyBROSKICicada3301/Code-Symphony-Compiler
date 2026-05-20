/**
 * API Route Handlers for Code Analysis and Music Generation
 */

import type { ParseResult } from "./parser";
import type { MusicalComposition } from "./musical-mapper";
import { parseCode } from "./parser";
import { mapToMusic } from "./musical-mapper";

export interface AnalysisRequest {
  code: string;
  tempo?: number;
}

export interface AnalysisResponse {
  success: boolean;
  data?: {
    parseResult: ParseResult;
    composition: MusicalComposition;
  };
  error?: string;
}

export async function analyzeCode(request: AnalysisRequest): Promise<AnalysisResponse> {
  try {
    const { code, tempo = 110 } = request;

    if (!code || code.trim().length === 0) {
      return {
        success: false,
        error: "Code input is empty",
      };
    }

    // Parse the C code
    const parseResult = parseCode(code);

    // Map to musical composition
    const composition = mapToMusic(parseResult, tempo);

    return {
      success: true,
      data: {
        parseResult,
        composition,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export interface SyntaxCheckResponse {
  valid: boolean;
  errors: SyntaxError[];
  warnings: string[];
}

export interface SyntaxError {
  line: number;
  message: string;
}

export function checkSyntax(code: string): SyntaxCheckResponse {
  const errors: SyntaxError[] = [];
  const warnings: string[] = [];
  const lines = code.split("\n");

  let braceCount = 0;
  let parenCount = 0;
  let bracketCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Basic bracket matching
    for (const char of line) {
      if (char === "{") braceCount++;
      else if (char === "}") {
        braceCount--;
        if (braceCount < 0) {
          errors.push({
            line: i + 1,
            message: "Unexpected closing brace",
          });
          braceCount = 0;
        }
      } else if (char === "(") parenCount++;
      else if (char === ")") parenCount--;
      else if (char === "[") bracketCount++;
      else if (char === "]") bracketCount--;
    }

    // Check for common syntax issues
    if (line.trim().endsWith(";") === false && line.trim().length > 0) {
      if (
        !line.includes("{") &&
        !line.includes("}") &&
        !line.includes("//") &&
        !line.startsWith("#")
      ) {
        warnings.push(`Line ${i + 1}: Statement may be incomplete`);
      }
    }
  }

  if (braceCount !== 0) {
    errors.push({
      line: lines.length,
      message: `Mismatched braces: ${braceCount > 0 ? "missing" : "extra"} closing brace`,
    });
  }

  if (parenCount !== 0) {
    errors.push({
      line: lines.length,
      message: `Mismatched parentheses`,
    });
  }

  if (bracketCount !== 0) {
    errors.push({
      line: lines.length,
      message: `Mismatched brackets`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export interface ReportResponse {
  eventSummary: Record<string, number>;
  operatorSummary: Record<string, number>;
  complexity: {
    maxDepth: number;
    averageDepth: number;
    totalLines: number;
  };
}

export function generateReport(parseResult: ParseResult, totalLines: number): ReportResponse {
  const eventSummary: Record<string, number> = {};
  const operatorSummary: Record<string, number> = {};
  let maxDepth = 0;
  let totalDepth = 0;

  for (const event of parseResult.events) {
    eventSummary[event.kind] = (eventSummary[event.kind] || 0) + 1;
    maxDepth = Math.max(maxDepth, event.depth);
    totalDepth += event.depth;
  }

  for (const op of parseResult.operators) {
    operatorSummary[op.operator] = (operatorSummary[op.operator] || 0) + 1;
  }

  return {
    eventSummary,
    operatorSummary,
    complexity: {
      maxDepth,
      averageDepth: parseResult.events.length > 0 ? totalDepth / parseResult.events.length : 0,
      totalLines,
    },
  };
}
