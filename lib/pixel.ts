// Meta (Facebook) Pixel. Switched on by NEXT_PUBLIC_META_PIXEL_ID in Vercel;
// without it every call here does nothing.

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || null;

type Fbq = (...args: unknown[]) => void;

/** Sends a standard Pixel event (ViewContent, AddToCart, InitiateCheckout, Purchase…). */
export function track(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (!PIXEL_ID || typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (!fbq) return;
  if (eventId) fbq("track", event, params ?? {}, { eventID: eventId });
  else fbq("track", event, params ?? {});
}
