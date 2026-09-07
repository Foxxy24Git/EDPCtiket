import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
  const jenisPerangkat = (sp.get("jenisPerangkat") ?? "").trim();
  const cabang = (sp.get("cabang") ?? "").trim();
  const status = (sp.get("status") ?? "").trim();
  const statusSupervisi = (sp.get("statusSupervisi") ?? "").trim();
  const search = (sp.get("search") || sp.get("q") || "").trim();

  if (!dari || !sampai) {
    return NextResponse.json({ error: "Rentang tanggal wajib diisi." }, { status: 400 });
  }

  try {
    const from = new Date(`${dari}T00:00:00+07:00`);
    const sampaiStart = new Date(`${sampai}T00:00:00+07:00`);
    const to = new Date(sampaiStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const where: Prisma.TicketWhereInput = {
      kategori: "workstation",
      isTerminated: false,
      waktuOpen: { gte: from, lte: to },
    };

    if (cabang) {
      where.wsCabang = cabang;
    }
    if (status === "proses" || status === "selesai") {
      where.status = status;
    }
    if (statusSupervisi === "approved" || statusSupervisi === "belum") {
      where.statusSupervisi = statusSupervisi;
    }
    if (jenisPerangkat) {
      if (jenisPerangkat.toLowerCase() === "edc" || jenisPerangkat.toLowerCase() === "mesin edc") {
        where.wsMerekKomputer = { contains: "EDC", mode: "insensitive" };
      } else if (jenisPerangkat.toLowerCase() === "komputer" || jenisPerangkat.toLowerCase() === "workstation") {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          {
            NOT: {
              wsMerekKomputer: { contains: "EDC", mode: "insensitive" },
            },
          },
        ];
      } else {
        where.wsMerekKomputer = { contains: jenisPerangkat, mode: "insensitive" };
      }
    }

    if (search) {
      where.OR = [
        { noTiket: { contains: search, mode: "insensitive" } },
        { wsCabang: { contains: search, mode: "insensitive" } },
        { wsMerekKomputer: { contains: search, mode: "insensitive" } },
        { wsNoSurat: { contains: search, mode: "insensitive" } },
        { wsKerusakan: { contains: search, mode: "insensitive" } },
        { wsVendor: { contains: search, mode: "insensitive" } },
        { wsSnKomputer: { contains: search, mode: "insensitive" } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
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
    let dateRangeLabel = `${dari} s.d. ${sampai}`;
    if (jenisPerangkat) dateRangeLabel += ` | Perangkat: ${jenisPerangkat}`;
    if (cabang) dateRangeLabel += ` | Cabang: ${cabang}`;
    if (status) dateRangeLabel += ` | Status: ${status === "selesai" ? "Selesai" : "Proses"}`;
    if (statusSupervisi) dateRangeLabel += ` | Supervisi: ${statusSupervisi === "approved" ? "Diapprove" : "Pending"}`;

    const filenameTag = jenisPerangkat ? `_${jenisPerangkat.replace(/\s+/g, "_").toUpperCase()}` : "";
    const filename = `REKAP_WORKSTATION${filenameTag}_${dari}_sd_${sampai}.xlsx`;

    const buffer = await buildWorkstationWorkbook(mapped, dateRangeLabel, logoPath || undefined);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
