const STATS = [
  { value: "10,000+", label: "Files distributed" },
  { value: "99.9%", label: "Uptime" },
  { value: "256-bit", label: "AES encryption" },
  { value: "<200ms", label: "Retrieval" },
];

export function Stats() {
  return (
    <section id="stats" className="border-t border-border py-20 md:py-[80px]">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-10 px-6 md:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="shimmer-num font-mono text-[30px] tracking-[-0.02em] md:text-[36px]">
              {stat.value}
            </p>
            <p className="mt-2 text-[14px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
