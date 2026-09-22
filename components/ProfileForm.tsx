"use client";

import { useActionState, startTransition } from "react";
import { saveProfile, type ProfileState } from "@/app/actions/auth";

const input = "mt-1.5 w-full border border-line bg-paper px-3 py-2.5 text-[16px] outline-none focus:border-ink";

export default function ProfileForm({ profile }: { profile: { full_name: string | null; phone: string | null; address: string | null } | null }) {
  const [state, act, pending] = useActionState<ProfileState, FormData>(saveProfile, { status: "idle" });
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => act(fd)); }}
      className="space-y-4"
    >
      <label className="block"><span className="text-sm text-ink-soft">নাম</span>
        <input name="full_name" defaultValue={profile?.full_name ?? ""} autoComplete="name" className={input} /></label>
      <label className="block"><span className="text-sm text-ink-soft">মোবাইল নম্বর</span>
        <input name="phone" type="tel" inputMode="tel" defaultValue={profile?.phone ?? ""} placeholder="01XXXXXXXXX" autoComplete="tel" className={input} /></label>
      <label className="block"><span className="text-sm text-ink-soft">ঠিকানা</span>
        <textarea name="address" rows={3} defaultValue={profile?.address ?? ""} autoComplete="street-address" className={input} /></label>
      <div className="flex items-center gap-4">
        <button disabled={pending} className="bg-ink px-5 py-2.5 text-paper disabled:opacity-60">{pending ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}</button>
        {state.message && <p role="status" className={state.status === "error" ? "text-sindoor" : "text-leaf"}>{state.message}</p>}
      </div>
    </form>
  );
}
