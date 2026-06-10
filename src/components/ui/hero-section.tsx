"use client";

import React from "react";
import { motion } from "framer-motion";
import { Particles } from "./particles";
import { AnimatedText, FadeIn } from "./animated-text";

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#000d1a]">
      {/* Particle background */}
      <Particles quantity={250} color="#8899aa" size={0.5} staticity={40} ease={60} />

      {/* Radial glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[900px] h-[900px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(0,229,255,0.03) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* IWC Monogram */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="font-serif leading-none mb-4 select-none"
          style={{
            fontSize: "clamp(80px, 14vw, 180px)",
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 700,
            background: "linear-gradient(135deg, #8899aa 0%, #c0cad8 25%, #e8edf3 45%, #ffffff 50%, #e0e7ee 55%, #b0bec5 75%, #8899aa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "0.08em",
          }}
        >
          <AnimatedText text="IWC" delay={0.3} />
        </motion.h1>

        {/* Engineered by Design */}
        <FadeIn delay={1.2}>
          <p
            className="text-[#8899aa] mb-6 select-none"
            style={{
              fontSize: "clamp(11px, 1.4vw, 16px)",
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              fontWeight: 300,
            }}
          >
            Engineered by Design
          </p>
        </FadeIn>

        {/* Decorative line */}
        <FadeIn delay={1.5}>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#8899aa]/30" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#8899aa]/30" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#8899aa]/30" />
          </div>
        </FadeIn>

        {/* INTEGRITY WEB CREATIONS */}
        <FadeIn delay={1.7}>
          <h2
            className="mb-2 select-none"
            style={{
              fontSize: "clamp(16px, 2.8vw, 36px)",
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 600,
              letterSpacing: "0.15em",
              background: "linear-gradient(135deg, #b0bec5 0%, #d4dce6 30%, #ffffff 50%, #d4dce6 70%, #b0bec5 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            INTEGRITY
          </h2>
        </FadeIn>

        <FadeIn delay={1.9}>
          <p
            className="text-[#8899aa] mb-8 select-none"
            style={{
              fontSize: "clamp(10px, 1.2vw, 14px)",
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              fontWeight: 400,
            }}
          >
            — Web Creations —
          </p>
        </FadeIn>

        {/* Tagline */}
        <FadeIn delay={2.2}>
          <p
            className="text-[#64748b] mb-12 select-none"
            style={{
              fontSize: "clamp(9px, 1vw, 12px)",
              letterSpacing: "0.6em",
              textTransform: "uppercase",
              fontWeight: 400,
            }}
          >
            Design. Function. Integrity.
          </p>
        </FadeIn>

        {/* CTA Buttons */}
        <FadeIn delay={2.5}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/contact"
              className="group relative inline-flex items-center gap-3 border border-white/10 hover:border-[#00e5ff]/30 text-white font-semibold px-9 py-4 transition-all duration-500 no-underline text-sm tracking-[0.15em] uppercase overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))" }}
            >
              <span className="relative z-10">Start a Project</span>
              <svg className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              <div className="absolute inset-0 bg-gradient-to-r from-[#00e5ff]/0 via-[#00e5ff]/5 to-[#00e5ff]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </a>
            <a
              href="/clients"
              className="inline-flex items-center text-[#8899aa] hover:text-white text-sm tracking-[0.15em] uppercase px-6 py-4 transition-all duration-300 no-underline"
            >
              View Our Work
            </a>
          </div>
        </FadeIn>
      </div>

      {/* Scroll indicator */}
      <FadeIn delay={3}>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <span className="text-[#64748b]/40 text-[9px] tracking-[0.4em] uppercase">Scroll</span>
          <motion.div
            className="w-px h-10 bg-gradient-to-b from-[#8899aa]/30 to-transparent relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.2 }}
          >
            <motion.div
              className="absolute top-0 left-0 w-full h-3 bg-[#00e5ff]/30"
              animate={{ y: ["-12px", "40px"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </FadeIn>
    </section>
  );
};
