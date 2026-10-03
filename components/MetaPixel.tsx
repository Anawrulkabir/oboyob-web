"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { PIXEL_ID, track } from "@/lib/pixel";

// Loads the Meta Pixel on shop pages (not admin) and counts every page view,
// including in-app navigation that doesn't reload the page.
export default function MetaPixel() {
  const path = usePathname();
  const first = useRef(true);
  // The snippet below counts the first page; later in-app page changes are counted here.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    track("PageView");
  }, [path]);
  if (!PIXEL_ID) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(PIXEL_ID)});
fbq('track', 'PageView');
`}</Script>
  );
}

/** "Viewed a product" — goes on the product page. */
export function PixelViewContent({ code, name, price }: { code: string; name: string; price: number | null }) {
  useEffect(() => {
    track("ViewContent", {
      content_ids: [code], content_name: name, content_type: "product",
      ...(price != null && { value: price, currency: "BDT" }),
    });
  }, [code, name, price]);
  return null;
}

/** "Bought" — on the order confirmation page, once per order, only right after ordering. */
export function PixelPurchase({ orderId, createdAt, value, items }: {
  orderId: string; createdAt: string; value: number; items: { code: string; qty: number; price: number }[];
}) {
  useEffect(() => {
    if (Date.now() - new Date(createdAt).getTime() > 60 * 60 * 1000) return; // old order opened again
    const key = `zp:${orderId}`;
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch {}
    track("Purchase", {
      value, currency: "BDT", content_type: "product",
      content_ids: items.map((i) => i.code),
      contents: items.map((i) => ({ id: i.code, quantity: i.qty, item_price: i.price })),
      num_items: items.reduce((n, i) => n + i.qty, 0),
    }, `order-${orderId}`);
  }, [orderId, createdAt, value, items]);
  return null;
}
