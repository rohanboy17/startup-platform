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
  const updateTimeoutsRef = useRef<number[]>([]);
  const mountFrameRef = useRef<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const updateControls = useCallback(() => {
    const node = trackRef.current;
    if (!node) return;

    const items = Array.from(node.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement
    );
    const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth);
    const hasOverflow = maxScrollLeft > 8 && items.length > 1;

    setShowControls(hasOverflow);

    if (!hasOverflow) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const scrollLeft = Math.min(Math.max(node.scrollLeft, 0), maxScrollLeft);
    let activeIndex = 0;
    let smallestDistance = Number.POSITIVE_INFINITY;

    items.forEach((item, index) => {
      const distance = Math.abs(item.offsetLeft - scrollLeft);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        activeIndex = index;
      }
    });

    setCanScrollLeft(activeIndex > 0);
    setCanScrollRight(activeIndex < items.length - 1);
  }, []);

  const scheduleControlUpdates = useCallback(() => {
    updateControls();
    updateTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    updateTimeoutsRef.current = [120, 260, 420].map((delayMs) =>
      window.setTimeout(updateControls, delayMs)
    );
  }, [updateControls]);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;

    mountFrameRef.current = window.requestAnimationFrame(scheduleControlUpdates);

    const handleScroll = () => updateControls();
    const handleSettle = () => scheduleControlUpdates();
    node.addEventListener("scroll", handleScroll, { passive: true });
    node.addEventListener("touchend", handleSettle, { passive: true });
    node.addEventListener("pointerup", handleSettle, { passive: true });
    node.addEventListener("scrollend", handleSettle as EventListener, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleControlUpdates())
        : null;

    resizeObserver?.observe(node);
    Array.from(node.children).forEach((child) => resizeObserver?.observe(child));
    window.addEventListener("resize", scheduleControlUpdates);

    return () => {
      node.removeEventListener("scroll", handleScroll);
      node.removeEventListener("touchend", handleSettle);
      node.removeEventListener("pointerup", handleSettle);
      node.removeEventListener("scrollend", handleSettle as EventListener);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleControlUpdates);
      if (mountFrameRef.current !== null) {
        window.cancelAnimationFrame(mountFrameRef.current);
      }
      updateTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [children, scheduleControlUpdates, updateControls]);

  const scrollByAmount = (direction: -1 | 1) => {
    const node = trackRef.current;
    if (!node) return;
    const items = Array.from(node.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement
    );
    if (items.length === 0) return;

    const scrollLeft = node.scrollLeft;
    let activeIndex = 0;
    let smallestDistance = Number.POSITIVE_INFINITY;

    items.forEach((item, index) => {
      const distance = Math.abs(item.offsetLeft - scrollLeft);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        activeIndex = index;
      }
    });

    const targetIndex = Math.max(0, Math.min(items.length - 1, activeIndex + direction));
    node.scrollTo({ left: items[targetIndex].offsetLeft, behavior: "smooth" });
    requestAnimationFrame(scheduleControlUpdates);
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
              "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-200",
              canScrollLeft
                ? "border-foreground/85 bg-foreground text-background shadow-[0_8px_20px_-12px_rgba(15,23,42,0.55)] hover:bg-foreground/90"
                : "cursor-not-allowed border-foreground/10 bg-background/70 text-foreground/25 shadow-none"
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
              "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-200",
              canScrollRight
                ? "border-foreground/85 bg-foreground text-background shadow-[0_8px_20px_-12px_rgba(15,23,42,0.55)] hover:bg-foreground/90"
                : "cursor-not-allowed border-foreground/10 bg-background/70 text-foreground/25 shadow-none"
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
