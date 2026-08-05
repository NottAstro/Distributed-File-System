import { createFileRoute } from "@tanstack/react-router";
import { LandingNav } from "@/components/dfs/LandingNav";
import { HeroSignup } from "@/components/dfs/HeroSignup";
import { HowItWorks } from "@/components/dfs/HowItWorks";
import { Features } from "@/components/dfs/Features";
import { Stats } from "@/components/dfs/Stats";
import { Footer } from "@/components/dfs/Footer";

const title = "upLoader — Distributed, encrypted file storage";
const description =
  "Upload once. upLoader splits, encrypts and distributes your files across storage nodes worldwide, then reassembles them on demand.";

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
    <div className="min-h-screen" style={{ background: "#05060f" }}>
      <LandingNav />
      <HeroSignup />
      <HowItWorks />
      <Features />
      <Stats />
      <Footer />
    </div>
  );
}
