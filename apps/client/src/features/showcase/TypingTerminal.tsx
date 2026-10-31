import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion";

export interface TerminalLine {
  kind: "command" | "output" | "success";
  text: string;
}

interface TypingTerminalProps {
  /** Keep this a module-level constant: a new array on every render restarts the typing. */
  lines: readonly TerminalLine[];
  caption: string;
}

interface Cursor {
  line: number;
  char: number;
}

const COMMAND_CHAR_DELAY_MS = 36;
const OUTPUT_CHAR_DELAY_MS = 12;
const LINE_PAUSE_MS = 420;

/**
 * A decorative terminal that types its lines out once it scrolls into view.
 * With reduced motion it renders fully typed from the start.
 */
export default function TypingTerminal({ lines, caption }: TypingTerminalProps) {
  const terminalRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  // No motion wanted (or no way to know when it's visible) → start fully typed.
  const [cursor, setCursor] = useState<Cursor>(() =>
    prefersReducedMotion() || !("IntersectionObserver" in window)
      ? { line: lines.length, char: 0 }
      : { line: 0, char: 0 },
  );

  useEffect(() => {
    const element = terminalRef.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setStarted(true);
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || cursor.line >= lines.length) return;

    const current = lines[cursor.line];
    const lineDone = cursor.char >= current.text.length;
    const delay = lineDone
      ? LINE_PAUSE_MS
      : current.kind === "command"
        ? COMMAND_CHAR_DELAY_MS
        : OUTPUT_CHAR_DELAY_MS;

    const timeoutId = window.setTimeout(() => {
      setCursor(lineDone ? { line: cursor.line + 1, char: 0 } : { line: cursor.line, char: cursor.char + 1 });
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [started, cursor, lines]);

  const typingLine = cursor.line < lines.length ? lines[cursor.line] : null;

  return (
    <figure className="sx-terminal" ref={terminalRef}>
      <div className="sx-terminal-bar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <pre className="sx-terminal-body" dir="ltr" aria-hidden="true">
        {lines.slice(0, cursor.line).map((line, index) => (
          <span key={index} className={`sx-terminal-${line.kind}`}>
            {line.text}
            {"\n"}
          </span>
        ))}
        {typingLine && (
          <span className={`sx-terminal-${typingLine.kind}`}>{typingLine.text.slice(0, cursor.char)}</span>
        )}
        <span className="sx-terminal-caret" />
      </pre>
      <figcaption className="sx-sr-only">{caption}</figcaption>
    </figure>
  );
}
