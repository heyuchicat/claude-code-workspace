import { NextResponse } from "next/server";
import { getBusiness } from "@/lib/businesses";
import { fetchGoogleBusinessLocations } from "@/lib/data-source";
import { generateMonthlyReportPdf } from "@/lib/report-generator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const locationId = new URL(request.url).searchParams.get("locationId");
  if (!locationId) {
    return NextResponse.json({ error: "locationId は必須です" }, { status: 400 });
  }

  const business = await getBusiness(businessId);
  if (!business) {
    return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  }

  const locations = await fetchGoogleBusinessLocations(businessId);
  const location = locations.find((l) => l.id === locationId);
  if (!location) {
    return NextResponse.json({ error: "ロケーションが見つかりません" }, { status: 404 });
  }

  try {
    const pdf = await generateMonthlyReportPdf(businessId, business.name, locationId, location.name);
    const encodedName = encodeURIComponent(`report-${business.name}.pdf`);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report.pdf"; filename*=UTF-8''${encodedName}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
