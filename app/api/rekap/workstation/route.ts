import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { buildWorkstationWorkbook } from "@/lib/workstationReportExcel";
import { resolveReportLogoPath } from "@/lib/appSettings";

function fmtTgl(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d).replace(/\//g, "-");
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const dari = sp.get("dari");
  const sampai = sp.get("sampai");

  if (!dari || !sampai) {
    return NextResponse.json({ error: "Rentang tanggal wajib diisi." }, { status: 400 });
  }

  try {
    const from = new Date(`${dari}T00:00:00+07:00`);
    const sampaiStart = new Date(`${sampai}T00:00:00+07:00`);
    const to = new Date(sampaiStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const tickets = await prisma.ticket.findMany({
      where: {
        kategori: "workstation",
        waktuOpen: { gte: from, lte: to },
      },
      orderBy: { waktuOpen: "asc" },
    });

    const mapped = tickets.map((t, idx) => ({
      no: idx + 1,
      noTiket: t.noTiket,
      wsCabang: t.wsCabang ?? "—",
      wsCapem: t.wsCapem ?? "—",
      wsTanggalMasuk: fmtTgl(t.wsTanggalMasuk),
      wsNoSurat: t.wsNoSurat ?? "—",
      wsMerekKomputer: t.wsMerekKomputer ?? "—",
      wsKelengkapan: t.wsKelengkapan ?? "—",
      wsSnKomputer: t.wsSnKomputer ?? "—",
      wsKerusakan: t.wsKerusakan ?? "—",
      wsTglKeVendor: fmtTgl(t.wsTglKeVendor),
      wsVendor: t.wsVendor ?? "—",
      wsTglSelesaiVendor: fmtTgl(t.wsTglSelesaiVendor),
      wsTglKembaliKeCabang: fmtTgl(t.wsTglKembaliKeCabang),
      wsPicTerima: t.wsPicTerima ?? "—",
      status: t.status === "selesai" ? "Selesai" : "Proses",
      statusSupervisi: t.statusSupervisi === "approved" ? "Diapprove" : "Pending",
      keterangan: t.keterangan ?? "—",
    }));

    const logoPath = await resolveReportLogoPath();
    const dateRangeLabel = `${dari} s.d. ${sampai}`;
    const buffer = await buildWorkstationWorkbook(mapped, dateRangeLabel, logoPath || undefined);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="REKAP_WORKSTATION_${dari}_sd_${sampai}.xlsx"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
