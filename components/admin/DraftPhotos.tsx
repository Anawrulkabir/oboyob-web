"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { discardUpload } from "@/app/admin/actions";
import { uploadProductImage } from "./upload";
import { btnQuiet } from "./styles";

// Photo picker for a product that doesn't exist yet: photos upload right
// away to drafts/…, and their URLs go with the form as `images`.
export default function DraftPhotos({ urls, onChange }: { urls: string[]; onChange: (urls: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const folder = useRef(`drafts/${crypto.randomUUID()}`);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList) {
    setError(null);
    const list = Array.from(files);
    let next = urls;
    for (const [i, file] of list.entries()) {
      setStatus(`আপলোড হচ্ছে ${i + 1}/${list.length}…`);
      try {
        next = [...next, await uploadProductImage(file, folder.current)];
        onChange(next);
      } catch (err) {
        setError((err as Error).message);
      }
    }
    setStatus(null);
    if (input.current) input.current.value = "";
  }

  const move = (i: number, to: number) => {
    const next = [...urls];
    const [u] = next.splice(i, 1);
    next.splice(to, 0, u);
    onChange(next);
  };
  const remove = (i: number) => {
    discardUpload(urls[i]).catch(() => {});
    onChange(urls.filter((_, j) => j !== i));
  };

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-sm text-ink-soft">ছবি</span>
        <span className="text-xs text-ink-soft">প্রথম ছবিটি মূল ছবি। ৪:৫ (খাড়া) ছবি সবচেয়ে ভালো দেখায়।</span>
      </div>
      <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {urls.map((url, i) => (
          <li key={url} className="border border-line">
            <div className="relative aspect-[4/5] bg-paper-deep">
              <Image src={url} alt="" fill sizes="160px" className="object-cover" />
              {i === 0 && <span className="absolute left-1.5 top-1.5 bg-ink px-1.5 py-0.5 text-[11px] text-paper">মূল ছবি</span>}
            </div>
            <div className="flex flex-wrap gap-1 p-1.5">
              {i > 0 && <button type="button" onClick={() => move(i, 0)} className={`${btnQuiet} !px-2 !py-1 !text-xs`}>মূল</button>}
              <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} className={`${btnQuiet} !px-2 !py-1 !text-xs`} aria-label="আগে">←</button>
              <button type="button" disabled={i === urls.length - 1} onClick={() => move(i, i + 1)} className={`${btnQuiet} !px-2 !py-1 !text-xs`} aria-label="পরে">→</button>
              <button type="button" onClick={() => remove(i)} className={`${btnQuiet} !px-2 !py-1 !text-xs !text-sindoor`} aria-label="ছবি সরান">✕</button>
            </div>
          </li>
        ))}
        <li>
          <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-ink-soft p-2 text-center text-xs text-ink-soft hover:border-ink hover:text-ink">
            <span className="text-2xl">+</span>
            {status ?? "ছবি যোগ করুন"}
            <input ref={input} type="file" accept="image/*" multiple disabled={!!status} className="sr-only"
              onChange={(e) => e.target.files?.length && upload(e.target.files)} />
          </label>
        </li>
      </ul>
      {error && <p role="alert" className="mt-2 text-sm text-sindoor">{error}</p>}
    </section>
  );
}
