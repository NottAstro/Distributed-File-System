import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Button } from "./Button";

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="glass border-b border-border">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-6">
          <Link to="/" className="text-foreground">
            <Logo />
          </Link>

          <nav className="glass hidden items-center gap-1 rounded-full border border-border px-1.5 py-1.5 md:flex">
            {[
              { label: "How It Works", href: "#how-it-works" },
              { label: "Security", href: "#security" },
              { label: "Stats", href: "#stats" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-1.5 text-[14px] text-muted-foreground transition-colors duration-200 ease-out hover:bg-hover hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/signin">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
