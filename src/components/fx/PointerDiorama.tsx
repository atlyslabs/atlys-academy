"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The pointer diorama - the second kept piece of the previous design pass.
 *
 * Children tagged `data-plate="<name>"` parallax against pointer position at
 * the rate given for that name; one child tagged `data-tilt` gets a slight
 * perspective tilt. Movement is damped through a single rAF lerp that parks
 * itself when settled; transforms only, so nothing lays out.
 *
 * Pointer-only by design: it does not mount its listeners on touch devices
 * or under reduced motion.
 */
export function PointerDiorama({
  rates = {},
  tiltMax = 1,
  className,
  children,
}: {
  /** Parallax distance in px per plate name, at full pointer deflection. */
  rates?: Record<string, number>;
  /** Max tilt in degrees for the `data-tilt` element. */
  tiltMax?: number;
  className?: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const root = rootRef.current;
    if (!root) return;
    const plates = Array.from(
      root.querySelectorAll<HTMLElement>("[data-plate]"),
    );
    const tilt = root.querySelector<HTMLElement>("[data-tilt]");

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;
    let running = false;

    const step = () => {
      current.x += (target.x - current.x) * 0.07;
      current.y += (target.y - current.y) * 0.07;

      for (const plate of plates) {
        const rate = rates[plate.dataset.plate ?? ""] ?? 0;
        plate.style.transform = `translate3d(${current.x * rate}px, ${current.y * rate * 0.7}px, 0)`;
      }
      if (tilt) {
        tilt.style.transform =
          `perspective(1100px) rotateX(${(-current.y * tiltMax).toFixed(3)}deg)` +
          ` rotateY(${(current.x * tiltMax).toFixed(3)}deg)`;
      }

      if (
        Math.abs(target.x - current.x) < 0.001 &&
        Math.abs(target.y - current.y) < 0.001
      ) {
        running = false;
        return;
      }
      frame = requestAnimationFrame(step);
    };

    const onMove = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.y = (event.clientY / window.innerHeight) * 2 - 1;
      if (!running) {
        running = true;
        frame = requestAnimationFrame(step);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
    // `rates` is a static config object at every call site; re-subscribing on
    // its identity would tear the lerp down on parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
