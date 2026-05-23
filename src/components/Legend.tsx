const items = [
  // Control flow / rhythm
  { k: "for", label: "Drums — repeating pattern (loop)" },
  { k: "while", label: "Drums — sustained loop" },
  { k: "if", label: "Drums — accented hit (branch)" },
  { k: "else", label: "Drums — alternate branch hit" },
  { k: "switch", label: "Drums — switch / variation" },
  { k: "case", label: "Drums — case tick" },
  { k: "break", label: "Drums — snare / break" },
  { k: "continue", label: "Drums — short hi-hat" },
  { k: "return", label: "Resolution — final chord/hit" },

  // Calls / I/O
  { k: "printf", label: "Lead — melodic function call" },
  { k: "scanf", label: "Lead — input / subtle motif" },

  // Memory / ambient
  { k: "malloc", label: "Ambient — alloc / sound spawn" },
  { k: "free", label: "Ambient — decay / free" },
  { k: "sizeof", label: "Click — size / small percussive cue" },

  // Types / pads
  { k: "struct", label: "Pad — structure (warm background)" },
  { k: "typedef", label: "Pad — type alias (variation)" },
  { k: "enum", label: "Pad — harmonic tint" },
  { k: "union", label: "Pad — blended texture" },

  // Operators / small percussion
  { k: "assign", label: "Click — assignment" },
  { k: "compare", label: "Click — comparison (harmonic match)" },
  { k: "pointer", label: "Click — pointer / indirection" },
  { k: "increment", label: "Click — increment tick" },
  { k: "bitwise", label: "Glitch — bitwise / noisy texture" },
  { k: "cast", label: "Glitch — type cast / filter sweep" },

  // Literals & comments
  { k: "string_lit", label: "Marimba — string literal / bright hit" },
  { k: "number_lit", label: "Marimba — numeric literal / tone" },
  { k: "macro", label: "Sweep — preprocessor macro" },
  { k: "comment", label: "Shimmer — comment / texture" },

  // Variables
  { k: "var", label: "Motif — variable name → recurring melodic motif" },
];

export function Legend() {
  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border px-3 py-2 uppercase-label">Instrument mapping</div>
      <table className="w-full font-mono text-[12px]">
        <tbody>
          {items.map((it, i) => (
            <tr key={it.k} className={i % 2 ? "bg-surface-2/40" : ""}>
              <td className="w-[40%] border-r border-border px-3 py-1.5 text-foreground">{it.k}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{it.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}