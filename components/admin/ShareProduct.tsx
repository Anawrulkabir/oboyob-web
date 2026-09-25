"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnQuiet } from "./styles";

/**
 * Product link pop-up with a Copy button, for sharing on the Facebook page.
 * Opens by itself right after a product is created (`created`); the "শেয়ার"
 * button reopens it any time.
 */
export default function ShareProduct({ url, created }: { url: string; created: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (created) ref.current?.showModal(); }, [created]);

  // Drop ?created=1 once closed, so a refresh doesn't reopen the pop-up.
  const onClose = () => { if (created) router.replace(location.pathname, { scroll: false }); };

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={btnQuiet}>🔗 লিংক কপি</button>

      <dialog ref={ref} aria-label="পণ্যের লিংক" onClose={onClose}
        onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close(); }}
        className="m-auto w-[min(92vw,28rem)] bg-paper p-0 text-ink backdrop:bg-ink/50">
        <div className="p-6">
          {created ? (
            <>
              <p className="flex h-11 w-11 items-center justify-center rounded-full bg-leaf/10 text-xl text-leaf" aria-hidden>✓</p>
              <h2 className="mt-3 text-2xl">পণ্যটি সফলভাবে পোস্ট হয়েছে!</h2>
              <p className="mt-1 text-sm text-ink-soft">লিংকটি কপি করে আমাদের Facebook পেজে শেয়ার করুন।</p>
            </>
          ) : (
            <h2 className="text-2xl">পণ্যের লিংক</h2>
          )}

          <div className="mt-5 flex">
            <input readOnly value={url} aria-label="পণ্যের লিংক" onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 border border-r-0 border-line bg-white px-3 py-2.5 text-sm outline-none" />
            <button type="button" onClick={copy} className={`${btnPrimary} shrink-0 ${copied ? "!bg-leaf" : ""}`}>
              {copied ? "✓ কপি হয়েছে" : "কপি"}
            </button>
          </div>

          <div className="mt-6 text-right">
            <button type="button" onClick={() => ref.current?.close()} className={btnQuiet}>বন্ধ করুন</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
