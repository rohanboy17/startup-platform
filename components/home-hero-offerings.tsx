"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { usePerformanceReducedMotion } from "@/lib/use-performance-reduced-motion";
import { cn } from "@/lib/utils";

type HomeHeroOfferingsProps = {
  phrases: string[];
  className?: string;
};

const TYPE_DELAY_MS = 70;
const DELETE_DELAY_MS = 34;
const HOLD_DELAY_MS = 1200;

export default function HomeHeroOfferings({ phrases, className }: HomeHeroOfferingsProps) {
  const reduceMotion = usePerformanceReducedMotion({ disableOnSmallScreens: false });
  const safePhrases = useMemo(() => phrases.filter((item) => item.trim().length > 0), [phrases]);
  const maxPhraseLength = useMemo(
    () => safePhrases.reduce((longest, item) => Math.max(longest, item.length), 0),
    [safePhrases]
  );
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (reduceMotion || safePhrases.length <= 1) {
      return;
    }

    const currentPhrase = safePhrases[phraseIndex] || "";
    const atPhraseEnd = charIndex === currentPhrase.length;

    const timer = window.setTimeout(
      () => {
        if (!isDeleting && !atPhraseEnd) {
          setCharIndex((current) => current + 1);
          return;
        }

        if (!isDeleting && atPhraseEnd) {
          setIsDeleting(true);
          return;
        }

        if (isDeleting && charIndex > 0) {
          setCharIndex((current) => current - 1);
          return;
        }

        setIsDeleting(false);
        setPhraseIndex((current) => (current + 1) % safePhrases.length);
      },
      !isDeleting && atPhraseEnd
        ? HOLD_DELAY_MS
        : isDeleting
          ? DELETE_DELAY_MS
          : TYPE_DELAY_MS
    );

    return () => window.clearTimeout(timer);
  }, [charIndex, isDeleting, phraseIndex, reduceMotion, safePhrases]);

  if (safePhrases.length === 0) return null;

  if (reduceMotion || safePhrases.length === 1) {
    return (
      <span className={cn(className, "min-h-0 whitespace-normal")} aria-label={safePhrases.join(", ")}>
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-current">
          {safePhrases.map((phrase, index) => (
            <Fragment key={phrase}>
              {index > 0 ? <span className="text-foreground/35">•</span> : null}
              <span className="whitespace-normal">{phrase}</span>
            </Fragment>
          ))}
        </span>
      </span>
    );
  }

  const currentPhrase = safePhrases[phraseIndex] || "";
  const visiblePhrase = currentPhrase.slice(0, charIndex);

  return (
    <span
      className={className}
      style={maxPhraseLength ? { minWidth: `${maxPhraseLength + 1}ch` } : undefined}
    >
      <span>{visiblePhrase}</span>
      <span className="ml-1 text-emerald-500 animate-pulse" aria-hidden="true">
        |
      </span>
    </span>
  );
}
