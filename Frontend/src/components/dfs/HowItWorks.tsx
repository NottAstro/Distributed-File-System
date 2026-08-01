const NODES = [
  { label: "Node A", chunk: "Chunk 1" },
  { label: "Node B", chunk: "Chunk 2" },
  { label: "Node C", chunk: "Chunk 3" },
  { label: "Node D", chunk: "Chunk 4" },
  { label: "Node E", chunk: "Chunk 5" },
  { label: "Node N", chunk: "Chunk n" },
];

export function HowItWorks() {
  const cx = 300;
  const cy = 250;
  const r = 190;

  return (
    <section id="how-it-works" className="border-t border-border py-20 md:py-[80px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <h2 className="max-w-[640px] text-[28px] font-normal leading-[1.15] tracking-[-0.01em] md:text-[36px]">
          Upload. Distribute. Retrieve.
          <br />
          <span className="text-faint">Your files are never stored in one place.</span>
        </h2>

        <div className="mt-14 flex justify-center">
          <svg
            viewBox="0 0 600 500"
            className="h-auto w-full max-w-[720px]"
            role="img"
            aria-label="Diagram: a file split into encrypted chunks distributed across storage nodes"
          >
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeDasharray="2 6"
            />
            <circle
              cx={cx}
              cy={cy}
              r={r - 70}
              fill="none"
              stroke="currentColor"
              className="text-border"
            />

            {NODES.map((node, i) => {
              const angle = (i / NODES.length) * Math.PI * 2 - Math.PI / 2;
              const x = cx + Math.cos(angle) * r;
              const y = cy + Math.sin(angle) * r;
              return (
                <g key={node.label}>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={x}
                    y2={y}
                    stroke="currentColor"
                    className="text-border-strong"
                    strokeDasharray="3 5"
                    style={{ animation: `dfs-dash ${4 + i * 0.4}s linear infinite` }}
                  />
                  <circle cx={x} cy={y} r="5" className="fill-teal" />
                  <circle
                    cx={x}
                    cy={y}
                    r="14"
                    fill="none"
                    stroke="currentColor"
                    className="text-border-strong"
                  />
                  <text
                    x={x}
                    y={y + (Math.sin(angle) >= 0 ? 40 : -30)}
                    textAnchor="middle"
                    className="fill-current text-[13px]"
                    style={{ fill: "var(--foreground)" }}
                  >
                    {node.label}
                  </text>
                  <text
                    x={x}
                    y={y + (Math.sin(angle) >= 0 ? 57 : -13)}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    className="text-[11px]"
                    style={{ fill: "var(--text-faint)", fontSize: 11 }}
                  >
                    {node.chunk}
                  </text>
                </g>
              );
            })}

            <circle cx={cx} cy={cy} r="52" style={{ fill: "var(--surface)" }} />
            <circle
              cx={cx}
              cy={cy}
              r="52"
              fill="none"
              stroke="currentColor"
              className="text-border-strong"
            />
            <text
              x={cx}
              y={cy - 2}
              textAnchor="middle"
              style={{ fill: "var(--foreground)", fontSize: 14 }}
            >
              Your File
            </text>
            <text
              x={cx}
              y={cy + 16}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              style={{ fill: "var(--accent-primary)", fontSize: 10 }}
            >
              AES-256
            </text>
          </svg>
        </div>
      </div>
    </section>
  );
}
