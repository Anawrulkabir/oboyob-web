// Delivery charges. The database (delivery_fee() in 0008_bargain_admin_orders.sql)
// decides the real total — keep the two in sync.

/** What customers can pick at checkout. */
export const DELIVERY_ZONES = [
  { id: "inside_dhaka", label: "ঢাকার ভিতরে", labelEn: "Inside Dhaka", fee: 80 },
  { id: "outside_dhaka", label: "ঢাকার বাইরে", labelEn: "Outside Dhaka", fee: 110 },
] as const;

/** Admin-created orders can also be picked up / handed over in person. */
export const ADMIN_DELIVERY_ZONES = [
  ...DELIVERY_ZONES,
  { id: "pickup", label: "হাতে হাতে / পিকআপ", labelEn: "Pickup", fee: 0 },
] as const;

export type DeliveryZone = (typeof DELIVERY_ZONES)[number]["id"];
export type AdminDeliveryZone = (typeof ADMIN_DELIVERY_ZONES)[number]["id"];

/** Any zone, for showing an order (includes pickup). */
export const deliveryZone = (id: string | null | undefined) => ADMIN_DELIVERY_ZONES.find((z) => z.id === id);
/** Zones a customer may choose on the website. */
export const checkoutZone = (id: string | null | undefined) => DELIVERY_ZONES.find((z) => z.id === id);

/** Where an admin-created order came from. */
export const ORDER_CHANNELS = [
  { id: "facebook", label: "Facebook / Messenger" },
  { id: "phone", label: "ফোন কল" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "in_person", label: "সরাসরি (দোকানে)" },
  { id: "other", label: "অন্যান্য" },
] as const;
export const channelLabel = (id: string | null | undefined) => ORDER_CHANNELS.find((c) => c.id === id)?.label;
