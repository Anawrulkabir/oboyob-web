"use client";

import { useActionState } from "react";
import { announceProductAction, type AnnounceState } from "@/app/admin/actions";
import { btnPrimary } from "./styles";

/** Product page: email past customers about this product, once. */
export default function AnnouncePanel({ productId, recipients, announcedAt, announcedCount, available, emailReady }: {
  productId: string; recipients: number; announcedAt: string | null; announcedCount: number | null;
  available: boolean; emailReady: boolean;
}) {
  const [state, action, pending] = useActionState<AnnounceState, FormData>(announceProductAction.bind(null, productId), { status: "idle" });
  const bn = (n: number) => n.toLocaleString("bn-BD");
  const date = (s: string) => new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(s));

  return (
    <section className="border border-line p-5">
      <h2 className="text-xl">গ্রাহকদের নতুন পণ্যের খবর</h2>
      {state.status !== "idle" ? (
        <p role="status" className={`mt-2 ${state.status === "sent" ? "text-leaf" : "text-sindoor"}`}>{state.status === "sent" && "✓ "}{state.message}</p>
      ) : announcedAt ? (
        <p className="mt-2 text-leaf">
          ✓ {announcedCount != null ? `${bn(announcedCount)} জনকে পাঠানো হয়েছে` : "পাঠানো হচ্ছে…"} — {date(announcedAt)}
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            যাঁরা আগে অর্ডার করেছেন বা অ্যাকাউন্ট খুলেছেন (ইমেইল আছে এমন {bn(recipients)} জন) তাঁদের এই পণ্যের ছবি, দাম ও লিংকসহ ইমেইল যাবে।
            প্রতিটি পণ্যের জন্য একবারই পাঠানো যায়। যাঁরা “Unsubscribe” করেছেন তাঁরা পাবেন না।
          </p>
          {!emailReady ? (
            <p className="mt-3 text-sm text-sindoor">ইমেইল চালু নেই — Vercel-এ SMTP_USER ও SMTP_PASS দিন।</p>
          ) : !available ? (
            <p className="mt-3 text-sm text-ink-soft">স্টক ০ — স্টক যোগ করার পর পাঠান।</p>
          ) : recipients === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">এখনও কোনো গ্রাহকের ইমেইল নেই।</p>
          ) : (
            <form action={action} onSubmit={(e) => { if (!confirm(`${bn(recipients)} জনকে ইমেইল পাঠাবেন?`)) e.preventDefault(); }} className="mt-4">
              <button disabled={pending} className={btnPrimary}>
                {pending ? "পাঠানো হচ্ছে… (পেজটি খোলা রাখুন)" : `✉ ${bn(recipients)} জনকে ইমেইল পাঠান`}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
