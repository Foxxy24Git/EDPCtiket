import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildLogServerWorkbook, type LogServerReportRow } from "@/lib/logServerReportExcel";
import { getSession } from "@/lib/session";

function formatDateTime(iso: Date | string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dari = searchParams.get("dari");
    const sampai = searchParams.get("sampai");

    let where = {};
    let dateRangeLabel = "Semua Data";
    let filename = "REKAP_LOG_SERVER_SEMUA.xlsx";

    if (dari && sampai) {
      const startDate = new Date(`${dari}T00:00:00+07:00`);
      const endDate = new Date(`${sampai}T23:59:59.999+07:00`);
      where = {
        waktuAkses: {
          gte: startDate,
          lte: endDate,
        },
      };
      dateRangeLabel = `${dari} s.d ${sampai}`;
      filename = `REKAP_LOG_SERVER_${dari}_sd_${sampai}.xlsx`;
    }

    const logs = await prisma.serverAccessLog.findMany({
      where,
      orderBy: { waktuAkses: "asc" },
      include: {
        pencatat: { select: { nama: true } },
        approver: { select: { nama: true } },
      },
    });

    const reportRows: LogServerReportRow[] = logs.map((item, idx) => ({
      no: idx + 1,
      fotoUrl: item.fotoUrl,
      namaOrang: item.namaOrang,
      instansi: item.instansi || "-",
      namaPic: item.namaPic || "-",
      keperluan: item.keperluan || "-",
      waktuMasuk: formatDateTime(item.waktuAkses),
      waktuKeluar: formatDateTime(item.waktuKeluar),
      pencatatNama: item.pencatat?.nama || "-",
      statusApproval: item.statusApproval === "approved" ? "Approved" : "Pending",
      approverNama: item.approver?.nama || "-",
    }));

    const buffer = await buildLogServerWorkbook(reportRows, dateRangeLabel);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/rekap/log-server]", err);
    return NextResponse.json({ error: "Gagal me-render rekap Excel log server." }, { status: 500 });
  }
}
