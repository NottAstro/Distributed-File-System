import React from "react";

export function GlassCard({
  children,
  style,
  className,
  isActive = true,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  isActive?: boolean;
}) {
  return (
    <div
      className={className}
      style={{
        background: isActive ? "#000000" : "rgba(255,255,255,0.06)",
        backdropFilter: isActive ? "none" : "blur(12px)",
        WebkitBackdropFilter: isActive ? "none" : "blur(12px)",
        borderRadius: 16,
        padding: "28px 24px",
        boxShadow: isActive
          ? "rgba(216,236,248,0.1) 0px 1px 1px 0px inset, rgba(0,0,0,0.8) 0px 24px 48px 0px"
          : "rgba(255,255,255,0.1) 0px 1px 1px 0px inset, rgba(0,0,0,0.2) 0px 16px 32px 0px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
