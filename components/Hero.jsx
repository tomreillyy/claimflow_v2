'use client';
import React from 'react';

export function Hero() {
  const gridStyle = {
    backgroundImage:
      'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),' +
      'linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
    backgroundSize: '32px 32px',
  };

  const glowStyle = {
    background:
      'radial-gradient(60% 60% at 50% 20%, rgba(28,43,255,0.25) 0%, rgba(0,194,255,0.18) 25%, rgba(0,0,0,0) 60%)',
    filter: 'blur(30px)'
  };

  return (
    <main className="relative isolate overflow-hidden bg-[#0B0C0F] text-white" data-testid="hero-root">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={gridStyle} />
        <div className="absolute -top-64 left-1/2 h-[72rem] w-[72rem] -translate-x-1/2 rounded-full opacity-40" style={glowStyle} />
      </div>

      <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-y-16 px-6 pb-28 pt-28 md:grid-cols-12 md:gap-x-8 lg:px-10 lg:pb-36 lg:pt-36">
        <div className="md:col-span-6 lg:col-span-5">
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            R&D claims, captured <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">as you work</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-white/70 sm:text-lg">
            Forward project emails. Drop files. Type quick notes. ClaimFlow quietly organizes everything into ATO-ready activities — so year‑end isn’t a rebuild.
          </p>

          <div className="mt-10 flex items-center gap-4">
            <a
              href="/admin/new-project"
              className="group relative inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-white transition [text-shadow:0_0_1px_rgba(255,255,255,.2)]"
              data-testid="cta-start"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#06B6D4] opacity-90 transition group-hover:opacity-100" />
              <span className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[#2563EB] to-[#06B6D4] blur-md opacity-35" aria-hidden />
              <span className="relative">Start a project</span>
            </a>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white/90 backdrop-blur-sm transition hover:border-white/25 hover:text-white"
              data-testid="cta-demo"
            >
              See a 60‑second demo
            </a>
          </div>

          <p className="mt-4 text-sm text-white/45">Built in Australia. Exports organized by core & supporting activities.</p>
        </div>

        <div className="md:col-span-6 md:col-start-7 lg:col-span-7">
          <div className="relative mx-auto w-full max-w-[940px]" data-testid="product-frame">
            <div className="relative rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_50px_rgba(0,0,0,0.5)] ring-1 ring-black/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <div className="ml-3 h-6 flex-1 rounded-md bg-white/5" />
              </div>
              <div className="relative">
                <img
                  src="/hero-screenshot.png"
                  alt="ClaimFlow evidence timeline"
                  className="rounded-b-2xl w-full"
                />
                <div className="pointer-events-none absolute inset-0 rounded-b-2xl ring-1 ring-white/10" />
              </div>
            </div>

            <div className="absolute -bottom-6 left-6 hidden rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 shadow-xl backdrop-blur-md md:block">
              Email → Evidence card. PDF export in one click.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
