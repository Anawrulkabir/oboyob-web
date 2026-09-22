"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "@/app/admin/actions";
import { adminInput } from "./styles";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm text-ink-soft">ইমেইল</span>
        <input name="email" type="email" autoComplete="email" required className={adminInput} />
      </label>
      <label className="block">
        <span className="text-sm text-ink-soft">পাসওয়ার্ড</span>
        <input name="password" type="password" autoComplete="current-password" required className={adminInput} />
      </label>
      {state.error && <p role="alert" className="text-sm text-sindoor">{state.error}</p>}
      <button disabled={pending} className="w-full bg-ink py-3 text-paper disabled:opacity-60">
        {pending ? "লগইন হচ্ছে…" : "লগইন করুন"}
      </button>
    </form>
  );
}
