import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  activeLine: number | null;
}

const KEYWORDS = ["for","while","if","else","return","int","char","float","double","void","struct","typedef","const","static","include","define"];
const CALLS = ["printf","scanf","main","malloc","free"];

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"} as any)[c]);
}

function highlight(line: string) {
  let h = escapeHtml(line);
  h = h.replace(/(\/\/.*)$/g, '<span style="color:var(--color-muted-foreground)">$1</span>');
  h = h.replace(/("(?:\\.|[^"\\])*")/g, '<span style="color:var(--color-signal)">$1</span>');
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:oklch(0.35 0.005 90)">$1</span>');
  h = h.replace(new RegExp(`\\b(${KEYWORDS.join("|")})\\b`, "g"),
    '<span style="color:var(--color-foreground);font-weight:500">$1</span>');
  h = h.replace(new RegExp(`\\b(${CALLS.join("|")})\\b`, "g"),
    '<span style="color:var(--color-foreground);text-decoration:underline;text-decoration-color:var(--color-border);text-underline-offset:3px">$1</span>');
  h = h.replace(/^(\s*#\w+)/g, '<span style="color:var(--color-muted-foreground)">$1</span>');
  return h || "&nbsp;";
}

export function CodeEditor({ value, onChange, activeLine }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lines = value.split("\n");

  useEffect(() => {
    const ta = taRef.current, pre = preRef.current;
    if (!ta || !pre) return;
    const onScroll = () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; };
    ta.addEventListener("scroll", onScroll);
    return () => ta.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative flex h-full w-full overflow-hidden border border-border bg-card font-mono text-[13px]">
      <div className="select-none border-r border-border bg-surface-2 px-3 py-3 text-right text-[11px] text-muted-foreground">
        {lines.map((_, i) => (
          <div
            key={i}
            className={`leading-5 ${activeLine === i + 1 ? "text-signal" : ""}`}
          >
            {String(i + 1).padStart(3, "0")}
          </div>
        ))}
      </div>
      <div className="relative flex-1 overflow-hidden">
        <pre
          ref={preRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 m-0 overflow-auto whitespace-pre p-3 leading-5"
        >
          {lines.map((l, i) => (
            <div
              key={i}
              className={activeLine === i + 1 ? "animate-line-mark" : ""}
              dangerouslySetInnerHTML={{ __html: highlight(l) }}
            />
          ))}
        </pre>
        <textarea
          ref={taRef}
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full resize-none overflow-auto bg-transparent p-3 leading-5 text-transparent caret-foreground outline-none scrollbar-thin"
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </div>
    </div>
  );
}
