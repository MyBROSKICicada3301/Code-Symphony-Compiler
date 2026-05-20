const items = [
  // Keyboard / Harmony (data types & variables)
  { k: 'int',       label: 'Keyboard — base chord (primary harmonic root)' },
  { k: 'float',     label: 'Keyboard — D variation (color tone)' },
  { k: 'double',    label: 'Keyboard — layered chord (richer harmony)' },
  { k: 'char',      label: 'Keyboard — single note (ASCII → pitch)' },
  { k: 'void',      label: 'Keyboard — rest / silence' },
  { k: 'unsigned',  label: 'Keyboard — octave shift up (brighter)' },
  { k: 'variable',  label: 'Keyboard — recurring motif (deterministic)' },
  { k: 'printf',    label: 'Keyboard — melodic lead / function call motif' },

  // Drums / Rhythm (control flow)
  { k: 'for',       label: 'Drums — repeating drum pattern (loop)' },
  { k: 'while',     label: 'Drums — sustained rhythmic loop' },
  { k: 'if',        label: 'Drums — accented hit (branch)' },
  { k: 'else',      label: 'Drums — alternate variation (branch alt)' },
  { k: 'return',    label: 'Drums — final resolution hit' },

  // Guitar / Melody (operators & expressions)
  { k: '+',         label: 'Guitar — ascending motif (addition/concat)' },
  { k: '-',         label: 'Guitar — descending motif (subtraction)' },
  { k: '*',         label: 'Guitar — distortion / sustain (multiply/pointer op)' },
  { k: '/',         label: 'Guitar — split melody / stereo (division)' },
  { k: '=',         label: 'Guitar — chord lock (assignment stabilizer)' },
  { k: '==',        label: 'Guitar — harmonic match (equality)' },
  { k: '!=',        label: 'Guitar — dissonant strike (inequality)' },

  // Ambient / Memory (pointers & allocation)
  { k: '* (pointer)', label: 'Ambient — echo / pointer deref' },
  { k: '& (address)', label: 'Ambient — reversed echo / reference trigger' },
  { k: 'NULL',        label: 'Ambient — silence drop' },
  { k: 'malloc',      label: 'Ambient — sound spawn (alloc)' },
  { k: 'free',        label: 'Ambient — fade out / decay (free)' },

  // Symbols / Punctuation (structural cues)
  { k: '{ }',       label: 'Phrase boundaries — begin / end musical phrases' },
  { k: ';',         label: 'Beat separator — short timing break' },
  { k: '( )',       label: 'Articulation — envelope shaping' },
  { k: '[ ]',       label: 'Sequencer index — pattern/grid reference' },
];

export function Legend() {
  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border px-3 py-2 uppercase-label">Instrument mapping</div>
      <table className="w-full font-mono text-[12px]">
        <tbody>
          {items.map((it, i) => (
            <tr key={it.k} className={i % 2 ? 'bg-surface-2/40' : ''}>
              <td className="w-[40%] border-r border-border px-3 py-1.5 text-foreground">{it.k}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{it.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
