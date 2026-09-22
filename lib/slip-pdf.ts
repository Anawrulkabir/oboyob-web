import "server-only";
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type * as HB from "harfbuzzjs";
import { site } from "@/lib/site";
import { deliveryZone } from "@/lib/delivery";
import { orderRef, type Order } from "@/lib/orders";

// The payment slip, as an A4 PDF (English). Customer names, addresses and
// product names are often Bangla; PDF libraries can't shape Bangla
// conjuncts correctly, so any non-ASCII text is shaped with HarfBuzz (the
// engine browsers use) and drawn as vector outlines. ASCII text stays real,
// selectable text in the same font.

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const FONTS = { regular: "NotoSansBengali-Regular.ttf", bold: "NotoSansBengali-SemiBold.ttf" } as const;
type Weight = keyof typeof FONTS;

const C = { ink: "#231f1b", soft: "#6b6157", line: "#e3d9c8", paper: "#fbf8f2", deep: "#f3ece0", haldi: "#a8742a", leaf: "#4f6a3d" };

interface Shaper { font: HB.Font; upem: number }
interface Loaded { hb: typeof HB; files: Record<Weight, Buffer>; shapers: Record<Weight, Shaper>; logo: Buffer }
let loaded: Promise<Loaded> | null = null;

// harfbuzzjs is an ES module that awaits its WebAssembly at load time, so it
// must be import()-ed, never require()-d. Loaded once per server instance.
function load(): Promise<Loaded> {
  return (loaded ??= (async () => {
    const hb = await import("harfbuzzjs");
    const files = {
      regular: fs.readFileSync(path.join(FONT_DIR, FONTS.regular)),
      bold: fs.readFileSync(path.join(FONT_DIR, FONTS.bold)),
    };
    const make = (buf: Buffer): Shaper => {
      const face = new hb.Face(new hb.Blob(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer));
      return { font: new hb.Font(face), upem: face.upem };
    };
    const logo = fs.readFileSync(path.join(process.cwd(), "assets", "brand", "logo.png"));
    return { hb, files, logo, shapers: { regular: make(files.regular), bold: make(files.bold) } };
  })());
}

const tk = (n: number | null | undefined) => `Tk ${(n ?? 0).toLocaleString("en-IN")}`;
const isAscii = (s: string) => /^[\x20-\x7E]*$/.test(s);
const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

type Doc = PDFKit.PDFDocument;
interface TextOpts { size?: number; weight?: Weight; color?: string; width?: number; align?: "left" | "right" | "center" }

/** Draws text at (x, y = top of the line). Wraps within `width`. Returns the height used. */
function text(L: Loaded, doc: Doc, str: string, x: number, y: number, o: TextOpts = {}): number {
  const { size = 10, weight = "regular", color = C.ink, width, align = "left" } = o;
  doc.font(weight).fontSize(size).fillColor(color);
  if (isAscii(str)) {
    const opts = { width, align, lineBreak: !!width } as const;
    const h = doc.heightOfString(str, opts);
    doc.text(str, x, y, opts);
    return h;
  }
  // Non-ASCII: shape with HarfBuzz, wrap on spaces, draw outlines.
  const shaper = L.shapers[weight];
  const shape = (s: string) => shapeText(L.hb, shaper.font, s);
  const scale = size / shaper.upem;
  const measure = (s: string) => shape(s).reduce((w, g) => w + g.pos.xAdvance, 0) * scale;
  const lines: string[] = [];
  for (const para of str.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (width && line && measure(next) > width) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
  }
  const lineHeight = doc.currentLineHeight(true);
  const ascent = ((doc as unknown as { _font: { ascender: number } })._font.ascender / 1000) * size;
  lines.forEach((line, n) => {
    const w = measure(line);
    const left = width && align === "right" ? x + width - w : width && align === "center" ? x + (width - w) / 2 : x;
    let pen = 0;
    const baseline = y + n * lineHeight + ascent;
    for (const g of shape(line)) {
      const d = shaper.font.glyphToPath(g.gid);
      if (d) {
        doc.save().translate(left + (pen + g.pos.xOffset) * scale, baseline - g.pos.yOffset * scale).scale(scale, -scale);
        doc.path(d).fill(color);
        doc.restore();
      }
      pen += g.pos.xAdvance;
    }
  });
  return lines.length * lineHeight;
}

