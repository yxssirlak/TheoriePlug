"use client";

import { useCallback, useSyncExternalStore } from "react";

const SIDEBAR_PREFERENCE_KEY = "theorieplug-sidebar-collapsed";
const subscribers = new Set<() => void>();

function subscribe(callback: () => void) {
  subscribers.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    subscribers.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === "true";
}

function setPreference(collapsed: boolean) {
  window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(collapsed));
  subscribers.forEach((notify) => notify());
}

export function useSidebarPreference() {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const toggleCollapsed = useCallback(() => setPreference(!collapsed), [collapsed]);

  return [collapsed, toggleCollapsed] as const;
}
