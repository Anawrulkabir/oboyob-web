// Delivery charges shown at checkout. The database (delivery_fee() in
// 0006_cart_checkout.sql) decides the real total — keep the two in sync.
export const DELIVERY_ZONES = [
  { id: "inside_dhaka", label: "ঢাকার ভিতরে", labelEn: "Inside Dhaka", fee: 80 },
  { id: "outside_dhaka", label: "ঢাকার বাইরে", labelEn: "Outside Dhaka", fee: 110 },
] as const;

export type DeliveryZone = (typeof DELIVERY_ZONES)[number]["id"];

export const deliveryZone = (id: string | null | undefined) => DELIVERY_ZONES.find((z) => z.id === id);
