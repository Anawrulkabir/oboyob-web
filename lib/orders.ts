import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus } from "@/lib/order-status";

export interface OrderItem {
  id: string;
  product_id: string | null;
  product_code: string;
  product_name: string;
  unit_price: number;
  quantity: number;
}

/** An order with its lines, as the slip, emails and admin pages use it. */
export interface Order {
  id: string;
  created_at: string;
  status: OrderStatus;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_email: string | null;
  note: string | null;
  coupon_code: string | null;
  discount: number;
  delivery_zone: "inside_dhaka" | "outside_dhaka" | null;
  delivery_charge: number;
  subtotal: number | null;
  total: number | null;
  payment_method: "cod";
  slip_token: string;
  emailed_at: string | null;
  items: OrderItem[];
}

export const ORDER_SELECT = "*, items:order_items(id, product_id, product_code, product_name, unit_price, quantity)";

/** Short reference customers see: first 8 characters of the id, uppercase. */
export const orderRef = (id: string) => id.slice(0, 8).toUpperCase();

export async function loadOrder(db: SupabaseClient, id: string): Promise<Order | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  return (data as Order | null) ?? null;
}
