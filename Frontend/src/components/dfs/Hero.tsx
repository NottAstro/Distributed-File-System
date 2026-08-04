import { Link } from "@tanstack/react-router";
import { Button } from "./Button";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-[68px]">
      <div className="mesh pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(70% 60% at 50% 40%, black, transparent)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1200px] px-6 py-20">
        <div className="max-w-[720px]">
          <p className="text-overline animate-rise text-faint">Distributed · Encrypted · Fast</p>

          <h1
            className="hero-ink animate-rise mt-6 text-[34px] font-normal leading-[1.08] tracking-[-0.02em] md:text-[38px] lg:text-[46px]"
            style={{ animationDelay: "60ms" }}
          >
            Your files, distributed across the world.
            <br />
            <span className="text-muted-foreground">Always accessible.</span>
          </h1>

          <p
            className="animate-rise mt-6 max-w-[540px] text-[16px] leading-[1.5] text-muted-foreground"
            style={{ animationDelay: "120ms" }}
          >
            Upload once. DFS splits, encrypts, and distributes your files across multiple storage
            nodes. Download from anywhere, anytime.
          </p>

          <div
            className="animate-rise mt-9 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "180ms" }}
          >
            <Button asChild>
              <Link to="/signup">
                Start Uploading <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
