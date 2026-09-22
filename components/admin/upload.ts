import { createBrowserSupabase } from "@/lib/supabase/browser";

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/** Downscale large phone photos in the browser before upload (max 2000px, JPEG). */
async function prepare(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.86));
  } catch {
    return file;
  }
}

/** Uploads one photo straight to the public "products" bucket; returns its public URL. */
export async function uploadProductImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name}: ছবি নয়।`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}: ১৫MB-এর বেশি।`);
  const blob = await prepare(file);
  const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const sb = createBrowserSupabase();
  const { error } = await sb.storage.from("products").upload(path, blob, {
    cacheControl: "31536000", contentType: blob.type || file.type, upsert: false,
  });
  if (error) throw new Error(`আপলোড ব্যর্থ: ${error.message}`);
  return sb.storage.from("products").getPublicUrl(path).data.publicUrl;
}
