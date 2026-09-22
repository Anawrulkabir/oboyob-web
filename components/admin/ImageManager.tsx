"use client";

import { useRef, useState, useTransition } from "react";
import SubmitButton from "@/components/SubmitButton";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { uploadProductImage } from "./upload";
import { addImage, deleteImage, moveImage, updateAltText } from "@/app/admin/actions";
import type { ProductImage } from "@/types/product";
import { adminInput, btnQuiet } from "./styles";

export default function ImageManager({ productId, productName, images }: {
  productId: string; productName: string; images: ProductImage[];
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  async function upload(files: FileList) {
    setError(null);
    const list = Array.from(files);
    for (const [i, file] of list.entries()) {
      setStatus(`আপলোড হচ্ছে ${i + 1}/${list.length}…`);
      try {
        await addImage(productId, await uploadProductImage(file, productId), productName);
      } catch (err) {
        setError((err as Error).message);
      }
    }
    setStatus(null);
    if (input.current) input.current.value = "";
    router.refresh();
  }

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

      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
                {i > 0 && <button type="button" disabled={busy} onClick={() => run(() => moveImage(productId, img.id, "first"))} className={btnQuiet}>মূল করুন</button>}
                <button type="button" disabled={busy || i === 0} onClick={() => run(() => moveImage(productId, img.id, "up"))} className={btnQuiet} aria-label="আগে">←</button>
                <button type="button" disabled={busy || i === images.length - 1} onClick={() => run(() => moveImage(productId, img.id, "down"))} className={btnQuiet} aria-label="পরে">→</button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => confirm("ছবিটি মুছে ফেলবেন?") && run(() => deleteImage(img.id))}
                  className={`${btnQuiet} !text-sindoor`}
                >
                  মুছুন
                </button>
              </div>
            </div>
          </li>
        ))}

        <li>
          <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-ink-soft text-center text-sm text-ink-soft hover:border-ink hover:text-ink">
            <span className="text-2xl">+</span>
            {status ?? "ছবি যোগ করুন"}
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              disabled={!!status}
              className="sr-only"
              onChange={(e) => e.target.files?.length && upload(e.target.files)}
            />
          </label>
        </li>
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-sindoor">{error}</p>}
    </section>
  );
}
