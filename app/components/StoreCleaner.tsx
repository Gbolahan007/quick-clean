"use client";
// app/components/StoreCleaner.tsx
// Mounted on success pages to clear booking state after payment.
// Must be a client component — localStorage is not available server-side.

import { useEffect } from "react";

interface StoreCleanerProps {
  storeKeys: string[];
}

export function StoreCleaner({ storeKeys }: StoreCleanerProps) {
  useEffect(() => {
    try {
      storeKeys.forEach((key) => localStorage.removeItem(key));
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
