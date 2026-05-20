/**
 * C Code Parser
 * Extracts syntax elements, control flow, and data types for musical mapping
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

export interface ParseResult {
  events: ParsedEvent[];
  structures: StructureInfo[];
  operators: OperatorInfo[];
}

export interface StructureInfo {
  type: "for" | "while" | "if" | "function" | "struct" | "array";
  name?: string;
  startLine: number;
  endLine: number;
  depth: number;
}

export interface OperatorInfo {
  operator:
    | "="
    | "+"
    | "-"
    | "*"
    | "/"
    | "%"
    | "=="
    | "!="
    | "<"
    | ">"
    | "&&"
    | "||"
    | "++"
    | "--";
  line: number;
  column: number;
}

const KEYWORDS = {
  control: /\b(for|while|if|else|switch|case|break|continue|return)\b/g,
  dataType: /\b(int|char|float|double|void|short|long|signed|unsigned)\b/g,
  structType: /\b(struct|union|enum|typedef)\b/g,
  memory: /\b(malloc|calloc|free|NULL)\b/g,
  io: /\b(printf|scanf)\b/g,
};

const OPERATORS = /(\+\+|--|\+=|-=|\*=|\/=|%=|==|!=|<=|>=|&&|\|\||=|\+|-|\*|\/|%|<|>|&|\||\^|!)/g;

const RESERVED = new Set([
  "int",
  "char",
  "float",
  "double",
  "void",
  "short",
  "long",
  "signed",
  "unsigned",
  "if",
  "else",
  "for",
  "while",
  "do",
  "return",
  "switch",
  "case",
  "break",
  "continue",
  "struct",
  "typedef",
  "const",
  "static",
  "sizeof",
  "include",
  "define",
  "NULL",
  "printf",
  "scanf",
  "main",
  "true",
  "false",
  "malloc",
  "free",
  "calloc",
  "union",
  "enum",
]);

export class CCodeParser {
  private source: string;
  private lines: string[];
  private events: ParsedEvent[] = [];
  private structures: StructureInfo[] = [];
  private operators: OperatorInfo[] = [];

  constructor(source: string) {
    this.source = source;
    this.lines = source.split("\n");
  }

  parse(): ParseResult {
    this.events = [];
    this.structures = [];
    this.operators = [];

    let depth = 0;
    const structStack: StructureInfo[] = [];

    for (let lineIdx = 0; lineIdx < this.lines.length; lineIdx++) {
      const line = this.lines[lineIdx];
      const stripped = this.stripComments(line);

      // Track depth changes
      const openBraces = (stripped.match(/{/g) || []).length;
      const closeBraces = (stripped.match(/}/g) || []).length;

      if (closeBraces > 0) {
        depth = Math.max(0, depth - closeBraces);
      }

      // Parse line for events
      this.parseLineEvents(stripped, lineIdx + 1, depth);
      this.parseOperators(stripped, lineIdx + 1);

      if (openBraces > 0) {
        depth += openBraces;
      }
    }

    return {
      events: this.events,
      structures: this.structures,
      operators: this.operators,
    };
  }

  private stripComments(line: string): string {
    return line
      .replace(/\/\/.*$/g, "")
      .replace(/\/\*.*?\*\//g, "")
      .replace(/"(?:\\.|[^"\\])*"/g, '""')
      .replace(/'(?:\\.|[^'\\])*'/g, "''");
  }

  private parseLineEvents(stripped: string, lineNum: number, depth: number): void {
    // Control flow
    const controls = ["for", "while", "if", "return"] as const;
    for (const ctrl of controls) {
      const pattern = new RegExp(`\\b${ctrl}\\b`);
      if (pattern.test(stripped)) {
        this.events.push({
          line: lineNum,
          column: stripped.indexOf(ctrl),
          depth,
          kind: ctrl,
        });
      }
    }

    // I/O functions
    if (/\bprintf\s*\(/.test(stripped)) {
      this.events.push({
        line: lineNum,
        column: stripped.indexOf("printf"),
        depth,
        kind: "printf",
      });
    }

    // Data types
    const typeMatches = stripped.matchAll(
      /\b(int|float|double|char|void|unsigned)\b/g
    );
    for (const match of typeMatches) {
      const dataType = match[1] as
        | "int"
        | "float"
        | "double"
        | "char"
        | "void"
        | "unsigned";
      this.events.push({
        line: lineNum,
        column: match.index || 0,
        depth,
        kind: dataType,
        dataType,
      });
    }

    // Memory operations
    if (/\bmalloc\s*\(/.test(stripped)) {
      this.events.push({
        line: lineNum,
        column: stripped.indexOf("malloc"),
        depth,
        kind: "malloc",
      });
    }
    if (/\bfree\s*\(/.test(stripped)) {
      this.events.push({
        line: lineNum,
        column: stripped.indexOf("free"),
        depth,
        kind: "free",
      });
    }

    // Pointers and references
    if (/\*/.test(stripped) && !/\*\*/.test(stripped)) {
      this.events.push({
        line: lineNum,
        column: stripped.indexOf("*"),
        depth,
        kind: "pointer",
      });
    }

    // Arrays
    if (/\[.*\]/.test(stripped)) {
      this.events.push({
        line: lineNum,
        column: stripped.indexOf("["),
        depth,
        kind: "array",
      });
    }

    // Variables (loose detection)
    const identifiers = stripped.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
    for (const id of identifiers) {
      if (!RESERVED.has(id)) {
        this.events.push({
          line: lineNum,
          column: stripped.indexOf(id),
          depth,
          kind: "var",
          token: id,
        });
      }
    }
  }

  private parseOperators(
    stripped: string,
    lineNum: number
  ): void {
    const matches = stripped.matchAll(OPERATORS);
    for (const match of matches) {
      const op = match[0];
      const validOps = [
        "=",
        "+",
        "-",
        "*",
        "/",
        "%",
        "==",
        "!=",
        "<",
        ">",
        "&&",
        "||",
        "++",
        "--",
      ];
      if (validOps.includes(op)) {
        this.operators.push({
          operator: op as OperatorInfo["operator"],
          line: lineNum,
          column: match.index || 0,
        });
      }
    }
  }
}

export function parseCode(source: string): ParseResult {
  const parser = new CCodeParser(source);
  return parser.parse();
}
