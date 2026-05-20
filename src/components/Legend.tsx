const items = [
  { k: "for",      label: "percussion loop" },
  { k: "while",    label: "synth drone" },
  { k: "if",       label: "bell / chime" },
  { k: "return",   label: "resolving chord" },
  { k: "printf",   label: "melodic lead" },
  { k: "depth",    label: "harmonic layering" },
  { k: "variable", label: "recurring motif" },
];

export function Legend() {
  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border px-3 py-2 uppercase-label">
        instrument mapping
      </div>
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
