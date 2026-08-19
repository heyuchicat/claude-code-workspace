import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchGoogleBusinessLocations } from "@/lib/data-source";
import { generateMonthlyReportPdf } from "@/lib/report-generator";
import { sendMail } from "@/lib/mailer";
import { getAdminSettings } from "@/lib/admin-settings";

// 外部cron(例: 毎月1日)から呼び出し、reportEmailが設定されている店舗に
// 月次レポートPDFをメール添付で送付する。
// 例: curl -X POST https://<your-domain>/api/cron/send-monthly-reports \
//       -H "Authorization: Bearer <設定画面のCRON_SECRET>"

export async function POST(request: Request) {
  const settings = await getAdminSettings();
  if (!settings) {
    return NextResponse.json({ error: "初回セットアップが完了していません" }, { status: 428 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${settings.cronSecret}`) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }

  const businesses = await prisma.business.findMany({
    where: { reportEmail: { not: null } },
  });

  const results: { businessId: string; ok: boolean; error?: string }[] = [];

  for (const business of businesses) {
    try {
      const locations = await fetchGoogleBusinessLocations(business.id);
      for (const location of locations) {
        const pdf = await generateMonthlyReportPdf(
          business.id,
          business.name,
          location.id,
          location.name
        );
        await sendMail({
          to: business.reportEmail!,
          subject: `【月次レポート】${business.name} / ${location.name}`,
          text: "月次レポートを添付いたします。",
          attachments: [
            {
              filename: `report-${business.name}-${location.name}.pdf`,
              content: pdf,
              contentType: "application/pdf",
            },
          ],
        });
      }
      results.push({ businessId: business.id, ok: true });
    } catch (err) {
      results.push({
        businessId: business.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
