"use client";

import { useSyncExternalStore } from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Prevents hydration mismatch for persisted Zustand stores.
 * Uses useSyncExternalStore instead of useEffect + setState
 * so React stays happy and avoids cascading render warnings.
 */
export function PricingStoreProvider({ children, fallback = null }: Props) {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!hydrated) return <>{fallback}</>;

  return <>{children}</>;
}
