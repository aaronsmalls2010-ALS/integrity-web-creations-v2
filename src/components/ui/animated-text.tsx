"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "../../lib/utils";

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
}

const container: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number = 1) => ({
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: i * 0.1 },
  }),
};

const child: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      damping: 14,
      stiffness: 150,
    },
  },
};

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  className,
  delay = 0,
}) => {
  const letters = Array.from(text);

  return (
    <motion.span
      style={{ display: "inline-flex", overflow: "hidden" }}
      variants={container}
      initial="hidden"
      animate="visible"
      custom={delay}
      className={cn("", className)}
    >
      {letters.map((letter, index) => (
        <motion.span key={index} variants={child} style={{ display: "inline-block" }}>
          {letter === " " ? " " : letter}
        </motion.span>
      ))}
    </motion.span>
  );
};

interface AnimatedWordsProps {
  text: string;
  className?: string;
  delay?: number;
}

export const AnimatedWords: React.FC<AnimatedWordsProps> = ({
  text,
  className,
  delay = 0,
}) => {
  const words = text.split(" ");

  return (
    <span className={cn("inline-flex flex-wrap", className)}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{
            duration: 0.4,
            delay: delay + index * 0.12,
            ease: "easeOut",
          }}
          className="mr-[0.25em] inline-block"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
};

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right";
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  className,
  direction = "up",
}) => {
  const offsets = {
    up: { y: 30 },
    down: { y: -30 },
    left: { x: 30 },
    right: { x: -30 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...offsets[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
