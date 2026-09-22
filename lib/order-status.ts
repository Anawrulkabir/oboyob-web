export const ORDER_STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "নতুন", confirmed: "কনফার্মড", shipped: "পাঠানো হয়েছে", delivered: "ডেলিভারড", cancelled: "বাতিল",
};
