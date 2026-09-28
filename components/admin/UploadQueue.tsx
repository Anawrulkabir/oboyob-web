"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isImageFile, uploadProductImage, type UploadStage } from "./upload";

// One tile per picked photo, each with its own stage and progress bar:
// waiting → converting (HEIC) → shrinking → uploading 0–100% → saving → done.

export interface UploadItem {
  id: string;
  file: File;
  name: string;
  preview: string | null;     // object URL of the picked file (null for HEIC until converted)
  stage: UploadStage;
  percent: number;
  error?: string;
}

const CONCURRENCY = 2;

/**
 * Upload queue. `onUploaded` runs for each finished photo (e.g. save it to the
 * product); if it throws, that photo shows the error and can be retried.
 */
export function useUploadQueue(folder: string, onUploaded: (url: string, file: File) => Promise<void> | void) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const running = useRef(0);
  const onUploadedRef = useRef(onUploaded);
  onUploadedRef.current = onUploaded;

  const patch = useCallback((id: string, p: Partial<UploadItem>) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i))), []);

  const run = useCallback(async (item: UploadItem) => {
    running.current++;
    try {
      const url = await uploadProductImage(item.file, folder, (stage, percent) => patch(item.id, { stage, percent: percent ?? 0 }));
      patch(item.id, { stage: "saving", percent: 100 });
      await onUploadedRef.current(url, item.file);
      patch(item.id, { stage: "done" });
      // Leave the ✓ visible for a moment, then the tile makes way for the real photo.
      setTimeout(() => setItems((list) => list.filter((i) => i.id !== item.id)), 1200);
    } catch (e) {
      patch(item.id, { stage: "error", error: (e as Error).message });
    } finally {
      running.current--;
      setItems((list) => [...list]); // wake the scheduler
    }
  }, [folder, patch]);

  // Start queued photos, a couple at a time.
  useEffect(() => {
    const free = CONCURRENCY - running.current;
    if (free <= 0) return;
    items.filter((i) => i.stage === "queued").slice(0, free).forEach((i) => {
      patch(i.id, { stage: "compressing" });
      run(i);
    });
  }, [items, patch, run]);

  // Free the preview URLs when the component goes away.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const picked = Array.from(files).map<UploadItem>((file) => {
      const heic = /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
      return {
        id: crypto.randomUUID(), file, name: file.name,
        preview: isImageFile(file) && !heic ? URL.createObjectURL(file) : null,
        stage: "queued", percent: 0,
      };
    });
    setItems((list) => [...list, ...picked]);
  }, []);

  const retry = useCallback((id: string) => patch(id, { stage: "queued", percent: 0, error: undefined }), [patch]);
  const dismiss = useCallback((id: string) => setItems((list) => {
    const it = list.find((i) => i.id === id);
    if (it?.preview) URL.revokeObjectURL(it.preview);
    return list.filter((i) => i.id !== id);
  }), []);

  const busy = items.some((i) => i.stage !== "done" && i.stage !== "error");

  // Don't let a closed tab / back swipe silently drop photos mid-upload.
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  return { items, addFiles, retry, dismiss, busy };
}

