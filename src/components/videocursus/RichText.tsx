// Eenvoudige tekst met bulletpoints: regels die beginnen met "- ", "* " of "• " worden een lijst
export default function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks: { type: "p" | "ul"; lines: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.type === "ul") last.lines.push(bullet[1]);
      else blocks.push({ type: "ul", lines: [bullet[1]] });
    } else {
      blocks.push({ type: "p", lines: [line] });
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((block, index) =>
        block.type === "ul" ? (
          <ul key={index} className="space-y-1.5">
            {block.lines.map((line, i) => (
              <li key={i} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={index}>{block.lines[0]}</p>
        ),
      )}
    </div>
  );
}
