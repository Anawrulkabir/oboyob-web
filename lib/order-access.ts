import "server-only";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSessionClient } from "@/lib/supabase/session";
import { loadOrder, type Order } from "@/lib/orders";

/**
 * An order for its slip: allowed with the secret link token (guests), or
 * for the signed-in customer who placed it, or for an admin.
 */
export async function orderForSlip(id: string, token: string | null): Promise<Order | null> {
  const db = getServiceClient();
  if (!db) return null;
  const order = await loadOrder(db, id);
  if (!order) return null;
  if (token && token === order.slip_token) return order;
  if (!isSupabaseConfigured) return null;
  const sb = await createSessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  if (order.customer_id === user.id) return order;
  const { data: admin } = await sb.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return admin ? order : null;
}
