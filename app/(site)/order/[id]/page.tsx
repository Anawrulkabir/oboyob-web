import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { orderForSlip } from "@/lib/order-access";
import { orderRef } from "@/lib/orders";
import { deliveryZone } from "@/lib/delivery";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Payment slip", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

const tk = (n: number | null | undefined) => `Tk ${(n ?? 0).toLocaleString("en-IN")}`;
const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

// The payment slip (English), shown right after checkout and from "My orders".
export default async function OrderSlipPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { t } = await searchParams;
  const o = await orderForSlip(id, t ?? null);
  if (!o) notFound();
  const zone = deliveryZone(o.delivery_zone);
  const pdfHref = `/order/${o.id}/slip.pdf?t=${o.slip_token}`;

  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 sm:px-8 md:pt-12">
      <div className="text-center">
        <p className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-leaf/10 text-2xl text-leaf" aria-hidden>✓</p>
        <h1 className="mt-4 text-3xl sm:text-4xl">ধন্যবাদ, অর্ডার পেয়েছি!</h1>
        <p className="mt-2 text-ink-soft">কনফার্ম করতে আমরা শীঘ্রই আপনাকে ফোন করব। পেমেন্ট স্লিপটি সংরক্ষণ করে রাখুন।</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={pdfHref} className="bg-ink px-6 py-3 text-paper hover:bg-ink/85">⬇ Download PDF slip</a>
          <Link href="/shop" className="border border-ink px-6 py-3 hover:bg-ink hover:text-paper">কেনাকাটা চালিয়ে যান</Link>
        </div>
      </div>

      {/* The slip, as on the PDF */}
      <article aria-label={`Payment slip #${orderRef(o.id)}`} className="mt-10 border border-line bg-white font-sans text-[15px] shadow-[0_10px_40px_-24px_rgba(35,31,27,0.4)]" lang="en">
        <header className="flex flex-wrap items-start justify-between gap-4 border-t-4 border-haldi bg-paper-deep px-6 py-6 sm:px-8">
          <div>
            <p className="text-xl font-semibold tracking-wide">{site.nameEn.toUpperCase()}</p>
            <p className="text-sm text-ink-soft">{site.tagline}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold">PAYMENT SLIP</p>
            <p className="text-sm">Order #{orderRef(o.id)}</p>
            <p className="text-xs text-ink-soft">{dateFmt.format(new Date(o.created_at))}</p>
          </div>
        </header>

        <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 sm:px-8">
          <div>
            <p className="text-xs font-semibold tracking-wider text-haldi">DELIVER TO</p>
            <p className="mt-1 font-medium">{o.customer_name}</p>
            <p className="tabular-nums">{o.customer_phone}</p>
            <p className="whitespace-pre-line text-ink-soft">{o.customer_address}</p>
            {o.customer_email && <p className="text-ink-soft">{o.customer_email}</p>}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 self-start text-sm">
            <dt className="col-span-2 mb-1 text-xs font-semibold tracking-wider text-haldi">DELIVERY &amp; PAYMENT</dt>
            <dt className="text-ink-soft">Delivery area</dt><dd>{zone?.labelEn ?? "-"}</dd>
            <dt className="text-ink-soft">Payment</dt><dd>Cash on Delivery</dd>
            <dt className="text-ink-soft">Payment status</dt><dd>Due on delivery</dd>
            {o.note && <><dt className="text-ink-soft">Note</dt><dd>{o.note}</dd></>}
          </dl>
        </div>

        <div className="overflow-x-auto px-6 sm:px-8">
          <table className="w-full min-w-[440px] text-sm">
            <thead>
              <tr className="bg-ink text-left text-xs tracking-wider text-paper">
                <th className="px-3 py-2.5 font-semibold">ITEM</th>
                <th className="px-3 py-2.5 text-right font-semibold">UNIT PRICE</th>
                <th className="px-3 py-2.5 text-center font-semibold">QTY</th>
                <th className="px-3 py-2.5 text-right font-semibold">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id} className="border-b border-line">
                  <td className="px-3 py-3"><p className="font-medium">{i.product_name}</p><p className="text-xs text-ink-soft">{i.product_code}</p></td>
                  <td className="px-3 py-3 text-right tabular-nums">{tk(i.unit_price)}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{i.quantity}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{tk(i.unit_price * i.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1.5 px-6 text-sm sm:px-8">
          <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="tabular-nums">{tk(o.subtotal)}</dd></div>
          {o.discount > 0 && <div className="flex justify-between text-leaf"><dt>Coupon ({o.coupon_code})</dt><dd className="tabular-nums">− {tk(o.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink-soft">Delivery charge</dt><dd className="tabular-nums">{tk(o.delivery_charge)}</dd></div>
        </dl>
        <div className="mx-6 mt-3 flex items-center justify-between bg-ink px-4 py-3 text-paper sm:mx-8 sm:ml-auto sm:w-80">
          <span className="text-sm font-semibold">TOTAL (COD)</span>
          <span className="text-xl font-semibold tabular-nums">{tk(o.total)}</span>
        </div>

        <div className="mx-6 my-6 border border-haldi px-4 py-3 sm:mx-8">
          <p className="text-xs font-semibold tracking-wider text-haldi">AMOUNT TO PAY ON DELIVERY</p>
          <p className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm text-ink-soft">Please keep the exact amount ready for the delivery person.</span>
            <span className="text-2xl font-semibold tabular-nums">{tk(o.total)}</span>
          </p>
        </div>
        <p className="border-t border-line px-6 py-4 text-xs text-ink-soft sm:px-8">
          Thank you for shopping with {site.nameEn}. This slip is computer generated and needs no signature.
        </p>
      </article>
    </div>
  );
}
