"use client";

import { ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MotionStagger } from "@/components/motion-stagger";
import { cn } from "@/lib/utils";

type MobileCarouselShellProps = {
  children: ReactNode;
  className: string;
  delay?: number;
  controlsClassName?: string;
};

export default function MobileCarouselShell({
  children,
  className,
  delay = 0,
  controlsClassName,
}: MobileCarouselShellProps) {
  const t = useTranslations("home");
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const updateControls = useCallback(() => {
    const node = trackRef.current;
    if (!node) return;

    const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth);
    const hasOverflow = maxScrollLeft > 8;
    const firstChild = node.firstElementChild as HTMLElement | null;
    const lastChild = node.lastElementChild as HTMLElement | null;

    setShowControls(hasOverflow);

    if (!hasOverflow || !firstChild || !lastChild) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const containerRect = node.getBoundingClientRect();
    const firstRect = firstChild.getBoundingClientRect();
    const lastRect = lastChild.getBoundingClientRect();
    const tolerance = 6;

    setCanScrollLeft(firstRect.left < containerRect.left - tolerance);
    setCanScrollRight(lastRect.right > containerRect.right + tolerance);
  }, []);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;

    updateControls();

    const handleScroll = () => updateControls();
    node.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateControls())
        : null;

    resizeObserver?.observe(node);
    window.addEventListener("resize", updateControls);

    return () => {
      node.removeEventListener("scroll", handleScroll);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateControls);
    };
  }, [children, updateControls]);

  const scrollByAmount = (direction: -1 | 1) => {
    const node = trackRef.current;
    if (!node) return;
    const amount = Math.max(node.clientWidth * 0.82, 220);
    node.scrollBy({ left: direction * amount, behavior: "smooth" });
    requestAnimationFrame(updateControls);
    window.setTimeout(updateControls, 220);
    window.setTimeout(updateControls, 420);
  };

  return (
    <>
      <div
        className={cn(
          "mb-3 hidden items-center justify-between gap-3 md:hidden",
          showControls && "flex",
          controlsClassName
        )}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-background/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/55">
          <MoveHorizontal size={14} className="text-foreground/45" />
          {t("mobileSwipeHint")}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollByAmount(-1)}
            disabled={!canScrollLeft}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
              canScrollLeft
                ? "border-foreground/15 bg-background/80 text-foreground/70 hover:bg-foreground/8"
                : "cursor-not-allowed border-foreground/8 bg-foreground/[0.03] text-foreground/25"
            )}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollByAmount(1)}
            disabled={!canScrollRight}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
              canScrollRight
                ? "border-foreground/15 bg-background/80 text-foreground/70 hover:bg-foreground/8"
                : "cursor-not-allowed border-foreground/8 bg-foreground/[0.03] text-foreground/25"
            )}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <MotionStagger ref={trackRef} className={className} delay={delay}>
        {children}
      </MotionStagger>
    </>
  );
}
