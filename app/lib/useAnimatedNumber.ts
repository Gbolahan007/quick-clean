"use client";

import { useEffect, useRef, useState } from "react";

export function useAnimatedNumber(target: number, duration = 350): number {
  const [current, setCurrent] = useState(target);
  const rafRef = useRef<number>(0);
  const fromRef = useRef<number>(target);
  const startRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = current;
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      setCurrent(fromRef.current + (target - fromRef.current) * ease);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return Math.round(current);
}
