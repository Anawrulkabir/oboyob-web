import { orderForSlip } from "@/lib/order-access";
import { renderSlipPdf } from "@/lib/slip-pdf";
import { orderRef } from "@/lib/orders";

export const dynamic = "force-dynamic";

// /order/<id>/slip.pdf?t=<token> — the payment slip as a PDF download.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await orderForSlip(id, new URL(req.url).searchParams.get("t"));
  if (!order) return new Response("Not found", { status: 404 });
  let pdf: Buffer;
  try {
    pdf = await renderSlipPdf(order);
  } catch (e) {
    console.error("slip pdf", order.id, e); // shows in Vercel → Logs
    return new Response("Sorry, the PDF slip could not be created right now. Please try again, or message us on Facebook.", {
      status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="zeenah-slip-${orderRef(order.id)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
