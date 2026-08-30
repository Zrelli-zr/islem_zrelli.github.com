"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const WINDOW_MS = 2000;
const NEEDED_TAPS = 5;

export default function HiddenAdminTrigger({ visible }) {
  const router = useRouter();
  const tapsRef = useRef([]);
  const [pulsing, setPulsing] = useState(false);

  function onActivate() {
    const now = Date.now();
    tapsRef.current = [...tapsRef.current, now].filter((t) => now - t < WINDOW_MS);

    // Very subtle feedback so a real visitor sees nothing unusual —
    // just a faint, brief opacity dip, the same on every tap.
    setPulsing(true);
    setTimeout(() => setPulsing(false), 120);

    if (tapsRef.current.length >= NEEDED_TAPS) {
      tapsRef.current = [];
      router.push("/admin/login");
    }
  }

  return (
    <div
      className={`mark${visible ? " show" : ""}`}
      onClick={onActivate}
      role="presentation"
      style={{
        cursor: "default",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        opacity: pulsing ? 0.75 : undefined,
        transition: "opacity 120ms ease",
      }}
    >
      I. Z.
    </div>
  );
}