const LABEL: Record<UploadStage, string> = {
  queued: "অপেক্ষায়…",
  converting: "iPhone ছবি রূপান্তর…",
  compressing: "ছোট করা হচ্ছে…",
  uploading: "আপলোড হচ্ছে",
  saving: "সংরক্ষণ হচ্ছে…",
  done: "✓ হয়ে গেছে",
  error: "হয়নি",
};

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`;

/** One photo's tile: preview, stage, progress bar, and retry/remove on failure. */
export function UploadTile({ item, onRetry, onDismiss, compact = false }: {
  item: UploadItem; onRetry: () => void; onDismiss: () => void; compact?: boolean;
}) {
  const failed = item.stage === "error";
  const done = item.stage === "done";
  // Overall bar: prep stages fill the first 15%, the upload the rest.
  const bar = done || item.stage === "saving" ? 100
    : item.stage === "uploading" ? 15 + Math.round(item.percent * 0.85)
    : item.stage === "queued" ? 0 : item.stage === "converting" ? 5 : 10;

  return (
    <li className={`border ${failed ? "border-sindoor/60" : done ? "border-leaf/60" : "border-line"}`} aria-live="polite">
      <div className="relative aspect-[4/5] overflow-hidden bg-paper-deep">
        {item.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.preview} alt="" className={`h-full w-full object-cover transition ${done ? "" : "opacity-60"}`} />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-xs text-ink-soft">{item.name}</div>
        )}
        {/* stage badge */}
        <div className="absolute inset-x-0 bottom-0 bg-ink/75 px-2 py-1.5 text-[11px] text-paper">
          <p className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              {!failed && !done && <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-paper/40 border-t-paper" aria-hidden />}
              {LABEL[item.stage]}{item.stage === "uploading" && ` ${item.percent}%`}
            </span>
            {!compact && <span className="shrink-0 whitespace-nowrap opacity-70">{mb(item.file.size)}</span>}
          </p>
          <div className="mt-1 h-1 w-full bg-paper/20" role="progressbar" aria-valuenow={bar} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full transition-[width] duration-300 ${failed ? "bg-sindoor" : done ? "bg-leaf" : "bg-haldi-soft"}`}
              style={{ width: `${failed ? 100 : bar}%` }} />
          </div>
        </div>
        {done && <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-leaf text-xs text-paper">✓</span>}
      </div>
      {failed && (
        <div className="space-y-1.5 p-2">
          <p className="text-xs leading-snug text-sindoor">{item.error}</p>
          <div className="flex gap-1">
            <button type="button" onClick={onRetry} className="min-h-10 flex-1 border border-ink px-2 text-xs hover:bg-ink hover:text-paper active:bg-ink active:text-paper">আবার চেষ্টা</button>
            <button type="button" onClick={onDismiss} className="min-h-10 flex-1 border border-line px-2 text-xs text-ink-soft hover:border-ink">সরান</button>
          </div>
        </div>
      )}
    </li>
  );
}

/** "3 of 5 uploaded" line with an overall bar — visible while anything is in flight. */
export function UploadSummary({ items }: { items: UploadItem[] }) {
  if (!items.length) return null;
  const done = items.filter((i) => i.stage === "done").length;
  const failed = items.filter((i) => i.stage === "error").length;
  const active = items.length - done - failed;
  if (!active) {
    return failed ? <p role="alert" className="mt-3 text-sm text-sindoor">{failed}টি ছবি আপলোড হয়নি — নিচের “আবার চেষ্টা” চাপুন।</p> : null;
  }
  const progress = items.reduce((sum, i) =>
    sum + (i.stage === "done" || i.stage === "saving" || i.stage === "error" ? 100 : i.stage === "uploading" ? i.percent : 0), 0) / items.length;
  return (
    <div className="mt-3 border border-line bg-paper-deep/60 px-3 py-2.5" aria-live="polite">
      <p className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/20 border-t-ink" aria-hidden />
          {items.length}টির মধ্যে {done}টি ছবি আপলোড হয়েছে
        </span>
        <span className="text-ink-soft">{Math.round(progress)}%</span>
      </p>
      <div className="mt-2 h-1.5 w-full bg-line">
        <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-ink-soft">আপলোড শেষ না হওয়া পর্যন্ত পেজটি বন্ধ করবেন না।</p>
    </div>
  );
}

const ACCEPT = "image/*,.heic,.heif";

/**
 * The "+ add photos" tile, plus on phones a separate "take a photo" button
 * that opens the camera directly. Several photos can be picked at once.
 */
export function AddPhotosTile({ onFiles, count }: { onFiles: (files: FileList) => void; count: number }) {
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onFiles(e.target.files);
    e.target.value = ""; // allow picking the same photo again after a failure
  };
  return (
    <li className="flex flex-col gap-2">
      <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-1.5 border-2 border-dashed border-ink-soft p-2 text-center text-sm text-ink-soft transition hover:border-ink hover:text-ink active:scale-[0.98] active:bg-paper-deep">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-2xl leading-none text-paper">+</span>
        <span className="font-medium text-ink">{count ? "আরও ছবি" : "ছবি যোগ করুন"}</span>
        <span className="text-[11px] leading-tight">একসাথে কয়েকটি বাছাই করা যাবে</span>
        <input type="file" accept={ACCEPT} multiple className="sr-only" onChange={pick} />
      </label>
      <label className="flex min-h-11 cursor-pointer items-center justify-center gap-1.5 border border-ink px-2 text-sm active:bg-ink active:text-paper sm:hidden">
        <span aria-hidden>📷</span> ছবি তুলুন
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pick} />
      </label>
    </li>
  );
}
