"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Tells /api/visit about each page the shopper opens (for the admin visitor page).
export default function VisitTracker() {
  const path = usePathname();
  useEffect(() => {
    let entry = false;
    try {
      entry = !sessionStorage.getItem("zv-s");
      sessionStorage.setItem("zv-s", "1");
    } catch {}
    fetch("/api/visit", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path, search: entry ? location.search : "", referrer: entry ? document.referrer : "", entry }),
    }).catch(() => {});
  }, [path]);
  return null;
}
