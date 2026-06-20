"use client";

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
