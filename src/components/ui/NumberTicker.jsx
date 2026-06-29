import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useTransform, animate } from "framer-motion";

/**
 * NumberTicker - smoothly animates numeric values on mount or updates.
 */
export default function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className = "",
  decimals = 0,
}) {
  const ref = useRef(null);
  const numericVal = typeof value === "number" ? value : parseFloat(value);
  const isInvalid = isNaN(numericVal);

  const motionValue = useMotionValue(direction === "down" ? (isInvalid ? 0 : numericVal) : 0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 80,
  });
  
  const displayValue = useTransform(springValue, (latest) =>
    latest.toFixed(decimals)
  );

  useEffect(() => {
    if (isInvalid) {
      if (ref.current) {
        ref.current.textContent = value;
      }
      return;
    }

    const timer = setTimeout(() => {
      animate(motionValue, numericVal, {
        duration: 1.5,
        ease: "easeOut",
      });
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [value, numericVal, isInvalid, motionValue, delay]);

  useEffect(() => {
    if (isInvalid) return;
    return displayValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = latest;
      }
    });
  }, [displayValue, isInvalid]);

  return (
    <span
      ref={ref}
      className={`inline-block tabular-nums tracking-wider ${className}`}
    >
      {isInvalid ? value : (direction === "down" ? numericVal : 0)}
    </span>
  );
}
