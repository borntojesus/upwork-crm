"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

type RevealAs = "div" | "section" | "li";

type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: RevealAs;
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();

  const initial = reduce ? { opacity: 0 } : { opacity: 0, y: 10 };
  const whileInView = reduce ? { opacity: 1 } : { opacity: 1, y: 0 };
  const viewport = { once: true, margin: "0px 0px -15% 0px" } as const;
  const transition = { duration: 0.4, ease: EASE, delay };

  if (as === "section") {
    return (
      <motion.section
        className={className}
        initial={initial}
        whileInView={whileInView}
        viewport={viewport}
        transition={transition}
      >
        {children}
      </motion.section>
    );
  }

  if (as === "li") {
    return (
      <motion.li
        className={className}
        initial={initial}
        whileInView={whileInView}
        viewport={viewport}
        transition={transition}
      >
        {children}
      </motion.li>
    );
  }

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={whileInView}
      viewport={viewport}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

type RevealStackProps = {
  children: React.ReactNode;
  className?: string;
  itemAs?: RevealAs;
  step?: number;
  baseDelay?: number;
};

export function RevealStack({
  children,
  className,
  itemAs = "div",
  step = 0.06,
  baseDelay = 0,
}: RevealStackProps) {
  const items = React.Children.toArray(children);
  return (
    <>
      {items.map((child, i) => {
        const childKey =
          React.isValidElement(child) && child.key != null ? child.key : i;
        return (
          <Reveal
            key={childKey}
            delay={baseDelay + i * step}
            className={className}
            as={itemAs}
          >
            {child}
          </Reveal>
        );
      })}
    </>
  );
}
