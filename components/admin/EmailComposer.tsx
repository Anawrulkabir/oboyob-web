"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendOrderEmail, type EmailState } from "@/app/admin/actions";
import { adminInput, btnPrimary, btnQuiet } from "./styles";

/** Custom email to the customer (English), with the payment slip PDF attached. */
export default function EmailComposer({ orderId, to, defaults, open: openAtStart }: {
  orderId: string; to: string; defaults: { subject: string; message: string }; open: boolean;
}) {
  const [open, setOpen] = useState(openAtStart);
  const [state, action, pending] = useActionState<EmailState, FormData>(sendOrderEmail.bind(null, orderId), { status: "idle" });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (openAtStart) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [openAtStart]);

  if (!open) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className={btnPrimary}>✉ ইমেইল লিখুন</button>
        {!to && <p className="text-sm text-ink-soft">গ্রাহক ইমেইল দেননি — ঠিকানা নিজে লিখতে হবে।</p>}
      </div>
    );
  }

  return (
    <div ref={ref} className="mt-4 border border-line p-5">
      {openAtStart && state.status === "idle" && (
        <p className="mb-4 bg-leaf/10 px-3 py-2 text-sm text-leaf">অর্ডার কনফার্ম হয়েছে। নিচের ইমেইলটি দেখে প্রয়োজনে বদলে “Send email” চাপুন।</p>
      )}
      <form action={action} className="grid gap-4">
        <label className="block">
          <span className="text-sm text-ink-soft">To</span>
          <input name="to" type="email" defaultValue={to} required placeholder="customer@example.com" className={adminInput} />
        </label>
        <label className="block">
          <span className="text-sm text-ink-soft">Subject</span>
          <input name="subject" defaultValue={defaults.subject} required className={adminInput} />
        </label>
        <label className="block">
          <span className="text-sm text-ink-soft">Message</span>
          <textarea name="message" defaultValue={defaults.message} required rows={11} className={`${adminInput} leading-relaxed`} />
          <span className="mt-1 block text-xs text-ink-soft">The order summary and a “View payment slip” button are added below your message automatically.</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="attach" defaultChecked className="h-4 w-4 accent-ink" />
          Attach payment slip (PDF)
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending} className={btnPrimary}>{pending ? "Sending…" : "Send email"}</button>
          <button type="button" onClick={() => setOpen(false)} className={btnQuiet}>বন্ধ করুন</button>
          {state.message && (
            <p role="status" className={state.status === "error" ? "text-sm text-sindoor" : "text-sm text-leaf"}>
              {state.status === "sent" ? "✓ " : ""}{state.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
