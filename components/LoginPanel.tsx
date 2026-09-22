"use client";

import { useActionState, useEffect, useState, startTransition } from "react";
import { authFlow, signInWithFacebook, type AuthState } from "@/app/actions/auth";

interface Props { next: string; phone: boolean; facebook: boolean; error?: string }

const input = "mt-1.5 w-full border border-line bg-paper px-3 py-3 text-[17px] outline-none focus:border-ink";

export default function LoginPanel({ next, phone, facebook, error }: Props) {
  const [method, setMethod] = useState<"phone" | "email">(phone ? "phone" : "email");
  const [state, act, pending] = useActionState<AuthState, FormData>(authFlow, { step: "start" });
  const [cooldown, setCooldown] = useState(0);

  const onCode = state.step === "code";
  useEffect(() => { if (onCode && !state.message) setCooldown(60); }, [onCode, state]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = (fd: FormData) => startTransition(() => act(fd));
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.name === "intent") fd.set("intent", submitter.value);
    submit(fd);
  };

  // ---------------------------------------------------------- step 2: code
  if (onCode) {
    const m = state.method!;
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="method" value={m} />
        <input type="hidden" name="target" value={state.target} />
        <input type="hidden" name={m === "email" ? "email" : "phone"} value={state.target} />
        <input type="hidden" name="next" value={next} />
        <p>
          {m === "phone" ? "SMS-এ" : "ইমেইলে"} একটি কোড পাঠানো হয়েছে:{" "}
          <span className="tabular-nums text-ink">{state.target}</span>
        </p>
        <label className="block">
          <span className="text-sm text-ink-soft">কোড</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            autoFocus
            required
            className={`${input} text-center text-2xl tracking-[0.4em] tabular-nums`}
          />
        </label>
        {state.message && <p role="alert" className="text-sm text-sindoor">{state.message}</p>}
        <button name="intent" value="verify" disabled={pending} className="w-full bg-ink py-3.5 text-paper disabled:opacity-60">
          {pending ? "যাচাই হচ্ছে…" : "লগইন করুন"}
        </button>
        <div className="flex justify-between text-sm text-ink-soft">
          <button type="button" onClick={() => location.reload()} className="underline underline-offset-4 hover:text-ink">
            {m === "phone" ? "নম্বর বদলান" : "ইমেইল বদলান"}
          </button>
          <button name="intent" value="send" disabled={pending || cooldown > 0} className="underline underline-offset-4 hover:text-ink disabled:no-underline disabled:opacity-60">
            {cooldown > 0 ? `আবার পাঠান (${cooldown})` : "আবার কোড পাঠান"}
          </button>
        </div>
      </form>
    );
  }

  // --------------------------------------------------------- step 1: start
  return (
    <div className="space-y-6">
      {facebook && (
        <form action={signInWithFacebook}>
          <input type="hidden" name="next" value={next} />
          <button className="flex w-full items-center justify-center gap-3 bg-[#1877F2] py-3.5 text-white hover:bg-[#166fe0]">
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
            Facebook দিয়ে চালিয়ে যান
          </button>
        </form>
      )}
      {error === "facebook" && <p role="alert" className="text-sm text-sindoor">Facebook লগইন সম্পন্ন হয়নি। আবার চেষ্টা করুন বা অন্য উপায়ে লগইন করুন।</p>}

      {facebook && (
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span className="h-px flex-1 bg-line" /> অথবা <span className="h-px flex-1 bg-line" />
        </div>
      )}

      {phone && (
        <div role="tablist" className="grid grid-cols-2 border border-line text-sm">
          {(["phone", "email"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={method === m} onClick={() => setMethod(m)}
              className={`py-2.5 ${method === m ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}>
              {m === "phone" ? "মোবাইল নম্বর" : "ইমেইল"}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="method" value={method} />
        <input type="hidden" name="next" value={next} />
        {method === "phone" ? (
          <label className="block">
            <span className="text-sm text-ink-soft">মোবাইল নম্বর</span>
            <div className="mt-1.5 flex border border-line focus-within:border-ink">
              <span className="flex items-center border-r border-line bg-paper-deep px-3 text-ink-soft">+88</span>
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="01XXXXXXXXX" required autoFocus
                className="w-full bg-paper px-3 py-3 text-[17px] tabular-nums outline-none" />
            </div>
          </label>
        ) : (
          <label className="block">
            <span className="text-sm text-ink-soft">ইমেইল</span>
            <input name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required autoFocus className={input} />
          </label>
        )}
        {state.step === "error" && state.message && <p role="alert" className="text-sm text-sindoor">{state.message}</p>}
        <button name="intent" value="send" disabled={pending} className="w-full bg-ink py-3.5 text-paper disabled:opacity-60">
          {pending ? "পাঠানো হচ্ছে…" : "কোড পাঠান"}
        </button>
        <p className="text-xs text-ink-soft">পাসওয়ার্ড লাগবে না। নতুন হলে অ্যাকাউন্ট নিজে থেকেই তৈরি হবে।</p>
      </form>
    </div>
  );
}
