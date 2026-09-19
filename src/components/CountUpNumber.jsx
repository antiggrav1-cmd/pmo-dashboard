import React, { useState, useEffect, useRef, memo } from "react";
import { formatCurrencyCop, formatCurrencyUsd } from "../utils/calculations";

/**
 * Animated Number Counter (Count-up effect)
 * Smoothly interpolates numbers on mount or when value changes.
 */
export const CountUpNumber = memo(function CountUpNumber({
  value = 0,
  duration = 650,
  decimals = 0,
  prefix = "",
  suffix = "",
  format = "number", // "number" | "cop" | "usd" | "raw"
  className = ""
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const reqIdRef = useRef(null);

  const target = typeof value === "number" ? value : Number(value) || 0;

  useEffect(() => {
    const start = displayValue;
    const end = target;
    const change = end - start;

    if (change === 0) return;

    const startTime = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const current = start + change * easedProgress;

      setDisplayValue(current);

      if (progress < 1) {
        reqIdRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(end);
      }
    };

    reqIdRef.current = requestAnimationFrame(step);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
    };
  }, [target, duration]);

  const formatted = (() => {
    if (format === "cop") {
      return formatCurrencyCop(displayValue);
    }
    if (format === "usd") {
      return formatCurrencyUsd(displayValue);
    }
    if (format === "raw") {
      return decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toString();
    }
    // Default formatted number
    const rounded = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toLocaleString("es-CO");
    return `${prefix}${rounded}${suffix}`;
  })();

  return <span className={className}>{formatted}</span>;
});
