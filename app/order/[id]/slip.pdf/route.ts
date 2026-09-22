import { orderForSlip } from "@/lib/order-access";
import { renderSlipPdf } from "@/lib/slip-pdf";
import { orderRef } from "@/lib/orders";

export const dynamic = "force-dynamic";

// /order/<id>/slip.pdf?t=<token> — the payment slip as a PDF download.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await orderForSlip(id, new URL(req.url).searchParams.get("t"));
  if (!order) return new Response("Not found", { status: 404 });
  const pdf = await renderSlipPdf(order);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="oboyob-slip-${orderRef(order.id)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
