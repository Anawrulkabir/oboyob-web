import { createBrowserSupabase } from "@/lib/supabase/browser";

// Product photo upload, all in the browser:
//   iPhone HEIC → JPEG  →  shrink to ≤2000px JPEG (≤4 MB)  →  upload with progress
// A 20–40 MB phone photo usually ends up around 0.5–1.5 MB.

/** Sanity limit on what can be picked at all (a video picked by mistake, etc.). */
export const MAX_PICK_BYTES = 100 * 1024 * 1024;
const MAX_SIDE = 2000;
const TARGET_BYTES = 4 * 1024 * 1024;
const BUCKET = "products";

export type UploadStage = "queued" | "converting" | "compressing" | "uploading" | "saving" | "done" | "error";
export type OnProgress = (stage: UploadStage, percent?: number) => void;

const isHeic = (f: File) => /image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);
export const isImageFile = (f: File) => f.type.startsWith("image/") || isHeic(f);

async function decode(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: "from-image" });
}

/** HEIC → JPEG. Safari can decode HEIC itself; other browsers get heic2any (loaded only when needed). */
async function fromHeic(file: File): Promise<Blob> {
  try {
    await decode(file); // Safari: works natively, compress() will re-encode it
    return file;
  } catch {
    const heic2any = (await import("heic2any")).default;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    return Array.isArray(out) ? out[0] : out;
  }
}

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));

/** Shrink to ≤2000px on the long side and re-save as JPEG, lowering quality until ≤4 MB. */
async function compress(src: Blob): Promise<Blob> {
  const bmp = await decode(src);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  // Already small, already a web format: keep it untouched.
  if (scale === 1 && src.size <= 1.5 * 1024 * 1024 && /image\/(jpeg|png|webp)/.test(src.type)) return src;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background instead of black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  let quality = 0.86;
  let out = await toJpeg(canvas, quality);
  while (out && out.size > TARGET_BYTES && quality > 0.5) {
    quality -= 0.1;
    out = await toJpeg(canvas, quality);
  }
  if (!out) throw new Error("ছবিটি প্রসেস করা যায়নি।");
  return out;
}

/** Upload with real progress (XMLHttpRequest — fetch can't report upload progress). */
async function put(path: string, blob: Blob, onPercent: (p: number) => void): Promise<string> {
  const sb = createBrowserSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error("লগইন শেষ হয়ে গেছে — পেজটি রিফ্রেশ করে আবার লগইন করুন।");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/storage/v1/object/${BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    xhr.setRequestHeader("Content-Type", blob.type || "image/jpeg");
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onPercent(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = xhr.statusText;
      try { msg = JSON.parse(xhr.responseText).message ?? msg; } catch {}
      reject(new Error(`আপলোড ব্যর্থ: ${msg || xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("ইন্টারনেট সংযোগে সমস্যা — আবার চেষ্টা করুন।"));
    xhr.send(blob);
  });
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Converts, shrinks and uploads one photo; returns its public URL. */
export async function uploadProductImage(file: File, folder: string, onProgress: OnProgress = () => {}): Promise<string> {
  if (!isImageFile(file)) throw new Error("এটি ছবি নয় (JPG, PNG, WEBP বা iPhone HEIC দিন)।");
  if (file.size > MAX_PICK_BYTES) throw new Error("ফাইলটি ১০০MB-এর বেশি — এটি সম্ভবত ভিডিও।");

  let src: Blob = file;
  if (isHeic(file)) {
    onProgress("converting");
    try {
      src = await fromHeic(file);
    } catch {
      throw new Error("iPhone-এর HEIC ছবিটি খোলা যায়নি। iPhone Settings → Camera → Formats → “Most Compatible” করুন, অথবা ছবিটি WhatsApp/Messenger থেকে সেভ করে আপলোড করুন।");
    }
  }

  onProgress("compressing");
  let blob: Blob;
  try {
    blob = await compress(src);
  } catch {
    // Couldn't decode (unusual format): upload as-is only if it's already small.
    if (src.size > TARGET_BYTES) throw new Error("ছবিটি ছোট করা যায়নি — অন্য ফরম্যাটে (JPG) সেভ করে আবার দিন।");
    blob = src;
  }

  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  onProgress("uploading", 0);
  const url = await put(path, blob, (p) => onProgress("uploading", p));
  return url;
}
