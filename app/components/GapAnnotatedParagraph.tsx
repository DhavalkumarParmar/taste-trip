"use client";
// The signature element. Renders the taste paragraph; if `gapPhrase` is a
// verbatim substring, wraps that span with a dashed underline whose color
// transitions in after a delay — visually "inking the annotation onto the page."
import { useEffect, useState } from "react";

export function GapAnnotatedParagraph({
  paragraph,
  gapPhrase,
  delayMs = 900,
}: {
  paragraph: string;
  gapPhrase: string;
  delayMs?: number;
}) {
  const hasGap = !!gapPhrase && paragraph.includes(gapPhrase);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!hasGap) return;
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), delayMs);
    return () => clearTimeout(t);
  }, [hasGap, gapPhrase, paragraph, delayMs]);

  if (!hasGap) {
    return <p className="taste-paragraph">{paragraph}</p>;
  }
  const idx = paragraph.indexOf(gapPhrase);
  const before = paragraph.slice(0, idx);
  const after = paragraph.slice(idx + gapPhrase.length);
  return (
    <p className="taste-paragraph">
      {before}
      <span className={`gap-annotation ${revealed ? "revealed" : ""}`}>
        {gapPhrase}
      </span>
      {after}
    </p>
  );
}
