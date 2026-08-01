/**
 * ──────────────────────────────────────────────────
 * index.tsx  —  LANDING PAGE  (URL: /)
 * ──────────────────────────────────────────────────
 * The public homepage visitors see before signing in.
 * Sections: Navbar → Hero → How It Works → Features
 * → Stats → Footer.
 * ──────────────────────────────────────────────────
 */
import { createFileRoute } from "@tanstack/react-router";
import { LandingNav } from "@/components/dfs/LandingNav";
import { Hero } from "@/components/dfs/Hero";
import { HowItWorks } from "@/components/dfs/HowItWorks";
import { Features } from "@/components/dfs/Features";
import { Stats } from "@/components/dfs/Stats";
import { Footer } from "@/components/dfs/Footer";

const title = "DFS — Distributed, encrypted file storage";
const description =
  "Upload once. DFS splits, encrypts and distributes your files across storage nodes worldwide, then reassembles them on demand.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <Hero />
      <HowItWorks />
      <Features />
      <Stats />
      <Footer />
    </div>
  );
}
