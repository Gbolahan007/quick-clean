"use client";

import { useSyncExternalStore } from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PricingStoreProvider({ children, fallback = null }: Props) {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!hydrated) return <>{fallback}</>;

  return <>{children}</>;
}