function shapeText(hb: typeof HB, font: HB.Font, str: string) {
  const buf = new hb.Buffer();
  buf.addText(str);
  buf.guessSegmentProperties();
  hb.shape(font, buf);
  const infos = buf.getGlyphInfos();
  const pos = buf.getGlyphPositions();
  return infos.map((g, i) => ({ gid: g.codepoint, pos: pos[i] }));
}

export async function renderSlipPdf(o: Order): Promise<Buffer> {
  const L = await load();
  const { files } = L;
  const doc = new PDFDocument({
    size: "A4", margin: 0,
    // Start in our own font: pdfkit's default (Helvetica) is read from data
    // files that serverless bundles tend to leave out.
    font: path.join(FONT_DIR, FONTS.regular),
    info: { Title: `Payment slip #${orderRef(o.id)}`, Author: site.nameEn, Subject: "Payment slip" },
  });
  doc.registerFont("regular", files.regular);
  doc.registerFont("bold", files.bold);
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));

  const W = doc.page.width;  // 595
  const M = 48;              // side margin
  const inner = W - M * 2;
  const zone = deliveryZone(o.delivery_zone);

  // ---- header band
  doc.rect(0, 0, W, 118).fill(C.deep);
  doc.rect(0, 0, W, 5).fill(C.haldi);
  // A copy of the logo lives in assets/ — public/ isn't shipped with server functions on Vercel.
  doc.image(L.logo, M, 30, { width: 58, height: 58 });
  text(L, doc, site.nameEn.toUpperCase(), M + 72, 36, { size: 20, weight: "bold" });
  text(L, doc, site.tagline, M + 72, 62, { size: 9.5, color: C.soft });
  text(L, doc, site.url.replace(/^https?:\/\//, ""), M + 72, 76, { size: 9.5, color: C.soft });
  text(L, doc, "PAYMENT SLIP", W - M - 220, 34, { size: 20, weight: "bold", width: 220, align: "right" });
  text(L, doc, `Order #${orderRef(o.id)}`, W - M - 220, 62, { size: 10.5, width: 220, align: "right" });
  text(L, doc, dateFmt.format(new Date(o.created_at)), W - M - 220, 77, { size: 9.5, color: C.soft, width: 220, align: "right" });

  // ---- billed to / delivery & payment
  let y = 146;
  const colW = (inner - 24) / 2;
  const label = (s: string, x: number, yy: number) => text(L, doc, s.toUpperCase(), x, yy, { size: 8, weight: "bold", color: C.haldi });
  label("Deliver to", M, y);
  let yl = y + 16;
  yl += text(L, doc, o.customer_name, M, yl, { size: 11.5, weight: "bold", width: colW });
  yl += text(L, doc, o.customer_phone, M, yl + 2, { size: 10, width: colW }) + 2;
  yl += text(L, doc, o.customer_address, M, yl + 2, { size: 10, color: C.soft, width: colW }) + 2;
  if (o.customer_email) yl += text(L, doc, o.customer_email, M, yl + 2, { size: 10, color: C.soft, width: colW }) + 2;

  const rx = M + colW + 24;
  label("Delivery & payment", rx, y);
  const kv = (k: string, v: string, yy: number) => {
    text(L, doc, k, rx, yy, { size: 10, color: C.soft });
    return text(L, doc, v, rx + 92, yy, { size: 10, width: colW - 92 });
  };
  let yr = y + 16;
  yr += kv("Delivery area", zone?.labelEn ?? "-", yr) + 3;
  yr += kv("Payment", "Cash on Delivery", yr) + 3;
  yr += kv("Payment status", "Due on delivery", yr) + 3;
  if (o.note) yr += kv("Note", o.note, yr) + 3;
  y = Math.max(yl, yr) + 26;

  // ---- items table
  const cols = { item: M, price: M + inner - 210, qty: M + inner - 120, amount: M + inner - 90 };
  doc.rect(M, y, inner, 26).fill(C.ink);
  const head = (s: string, x: number, w?: number, align?: "right" | "center") =>
    text(L, doc, s, x, y + 8, { size: 8.5, weight: "bold", color: C.paper, width: w, align });
  head("ITEM", cols.item + 10);
  head("UNIT PRICE", cols.price, 80, "right");
  head("QTY", cols.qty, 30, "center");
  head("AMOUNT", cols.amount, 80, "right");
  y += 26;
  for (const i of o.items) {
    const nameW = cols.price - cols.item - 20;
    const top = y + 9;
    let h = text(L, doc, i.product_name, cols.item + 10, top, { size: 10.5, weight: "bold", width: nameW });
    h += text(L, doc, i.product_code, cols.item + 10, top + h, { size: 8.5, color: C.soft });
    text(L, doc, tk(i.unit_price), cols.price, top, { size: 10, width: 80, align: "right" });
    text(L, doc, String(i.quantity), cols.qty, top, { size: 10, width: 30, align: "center" });
    text(L, doc, tk(i.unit_price * i.quantity), cols.amount, top, { size: 10, width: 80, align: "right" });
    const rowH = Math.max(h + 18, 34);
    doc.moveTo(M, y + rowH).lineTo(M + inner, y + rowH).lineWidth(0.6).strokeColor(C.line).stroke();
    y += rowH;
  }

  // ---- totals
  y += 14;
  const tx = M + inner - 250;
  const totalRow = (k: string, v: string, color: string = C.ink) => {
    text(L, doc, k, tx, y, { size: 10, color: C.soft });
    text(L, doc, v, tx + 150, y, { size: 10, color, width: 100, align: "right" });
    y += 18;
  };
  totalRow("Subtotal", tk(o.subtotal));
  if (o.discount) totalRow(`Coupon (${o.coupon_code})`, `- ${tk(o.discount)}`, C.leaf);
  totalRow(`Delivery charge${zone ? ` (${zone.labelEn})` : ""}`, tk(o.delivery_charge));
  y += 4;
  doc.rect(tx - 12, y, 262, 40).fill(C.ink);
  text(L, doc, "TOTAL (COD)", tx, y + 13, { size: 10, weight: "bold", color: C.paper });
  text(L, doc, tk(o.total), tx + 110, y + 10, { size: 15, weight: "bold", color: C.paper, width: 140, align: "right" });
  y += 64;

  // ---- amount due band
  doc.rect(M, y, inner, 54).lineWidth(1.2).strokeColor(C.haldi).stroke();
  text(L, doc, "AMOUNT TO PAY ON DELIVERY", M + 16, y + 12, { size: 8.5, weight: "bold", color: C.haldi });
  text(L, doc, "Please keep the exact amount ready for the delivery person.", M + 16, y + 28, { size: 9.5, color: C.soft });
  text(L, doc, tk(o.total), M + inner - 196, y + 15, { size: 18, weight: "bold", width: 180, align: "right" });
  y += 80;

  // ---- what happens next
  text(L, doc, "WHAT HAPPENS NEXT", M, y, { size: 8, weight: "bold", color: C.haldi });
  y += 16;
  for (const s of [
    "1.  We will call you to confirm the order.",
    "2.  Your parcel is sent to the address above.",
    "3.  Pay the total in cash when you receive it.",
  ]) y += text(L, doc, s, M, y, { size: 10 }) + 2;

  // ---- footer
  const fy = doc.page.height - 70;
  doc.moveTo(M, fy).lineTo(W - M, fy).lineWidth(0.6).strokeColor(C.line).stroke();
  text(L, doc, `Thank you for shopping with ${site.nameEn}.`, M, fy + 12, { size: 10, weight: "bold" });
  text(L, doc, `Questions? Message us on Facebook: ${site.facebook}`, M, fy + 28, { size: 8.5, color: C.soft });
  text(L, doc, "This slip is computer generated and needs no signature.", M, fy + 41, { size: 8.5, color: C.soft });

  doc.end();
  return done;
}
