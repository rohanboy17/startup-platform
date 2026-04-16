"use client";

import { useSyncExternalStore } from "react";

let isOpen = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeDashboardMobileNav(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDashboardMobileNavSnapshot() {
  return isOpen;
}

export function setDashboardMobileNavOpen(next: boolean) {
  if (isOpen === next) return;
  isOpen = next;
  emit();
}

export function toggleDashboardMobileNav() {
  setDashboardMobileNavOpen(!isOpen);
}

export function useDashboardMobileNav() {
  const open = useSyncExternalStore(
    subscribeDashboardMobileNav,
    getDashboardMobileNavSnapshot,
    () => false
  );

  return {
    open,
    setOpen: setDashboardMobileNavOpen,
    toggle: toggleDashboardMobileNav,
  };
}
