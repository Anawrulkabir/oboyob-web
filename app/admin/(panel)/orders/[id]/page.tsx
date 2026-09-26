import Link from "next/link";
import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import EmailComposer from "@/components/admin/EmailComposer";
import { requireAdmin } from "@/lib/admin";
import { setOrderStatus } from "@/app/admin/actions";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/order-status";
import { formatPrice } from "@/lib/format";
import { deliveryZone } from "@/lib/delivery";
import { loadOrder, orderRef } from "@/lib/orders";
import { emailConfigured } from "@/lib/notify";
import { site } from "@/lib/site";
import { btnQuiet } from "@/components/admin/styles";
import PhoneActions from "@/components/admin/PhoneActions";
import PricingEditor from "@/components/admin/PricingEditor";
import { channelLabel } from "@/lib/delivery";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ compose?: string; error?: string; created?: string }> };

const dateFmt = new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });
const tk = (n: number | null) => `Tk ${(n ?? 0).toLocaleString("en-IN")}`;

export default async function OrderDetail({ params, searchParams }: Props) {
  const { sb } = await requireAdmin();
  const { id } = await params;
  const { compose, error, created } = await searchParams;
  const o = await loadOrder(sb, id);
  if (!o) notFound();
  const zone = deliveryZone(o.delivery_zone);
  const ref = orderRef(o.id);
  const first = o.customer_name.split(/\s+/)[0] ?? o.customer_name;

  // Default email for a confirmed order — the admin can change every word before sending.
  const defaults = {
    subject: `Your order #${ref} is confirmed — ${site.nameEn}`,
    message:
      `Dear ${first},\n\n` +
      `Thank you for shopping with ${site.nameEn}! We're happy to let you know that your order #${ref} is confirmed and is being prepared for delivery.\n\n` +
      `Delivery: ${zone?.labelEn ?? "—"}. Payment: cash on delivery — please keep ${tk(o.total)} ready when your parcel arrives.\n\n` +
      `Your payment slip is attached to this email. If you have any questions, just reply or message us on Facebook.\n\n` +
      `Warm regards,\n${site.nameEn}`,
  };

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin/orders" className="text-sm text-ink-soft hover:text-ink">← অর্ডার</Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl">অর্ডার <span className="font-sans tabular-nums">#{ref}</span></h1>
          <a href={`/order/${o.id}/slip.pdf?t=${o.slip_token}`} className={btnQuiet}>⬇ Payment slip (PDF)</a>
        </div>
        <p className="text-sm text-ink-soft">
          {dateFmt.format(new Date(o.created_at))} · ক্যাশ অন ডেলিভারি ·{" "}
          {o.source === "admin" ? <>অ্যাডমিন তৈরি{o.channel && ` (${channelLabel(o.channel)})`}</> : "ওয়েবসাইট অর্ডার"}
        </p>
        {created && <p className="mt-3 text-leaf">✓ অর্ডার তৈরি হয়েছে, স্টক কমানো হয়েছে।</p>}
        {o.price_note && <p className="mt-2 text-sm"><span className="text-ink-soft">দামের নোট:</span> {o.price_note}</p>}
      </div>

      {error === "restock" && (
        <p role="alert" className="text-sindoor">বাতিল অর্ডারটি ফেরানো যায়নি — পণ্যের যথেষ্ট স্টক নেই। আগে পণ্যের স্টক বাড়ান।</p>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-lg">পণ্য</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
            {o.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-2.5">
                <span>
                  {i.product_id ? <Link href={`/admin/products/${i.product_id}`} className="hover:text-haldi">{i.product_name}</Link> : i.product_name}
                  <span className="text-ink-soft"> ({i.product_code}) × {i.quantity}</span>
                  {i.list_price != null && i.list_price > i.unit_price && (
                    <span className="block text-xs text-leaf">বিশেষ দাম {formatPrice(i.unit_price)} (নিয়মিত {formatPrice(i.list_price)})</span>
                  )}
                </span>
                <span className="tabular-nums">{formatPrice(i.unit_price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">সাবটোটাল</dt><dd className="tabular-nums">{formatPrice(o.subtotal)}</dd></div>
            {o.discount > 0 && <div className="flex justify-between text-leaf"><dt>কুপন {o.coupon_code}</dt><dd className="tabular-nums">−{formatPrice(o.discount)}</dd></div>}
            {o.admin_discount > 0 && <div className="flex justify-between text-leaf"><dt>বিশেষ ছাড়</dt><dd className="tabular-nums">−{formatPrice(o.admin_discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-soft">ডেলিভারি ({zone?.label ?? "—"})</dt><dd className="tabular-nums">{formatPrice(o.delivery_charge)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-base"><dt>মোট (COD)</dt><dd className="font-medium tabular-nums">{formatPrice(o.total)}</dd></div>
          </dl>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-lg">গ্রাহক</h2>
            <p className="mt-2">{o.customer_name}</p>
            <div className="mt-1"><PhoneActions phone={o.customer_phone} /></div>
            <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{o.customer_address}</p>
            {o.customer_email && <p className="text-sm text-ink-soft">{o.customer_email}</p>}
            {o.note && <p className="mt-2 text-sm italic text-ink-soft">“{o.note}”</p>}
          </div>
          <form action={setOrderStatus.bind(null, o.id, "detail")} className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">স্ট্যাটাস</span>
            <select name="status" defaultValue={o.status} className="border border-line bg-paper px-2 py-1.5 text-sm">
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
            </select>
            <SubmitButton className={btnQuiet} pendingText="আপডেট হচ্ছে…">আপডেট</SubmitButton>
          </form>
          <p className="text-xs text-ink-soft">দরদাম হলে আগে নিচে “দাম ও ছাড়” ঠিক করুন, তারপর “কনফার্মড” করুন — গ্রাহককে ইমেইল পাঠানোর ফর্ম খুলবে (স্লিপসহ)। পাঠানো/ডেলিভারড/বাতিল হলে গ্রাহক নিজে থেকেই আপডেট পাবেন।</p>
        </section>
      </div>

      {o.status !== "delivered" && o.status !== "cancelled" && <PricingEditor order={o} />}

      <section id="email" className="scroll-mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl">গ্রাহককে ইমেইল</h2>
          {o.emailed_at && <p className="text-sm text-leaf">✉ শেষ পাঠানো: {dateFmt.format(new Date(o.emailed_at))}</p>}
        </div>
        {!emailConfigured() ? (
          <p className="mt-3 text-sm text-sindoor">ইমেইল চালু নেই — Vercel-এ SMTP_USER (আপনার Gmail) ও SMTP_PASS (Gmail App Password) সেট করুন। README-তে ধাপগুলো আছে।</p>
        ) : (
          <EmailComposer orderId={o.id} to={o.customer_email ?? ""} defaults={defaults} open={compose === "1"} />
        )}
      </section>
    </div>
  );
}
