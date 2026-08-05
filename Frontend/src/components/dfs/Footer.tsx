import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Github, Twitter } from "lucide-react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Upload", to: "/dashboard" },
      { label: "Downloads", to: "/dashboard/downloads" },
      { label: "Dashboard", to: "/dashboard" },
      { label: "Storage", to: "/dashboard/storage" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", to: "/" },
      { label: "API", to: "/" },
      { label: "Status", to: "/" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/" },
      { label: "Terms", to: "/" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-[220px] text-[14px] text-muted-foreground">
              Split, encrypted and distributed storage for files that must survive anything.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-overline text-faint">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-[14px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="font-mono text-[12px] text-faint">© 2026 upLoader — Distributed File Storage</p>
          <div className="flex items-center gap-1">
            <a
              href="https://github.com"
              aria-label="GitHub"
              className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-200 hover:bg-hover hover:text-foreground"
            >
              <Github className="size-4" />
            </a>
            <a
              href="https://x.com"
              aria-label="X"
              className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-200 hover:bg-hover hover:text-foreground"
            >
              <Twitter className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
