"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { discardUpload } from "@/app/admin/actions";
import { AddPhotosTile, UploadSummary, UploadTile, useUploadQueue } from "./UploadQueue";

const tinyBtn = "flex min-h-10 min-w-10 flex-1 items-center justify-center border border-line text-sm text-ink-soft hover:border-ink hover:text-ink active:bg-paper-deep disabled:opacity-30";

// Photo picker for a product that doesn't exist yet: photos upload right
// away to drafts/…, and their URLs go with the form as `images`.
export default function DraftPhotos({ urls, onChange, onBusyChange }: {
  urls: string[]; onChange: (urls: string[]) => void; onBusyChange?: (busy: boolean) => void;
}) {
  const folder = useRef(`drafts/${crypto.randomUUID()}`);
  // Several photos finish independently, so append to the latest list, not a stale one.
  const latest = useRef(urls);
  latest.current = urls;
  const queue = useUploadQueue(folder.current, (url) => {
    const next = [...latest.current, url];
    latest.current = next;
    onChange(next);
  });

  useEffect(() => onBusyChange?.(queue.busy), [queue.busy, onBusyChange]);

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
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm text-ink-soft">ছবি {urls.length > 0 && `(${urls.length})`}</span>
        <span className="text-xs text-ink-soft">প্রথম ছবিটি মূল ছবি। ৪:৫ (খাড়া) ছবি সবচেয়ে ভালো দেখায়।</span>
      </div>
      <UploadSummary items={queue.items} />
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {urls.map((url, i) => (
          <li key={url} className="border border-line">
            <div className="relative aspect-[4/5] bg-paper-deep">
              <Image src={url} alt="" fill sizes="(max-width: 640px) 50vw, 160px" className="object-cover" />
              {i === 0 && <span className="absolute left-1.5 top-1.5 bg-ink px-1.5 py-0.5 text-[11px] text-paper">মূল ছবি</span>}
            </div>
            <div className="flex gap-1 p-1.5">
              {i > 0 && <button type="button" onClick={() => move(i, 0)} className={tinyBtn} aria-label="মূল ছবি করুন">★</button>}
              <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} className={tinyBtn} aria-label="আগে">←</button>
              <button type="button" disabled={i === urls.length - 1} onClick={() => move(i, i + 1)} className={tinyBtn} aria-label="পরে">→</button>
              <button type="button" onClick={() => remove(i)} className={`${tinyBtn} !text-sindoor`} aria-label="ছবি সরান">✕</button>
            </div>
          </li>
        ))}
        {queue.items.map((item) => (
          <UploadTile key={item.id} item={item} onRetry={() => queue.retry(item.id)} onDismiss={() => queue.dismiss(item.id)} />
        ))}
        <AddPhotosTile onFiles={queue.addFiles} count={urls.length + queue.items.length} />
      </ul>
    </section>
  );
}
