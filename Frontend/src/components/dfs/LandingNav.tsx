import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Button } from "./Button";

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        style={{
          background: "rgba(5,6,15,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(186,215,247,0.08)",
        }}
      >
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-6">
          <Link to="/" className="text-foreground">
            <Logo />
          </Link>

          <nav
            style={{
              background: "rgba(186,214,247,0.04)",
              boxShadow: "rgba(186,215,247,0.10) 0px 0px 0px 1px inset",
              borderRadius: 999,
              padding: "6px",
            }}
            className="hidden items-center gap-1 md:flex"
          >
            {[
              { label: "How It Works", href: "#how-it-works" },
              { label: "Security", href: "#security" },
              { label: "Stats", href: "#stats" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  borderRadius: 999,
                  padding: "6px 16px",
                  fontSize: 14,
                  color: "var(--ak-moon)",
                  transition: "color 150ms ease, background 150ms ease",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "#ffffff";
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(186,214,247,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--ak-moon)";
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/signin" style={{ color: "var(--ak-moon)" }}>Sign In</Link>
            </Button>
            <button
              style={{
                borderRadius: 999,
                padding: "8px 16px",
                background: "rgba(186,214,247,0.06)",
                boxShadow: "rgba(186,215,247,0.12) 0px 0px 0px 1px inset",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                transition: "background 200ms ease",
                fontFamily: "var(--font-sans)",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(186,214,247,0.12)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(186,214,247,0.06)")}
              onClick={() => document.getElementById("hero-signup-submit")?.closest("form")?.querySelector("input")?.focus()}
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

