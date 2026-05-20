/**
 * Frontend API Client for Code Symphony
 * Communicates with the backend analysis endpoint
 */

import type { AnalysisResponse } from "./types";

export async function analyzeCodeRemote(
  code: string,
  tempo: number = 110
): Promise<AnalysisResponse> {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        tempo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function validateCode(code: string): Promise<{
  valid: boolean;
  errors: Array<{ line: number; message: string }>;
  warnings: string[];
}> {
  try {
    // Do a lightweight syntax check without full analysis
    const errors = [];
    const warnings = [];

    if (!code || code.trim().length === 0) {
      errors.push({ line: 0, message: "Code is empty" });
    }

    // Basic bracket matching
    let braceCount = 0;
    let parenCount = 0;
    let bracketCount = 0;
    const lines = code.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === "{") braceCount++;
        else if (char === "}") braceCount--;
        else if (char === "(") parenCount++;
        else if (char === ")") parenCount--;
        else if (char === "[") bracketCount++;
        else if (char === "]") bracketCount--;
      }
    }

    if (braceCount !== 0) {
      errors.push({
        line: lines.length,
        message: "Mismatched braces",
      });
    }
    if (parenCount !== 0) {
      errors.push({
        line: lines.length,
        message: "Mismatched parentheses",
      });
    }
    if (bracketCount !== 0) {
      errors.push({
        line: lines.length,
        message: "Mismatched brackets",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          line: 0,
          message: error instanceof Error ? error.message : "Validation error",
        },
      ],
      warnings: [],
    };
  }
}
