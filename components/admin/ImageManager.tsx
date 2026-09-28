"use client";

import { useState, useTransition } from "react";
import SubmitButton from "@/components/SubmitButton";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AddPhotosTile, UploadSummary, UploadTile, useUploadQueue } from "./UploadQueue";
import { addImage, deleteImage, moveImage, updateAltText } from "@/app/admin/actions";
import type { ProductImage } from "@/types/product";
import { adminInput, btnQuiet } from "./styles";

export default function ImageManager({ productId, productName, images }: {
  productId: string; productName: string; images: ProductImage[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  // Each photo is saved to the product as soon as it lands; the grid refreshes to show it.
  const queue = useUploadQueue(productId, async (url) => {
    await addImage(productId, url, productName);
    router.refresh();
  });

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      try { await fn(); router.refresh(); } catch (err) { setError((err as Error).message); }
    });

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl">ছবি</h2>
        <p className="text-xs text-ink-soft">প্রথম ছবিটি মূল ছবি। ৪:৫ (খাড়া) ছবি সবচেয়ে ভালো দেখায়।</p>
      </div>

      <UploadSummary items={queue.items} />
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.id} className="border border-line">
            <div className="relative aspect-[4/5] bg-paper-deep">
              <Image src={img.image_url} alt={img.alt_text ?? ""} fill sizes="240px" className="object-cover" />
              {i === 0 && <span className="absolute left-2 top-2 bg-ink px-2 py-0.5 text-xs text-paper">মূল ছবি</span>}
            </div>
            <div className="space-y-2 p-2">
              <form action={updateAltText.bind(null, img.id)} className="flex gap-1">
                <input name="alt" defaultValue={img.alt_text ?? ""} placeholder="ছবির বিবরণ (alt)" className={`${adminInput} !mt-0 !py-1 text-sm`} />
                <SubmitButton className={btnQuiet} title="বিবরণ সংরক্ষণ">✓</SubmitButton>
              </form>
              <div className="flex flex-wrap gap-1">
                {i > 0 && <button type="button" disabled={busy} onClick={() => run(() => moveImage(productId, img.id, "first"))} className={`${btnQuiet} min-h-10`}>মূল করুন</button>}
                <button type="button" disabled={busy || i === 0} onClick={() => run(() => moveImage(productId, img.id, "up"))} className={`${btnQuiet} min-h-10 min-w-10`} aria-label="আগে">←</button>
                <button type="button" disabled={busy || i === images.length - 1} onClick={() => run(() => moveImage(productId, img.id, "down"))} className={`${btnQuiet} min-h-10 min-w-10`} aria-label="পরে">→</button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => confirm("ছবিটি মুছে ফেলবেন?") && run(() => deleteImage(img.id))}
                  className={`${btnQuiet} min-h-10 !text-sindoor`}
                >
                  মুছুন
                </button>
              </div>
            </div>
          </li>
        ))}

        {queue.items.map((item) => (
          <UploadTile key={item.id} item={item} onRetry={() => queue.retry(item.id)} onDismiss={() => queue.dismiss(item.id)} />
        ))}
        <AddPhotosTile onFiles={queue.addFiles} count={images.length + queue.items.length} />
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-sindoor">{error}</p>}
    </section>
  );
}
