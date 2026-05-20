# Code Symphony Compiler

## Overview

Code Symphony Compiler is an experimental system that transforms C code into music.

Instead of treating code as instructions for a machine, it treats code as a **musical score**. The compiler becomes a performer, interpreting syntax, structure, and execution flow as sound.

The result: every program is not just executed — it is *heard*.

---

## Core Idea

Traditional flow:

> Code → Compiler → Machine Output

Code Symphony flow:

> Code → Parser → Musical Mapping Engine → Sound Output (Live Composition)

Each part of the C program contributes to a layered musical composition:

- Syntax elements become instruments
- Program structure becomes rhythm and harmony
- Execution flow becomes melody progression

---

## Musical Mapping System

### Keywords → Instruments

| C Element  | Sound Representation      |
| ---------- | ------------------------- |
| `int`    | Piano (structure)         |
| `if`     | Bell / Chime (decision)   |
| `for`    | Drum loop (repetition)    |
| `while`  | Synth drone (continuity)  |
| `return` | Resolving chord (closure) |
| `printf` | Lead instrument (voice)   |

---

### Structure → Musical Behavior

- `{}` code blocks → musical phrases
- indentation → volume / reverb depth
- nesting depth → pitch layering
- functions → separate instrument tracks

---

### Execution Flow → Melody Logic

- Linear flow → melody line
- Branching (`if/else`) → harmonic split
- Loops → repeating motifs
- Recursion → evolving echo patterns

---

### Variables → Musical Identity

- Each variable name is hashed into a musical motif
- Reused variables trigger recurring musical themes
- Semantic hints can influence tone (e.g., `enemy`, `score`, `health`)

---

## Experience

When a user writes code like:

```c
for(int i = 0; i < 5; i++) {
    printf("%d", i);
}
```
