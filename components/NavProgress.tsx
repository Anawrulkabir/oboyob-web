"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A thin bar at the top that starts the instant an internal link is tapped,
// so the site never looks frozen while the next page loads from the server.

type Phase = "idle" | "loading" | "done";

function Bar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [phase, setPhase] = useState<Phase>("idle");

  // The URL changed → the new page is on screen.
  useEffect(() => { setPhase((p) => (p === "loading" ? "done" : p)); }, [pathname, search]);

  useEffect(() => {
    if (phase === "done") { const t = setTimeout(() => setPhase("idle"), 300); return () => clearTimeout(t); }
    if (phase === "loading") { const t = setTimeout(() => setPhase("done"), 15000); return () => clearTimeout(t); } // never stick
  }, [phase]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page / #hash
      setPhase("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (phase === "idle") return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div className={`h-full origin-left bg-haldi ${phase === "loading" ? "nav-progress-grow" : "nav-progress-done"}`} />
    </div>
  );
}

export default function NavProgress() {
  return <Suspense fallback={null}><Bar /></Suspense>;
}
